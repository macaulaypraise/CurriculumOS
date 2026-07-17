from functools import lru_cache
from typing import Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )
    database_url: str = Field(validation_alias="DATABASE_URL")
    openai_api_key: Optional[str] = Field(default=None, validation_alias="OPENAI_API_KEY")

@lru_cache
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
