from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class CurriculumChangeCreate(BaseModel):
    course_id: int
    change_type: str = Field(min_length=1, max_length=100)
    rationale: str | None = None
    before_snapshot: dict[str, Any] | None = None
    after_snapshot: dict[str, Any] | None = None


class CurriculumChangeRead(CurriculumChangeCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
