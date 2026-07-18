# CurriculumOS

> **Software engineers stopped managing code as documents decades ago. CurriculumOS brings software engineering principles—version control, dependency analysis, and pull requests—to curriculum development.**

CurriculumOS is an education-engineering workspace for designing, analyzing, and evolving curricula as connected systems rather than static documents. Built for the OpenAI Build Week Hackathon Education Track, it turns a course into a navigable dependency graph, lets curriculum teams propose changes as reviewable pull requests, compiles assessments directly from learning outcomes, and records every important decision as immutable history.

## Why CurriculumOS

Curriculum change is high-stakes systems work. Moving a topic can invalidate prerequisites, assessments, learning outcomes, and teaching plans—but most teams still manage that work through disconnected documents and spreadsheets. CurriculumOS makes these relationships explicit so curriculum teams can inspect impact before approving a change.

## Core Features

### Curriculum Graph

Visualize the curriculum as a connected graph of modules, lessons, and learning outcomes. The graph is the source of truth for downstream engineering work, including change analysis and assessment generation.

### Curriculum Pull Requests

Describe a proposed change in natural language, such as “Move recursion before trees.” CurriculumOS returns a structured pull request containing a summary, risk level, affected items, and a human-readable diff. Approval creates a new immutable curriculum version.

### Assessment Compiler

Generate assessments directly from learning outcomes, never from generic prompts detached from the curriculum. The Assessment Compiler produces a structured quiz and grading rubric, stores both as JSONB, and links the result to the source learning outcome.

### Version History and Activity Feed

Every approved curriculum change becomes a versioned snapshot. Every significant action—including assessment generation—creates an activity event, giving teams an auditable timeline of how a curriculum evolved.

## Architecture

### Project-Centric Workspace

`Project` is the root domain entity. A project owns one or more courses; a course owns modules; modules own lessons and learning outcomes. Versions, assessments, and activity events are all scoped to a project, enabling a coherent workspace instead of a collection of isolated course documents.

```text
Project
├── Course
│   └── Modules
│       ├── Lessons
│       └── Learning Outcomes
├── Curriculum Versions
├── Assessments
└── Activity Events
```

### Backend

- **FastAPI** provides typed, async APIs.
- **PostgreSQL 16** stores relational curriculum data and JSONB snapshots, questions, and rubrics.
- **SQLAlchemy 2.0 async** manages persistence.
- **Alembic** owns schema migrations.
- **React + TypeScript + Tailwind + React Flow + TanStack Query** power the workspace UI.

### AI Gateway and Provider Pattern

All AI-facing capabilities go through `AIGateway`, not directly through endpoints or frontend components. The gateway selects a provider while preserving the same structured API contract:

```text
API Route → AIGateway → DemoProvider | OpenAIProvider
```

- **DemoProvider** returns validated, deterministic, pre-computed structured outputs.
- **OpenAIProvider** is the live-provider boundary for BYOK usage.
- Both providers return the same shapes for Curriculum Pull Requests and generated assessments.

### BYOK Enterprise Architecture

CurriculumOS supports **Bring Your Own Key**. A user may supply an `X-OpenAI-Key` header from the workspace settings; the backend resolves it before falling back to server-side configuration. The frontend automatically attaches a locally stored key to requests, while the backend retains control over provider selection and data persistence.

## How We Used Codex and GPT-5.6

### Codex: Implementation Engineer

Codex acted as the Implementation Engineer for tightly scoped, architecture-driven sprints. Each sprint followed the project’s `/docs` Engineering Playbook: establish the domain change, implement the database and API contract, preserve protected registry files, then wire the corresponding workspace surface. Codex was used to build the FastAPI/SQLAlchemy models, provider gateway, routers, React workspace tabs, and the integration paths between them.

### GPT-5.6: Offline Curriculum Engineer

GPT-5.6, accessed through Codex, acted as an Offline Curriculum Engineer to synthesize the academically rigorous demo material in `seed_data.json`. It produced the Advanced Computer Science dependency graph, realistic learning outcomes, structural curriculum-change analyses, risk assessments, affected-item lists, diffs, and assessment scenarios. This let the product demonstrate authentic curriculum-engineering reasoning without relying on a fragile live call during judging.

### The Demo Fortress

The AI Gateway and `DemoProvider` form a deliberate **Demo Fortress**. Pre-computed GPT-5.6 scenarios provide a zero-latency, zero-crash path for judges while preserving the exact request and response contracts used by the live `OpenAIProvider`. The result is complete transparency: the workspace clearly identifies Demo Mode, yet every workflow—proposal generation, approval, versioning, and assessment compilation—runs through the same real application architecture and persistence layer.

## Local Setup

### Prerequisites

- Docker Desktop, with Docker Compose available
- Python managed with [`uv`](https://docs.astral.sh/uv/)
- Node.js and npm

### One-Command Startup

From the repository root:

```bash
make start
```

`make start` is the intended local entry point for launching the CurriculumOS stack. Docker PostgreSQL must be available locally; the database service uses PostgreSQL 16 through `docker-compose.yml`.

### Initialize the Database and Demo Workspace

After the stack is available, apply migrations and seed the deterministic demo project:

```bash
cd backend
uv run alembic upgrade head
uv run python seed_db.py
```

The seeder creates the **Computer Science Degree Revision** project, its Advanced Computer Science curriculum graph, an initial curriculum version, a seeded assessment, and initial activity events.

### Development URLs

- Frontend: `http://localhost:5173`
- Backend API and Swagger: `http://localhost:8000/docs`
- PostgreSQL: `localhost:5432`

## Demo Flow

1. Open the Interactive Demo workspace.
2. Inspect the Curriculum Graph and its module, lesson, and learning-outcome structure.
3. Propose a curriculum change such as “Move recursion before trees.”
4. Review the generated Curriculum Pull Request, risk level, impact list, and diff.
5. Approve the change to create an immutable version and activity event.
6. Open Assessments to inspect the seeded quiz or generate a new outcome-aligned assessment.
7. Open Overview or History to see the project’s evolving audit trail.

## Codex Session ID: [INSERT YOUR /feedback SESSION ID HERE]
