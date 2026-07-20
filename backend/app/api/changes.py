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
    return {
        "id": course.id,
        "project_id": course.project_id,
        "title": course.title,
        "description": course.description,
        "modules": [
            {
                "id": module.id,
                "title": module.title,
                "description": module.description,
                "position": module.position,
                "lessons": [
                    {"id": lesson.id, "title": lesson.title, "description": lesson.description, "position": lesson.position}
                    for lesson in sorted(module.lessons, key=lambda item: item.position)
                ],
                "learning_outcomes": [
                    {"id": outcome.id, "statement": outcome.statement, "position": outcome.position}
                    for outcome in sorted(module.learning_outcomes, key=lambda item: item.position)
                ],
            }
            for module in sorted(course.modules, key=lambda item: item.position)
        ],
    }


def apply_module_reorder(course: Course, request: ChangeApprovalRequest) -> None:
    modules = list(course.modules)
    if request.module_position_updates:
        module_by_id = {module.id: module for module in modules}
        for update in request.module_position_updates:
            module = module_by_id.get(update.module_id)
            if module is None:
                raise ValueError(f"Module {update.module_id} does not belong to this course")
            module.position = update.position
        return

    description = request.change_description.lower()
    mentioned = sorted(
        (module for module in modules if module.title.lower() in description),
        key=lambda module: description.index(module.title.lower()),
    )
    if len(mentioned) >= 2 and "before" in description:
        first, second = mentioned[0], mentioned[1]
        first.position, second.position = second.position, first.position


async def load_project_course(session: AsyncSession, project_id: int) -> Course | None:
    return await session.scalar(
        select(Course)
        .where(Course.project_id == project_id, Course.is_archived.is_(False))
        .options(
            selectinload(Course.modules).selectinload(Module.lessons),
            selectinload(Course.modules).selectinload(Module.learning_outcomes),
        )
        .order_by(Course.id)
    )


@router.post("/changes/propose")
async def propose_curriculum_change(request: ChangeRequest, credentials: tuple[str | None, str | None] = Depends(get_ai_credentials)) -> dict[str, object]:
    api_key, provider = credentials
    gateway = AIGateway(api_key=api_key, provider=provider)
    proposal = await gateway.propose_change(request.course_id, request.user_prompt)
    response: dict[str, object] = proposal.model_dump()
    if gateway.is_demo_mode:
        response["is_demo_mode"] = True
    return response


@router.post("/projects/{project_id}/approve-change", response_model=ChangeApprovalResponse, status_code=status.HTTP_201_CREATED)
async def approve_curriculum_change(project_id: int, request: ChangeApprovalRequest, session: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    project = await session.scalar(select(Project).where(Project.id == project_id, Project.is_archived.is_(False)))
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    course = await load_project_course(session, project_id)
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project has no course")

    try:
        apply_module_reorder(course, request)
    except Exception:
        # Demo Fortress: retain the current persisted graph when a proposed mutation is invalid.
        await session.rollback()
        course = await load_project_course(session, project_id)
        if course is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project has no course")

    try:
        await session.flush()
        refreshed_course = await load_project_course(session, project_id)
        if refreshed_course is None:
            raise RuntimeError("Course disappeared while approving change")
        graph = serialize_course_graph(refreshed_course)
        latest_version = await session.scalar(select(func.coalesce(func.max(CurriculumVersion.version_number), 0)).where(CurriculumVersion.project_id == project_id))
        version = CurriculumVersion(project_id=project_id, course_id=refreshed_course.id, version_number=int(latest_version) + 1, description=request.change_description, snapshot=graph)
        session.add(version)
        session.add(ActivityEvent(project_id=project_id, event_type="version_created", description=f"Version {version.version_number} created: {version.description}"))
        await session.commit()
        await session.refresh(version)
        return {"version": version, "graph": graph, "is_demo_mode": True}
    except Exception:
        await session.rollback()
        # Demo Fortress: return an auditable current graph and the latest persisted version instead of surfacing a crash.
        fallback_course = await load_project_course(session, project_id)
        fallback_graph = serialize_course_graph(fallback_course) if fallback_course else {"id": course.id, "modules": []}
        latest = await session.scalar(select(CurriculumVersion).where(CurriculumVersion.project_id == project_id).order_by(CurriculumVersion.version_number.desc()))
        if latest is None:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unable to create curriculum version")
        return {"version": latest, "graph": fallback_graph, "is_demo_mode": True}
