from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.change import CurriculumPR
from app.services.ai_gateway import AIGateway


async def propose_change(
    session: AsyncSession,
    course_id: int,
    user_prompt: str,
) -> CurriculumPR:
    """Backward-compatible service entry point for demo proposal generation."""
    _ = session
    return await AIGateway().propose_change(course_id, user_prompt)
