import logging
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.change import CurriculumPR
from app.schemas.curriculum import CourseGraph
from app.services.dependency_graph import enrich_proposal_with_graph_facts
from app.services.providers.demo_provider import DemoProvider
from app.services.providers.universal_provider import UniversalProvider

logger = logging.getLogger(__name__)


class AIGateway:
    """Provider gateway with deterministic fallbacks for interactive demo workflows."""

    def __init__(self, api_key: str | None = None, provider: str | None = None) -> None:
        self._demo_provider = DemoProvider(); self._api_key = api_key; self._provider_name = provider; self._universal_provider: UniversalProvider | None = None; self.is_demo_mode = True
        if api_key and provider:
            try:
                self._universal_provider = UniversalProvider(api_key, provider); self.is_demo_mode = False
            except Exception:
                logger.exception("Live AI provider setup failed; using DemoProvider")

    async def propose_change(self, course_id: int, user_prompt: str, session: AsyncSession | None = None) -> CurriculumPR:
        try:
            proposal = await (self._universal_provider.propose_change(course_id, user_prompt) if self._universal_provider else self._demo_provider.propose_change(course_id, user_prompt))
        except Exception:
            logger.exception("Live AI provider failed; falling back to DemoProvider")
            self.is_demo_mode = True; proposal = await self._demo_provider.propose_change(course_id, user_prompt)
        if session is None:
            return proposal
        try:
            return await enrich_proposal_with_graph_facts(session, course_id, user_prompt, proposal)
        except Exception:
            logger.exception("Dependency graph analysis failed; returning deterministic provider proposal")
            return proposal

    async def extract_curriculum(self, text: str, api_key: str | None = None, provider: str | None = None) -> CourseGraph:
        key = api_key or self._api_key; provider_name = provider or self._provider_name
        if not key or not provider_name:
            raise RuntimeError("Live extraction requires an AI key and provider")
        return await UniversalProvider(key, provider_name).extract_curriculum(text)

    async def generate_assessment(self, outcome_text: str) -> dict[str, Any]:
        return await self._demo_provider.generate_assessment(outcome_text)
