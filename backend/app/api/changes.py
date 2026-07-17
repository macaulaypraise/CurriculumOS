import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db_session
from app.schemas.change import ChangeRequest, CurriculumPR
from app.services.ai_change import propose_change

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/changes", tags=["changes"])


@router.post("/propose", response_model=CurriculumPR)
async def propose_curriculum_change(
    request: ChangeRequest,
    session: AsyncSession = Depends(get_db_session),
) -> CurriculumPR:
    try:
        return await propose_change(session, request.course_id, request.user_prompt)
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except Exception as error:
        logger.exception("Curriculum change proposal failed.")
        raise HTTPException(status_code=502, detail="Unable to generate a curriculum proposal.") from error
