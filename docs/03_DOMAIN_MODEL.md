# CurriculumOS Domain Model
Version: 1.0

## Core Entities
1. **Project**: The root container. Represents a curriculum initiative (e.g., "CS Degree 2026").
2. **File**: Raw inputs (PDFs, DOCX) uploaded to a Project.
3. **Course**: The structured educational content belonging to a Project.
4. **Module**: A thematic grouping within a Course.
5. **Lesson**: The atomic unit of instruction within a Module.
6. **LearningOutcome**: Measurable competencies tied to a Module.
7. **CurriculumGraph**: The virtual, dependency-aware representation of the Course.
8. **ChangeRequest (PR)**: A proposed mutation to the Graph, including impact analysis and risk.
9. **Version**: An immutable snapshot of the CurriculumGraph created after a ChangeRequest is approved.
10. **Assessment**: Generated evaluations tied directly to LearningOutcomes.

## Ownership Rules
- A Project owns many Courses, Files, and Versions.
- A Course owns many Modules.
- A Module owns many Lessons and LearningOutcomes.
- Deletions cascade strictly downward.
