import asyncio
import io
import logging
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pypdf import PdfReader
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_ai_credentials
from app.database.session import get_db
from app.models.course import Course
from app.models.learning_outcome import LearningOutcome
from app.models.lesson import Lesson
from app.models.module import Module
from app.models.project import Project
from app.schemas.curriculum import CourseGraph, get_demo_course
from app.services.ai_gateway import AIGateway

logger = logging.getLogger(__name__)
router = APIRouter(tags=["files"])


def extract_pdf_text(content: bytes) -> str:
    reader = PdfReader(io.BytesIO(content))
    return "\n".join(page.extract_text() or "" for page in reader.pages).strip()


async def extract_upload_text(upload: UploadFile) -> str:
    filename = upload.filename or "Uploaded curriculum"
    suffix = Path(filename).suffix.lower()
    try:
        content = await asyncio.wait_for(upload.read(), timeout=10)
        if suffix == ".pdf":
            text = await asyncio.wait_for(asyncio.to_thread(extract_pdf_text, content), timeout=10)
        elif suffix in {".txt", ".md"}:
            text = content.decode("utf-8", errors="replace").strip()
        else:
            text = ""
        return text or filename
    except Exception:
        logger.exception("File text extraction failed; using filename fallback")
        return filename


async def save_graph(session: AsyncSession, project_id: int, graph: CourseGraph, course_name: str | None = None) -> Course:
    course = Course(project_id=project_id, title=course_name or graph.title, description=graph.description)
    session.add(course)
    await session.flush()
    for module_index, module_data in enumerate(graph.modules, start=1):
        module = Module(course_id=course.id, title=module_data.title, description=module_data.description, position=getattr(module_data, "position", None) or module_index)
        session.add(module)
        await session.flush()
        for lesson_index, lesson_data in enumerate(module_data.lessons, start=1):
            session.add(Lesson(module_id=module.id, title=lesson_data.title, description=lesson_data.description, position=getattr(lesson_data, "position", None) or lesson_index))
        for outcome_index, outcome_data in enumerate(module_data.learning_outcomes, start=1):
            session.add(LearningOutcome(module_id=module.id, statement=outcome_data.statement, position=getattr(outcome_data, "position", None) or outcome_index))
    return course


@router.post("/projects/{project_id}/upload", status_code=status.HTTP_201_CREATED)
async def upload_and_extract_curriculum(project_id: int, file: UploadFile = File(...), course_name: str | None = Form(default=None), session: AsyncSession = Depends(get_db), credentials: tuple[str | None, str | None] = Depends(get_ai_credentials)) -> dict[str, int | bool | str]:
    project = await session.get(Project, project_id)
    if project is None or project.is_archived:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    text = await extract_upload_text(file)
    api_key, provider = credentials
    try:
        graph = await asyncio.wait_for(AIGateway().extract_curriculum(text, api_key=api_key, provider=provider), timeout=30)
        is_fallback = False; message = "Curriculum extracted with Live AI"
    except Exception:
        logger.exception("Live curriculum extraction failed; using demo curriculum fallback")
        graph = get_demo_course(); is_fallback = True; message = "Using demo curriculum because live extraction was unavailable"
    try:
        course = await save_graph(session, project_id, graph, course_name.strip() if course_name else None)
        await session.commit(); await session.refresh(course)
    except Exception:
        await session.rollback(); raise
    return {"project_id": project_id, "course_id": course.id, "is_fallback": is_fallback, "message": message}
