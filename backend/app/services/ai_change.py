import asyncio
import json
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.change import CurriculumPR

SEED_PATH = Path(__file__).parents[2] / "seed_data.json"
PROPOSED_CHANGES: dict[str, dict[str, object]] = {
    change["id"]: change
    for change in json.loads(SEED_PATH.read_text(encoding="utf-8"))["proposed_changes"]
}


async def propose_change(
    session: AsyncSession,
    course_id: int,
    user_prompt: str,
) -> CurriculumPR:
    del session, course_id

    prompt = user_prompt.lower()
    if "recursion" in prompt or "move" in prompt:
        proposal = PROPOSED_CHANGES["pr-001"]
    elif any(keyword in prompt for keyword in ("esl", "accessibility", "accommodation")):
        proposal = PROPOSED_CHANGES["pr-002"]
    else:
        proposal = PROPOSED_CHANGES["pr-003"]

    await asyncio.sleep(1.5)
    return CurriculumPR.model_validate(proposal)
