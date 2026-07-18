from typing import Any

from app.schemas.change import CurriculumPR
from app.services.providers.demo_provider import DemoProvider
from app.services.providers.openai_provider import OpenAIProvider


class AIGateway:
    """Selects an AI provider while preserving CurriculumOS service contracts."""

    def __init__(self, api_key: str | None = None) -> None:
        normalized_key = api_key.strip() if api_key else ""
        self.is_demo_mode = not bool(normalized_key)
        self._provider = DemoProvider() if self.is_demo_mode else OpenAIProvider(normalized_key)

    async def propose_change(self, course_id: int, user_prompt: str) -> CurriculumPR:
        return await self._provider.propose_change(course_id, user_prompt)

    async def generate_assessment(self, outcome_text: str) -> dict[str, Any]:
        return await self._provider.generate_assessment(outcome_text)
