from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.activity import router as activity_router
from app.api.assessments import router as assessments_router
from app.api.changes import router as changes_router
from app.api.curriculum import router as curriculum_router
from app.api.projects import router as projects_router
from app.api.versions import router as versions_router

app = FastAPI(title="CurriculumOS")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects_router)
app.include_router(curriculum_router)
app.include_router(changes_router)
app.include_router(versions_router)
app.include_router(assessments_router)
app.include_router(activity_router)


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}
