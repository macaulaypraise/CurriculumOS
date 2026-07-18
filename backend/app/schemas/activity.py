from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ActivityEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    event_type: str
    description: str
    created_at: datetime
