from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.curriculum import router as curriculum_router
from app.api.changes import router as changes_router

app = FastAPI(title="CurriculumOS")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(curriculum_router)
app.include_router(changes_router)

@app.get("/health", tags=["health"])
async def health_check() -> dict[str, str]:
    return {"status": "ok"}
