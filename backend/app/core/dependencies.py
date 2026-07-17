from typing import Annotated

from fastapi import Header

from app.core.config import settings


async def get_openai_key(
    x_openai_key: Annotated[str | None, Header()] = None,
) -> str | None:
    return x_openai_key or settings.openai_api_key or None
