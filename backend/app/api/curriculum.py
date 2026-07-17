from typing import Annotated

from fastapi import APIRouter, Body, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database.session import get_db_session
from app.models.course import Course
from app.models.module import Module as ModuleModel
from app.schemas.curriculum import (
    CourseGraph,
    LearningOutcome,
    Lesson,
    Module,
)
from app.services.ai_extraction import extract_curriculum_graph
from app.services.curriculum import save_curriculum_graph

router = APIRouter(prefix="/curriculum", tags=["curriculum"])


class CurriculumExtractionResponse(BaseModel):
    course_id: int
    graph: CourseGraph


@router.post("/extract", response_model=CurriculumExtractionResponse)
async def extract_curriculum(
    text: Annotated[str, Body(embed=True, min_length=1)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> CurriculumExtractionResponse:
    graph = await extract_curriculum_graph(text)
    course = await save_curriculum_graph(session, graph)

    return CurriculumExtractionResponse(course_id=course.id, graph=graph)


@router.get("/{course_id}", response_model=CourseGraph)
async def get_curriculum(
    course_id: int,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> CourseGraph:
    statement = (
        select(Course)
        .where(Course.id == course_id)
        .options(
            selectinload(Course.modules).selectinload(ModuleModel.lessons),
            selectinload(Course.modules).selectinload(ModuleModel.learning_outcomes),
        )
    )
    course = (await session.execute(statement)).scalar_one_or_none()

    if course is None:
        raise HTTPException(status_code=404, detail="Course not found.")

    return CourseGraph(
        title=course.title,
        description=course.description or "",
        modules=[
            Module(
                title=module.title,
                description=module.description or "",
                lessons=[
                    Lesson(title=lesson.title, description=lesson.description)
                    for lesson in module.lessons
                ],
                learning_outcomes=[
                    LearningOutcome(statement=outcome.statement)
                    for outcome in module.learning_outcomes
                ],
            )
            for module in course.modules
        ],
    )
