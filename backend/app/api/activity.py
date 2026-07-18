from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.models.activity_event import ActivityEvent
from app.schemas.activity import ActivityEventResponse

router = APIRouter(tags=["activity"])


@router.get("/projects/{project_id}/activity", response_model=list[ActivityEventResponse])
async def list_project_activity(
    project_id: int,
    session: AsyncSession = Depends(get_db),
) -> list[ActivityEvent]:
    result = await session.scalars(
        select(ActivityEvent)
        .where(ActivityEvent.project_id == project_id)
        .order_by(ActivityEvent.created_at.desc())
    )
    return list(result)
