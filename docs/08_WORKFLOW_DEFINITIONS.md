# Workflow Definitions
Version: 1.0

## 1. Curriculum Ingestion
Upload File $\rightarrow$ Extract Text $\rightarrow$ AI Gateway $\rightarrow$ Validate $\rightarrow$ Persist Graph.

## 2. Curriculum Change (The Hero Flow)
User Request $\rightarrow$ AI Gateway analyzes Graph $\rightarrow$ Generate ChangeRequest (PR) $\rightarrow$ User Reviews Diff $\rightarrow$ User Approves $\rightarrow$ Apply Mutation $\rightarrow$ Create Version $\rightarrow$ Refresh UI.

## 3. Assessment Generation
Select LearningOutcome $\rightarrow$ AI Gateway $\rightarrow$ Generate Questions/Rubric $\rightarrow$ Attach to Graph Node.
