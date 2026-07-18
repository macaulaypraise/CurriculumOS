from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_openai_key
from app.database.session import get_db
from app.models.activity_event import ActivityEvent
from app.models.assessment import Assessment
from app.models.course import Course
from app.models.learning_outcome import LearningOutcome
from app.models.module import Module
from app.models.project import Project
from app.schemas.assessment import AssessmentGenerationRequest, AssessmentResponse
from app.services.ai_gateway import AIGateway

router = APIRouter(tags=["assessments"])


@router.get("/projects/{project_id}/assessments", response_model=list[AssessmentResponse])
async def list_project_assessments(project_id: int, session: AsyncSession = Depends(get_db)) -> list[Assessment]:
    result = await session.scalars(
        select(Assessment).where(Assessment.project_id == project_id).order_by(Assessment.created_at.desc())
    )
    return list(result)


@router.post(
    "/projects/{project_id}/assessments/generate",
    response_model=AssessmentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def generate_project_assessment(
    project_id: int,
    request: AssessmentGenerationRequest,
    session: AsyncSession = Depends(get_db),
    api_key: str | None = Depends(get_openai_key),
) -> Assessment:
    project = await session.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    course = await session.scalar(select(Course).where(Course.project_id == project_id).order_by(Course.id))
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project has no course")

    outcome = await session.scalar(
        select(LearningOutcome)
        .join(Module)
        .where(LearningOutcome.id == request.learning_outcome_id, Module.course_id == course.id)
    )
    if outcome is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Learning outcome not found for project")

    generated = await AIGateway(api_key=api_key).generate_assessment(request.outcome_text)
    assessment = Assessment(
        project_id=project_id,
        course_id=course.id,
        learning_outcome_id=outcome.id,
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
