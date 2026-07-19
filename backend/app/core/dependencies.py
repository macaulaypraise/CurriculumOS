from typing import Annotated

from fastapi import Header

from app.core.config import settings


async def get_ai_credentials(
    x_ai_key: Annotated[str | None, Header(alias="X-AI-Key")] = None,
    x_ai_provider: Annotated[str | None, Header(alias="X-AI-Provider")] = None,
    x_openai_key: Annotated[str | None, Header(alias="X-OpenAI-Key")] = None,
) -> tuple[str | None, str | None]:
    """Return BYOK credentials while supporting the legacy OpenAI header."""
    api_key = x_ai_key or x_openai_key or settings.openai_api_key
    provider = x_ai_provider.strip().lower() if x_ai_provider else ("openai" if api_key else None)
    return api_key, provider


async def get_openai_key(
    x_ai_key: Annotated[str | None, Header(alias="X-AI-Key")] = None,
    x_openai_key: Annotated[str | None, Header(alias="X-OpenAI-Key")] = None,
) -> str | None:
    """Backward-compatible key dependency for existing API routes."""
    return x_ai_key or x_openai_key or settings.openai_api_key
