from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database.session import get_db
from app.models.course import Course
from app.models.project import Project

router = APIRouter(tags=["courses"])


class CourseCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None


class CourseUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None


def course_payload(course: Course) -> dict[str, int | str | None]:
    return {"id": course.id, "project_id": course.project_id, "title": course.title, "description": course.description, "module_count": len(course.modules)}


@router.get("/projects/{project_id}/courses")
async def list_project_courses(project_id: int, session: AsyncSession = Depends(get_db)) -> list[dict[str, int | str | None]]:
    courses = await session.scalars(select(Course).where(Course.project_id == project_id, Course.is_archived.is_(False)).options(selectinload(Course.modules)).order_by(Course.created_at.asc()))
    return [course_payload(course) for course in courses]


@router.post("/projects/{project_id}/courses", status_code=status.HTTP_201_CREATED)
async def create_project_course(project_id: int, payload: CourseCreateRequest, session: AsyncSession = Depends(get_db)) -> dict[str, int | str | None]:
    project = await session.scalar(select(Project).where(Project.id == project_id, Project.is_archived.is_(False)))
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    course = Course(project_id=project_id, title=payload.title, description=payload.description)
    session.add(course)
    await session.commit()
    await session.refresh(course)
    return {"id": course.id, "project_id": course.project_id, "title": course.title, "description": course.description, "module_count": 0}


@router.patch("/projects/{project_id}/courses/{course_id}")
async def update_project_course(project_id: int, course_id: int, payload: CourseUpdateRequest, session: AsyncSession = Depends(get_db)) -> dict[str, int | str | None]:
    course = await session.scalar(select(Course).where(Course.id == course_id, Course.project_id == project_id, Course.is_archived.is_(False)).options(selectinload(Course.modules)))
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(course, field, value)
    await session.commit()
    await session.refresh(course, attribute_names=["modules"])
    return course_payload(course)


@router.delete("/projects/{project_id}/courses/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
async def archive_project_course(project_id: int, course_id: int, session: AsyncSession = Depends(get_db)) -> Response:
    course = await session.scalar(select(Course).where(Course.id == course_id, Course.project_id == project_id, Course.is_archived.is_(False)))
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    course.is_archived = True
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
