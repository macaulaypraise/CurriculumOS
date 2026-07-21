from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class AssessmentGenerationRequest(BaseModel):
    """Supports the legacy outcome payload and new outcome/module/course scopes."""

    scope: Literal["outcome", "module", "course"] = "outcome"
    target_id: int | None = Field(default=None, gt=0)
    learning_outcome_id: int | None = Field(default=None, gt=0)
    outcome_text: str | None = Field(default=None, min_length=1, max_length=2000)

    @model_validator(mode="after")
    def normalise_target(self) -> "AssessmentGenerationRequest":
        if self.target_id is None:
            self.target_id = self.learning_outcome_id
        if self.target_id is None:
            raise ValueError("target_id is required")
        if self.learning_outcome_id is not None and self.scope != "outcome":
            raise ValueError("learning_outcome_id can only be used with outcome scope")
        return self


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
