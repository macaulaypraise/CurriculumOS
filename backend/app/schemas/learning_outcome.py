from pydantic import BaseModel, ConfigDict, Field


class LearningOutcomeCreate(BaseModel):
    module_id: int
    statement: str = Field(min_length=1)
    position: int = Field(ge=0)


class LearningOutcomeRead(LearningOutcomeCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
