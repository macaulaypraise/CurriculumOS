from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class AssessmentGenerationRequest(BaseModel):
    learning_outcome_id: int
    outcome_text: str = Field(min_length=1, max_length=2000)


class AssessmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    course_id: int
    learning_outcome_id: int | None
    title: str
    questions: list[dict[str, Any]]
    rubric: dict[str, Any]
    created_at: datetime
