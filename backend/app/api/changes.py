from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_ai_credentials
from app.database.session import get_db
from app.models.activity_event import ActivityEvent
from app.models.course import Course
from app.models.curriculum_version import CurriculumVersion
from app.models.project import Project
from app.schemas.change import ChangeRequest
from app.schemas.version import ChangeApprovalRequest, CurriculumVersionResponse
from app.services.ai_gateway import AIGateway

router = APIRouter(tags=["changes"])


@router.post("/changes/propose")
async def propose_curriculum_change(
    request: ChangeRequest,
    credentials: tuple[str | None, str | None] = Depends(get_ai_credentials),
) -> dict[str, object]:
    api_key, provider = credentials
    gateway = AIGateway(api_key=api_key, provider=provider)
    proposal = await gateway.propose_change(request.course_id, request.user_prompt)
    response: dict[str, object] = proposal.model_dump()
    if gateway.is_demo_mode:
        response["is_demo_mode"] = True
    return response


@router.post(
    "/projects/{project_id}/approve-change",
    response_model=CurriculumVersionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def approve_curriculum_change(
    project_id: int,
    request: ChangeApprovalRequest,
    session: AsyncSession = Depends(get_db),
) -> CurriculumVersion:
    project = await session.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    course = await session.scalar(select(Course).where(Course.project_id == project_id).order_by(Course.id))
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project has no course")

    latest_version = await session.scalar(
        select(func.coalesce(func.max(CurriculumVersion.version_number), 0)).where(CurriculumVersion.project_id == project_id)
    )
    version = CurriculumVersion(
        project_id=project_id,
        course_id=course.id,
        version_number=int(latest_version) + 1,
        description=request.change_description,
        snapshot={"status": "approved"},
    )

    try:
        session.add(version)
        session.add(ActivityEvent(project_id=project_id, event_type="version_created", description=f"Version {version.version_number} created: {version.description}"))
        await session.commit()
        await session.refresh(version)
    except Exception:
        await session.rollback()
        raise
    return version
