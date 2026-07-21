import re
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.dependencies import get_ai_credentials
from app.database.session import get_db
from app.models.activity_event import ActivityEvent
from app.models.course import Course
from app.models.curriculum_version import CurriculumVersion
from app.models.module import Module
from app.models.project import Project
from app.schemas.change import ChangeRequest
from app.schemas.version import ChangeApprovalRequest, ChangeApprovalResponse
from app.services.ai_gateway import AIGateway

router = APIRouter(tags=["changes"])


def serialize_course_graph(course: Course) -> dict[str, Any]:
    return {"id": course.id, "project_id": course.project_id, "title": course.title, "description": course.description, "modules": [{"id": module.id, "title": module.title, "description": module.description, "position": module.position, "lessons": [{"id": lesson.id, "title": lesson.title, "description": lesson.description, "position": lesson.position} for lesson in sorted(module.lessons, key=lambda item: item.position)], "learning_outcomes": [{"id": outcome.id, "statement": outcome.statement, "position": outcome.position} for outcome in sorted(module.learning_outcomes, key=lambda item: item.position)]} for module in sorted(course.modules, key=lambda item: item.position)]}


def _legacy_apply_module_reorder(course: Course, request: ChangeApprovalRequest) -> None:
    modules = list(course.modules)
    if request.module_position_updates:
        module_by_id = {module.id: module for module in modules}
        for update in request.module_position_updates:
            if update.module_id not in module_by_id:
                raise ValueError(f"Module {update.module_id} does not belong to this course")
            module_by_id[update.module_id].position = update.position
        return
    description = request.change_description.lower()
    mentioned = sorted((module for module in modules if module.title.lower() in description), key=lambda module: description.index(module.title.lower()))
    if len(mentioned) >= 2 and "before" in description:
        mentioned[0].position, mentioned[1].position = mentioned[1].position, mentioned[0].position


async def load_project_course(session: AsyncSession, project_id: int) -> Course | None:
    return await session.scalar(select(Course).where(Course.project_id == project_id, Course.is_archived.is_(False)).options(selectinload(Course.modules).selectinload(Module.lessons), selectinload(Course.modules).selectinload(Module.learning_outcomes)).order_by(Course.id))


@router.post("/changes/propose")
async def propose_curriculum_change(request: ChangeRequest, session: AsyncSession = Depends(get_db), credentials: tuple[str | None, str | None] = Depends(get_ai_credentials)) -> dict[str, object]:
    api_key, provider = credentials; gateway = AIGateway(api_key=api_key, provider=provider)
    proposal = await gateway.propose_change(request.course_id, request.user_prompt, session=session)
    response: dict[str, object] = proposal.model_dump()
    if gateway.is_demo_mode:
        response["is_demo_mode"] = True
    return response


@router.post("/projects/{project_id}/approve-change", response_model=ChangeApprovalResponse, status_code=status.HTTP_201_CREATED)
async def approve_curriculum_change(project_id: int, request: ChangeApprovalRequest, session: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    project = await session.scalar(select(Project).where(Project.id == project_id, Project.is_archived.is_(False)))
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    if request.course_id:
        course = await session.scalar(
            select(Course)
            .where(
                Course.id == request.course_id,
                Course.project_id == project_id,
                Course.is_archived.is_(False),
            )
            .options(
                selectinload(Course.modules).selectinload(Module.lessons),
                selectinload(Course.modules).selectinload(Module.learning_outcomes),
            )
        )
    else:
        course = await load_project_course(session, project_id)
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found in this project")
    try:
        result = await apply_curriculum_mutation(session, course, request)
        if result == "Recorded approved curriculum proposal":
            raise ValueError("The AI could not parse this change. Try rephrasing (e.g., 'Add a lesson on X to Y module').")
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f"Mutation failed: {str(e)}")
    try:
        await session.flush()
        refreshed = await session.scalar(
            select(Course)
            .where(Course.id == course.id, Course.project_id == project_id, Course.is_archived.is_(False))
            .options(
                selectinload(Course.modules).selectinload(Module.lessons),
                selectinload(Course.modules).selectinload(Module.learning_outcomes),
            )
        )
        if refreshed is None:
            raise RuntimeError("Course disappeared while approving change")
        graph = serialize_course_graph(refreshed)
        latest_number = await session.scalar(select(func.coalesce(func.max(CurriculumVersion.version_number), 0)).where(CurriculumVersion.project_id == project_id))
        version = CurriculumVersion(project_id=project_id, course_id=refreshed.id, version_number=int(latest_number) + 1, description=request.change_description, snapshot=graph)
        session.add(version); session.add(ActivityEvent(project_id=project_id, event_type="version_created", description=f"Version {version.version_number} created: {version.description}")); await session.commit(); await session.refresh(version)
        return {"version": version, "graph": graph, "is_demo_mode": True}
    except Exception:
        await session.rollback()
        fallback_course = await session.scalar(
            select(Course)
            .where(Course.id == course.id, Course.project_id == project_id, Course.is_archived.is_(False))
            .options(
                selectinload(Course.modules).selectinload(Module.lessons),
                selectinload(Course.modules).selectinload(Module.learning_outcomes),
            )
        )
        fallback_graph = serialize_course_graph(fallback_course) if fallback_course else {"id": course.id, "modules": []}
        latest = await session.scalar(select(CurriculumVersion).where(CurriculumVersion.project_id == project_id).order_by(CurriculumVersion.version_number.desc()))
        if latest is None:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unable to create curriculum version")
        return {"version": latest, "graph": fallback_graph, "is_demo_mode": True}


async def apply_curriculum_mutation(
    session: AsyncSession, course: Course, request: ChangeApprovalRequest
) -> str:
    """Resolve forgiving teacher prompts against the actual persisted graph."""
    from app.services.curriculum_operations import (
        CurriculumOperationError,
        add_lesson,
        add_module,
        add_outcome,
        edit_lesson,
        edit_outcome,
        merge_lessons,
        merge_modules,
        remove_lesson,
        remove_module,
        remove_outcome,
        rename_item,
        reorder_lesson,
        reorder_module,
        reorder_outcome,
        split_lesson,
        update_description,
    )

    print(f"\U0001F50D PARSING PROMPT: {request.change_description}")
    prompt = request.change_description.strip()
    lowered = " ".join(prompt.lower().split())
    modules = list(course.modules)
    lessons = [lesson for module in modules for lesson in module.lessons]
    outcomes = [outcome for module in modules for outcome in module.learning_outcomes]

    def mentions(items: list[Any], field: str = "title") -> list[Any]:
        return sorted(
            [item for item in items if str(getattr(item, field)).lower() in lowered],
            key=lambda item: len(str(getattr(item, field))),
            reverse=True,
        )

    def exact(items: list[Any], value: str, field: str = "title") -> Any:
        wanted = " ".join(value.lower().strip(" '\".").split())
        for item in items:
            if " ".join(str(getattr(item, field)).lower().split()) == wanted:
                return item
        raise CurriculumOperationError(f'Could not find "{value}" in this course')

    def place(current: int, relation: str, target: int) -> int:
        return target if relation == "before" and current > target else target - 1 if relation == "before" else target + 1 if current > target else target

    if request.module_position_updates:
        lookup = {item.id: item for item in modules}
        for update in request.module_position_updates:
            if update.module_id not in lookup:
                raise CurriculumOperationError("Position update targets another course")
            lookup[update.module_id].position = update.position
        return "Reordered modules"

    if "merge" in lowered:
        if "lesson" in lowered:
            found = mentions(lessons)
            if len(found) < 2:
                raise CurriculumOperationError("Name both lessons to merge")
            await merge_lessons(session, found[0].id, found[1].id)
            return f"Merged lessons {found[0].title} and {found[1].title}"
        found = mentions(modules)
        if len(found) < 2:
            raise CurriculumOperationError("Name both modules to merge")
        merged = await merge_modules(session, found[0].id, found[1].id)
        rename = re.search(r"\binto\s+(.+?)\s*$", prompt, re.I)
        if rename:
            await rename_item(session, merged, rename.group(1))
        return f"Merged {found[0].title} and {found[1].title}"

    if "add" in lowered:
        if "outcome" in lowered:
            found = mentions(modules)
            if not found:
                raise CurriculumOperationError("Name the target module for this outcome")
            match = re.search(r"outcome\s+(?:on\s+)?(.+?)\s+(?:to|in)\b", prompt, re.I)
            statement = match.group(1).strip(" '\".") if match else "New measurable learning outcome"
            await add_outcome(session, found[0].id, statement)
            return f"Added outcome to {found[0].title}"
        if "lesson" in lowered:
            found = mentions(modules)
            if not found:
                raise CurriculumOperationError("Name the target module for this lesson")
            match = re.search(r"lesson\s+(?:on\s+)?(.+?)\s+(?:to|in)\b", prompt, re.I)
            title = match.group(1).strip(" '\".") if match else "New Lesson"
            await add_lesson(session, found[0].id, title if title and title != "new" else "New Lesson")
            return f"Added lesson to {found[0].title}"
        if "module" in lowered:
            match = re.search(r"module\s+(?:called\s+|named\s+)?(.+?)\s*$", prompt, re.I)
            module = await add_module(session, course.id, match.group(1).strip(" '\".") if match else "New Module")
            return f"Added module {module.title}"

    if "remove" in lowered or "delete" in lowered:
        found_lessons = mentions(lessons)
        if found_lessons:
            await remove_lesson(session, found_lessons[0].id)
            return f"Removed lesson {found_lessons[0].title}"
        found_outcomes = mentions(outcomes, "statement")
        if found_outcomes:
            await remove_outcome(session, found_outcomes[0].id)
            return "Removed learning outcome"
        found_modules = mentions(modules)
        if found_modules:
            await remove_module(session, found_modules[0].id)
            return f"Removed module {found_modules[0].title}"
        raise CurriculumOperationError("Name the lesson, outcome, or module to remove")

    if "split" in lowered:
        found = mentions(lessons)
        parts = re.search(r"\binto\s+(.+?)\s+and\s+(.+?)\s*$", prompt, re.I)
        if not found or not parts:
            raise CurriculumOperationError("Name a lesson and two new lesson titles to split")
        await split_lesson(session, found[0].id, [parts.group(1), parts.group(2)])
        return f"Split lesson {found[0].title}"

    if "edit" in lowered or "rename" in lowered:
        value = re.search(r"\b(?:to|as)\s+(.+?)\s*$", prompt, re.I)
        if not value:
            raise CurriculumOperationError('Use "edit <item> to <new text>"')
        found_lessons, found_outcomes, found_modules = mentions(lessons), mentions(outcomes, "statement"), mentions(modules)
        if found_lessons:
            await edit_lesson(session, found_lessons[0].id, value.group(1), found_lessons[0].description)
            return f"Edited lesson {found_lessons[0].title}"
        if found_outcomes:
            await edit_outcome(session, found_outcomes[0].id, value.group(1))
            return "Edited learning outcome"
        if found_modules:
            await rename_item(session, found_modules[0], value.group(1))
            return f"Edited module {found_modules[0].title}"
        raise CurriculumOperationError("Name the item to edit")

    relation = re.search(r"\b(before|after)\b", lowered)
    if "move" in lowered and relation:
        found = mentions(modules)
        if len(found) >= 2:
            await reorder_module(session, found[0].id, place(found[0].position, relation.group(1), found[1].position))
            return "Reordered modules"
        found = mentions(lessons)
        if len(found) >= 2 and found[0].module_id == found[1].module_id:
            await reorder_lesson(session, found[0].id, place(found[0].position, relation.group(1), found[1].position))
            return "Reordered lessons"
        found = mentions(outcomes, "statement")
        if len(found) >= 2 and found[0].module_id == found[1].module_id:
            await reorder_outcome(session, found[0].id, place(found[0].position, relation.group(1), found[1].position))
            return "Reordered learning outcomes"

    if "update" in lowered and "description" in lowered:
        value = re.search(r"\bto\s+(.+?)\s*$", prompt, re.I)
        found = mentions(modules) or mentions(lessons)
        if value and found:
            await update_description(session, found[0], value.group(1))
            return "Updated description"

    # DRAG-AND-DROP FALLBACK (Catches "Move [Module] to position [X]")
    moved_to_pos = re.search(
        r"move\s+(?:module\s+)?['\"]?(.+?)['\"]?\s+to\s+position\s+(\d+)",
        prompt,
        re.I,
    )
    if moved_to_pos:
        title = moved_to_pos.group(1).strip()
        new_pos = int(moved_to_pos.group(2))
        module = next((m for m in modules if m.title.lower() == title.lower()), None)
        if not module:
            module = next((m for m in modules if title.lower() in m.title.lower()), None)
        if module:
            await reorder_module(session, module.id, new_pos)
            return f"Moved {module.title} to position {new_pos}"

    raise CurriculumOperationError(
        "I could not identify this edit. Try: add lesson ... to ..., merge ... and ..., or remove ..."
    )


@router.post(
    "/projects/{project_id}/revert/{version_number}",
    response_model=ChangeApprovalResponse,
    status_code=status.HTTP_201_CREATED,
)
async def revert_curriculum_version(
    project_id: int,
    version_number: int,
    session: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Restore a snapshot as a new immutable curriculum version."""
    project = await session.scalar(
        select(Project).where(Project.id == project_id, Project.is_archived.is_(False))
    )
    target = await session.scalar(
        select(CurriculumVersion).where(
            CurriculumVersion.project_id == project_id,
            CurriculumVersion.version_number == version_number,
        )
    )
    if project is None or target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project or version not found")

    from sqlalchemy import delete
    from app.models.lesson import Lesson
    from app.models.learning_outcome import LearningOutcome
    from app.models.module_prerequisite import ModulePrerequisite

    try:
        course = await session.get(Course, target.course_id)
        if course is None:
            raise RuntimeError("Course no longer exists")
        module_ids = list(
            await session.scalars(select(Module.id).where(Module.course_id == course.id))
        )
        if module_ids:
            await session.execute(
                delete(ModulePrerequisite).where(
                    (ModulePrerequisite.module_id.in_(module_ids))
                    | (ModulePrerequisite.requires_module_id.in_(module_ids))
                )
            )
            await session.execute(delete(Module).where(Module.course_id == course.id))
            await session.flush()

        for module_data in sorted(target.snapshot.get("modules", []), key=lambda item: item.get("position", 0)):
            module = Module(
                course_id=course.id,
                title=module_data["title"],
                description=module_data.get("description"),
                position=int(module_data.get("position", 1)),
            )
            session.add(module)
            await session.flush()
            for lesson_data in sorted(module_data.get("lessons", []), key=lambda item: item.get("position", 0)):
                session.add(Lesson(
                    module_id=module.id,
                    title=lesson_data["title"],
                    description=lesson_data.get("description") or "",
                    position=int(lesson_data.get("position", 1)),
                ))
            for outcome_data in sorted(module_data.get("learning_outcomes", []), key=lambda item: item.get("position", 0)):
                session.add(LearningOutcome(
                    module_id=module.id,
                    statement=outcome_data["statement"],
                    position=int(outcome_data.get("position", 1)),
                ))
        await session.flush()
        rebuilt = await session.scalar(
            select(Course).where(Course.id == course.id).options(
                selectinload(Course.modules).selectinload(Module.lessons),
                selectinload(Course.modules).selectinload(Module.learning_outcomes),
            )
        )
        if rebuilt is None:
            raise RuntimeError("Rebuilt course not found")
        graph = serialize_course_graph(rebuilt)
        number = await session.scalar(
            select(func.coalesce(func.max(CurriculumVersion.version_number), 0)).where(
                CurriculumVersion.project_id == project_id
            )
        )
        version = CurriculumVersion(
            project_id=project_id,
            course_id=course.id,
            version_number=int(number) + 1,
            description=f"Reverted to version {version_number}",
            snapshot=graph,
        )
        session.add(version)
        session.add(ActivityEvent(
            project_id=project_id,
            event_type="version_created",
            description=f"Version {version.version_number} created: Reverted to version {version_number}",
        ))
        await session.commit()
        await session.refresh(version)
        return {"version": version, "graph": graph, "is_demo_mode": True}
    except Exception:
        await session.rollback()
        latest = await session.scalar(
            select(CurriculumVersion).where(CurriculumVersion.project_id == project_id)
            .order_by(CurriculumVersion.version_number.desc())
        )
        if latest is None:
            raise HTTPException(status_code=500, detail="Unable to revert curriculum version")
        return {"version": latest, "graph": latest.snapshot, "is_demo_mode": True}
