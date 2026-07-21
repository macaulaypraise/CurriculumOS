from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_ai_credentials
from app.database.session import get_db
from app.models.activity_event import ActivityEvent
from app.models.assessment import Assessment
from app.models.course import Course
from app.models.learning_outcome import LearningOutcome
from app.models.lesson import Lesson
from app.models.module import Module
from app.models.project import Project
from app.schemas.assessment import AssessmentGenerationRequest, AssessmentResponse
from app.services.ai_gateway import AIGateway

router = APIRouter(tags=["assessments"])
AssessmentScope = Literal["outcome", "module", "course"]


class AssessmentUpdateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)


@router.get("/projects/{project_id}/assessments", response_model=list[AssessmentResponse])
async def list_project_assessments(
    project_id: int, session: AsyncSession = Depends(get_db)
) -> list[Assessment]:
    result = await session.scalars(
        select(Assessment)
        .where(
            Assessment.project_id == project_id,
            Assessment.is_archived.is_(False),
        )
        .order_by(Assessment.created_at.desc())
    )
    return list(result)


async def _assessment_target_context(
    session: AsyncSession,
    project_id: int,
    request: AssessmentGenerationRequest,
) -> tuple[Course, str, str, list[str]]:
    """Resolve an assessment target into stable, provider-ready curriculum context."""
    scope: AssessmentScope = request.scope
    target_id = request.target_id
    assert target_id is not None

    if scope == "outcome":
        outcome = await session.scalar(
            select(LearningOutcome)
            .join(Module, LearningOutcome.module_id == Module.id)
            .join(Course, Module.course_id == Course.id)
            .where(
                LearningOutcome.id == target_id,
                Course.project_id == project_id,
                Course.is_archived.is_(False),
            )
        )
        if outcome is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Learning outcome not found")
        module = await session.get(Module, outcome.module_id)
        if module is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Outcome module not found")
        course = await session.get(Course, module.course_id)
        if course is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Outcome course not found")
        return (
            course,
            f"{module.title}: {outcome.statement}",
            module.description or f"Learning outcome from the {module.title} module.",
            [outcome.statement, f"Parent module: {module.title}"],
        )

    if scope == "module":
        module = await session.scalar(
            select(Module)
            .join(Course, Module.course_id == Course.id)
            .where(
                Module.id == target_id,
                Course.project_id == project_id,
                Course.is_archived.is_(False),
            )
        )
        if module is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found")
        course = await session.get(Course, module.course_id)
        if course is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module course not found")
        outcomes = list(
            await session.scalars(
                select(LearningOutcome.statement)
                .where(LearningOutcome.module_id == module.id)
                .order_by(LearningOutcome.position)
            )
        )
        lessons = list(
            await session.scalars(
                select(Lesson.title)
                .where(Lesson.module_id == module.id)
                .order_by(Lesson.position)
            )
        )
        context_items = outcomes or lessons or [module.title]
        return course, module.title, module.description or "", context_items

    course = await session.scalar(
        select(Course).where(
            Course.id == target_id,
            Course.project_id == project_id,
            Course.is_archived.is_(False),
        )
    )
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    module_titles = list(
        await session.scalars(
            select(Module.title)
            .where(Module.course_id == course.id)
            .order_by(Module.position)
        )
    )
    return course, course.title, course.description or "", module_titles or [course.title]


@router.post(
    "/projects/{project_id}/assessments/generate",
    response_model=AssessmentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def generate_project_assessment(
    project_id: int,
    request: AssessmentGenerationRequest,
    session: AsyncSession = Depends(get_db),
    credentials: tuple[str | None, str | None] = Depends(get_ai_credentials),
) -> Assessment:
    project = await session.scalar(
        select(Project).where(Project.id == project_id, Project.is_archived.is_(False))
    )
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    course, target_title, target_description, context_items = await _assessment_target_context(
        session, project_id, request
    )
    api_key, provider = credentials
    gateway = AIGateway(api_key=api_key, provider=provider)
    generated = await gateway.generate_assessment(
        scope=request.scope,
        target_id=request.target_id,
        course_id=course.id,
        target_title=target_title,
        target_description=target_description,
        context_items=context_items,
    )
    assessment = Assessment(
        project_id=project_id,
        course_id=course.id,
        learning_outcome_id=request.target_id if request.scope == "outcome" else None,
        title=str(generated["title"]),
        questions=generated["questions"],
        rubric=generated["rubric"],
    )
    try:
        session.add(assessment)
        session.add(
            ActivityEvent(
                project_id=project_id,
                event_type="assessment_generated",
                description=f"Assessment generated: {assessment.title}",
            )
        )
        await session.commit()
        await session.refresh(assessment)
    except Exception:
        await session.rollback()
        raise
    return assessment


@router.patch(
    "/projects/{project_id}/assessments/{assessment_id}",
    response_model=AssessmentResponse,
)
async def update_project_assessment(
    project_id: int,
    assessment_id: int,
    payload: AssessmentUpdateRequest,
    session: AsyncSession = Depends(get_db),
) -> Assessment:
    assessment = await session.scalar(
        select(Assessment).where(
            Assessment.id == assessment_id,
            Assessment.project_id == project_id,
            Assessment.is_archived.is_(False),
        )
    )
    if assessment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found")
    assessment.title = payload.title
    await session.commit()
    await session.refresh(assessment)
    return assessment


@router.delete(
    "/projects/{project_id}/assessments/{assessment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def archive_project_assessment(
    project_id: int,
    assessment_id: int,
    session: AsyncSession = Depends(get_db),
) -> Response:
    assessment = await session.scalar(
        select(Assessment).where(
            Assessment.id == assessment_id,
            Assessment.project_id == project_id,
            Assessment.is_archived.is_(False),
        )
    )
    if assessment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found")
    assessment.is_archived = True
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
