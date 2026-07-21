from pydantic import BaseModel, ConfigDict, Field


class LearningOutcome(BaseModel):
    """A measurable capability a learner should demonstrate after a module."""

    model_config = ConfigDict(
        json_schema_extra={
            "description": "A specific, observable learning outcome for a curriculum module."
        }
    )

    id: int | None = Field(default=None, description="Database identifier when this outcome is loaded from persistence.")
    position: int | None = Field(default=None, description="Ordered position within the module when persisted.")
    statement: str = Field(
        description="A concise, measurable statement of what the learner will be able to do."
    )


class Lesson(BaseModel):
    """A teachable unit within a curriculum module."""

    model_config = ConfigDict(
        json_schema_extra={"description": "One lesson that belongs to a curriculum module."}
    )

    id: int | None = Field(default=None, description="Database identifier when this lesson is loaded from persistence.")
    position: int | None = Field(default=None, description="Ordered position within the module when persisted.")
    title: str = Field(description="The lesson title as stated or clearly implied by the source material.")
    description: str = Field(
        description="A brief description of the concepts, skills, or activities covered by the lesson."
    )


class Module(BaseModel):
    """A coherent group of lessons and learning outcomes within a course."""

    model_config = ConfigDict(
        json_schema_extra={
            "description": "A course module containing its lessons and learning outcomes."
        }
    )

    id: int | None = Field(default=None, description="Database identifier when this module is loaded from persistence.")
    position: int | None = Field(default=None, description="Ordered position within the course when persisted.")
    title: str = Field(description="The module title as stated or clearly implied by the source material.")
    description: str = Field(description="A brief summary of the module's scope and purpose.")
    lessons: list[Lesson] = Field(
        description="The ordered lessons that make up this module. Use an empty list when none are provided."
    )
    learning_outcomes: list[LearningOutcome] = Field(
        description="The measurable learning outcomes for this module. Use an empty list when none are provided."
    )


class CourseGraph(BaseModel):
    """The complete extracted curriculum graph for one course."""

    model_config = ConfigDict(
        json_schema_extra={
            "description": "A complete course curriculum, organized into modules, lessons, and learning outcomes."
        }
    )

    title: str = Field(description="The course title as stated or clearly implied by the source material.")
    description: str = Field(description="A brief overview of the course's subject, audience, and purpose.")
    modules: list[Module] = Field(
        description="The ordered modules that make up the course. Use an empty list when none are provided."
    )


Course = CourseGraph


def get_demo_course() -> CourseGraph:
    return CourseGraph(
        title="Introduction to Computer Science",
        description="A beginner course covering foundational computing concepts and programming skills.",
        modules=[
            Module(
                title="Foundations of Computing",
                description="Introduces the role of computers, algorithms, and data in solving problems.",
                lessons=[
                    Lesson(
                        title="What Is Computer Science?",
                        description="An overview of computer science, computing systems, and their real-world uses.",
                    ),
                    Lesson(
                        title="Algorithms and Problem Solving",
                        description="Introduces step-by-step problem solving and basic algorithm design.",
                    ),
                ],
                learning_outcomes=[
                    LearningOutcome(
                        statement="Explain the role of algorithms in solving computational problems."
                    ),
                    LearningOutcome(
                        statement="Break a simple problem into clear, ordered solution steps."
                    ),
                ],
            ),
            Module(
                title="Programming Fundamentals",
                description="Introduces the basic building blocks used to write simple programs.",
                lessons=[
                    Lesson(
                        title="Variables and Data Types",
                        description="Covers storing values and choosing appropriate data types in a program.",
                    ),
                    Lesson(
                        title="Control Flow",
                        description="Introduces decisions and repetition using conditional statements and loops.",
                    ),
                ],
                learning_outcomes=[
                    LearningOutcome(
                        statement="Write a simple program that stores and manipulates values."
                    ),
                    LearningOutcome(
                        statement="Use conditionals and loops to control a program's execution."
                    ),
                ],
            ),
        ],
    )
