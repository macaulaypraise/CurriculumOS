"""Atomic, position-safe mutations for a course curriculum graph."""

from __future__ import annotations

from collections.abc import Sequence

from sqlalchemy import delete, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lesson import Lesson
from app.models.learning_outcome import LearningOutcome
from app.models.module import Module
from app.models.module_prerequisite import ModulePrerequisite


class CurriculumOperationError(ValueError):
    """Raised when an approved mutation cannot be safely applied."""


async def _module(session: AsyncSession, module_id: int) -> Module:
    module = await session.get(Module, module_id)
    if module is None:
        raise CurriculumOperationError("Module not found")
    return module


async def _reindex_modules(session: AsyncSession, course_id: int) -> None:
    modules = list(
        await session.scalars(
            select(Module).where(Module.course_id == course_id).order_by(Module.position, Module.id)
        )
    )
    for position, module in enumerate(modules, start=1):
        module.position = position


async def _reindex_lessons(session: AsyncSession, module_id: int) -> list[Lesson]:
    lessons = list(
        await session.scalars(
            select(Lesson).where(Lesson.module_id == module_id).order_by(Lesson.position, Lesson.id)
        )
    )
    for position, lesson in enumerate(lessons, start=1):
        lesson.position = position
    return lessons


async def _reindex_outcomes(session: AsyncSession, module_id: int) -> list[LearningOutcome]:
    outcomes = list(
        await session.scalars(
            select(LearningOutcome)
            .where(LearningOutcome.module_id == module_id)
            .order_by(LearningOutcome.position, LearningOutcome.id)
        )
    )
    for position, outcome in enumerate(outcomes, start=1):
        outcome.position = position
    return outcomes


async def merge_modules(
    session: AsyncSession,
    module_a_id: int,
    module_b_id: int,
) -> Module:
    """Keep module A, move module B's content and dependency edges into it."""
    if module_a_id == module_b_id:
        raise CurriculumOperationError("A module cannot be merged with itself")
    module_a = await _module(session, module_a_id)
    module_b = await _module(session, module_b_id)
    if module_a.course_id != module_b.course_id:
        raise CurriculumOperationError("Modules must belong to the same course")

    lessons_a = await _reindex_lessons(session, module_a.id)
    lessons_b = await _reindex_lessons(session, module_b.id)
    for offset, lesson in enumerate(lessons_b, start=len(lessons_a) + 1):
        lesson.module_id = module_a.id
        lesson.position = offset

    outcomes_a = await _reindex_outcomes(session, module_a.id)
    outcomes_b = await _reindex_outcomes(session, module_b.id)
    for offset, outcome in enumerate(outcomes_b, start=len(outcomes_a) + 1):
        outcome.module_id = module_a.id
        outcome.position = offset

    # Rewrite the real prerequisite graph, discarding self-edges and duplicates.
    module_ids = set(
        await session.scalars(select(Module.id).where(Module.course_id == module_a.course_id))
    )
    edges = list(
        await session.execute(
            select(ModulePrerequisite.module_id, ModulePrerequisite.requires_module_id).where(
                ModulePrerequisite.module_id.in_(module_ids)
            )
        )
    )
    rewritten = {
        (
            module_a.id if module_id == module_b.id else module_id,
            module_a.id if required_id == module_b.id else required_id,
        )
        for module_id, required_id in edges
    }
    rewritten = {edge for edge in rewritten if edge[0] != edge[1]}
    await session.execute(
        delete(ModulePrerequisite).where(
            or_(
                ModulePrerequisite.module_id.in_(module_ids),
                ModulePrerequisite.requires_module_id.in_(module_ids),
            )
        )
    )
    for module_id, required_id in sorted(rewritten):
        session.add(ModulePrerequisite(module_id=module_id, requires_module_id=required_id))

    await session.delete(module_b)
    await session.flush()
    await _reindex_modules(session, module_a.course_id)
    return module_a


async def add_lesson(
    session: AsyncSession, module_id: int, title: str, description: str = ""
) -> Lesson:
    module = await _module(session, module_id)
    lessons = await _reindex_lessons(session, module.id)
    lesson = Lesson(
        module_id=module.id,
        title=title.strip(),
        description=description.strip() or f"Teacher-added lesson: {title.strip()}.",
        position=len(lessons) + 1,
    )
    session.add(lesson)
    await session.flush()
    return lesson


async def add_outcome(
    session: AsyncSession, module_id: int, statement: str
) -> LearningOutcome:
    module = await _module(session, module_id)
    outcomes = await _reindex_outcomes(session, module.id)
    outcome = LearningOutcome(
        module_id=module.id, statement=statement.strip(), position=len(outcomes) + 1
    )
    session.add(outcome)
    await session.flush()
    return outcome


async def remove_lesson(session: AsyncSession, lesson_id: int) -> None:
    lesson = await session.get(Lesson, lesson_id)
    if lesson is None:
        raise CurriculumOperationError("Lesson not found")
    module_id = lesson.module_id
    await session.delete(lesson)
    await session.flush()
    await _reindex_lessons(session, module_id)


async def remove_outcome(session: AsyncSession, outcome_id: int) -> None:
    outcome = await session.get(LearningOutcome, outcome_id)
    if outcome is None:
        raise CurriculumOperationError("Learning outcome not found")
    module_id = outcome.module_id
    await session.delete(outcome)
    await session.flush()
    await _reindex_outcomes(session, module_id)


async def remove_module(session: AsyncSession, module_id: int) -> None:
    module = await _module(session, module_id)
    await session.execute(
        delete(ModulePrerequisite).where(
            or_(
                ModulePrerequisite.module_id == module.id,
                ModulePrerequisite.requires_module_id == module.id,
            )
        )
    )
    course_id = module.course_id
    await session.delete(module)
    await session.flush()
    await _reindex_modules(session, course_id)


async def reorder_lesson(session: AsyncSession, lesson_id: int, new_position: int) -> Lesson:
    lesson = await session.get(Lesson, lesson_id)
    if lesson is None:
        raise CurriculumOperationError("Lesson not found")
    lessons = await _reindex_lessons(session, lesson.module_id)
    lessons.remove(lesson)
    lessons.insert(max(0, min(new_position - 1, len(lessons))), lesson)
    for position, item in enumerate(lessons, start=1):
        item.position = position
    return lesson


async def reorder_outcome(
    session: AsyncSession, outcome_id: int, new_position: int
) -> LearningOutcome:
    outcome = await session.get(LearningOutcome, outcome_id)
    if outcome is None:
        raise CurriculumOperationError("Learning outcome not found")
    outcomes = await _reindex_outcomes(session, outcome.module_id)
    outcomes.remove(outcome)
    outcomes.insert(max(0, min(new_position - 1, len(outcomes))), outcome)
    for position, item in enumerate(outcomes, start=1):
        item.position = position
    return outcome


async def reorder_module(session: AsyncSession, module_id: int, new_position: int) -> Module:
    module = await _module(session, module_id)
    modules = list(
        await session.scalars(
            select(Module).where(Module.course_id == module.course_id).order_by(Module.position, Module.id)
        )
    )
    modules.remove(module)
    modules.insert(max(0, min(new_position - 1, len(modules))), module)
    for position, item in enumerate(modules, start=1):
        item.position = position
    return module


async def rename_item(session: AsyncSession, item: Module | Lesson | LearningOutcome, value: str) -> None:
    value = value.strip()
    if not value:
        raise CurriculumOperationError("Names cannot be empty")
    if isinstance(item, LearningOutcome):
        item.statement = value
    else:
        item.title = value


async def update_description(session: AsyncSession, item: Module | Lesson, value: str) -> None:
    item.description = value.strip()



async def add_module(
    session: AsyncSession, course_id: int, title: str, description: str = ""
) -> Module:
    modules = list(
        await session.scalars(
            select(Module).where(Module.course_id == course_id).order_by(Module.position)
        )
    )
    module = Module(
        course_id=course_id,
        title=title.strip() or "New Module",
        description=description.strip() or None,
        position=len(modules) + 1,
    )
    session.add(module)
    await session.flush()
    return module


async def merge_lessons(
    session: AsyncSession, lesson_a_id: int, lesson_b_id: int
) -> Lesson:
    if lesson_a_id == lesson_b_id:
        raise CurriculumOperationError("A lesson cannot be merged with itself")
    lesson_a = await session.get(Lesson, lesson_a_id)
    lesson_b = await session.get(Lesson, lesson_b_id)
    if lesson_a is None or lesson_b is None:
        raise CurriculumOperationError("Lesson not found")
    if lesson_a.module_id != lesson_b.module_id:
        raise CurriculumOperationError("Lessons must belong to the same module")
    lesson_a.description = "\n\n".join(
        value for value in (lesson_a.description, lesson_b.description) if value
    )
    module_id = lesson_a.module_id
    await session.delete(lesson_b)
    await session.flush()
    await _reindex_lessons(session, module_id)
    return lesson_a


async def split_lesson(
    session: AsyncSession, lesson_id: int, new_titles: list[str]
) -> list[Lesson]:
    titles = [title.strip() for title in new_titles if title.strip()]
    if len(titles) < 2:
        raise CurriculumOperationError("Splitting a lesson requires at least two titles")
    lesson = await session.get(Lesson, lesson_id)
    if lesson is None:
        raise CurriculumOperationError("Lesson not found")
    module_id, original_position, original_description = (
        lesson.module_id,
        lesson.position,
        lesson.description,
    )
    await session.delete(lesson)
    await session.flush()
    siblings = await _reindex_lessons(session, module_id)
    created: list[Lesson] = []
    for offset, title in enumerate(titles):
        new_lesson = Lesson(
            module_id=module_id,
            title=title,
            description=original_description if offset == 0 else f"Split from: {lesson.title}",
            position=original_position + offset,
        )
        session.add(new_lesson)
        created.append(new_lesson)
    await session.flush()
    all_lessons = [*siblings, *created]
    all_lessons.sort(key=lambda item: (item.position, item.id or 0))
    for position, item in enumerate(all_lessons, start=1):
        item.position = position
    return created


async def edit_lesson(
    session: AsyncSession, lesson_id: int, title: str, description: str
) -> Lesson:
    lesson = await session.get(Lesson, lesson_id)
    if lesson is None:
        raise CurriculumOperationError("Lesson not found")
    lesson.title = title.strip() or lesson.title
    lesson.description = description.strip() or lesson.description
    return lesson


async def edit_outcome(
    session: AsyncSession, outcome_id: int, statement: str
) -> LearningOutcome:
    outcome = await session.get(LearningOutcome, outcome_id)
    if outcome is None:
        raise CurriculumOperationError("Learning outcome not found")
    outcome.statement = statement.strip() or outcome.statement
    return outcome
