from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ModulePositionUpdate(BaseModel):
    module_id: int
    position: int = Field(ge=1)


class ChangeApprovalRequest(BaseModel):
    change_description: str = Field(min_length=1, max_length=500)
    module_position_updates: list[ModulePositionUpdate] = Field(default_factory=list)


class CurriculumVersionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    course_id: int
    version_number: int
    description: str
    snapshot: dict[str, Any]
    created_at: datetime


class ChangeApprovalResponse(BaseModel):
    version: CurriculumVersionResponse
    graph: dict[str, Any]
    is_demo_mode: bool = True
