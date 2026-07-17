from pydantic import BaseModel, ConfigDict, Field


class ModuleCreate(BaseModel):
    course_id: int
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    position: int = Field(ge=0)


class ModuleRead(ModuleCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
