from typing import Any

from app.schemas.change import CurriculumPR


class OpenAIProvider:
    """Temporary Live AI provider stub until live prompts and credits are enabled."""

    def __init__(self, api_key: str) -> None:
        self._api_key = api_key

    async def propose_change(self, course_id: int, user_prompt: str) -> CurriculumPR:
        _ = (course_id, user_prompt, self._api_key)
        return CurriculumPR(
            summary="Live AI processing simulated",
            risk_level="low",
            affected_items=[],
            generated_diff="Live AI provider is configured but simulated for this demo.",
        )

    async def generate_assessment(self, outcome_text: str) -> dict[str, Any]:
        _ = (outcome_text, self._api_key)
        return {
            "title": "Live AI Assessment (Simulated)",
            "questions": [{"question": "Live AI assessment generation is simulated.", "points": 1}],
            "rubric": {"total_points": 1, "criteria": []},
        }
