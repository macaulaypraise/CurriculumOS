from typing import Literal

from pydantic import BaseModel, Field


class ChangeRequest(BaseModel):
    course_id: int = Field(description="The ID of the course to analyze.")
    user_prompt: str = Field(description="The requested curriculum change in plain language.")


class CurriculumPR(BaseModel):
    summary: str = Field(description="A concise summary of the proposed curriculum change.")
    risk_level: Literal["low", "medium", "high"] = Field(
        description="The dependency risk of applying the change."
    )
    affected_items: list[str] = Field(
        description="Lessons, outcomes, assessments, or dependencies affected by the proposal."
    )
    generated_diff: str = Field(
        description="A readable, unified-diff-style description of the proposed curriculum edits."
    )
