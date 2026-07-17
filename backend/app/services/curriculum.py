from sqlalchemy.ext.asyncio import AsyncSession

from app.models.course import Course
from app.models.learning_outcome import LearningOutcome
from app.models.lesson import Lesson
from app.models.module import Module
from app.schemas.curriculum import CourseGraph


async def save_curriculum_graph(session: AsyncSession, graph: CourseGraph) -> Course:
    course = Course(title=graph.title, description=graph.description)

    try:
        session.add(course)
        await session.flush()

        for module_position, module_graph in enumerate(graph.modules):
            module = Module(
                course_id=course.id,
                title=module_graph.title,
                description=module_graph.description,
                position=module_position,
            )
            session.add(module)
            await session.flush()

            for lesson_position, lesson_graph in enumerate(module_graph.lessons):
                session.add(
                    Lesson(
                        module_id=module.id,
                        title=lesson_graph.title,
                        description=lesson_graph.description,
                        position=lesson_position,
                    )
                )

            for outcome_position, outcome_graph in enumerate(module_graph.learning_outcomes):
                session.add(
                    LearningOutcome(
                        module_id=module.id,
                        statement=outcome_graph.statement,
                        position=outcome_position,
                    )
                )

        await session.flush()
        await session.commit()
        await session.refresh(course)
        return course
    except Exception:
        await session.rollback()
        raise
