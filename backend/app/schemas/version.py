from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ChangeApprovalRequest(BaseModel):
    change_description: str = Field(min_length=1, max_length=500)


class CurriculumVersionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    course_id: int
    version_number: int
    description: str
    snapshot: dict[str, Any]
    created_at: datetime
