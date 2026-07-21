import json
from typing import Any

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

    async def generate_assessment(
        self,
        *,
        scope: str,
        target_title: str,
        target_description: str,
        context_items: list[str],
    ) -> dict[str, Any]:
        topics = "\n".join(f"- {item}" for item in context_items)
        system_prompt = (
            "You are an expert curriculum assessment designer. Generate exactly 3 to 5 highly specific, "
            "multi-part assessment questions and a tailored grading rubric. Every question and rubric criterion "
            "must directly test the supplied target and topics; never substitute generic computer-science examples. "
            "Return only a JSON object with: title; questions (question, prompt, parts, points); and rubric "
            "(total_points, criteria with criterion, points, description)."
        )
        user_prompt = (
            f"Assessment scope: {scope}\n"
            f"Target: {target_title}\n"
            f"Target description: {target_description or 'Not provided'}\n"
            f"Specific topics to test:\n{topics}"
        )
        completion = await self._client.chat.completions.create(
            model=self._model,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.35,
            timeout=30,
        )
        content = completion.choices[0].message.content
        if not content:
            raise ValueError("Provider returned an empty response")
        return json.loads(content)
