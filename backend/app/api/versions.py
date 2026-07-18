from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.models.curriculum_version import CurriculumVersion
from app.schemas.version import CurriculumVersionResponse

router = APIRouter(tags=["versions"])


@router.get("/projects/{project_id}/versions", response_model=list[CurriculumVersionResponse])
async def list_project_versions(
    project_id: int,
    session: AsyncSession = Depends(get_db),
) -> list[CurriculumVersion]:
    result = await session.scalars(
        select(CurriculumVersion)
        .where(CurriculumVersion.project_id == project_id)
        .order_by(CurriculumVersion.created_at.desc(), CurriculumVersion.version_number.desc())
    )
    return list(result)
