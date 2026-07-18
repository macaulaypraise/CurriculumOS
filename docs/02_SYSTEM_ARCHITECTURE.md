# CurriculumOS System Architecture

Version: 1.0

---

# 1. Architecture Philosophy

CurriculumOS follows a domain-driven architecture.

The system is organized around educational concepts, not technical layers.

The central entity is the Project.

---

# 2. High-Level Architecture


Frontend

↓

API Layer

↓

Domain Services

↓

Database

↓

AI Gateway


---

# 3. Core Domain Model


Project

|

├── Files

├── Course

├── Curriculum Graph

├── Assessments

├── Change Requests

├── Versions

├── Activity Events

└── Exports


---

# 4. Source of Truth


The Curriculum Graph is the central model.

Everything derives from it.


Files

↓

Extraction

↓

Curriculum Graph

↓

Assessments

↓

Changes

↓

Versions

---

# 5. Backend Services


## Project Service

Owns:

- project lifecycle
- metadata
- settings


---

## File Service

Owns:

- uploads
- storage
- file metadata


---

## Curriculum Service

Owns:

- courses
- modules
- lessons
- outcomes


---

## Graph Service

Owns:

- dependencies
- relationships
- graph transformations


---

## Change Service

Owns:

- curriculum pull requests
- impact analysis
- approval workflow


---

## Version Service

Owns:

- snapshots
- rollback
- history


---

## Assessment Service

Owns:

- exams
- rubrics
- generated materials


---

## AI Gateway

Owns:

- AI provider selection
- prompting
- validation
- retries


---

# 6. AI Architecture


Request

↓

AI Gateway

↓

Provider


Demo Provider

or

OpenAI Provider


↓

Structured Output Validation

↓

Database


---

# 7. Provider Pattern


The system must support:


DemoProvider

Used for:

- testing
- judging
- offline operation


OpenAIProvider

Used for:

- real generation
- customer workflows


Both implement the same interface.


---

# 8. Change Workflow


User Request

↓

AI Analysis

↓

Curriculum Change Request

↓

Human Approval

↓

Version Creation

↓

Graph Update


---

# 9. Version Model


Every approved change creates:


Version

- snapshot
- description
- timestamp
- author


---

# 10. Frontend Architecture


Pages:


Landing

Projects

Workspace


Workspace contains:


Overview

Curriculum

Assessments

Files

Changes

History

Settings


---

# 11. Demo Architecture


Demo Mode is a first-class product mode.

The user experience is identical.

Only the data provider changes.


Frontend

↓

API

↓

Provider Interface

↓

Demo/OpenAI


---

# 12. Reliability Rules


No AI request may:

- block indefinitely
- bypass validation
- directly write to database


Every AI operation requires:


Timeout

Retry

Fallback

Validation
