import asyncio
import json
from pathlib import Path
from typing import Any

from app.database.session import AsyncSessionLocal, engine
from app.models.course import Course
from app.models.learning_outcome import LearningOutcome
from app.models.lesson import Lesson
from app.models.module import Module

SEED_PATH = Path(__file__).with_name("seed_data.json")


async def seed_database() -> None:
    seed_data: dict[str, list[dict[str, Any]]] = json.loads(SEED_PATH.read_text(encoding="utf-8"))

    async with AsyncSessionLocal() as session:
        try:
            for course_data in seed_data["courses"]:
                course = Course(
                    title=course_data["title"],
                    description=course_data["description"],
                )
                session.add(course)
                await session.flush()

                for module_data in course_data["modules"]:
                    module = Module(
                        course_id=course.id,
                        title=module_data["title"],
                        description=module_data["description"],
                        position=module_data["position"],
                    )
                    session.add(module)
                    await session.flush()

                    for lesson_data in module_data["lessons"]:
                        session.add(
                            Lesson(
                                module_id=module.id,
                                title=lesson_data["title"],
                                description=lesson_data["description"],
                                position=lesson_data["position"],
                            )
                        )

                    for outcome_data in module_data["learning_outcomes"]:
                        session.add(
                            LearningOutcome(
                                module_id=module.id,
                                statement=outcome_data["statement"],
                                position=outcome_data["position"],
                            )
                        )

            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed_database())
