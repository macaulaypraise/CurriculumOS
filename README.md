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


## Challenges We Ran Into
* **The "Silent Swallow" Trap:** Our mutation engine's `try/except` block was catching database errors, rolling back, but *silently continuing* to save a new version of the unchanged graph. The UI showed "Success!" while nothing changed. Forcing the backend to throw loud 400 errors was a massive debugging breakthrough.
* **The Pydantic ID-Stripping Illusion:** We spent hours debugging why the React Flow graph wouldn't render new nodes after a successful mutation. Our Pydantic serialization layer was omitting the `id` fields, causing React Flow to receive `undefined` IDs and silently reject the nodes.
* **Agentic File-Sync Hallucinations:** Working with Codex in a WSL environment led to scenarios where the agent claimed a fix was applied, but the disk was untouched. This taught me to rigorously verify the actual artifact on disk rather than trusting the agent's chat output.

### BYOK Enterprise Architecture

CurriculumOS supports **Bring Your Own Key**. A user may supply an `X-OpenAI-Key` header from the workspace settings; the backend resolves it before falling back to server-side configuration. The frontend automatically attaches a locally stored key to requests, while the backend retains control over provider selection and data persistence.

## How We Used Codex and GPT-5.6

### Codex: The Autonomous Pair-Programmer
I treated Codex as my autonomous engineer, but I quickly learned that my job had to shift from "writing code" to "designing the harness." AI agents are incredible, but they are terrible at knowing when they've failed silently.

Early on, Codex would confidently report "I fixed the endpoint," but the file on my WSL environment was completely untouched. I also had to enforce a strict "Demo Fortress" pattern—wrapping every live AI call in deterministic fallbacks—because without strict architectural constraints, the agent would hallucinate success states or let API latency ruin the demo. By feeding Codex tightly scoped, multi-file tickets (e.g., "Wire the course_id through the approval flow and preserve the Demo Fortress fallback"), we shipped a 3-tier SaaS backend, Alembic migrations, and a complex mutation engine in a single weekend.

### GPT-5.6: The Context-Aware Curriculum Engine
GPT-5.6 is the brain behind the "Assessment Compiler" and the topological risk analysis. Instead of feeding it generic prompts, the custom AI Gateway forces GPT-5.6 to read the live PostgreSQL context. If a teacher asks for a "Module Exam" on *CSS & Responsive Design*, GPT-5.6 reads the database, understands the specific lessons (Flexbox, Grid, Media Queries), and generates a highly tailored rubric and exam scoped exactly to those outcomes.

### The Demo Fortress
To guarantee zero-latency and zero-crash presentations, we built a "Demo Fortress." If no OpenAI API key is provided, the AI Gateway seamlessly routes requests to a `DemoProvider`. This provider uses string interpolation against the live database records to generate context-aware, deterministic JSON responses. The workspace clearly identifies Demo Mode, but every workflow runs through the exact same real application architecture.

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

## Codex Session ID: [019f6fc9-59fe-7431-9e02-ac5ab6ad08f7]
