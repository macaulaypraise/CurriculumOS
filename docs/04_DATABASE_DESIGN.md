# Database Design
Version: 1.0

## Engine & ORM
- **Database**: PostgreSQL 16
- **ORM**: SQLAlchemy 2.0 (Async)
- **Migrations**: Alembic (Async `env.py`)

## Core Tables
- `projects`: id, name, description, created_at, updated_at
- `courses`: id, project_id (FK), title, description
- `modules`: id, course_id (FK), title, position
- `lessons`: id, module_id (FK), title, description, position
- `learning_outcomes`: id, module_id (FK), statement, position
- `curriculum_changes`: id, course_id (FK), summary, risk_level, affected_items (JSONB), generated_diff, status (pending/approved)
- `curriculum_versions`: id, project_id (FK), snapshot (JSONB), description, created_at

## Rules
- All major entities require `created_at` and `updated_at`.
- Use `JSONB` for graph snapshots and diffs to allow flexible querying.
- Prefer soft deletes for `Courses` and `Modules`.
