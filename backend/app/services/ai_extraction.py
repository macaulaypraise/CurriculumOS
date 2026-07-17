import logging

from openai import AsyncOpenAI

from app.core.config import settings
from app.schemas.curriculum import CourseGraph, get_demo_course

logger = logging.getLogger(__name__)

MODEL = "gpt-4o-mini"
SYSTEM_PROMPT = """Extract a curriculum graph from the supplied text.
Only include information supported by the text. Do not invent modules, lessons, or learning outcomes.
Use empty lists when the source does not provide lessons or learning outcomes."""


async def extract_curriculum_graph(text: str) -> CourseGraph:
    for attempt in range(2):
        try:
            client = AsyncOpenAI(api_key=settings.openai_api_key, timeout=30.0)
            completion = await client.beta.chat.completions.parse(
                model=MODEL,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": text},
                ],
                response_format=CourseGraph,
            )
            curriculum = completion.choices[0].message.parsed

            if curriculum is None:
                raise ValueError("The model returned no parsed curriculum graph.")

            return curriculum
        except Exception:
            logger.exception("Curriculum extraction attempt %d of 2 failed.", attempt + 1)

    logger.error("Curriculum extraction failed after two attempts; returning demo course.")
    return get_demo_course()
