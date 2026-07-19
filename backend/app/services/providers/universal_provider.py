import json

from openai import AsyncOpenAI

from app.schemas.change import CurriculumPR
from app.schemas.curriculum import CourseGraph

PROVIDER_CONFIGS = {
    "openai": {"base_url": "https://api.openai.com/v1", "model": "gpt-4o-mini"},
    "groq": {"base_url": "https://api.groq.com/openai/v1", "model": "llama-3.3-70b-versatile"},
    "gemini": {"base_url": "https://generativelanguage.googleapis.com/v1beta/openai/", "model": "gemini-1.5-flash"},
    "openrouter": {"base_url": "https://openrouter.ai/api/v1", "model": "anthropic/claude-3-haiku-20240307"},
}


class UniversalProvider:
    """OpenAI-compatible live provider for all supported BYOK services."""

    def __init__(self, api_key: str, provider_name: str) -> None:
        provider = provider_name.lower().strip()
        if provider not in PROVIDER_CONFIGS:
            raise ValueError(f"Unsupported AI provider: {provider}")
        config = PROVIDER_CONFIGS[provider]
        self._client = AsyncOpenAI(api_key=api_key, base_url=config["base_url"])
        self._model = config["model"]

    async def propose_change(self, course_id: int, user_prompt: str) -> CurriculumPR:
        schema = json.dumps(CurriculumPR.model_json_schema(), indent=2)
        completion = await self._client.chat.completions.create(
            model=self._model,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": "You are a Curriculum Engineer analyzing prerequisite dependencies. Return only JSON matching this CurriculumPR schema:\n" + schema},
                {"role": "user", "content": f"Course ID: {course_id}\nRequested curriculum change: {user_prompt}"},
            ],
            timeout=20,
        )
        content = completion.choices[0].message.content
        if not content:
            raise ValueError("Provider returned an empty response")
        return CurriculumPR.model_validate_json(content)

    async def extract_curriculum(self, text: str) -> CourseGraph:
        schema = json.dumps(CourseGraph.model_json_schema(), indent=2)
        completion = await self._client.chat.completions.create(
            model=self._model,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": "Extract curriculum structure from the supplied text. Return only JSON matching this CourseGraph schema:\n" + schema},
                {"role": "user", "content": text[:120_000]},
            ],
            timeout=30,
        )
        content = completion.choices[0].message.content
        if not content:
            raise ValueError("Provider returned an empty response")
        return CourseGraph.model_validate_json(content)
