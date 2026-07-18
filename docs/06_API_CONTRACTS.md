# API Contracts
Version: 1.0

## Conventions
- All endpoints use Pydantic v2 for Request/Response validation.
- Async handlers only.
- BYOK (Bring Your Own Key) passed via `X-OpenAI-Key` header.

## Core Endpoints
- `GET /projects`: List projects.
- `POST /projects`: Create project.
- `GET /projects/{id}/graph`: Fetch the curriculum graph.
- `POST /projects/{id}/changes`: Propose a curriculum change (triggers AI Gateway).
- `POST /projects/{id}/changes/{change_id}/approve`: Approve change, mutate graph, create Version.
- `GET /projects/{id}/versions`: List version history.
