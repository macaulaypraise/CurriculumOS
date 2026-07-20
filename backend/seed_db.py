import asyncio
import json
from pathlib import Path
from typing import Any

from sqlalchemy import select

from app.database.session import AsyncSessionLocal
from app.models.activity_event import ActivityEvent
from app.models.assessment import Assessment
from app.models.course import Course
from app.models.curriculum_version import CurriculumVersion
from app.models.learning_outcome import LearningOutcome
from app.models.lesson import Lesson
from app.models.module import Module
from app.models.project import Project

SEED_FILE = Path(__file__).with_name("seed_data.json")
DEMO_PROJECT_NAME = "Computer Science Degree Revision"
INITIAL_ASSESSMENT_QUESTIONS: list[dict[str, Any]] = [
    {"question": "Trace the call stack for factorial(4).", "prompt": "Show each frame, base case, and return value.", "points": 10},
    {"question": "Repair a non-terminating recursive binary search.", "prompt": "Identify the missing base case and provide corrected pseudocode.", "points": 12},
    {"question": "Design a recursive palindrome check for a linked list.", "prompt": "Explain the subproblem, base case, and complexity trade-offs.", "points": 15},
]
INITIAL_ASSESSMENT_RUBRIC: dict[str, Any] = {
    "total_points": 37,
    "criteria": [
        {"criterion": "Call stack reasoning", "points": 10, "description": "Frames and return order are accurate."},
        {"criterion": "Base cases and termination", "points": 10, "description": "Termination logic is precise."},
        {"criterion": "Algorithmic correctness", "points": 12, "description": "Solution handles boundary cases."},
        {"criterion": "Complexity and communication", "points": 5, "description": "Complexity is justified clearly."},
    ],
}


async def add_initial_assessment(session, project: Project) -> None:
    course = await session.scalar(select(Course).where(Course.project_id == project.id).order_by(Course.id))
    if course is None:
        return
    outcome = await session.scalar(
        select(LearningOutcome).join(Module).where(Module.course_id == course.id).order_by(LearningOutcome.id)
    )
    if outcome is None:
        return
    existing = await session.scalar(select(Assessment).where(Assessment.project_id == project.id).limit(1))
    if existing is None:
        session.add(
            Assessment(
                project_id=project.id,
                course_id=course.id,
                learning_outcome_id=outcome.id,
                title="Recursion & Call Stack Mastery Quiz",
                questions=INITIAL_ASSESSMENT_QUESTIONS,
                rubric=INITIAL_ASSESSMENT_RUBRIC,
            )
        )


async def add_initial_activity(session, project: Project) -> None:
    event_types = set(
        await session.scalars(select(ActivityEvent.event_type).where(ActivityEvent.project_id == project.id))
    )
    if "project_created" not in event_types:
        session.add(ActivityEvent(project_id=project.id, event_type="project_created", description="Project created: Computer Science Degree Revision"))
    if "curriculum_extracted" not in event_types:
        session.add(ActivityEvent(project_id=project.id, event_type="curriculum_extracted", description="Initial curriculum extracted"))


async def seed_database() -> None:
    seed_data = json.loads(SEED_FILE.read_text(encoding="utf-8"))

    async with AsyncSessionLocal() as session:
        try:
            project = await session.scalar(select(Project).where(Project.name == DEMO_PROJECT_NAME))
            if project is not None:
                await add_initial_assessment(session, project)
                await add_initial_activity(session, project)
                await session.commit()
                print("Demo project already exists; ensured initial assessment and activity.")
                return

            project = Project(name=DEMO_PROJECT_NAME, description="A demo workspace for revising the Advanced Computer Science curriculum.")
            session.add(project)
            await session.flush()

            first_course: Course | None = None
            for course_data in seed_data["courses"]:
                course = Course(project_id=project.id, title=course_data["title"], description=course_data["description"])
                session.add(course)
                await session.flush()
                first_course = first_course or course
                for module_data in course_data["modules"]:
                    module = Module(course_id=course.id, title=module_data["title"], description=module_data["description"], position=module_data["position"])
                    session.add(module)
                    await session.flush()
                    for lesson_data in module_data["lessons"]:
                        session.add(Lesson(module_id=module.id, title=lesson_data["title"], description=lesson_data["description"], position=lesson_data["position"]))
                    for out_idx, outcome_data in enumerate(module_data.get("learning_outcomes", [])):
                        session.add(
                            LearningOutcome(
                                module_id=module.id,
                                statement=outcome_data["statement"],
                                position=outcome_data.get("position") or (out_idx + 1),
                            )
                        )

            if first_course is not None:
                session.add(CurriculumVersion(project_id=project.id, course_id=first_course.id, version_number=1, description="Initial Curriculum Extraction", snapshot={"status": "initial"}))
                await session.flush()
                await add_initial_assessment(session, project)
            await add_initial_activity(session, project)

            existing_version = await session.scalar(
                select(CurriculumVersion).where(CurriculumVersion.project_id == project.id)
            )
            if not existing_version:
                session.add(CurriculumVersion(
                    project_id=project.id,
                    course_id=course.id,
                    version_number=1,
                    description="Initial Curriculum Extraction",
                    snapshot={"status": "initial", "message": "Demo Fortress Seed"}
                ))

            await session.commit()
        except Exception:
            await session.rollback()
            raise

    print("Demo project, curriculum, initial version, assessment, and activity seeded.")


if __name__ == "__main__":
    asyncio.run(seed_database())
