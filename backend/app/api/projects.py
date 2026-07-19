from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.dependencies import get_openai_key
from app.database.session import get_db
from app.models.course import Course
from app.models.module import Module
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=list[ProjectResponse])
async def list_projects(session: AsyncSession = Depends(get_db)) -> list[Project]:
    result = await session.scalars(select(Project).where(Project.is_archived.is_(False)).order_by(Project.created_at.desc()))
    return list(result)


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(payload: ProjectCreate, session: AsyncSession = Depends(get_db)) -> Project:
    project = Project(name=payload.name, description=payload.description)
    session.add(project)
    await session.commit()
    await session.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: int, session: AsyncSession = Depends(get_db)) -> Project:
    project = await session.scalar(select(Project).where(Project.id == project_id, Project.is_archived.is_(False)))
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: int, payload: ProjectUpdate, session: AsyncSession = Depends(get_db)) -> Project:
    project = await session.scalar(select(Project).where(Project.id == project_id, Project.is_archived.is_(False)))
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    await session.commit()
    await session.refresh(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def archive_project(project_id: int, session: AsyncSession = Depends(get_db)) -> Response:
    project = await session.scalar(select(Project).where(Project.id == project_id, Project.is_archived.is_(False)))
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    project.is_archived = True
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{project_id}/graph")
async def get_project_graph(project_id: int, session: AsyncSession = Depends(get_db), api_key: str | None = Depends(get_openai_key)) -> dict[str, object]:
    course = await session.scalar(select(Course).where(Course.project_id == project_id, Course.is_archived.is_(False)).options(selectinload(Course.modules).selectinload(Module.lessons), selectinload(Course.modules).selectinload(Module.learning_outcomes)).order_by(Course.id))
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project curriculum not found")
    return {"id": course.id, "title": course.title, "description": course.description, "modules": [{"id": module.id, "title": module.title, "description": module.description, "position": module.position, "lessons": [{"id": lesson.id, "title": lesson.title, "description": lesson.description, "position": lesson.position} for lesson in sorted(module.lessons, key=lambda item: item.position)], "learning_outcomes": [{"id": outcome.id, "statement": outcome.statement} for outcome in module.learning_outcomes]} for module in sorted(course.modules, key=lambda item: item.position)], "is_demo_mode": api_key is None}
