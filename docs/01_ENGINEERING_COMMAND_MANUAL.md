# CurriculumOS Engineering Command Manual

Version: 1.0

Audience:

- Codex
- Qwen
- Frontend Engineers
- Backend Engineers
- Future Contributors

Purpose:

Define how CurriculumOS must be built, extended, and maintained.

This document is the engineering contract.


---

# 0. Instructions For AI Coding Agents


Before changing code:


Read:


/docs/00_PRODUCT_VISION.md

/docs/01_ENGINEERING_COMMAND_MANUAL.md

/docs/02_SYSTEM_ARCHITECTURE.md


Then:


1. Understand existing architecture.

2. Identify correct service owner.

3. Implement without bypassing domain rules.

4. Add validation.

5. Add error handling.

6. Explain architectural impact.


Do not create temporary solutions that violate the architecture.


---

# 1. Core Engineering Principles

## Principle 1: Protect the Domain Model

Do not create features that bypass the CurriculumOS domain model.

Everything must connect through:

Project

↓

Curriculum Graph

↓

Changes

↓

Versions


---

## Principle 2: Business Logic Lives in Services

API routes are not allowed to contain business logic.

Bad:


POST /changes

    analyze graph

    calculate risk

    update database


Good:


API Route

↓

ChangeService

↓

GraphService

↓

VersionService


---

## Principle 3: Frontend Does Not Own Business Logic

React components display state.

They do not:

- calculate curriculum impact
- generate changes
- transform AI output
- manage database rules


---

# 2. Backend Rules


## Rule 1 — Every Endpoint Requires Validation


Bad:


@app.post("/course")
async def create(data):
    pass


Good:


@app.post("/course")
async def create_course(
    course: CourseCreate
):
    pass


Everything must use:

- Pydantic request models
- Pydantic response models


---

# Rule 2 — Never Trust AI Output


AI output pipeline:


GPT Response

↓

Pydantic Validation

↓

Business Validation

↓

Database

↓

Frontend


Never:


GPT

↓

Database


---

Example:


class CurriculumChange(BaseModel):

    summary: str

    affected_items: list[str]

    risk: Literal[
        "low",
        "medium",
        "high"
    ]


Invalid output must trigger:


AI generation failed validation.

Retrying...


---

# Rule 3 — All AI Calls Require Protection


Every AI request requires:


Timeout

↓

Retry

↓

Fallback


Example:


try:

    AI request


timeout:

    retry once


failure:

    return previous valid state


---

# Rule 4 — Async Everywhere


Avoid blocking operations.


Bad:


requests.post()


Good:


async_client.post()


Database operations must use async patterns.

---

# Rule 5 — Database Safety


Every database mutation requires:


BEGIN TRANSACTION

↓

Update

↓

Validate

↓

Commit


Failure:


Rollback


Never leave partial curriculum updates.


Bad:


Update lesson

FAIL

Assessment unchanged


Good:


BEGIN

Update lesson

Update assessment

Commit


---

# 3. AI Engineering Rules


## AI Provider Pattern


Never directly call OpenAI inside business services.


Bad:


ChangeService

↓

OpenAI API


Good:


ChangeService

↓

AI Gateway

↓

AI Provider


---

Providers:


DemoProvider

OpenAIProvider


Both must implement identical interfaces.


---

## AI Output Contracts


Every AI workflow requires:


Input Schema

Prompt

Output Schema

Validator

Fallback


---

## AI Retry Policy


Default:


Attempt 1:

Primary generation


Attempt 2:

Retry with correction prompt


Attempt 3:

Use fallback


Do not endlessly retry.


---

# 4. Database Rules


## Every Major Entity Needs:


created_at

updated_at


---

## Deletions


Prefer:


soft delete


over:


hard delete


for important curriculum objects.


---

## Relationships


Projects own curriculum.

Curriculum owns dependencies.

Dependencies drive impact analysis.


---

# 5. Frontend Rules


## Component Structure


Components should be:


Small

Reusable

Domain-focused


Example:


components/


graph/

    CurriculumNode.tsx

    DependencyEdge.tsx


changes/

    PullRequestCard.tsx

    RiskBadge.tsx


assessment/

    AssessmentCard.tsx


---

# 6. State Management Rules


Use:


TanStack Query

for:

- server state
- API data
- caching


Use:


Context

for:

- application mode
- user settings


Do not introduce Redux unless complexity requires it.


---

# 7. Navigation Rules


Every screen must belong to a workflow.


Primary navigation:


Projects

↓

Workspace


Workspace:


Overview

Curriculum

Assessments

Files

Changes

History

Settings


---

# 8. Demo Mode Rules


Demo Mode is not a hack.

It is a supported product mode.


Requirements:


- Same UI as Live Mode
- Same API contracts
- Same data models


Only provider changes.


Example:


Demo:

ChangeService

↓

DemoProvider


Live:

ChangeService

↓

OpenAIProvider


---

# 9. Version Control Rules


Every approved curriculum modification creates:


CurriculumVersion


Contains:


snapshot

changes

timestamp

metadata


---

# 10. Testing Requirements


Minimum:


Backend:


- Schema validation tests
- Service tests
- AI fallback tests


Frontend:


- Component rendering
- Workflow tests


---

# 11. Git Rules


Commit messages:


feat:

new capability


fix:

bug correction


refactor:

architecture improvement


docs:

documentation


Example:


feat: add curriculum version snapshots


---

# 12. Code Review Checklist


Before merging:


Architecture:


□ Does this follow the domain model?


□ Does this preserve Graph as source of truth?


□ Does this belong in the correct service?


AI:


□ Is output validated?


□ Is fallback available?


Database:


□ Are transactions safe?


Frontend:


□ Is business logic avoided?


Product:


□ Does this improve the user workflow?


---

# 13. Current Hackathon Priority Order


Do not build randomly.


Priority:


## Priority 1

Make Demo Experience Perfect


## Priority 2

Real Curriculum Change Workflow


Approve

↓

Version

↓

Updated Graph


## Priority 3

Assessment Compiler


## Priority 4

Live AI Provider


## Priority 5

Analytics / Debugger


---

# Final Engineering Principle


Every feature should make CurriculumOS feel more like:

"GitHub for curriculum"


and less like:

"ChatGPT with education prompts."


---

> **CRITICAL FILE MANAGEMENT RULE:**
> You must overwrite existing files directly. Do NOT create `.new`, `.bak`, `.copy`, or duplicate files. If a file needs updating, replace its contents entirely. Clean up after yourself.
