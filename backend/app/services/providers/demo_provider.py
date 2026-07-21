import asyncio
import json
from pathlib import Path
from typing import Any

from app.schemas.change import CurriculumPR


class DemoProvider:
    """Deterministic demo outputs that are tailored to persisted curriculum context."""

    def __init__(self) -> None:
        seed_path = Path(__file__).resolve().parents[3] / "seed_data.json"
        seed_data: dict[str, Any] = json.loads(seed_path.read_text(encoding="utf-8"))
        self._changes = {change["id"]: change for change in seed_data["proposed_changes"]}

    async def propose_change(self, course_id: int, user_prompt: str) -> CurriculumPR:
        _ = course_id
        prompt = user_prompt.lower()
        await asyncio.sleep(1.5)
        if "merge" in prompt:
            return CurriculumPR(
                summary="Merge curriculum modules",
                risk_level="medium",
                affected_items=[
                    "Module: Data Structures",
                    "Module: Algorithms",
                    "Lessons and outcomes in both modules",
                ],
                generated_diff=(
                    "~ Modules Data Structures + Algorithms -> Foundations\n"
                    "+ Combined lessons and learning outcomes\n"
                    "~ Recalculated prerequisite relationships"
                ),
            )
        if "big o" in prompt and ("add" in prompt or "lesson" in prompt):
            return CurriculumPR(
                summary="Add Big O Notation lesson",
                risk_level="low",
                affected_items=["Module: Algorithms", "New lesson: Big O Notation"],
                generated_diff=(
                    "+ New Lesson: Big O Notation\n"
                    "  Module: Algorithms\n"
                    "+ Learning activities for asymptotic analysis"
                ),
            )
        if "remove" in prompt:
            return CurriculumPR(
                summary="Remove requested curriculum item",
                risk_level="high",
                affected_items=[
                    "Requested curriculum item",
                    "Dependent module relationships",
                ],
                generated_diff=(
                    "- Removed requested curriculum item\n"
                    "! Review downstream prerequisite relationships"
                ),
            )
        if "recursion" in prompt or "move" in prompt:
            change = self._changes["pr-001"]
        elif "esl" in prompt or "accessibility" in prompt or "accommodation" in prompt:
            change = self._changes["pr-002"]
        else:
            change = self._changes["pr-003"]
        return CurriculumPR.model_validate(change)

    async def generate_assessment(
        self,
        *,
        scope: str,
        target_title: str,
        target_description: str,
        context_items: list[str],
    ) -> dict[str, Any]:
        """Build a rich demo assessment from the exact curriculum context supplied by the API."""
        await asyncio.sleep(1.5)
        topics = [item.strip() for item in context_items if item and item.strip()] or [target_title]
        primary = topics[0]
        secondary = topics[1] if len(topics) > 1 else primary
        tertiary = topics[2] if len(topics) > 2 else secondary
        scope_label = {"outcome": "Outcome Quiz", "module": "Module Assessment", "course": "Final Examination"}.get(scope, "Assessment")
        description = target_description.strip() or f"Curriculum content focused on {target_title}."

        return {
            "title": f"{target_title} {scope_label}",
            "questions": [
                {
                    "question": f"Explain {primary} within {target_title}",
                    "prompt": (
                        f"Using the curriculum context for {target_title}, explain the purpose and practical "
                        f"application of '{primary}'. Ground your answer in this target: {description}"
                    ),
                    "parts": [
                        f"Define '{primary}' precisely in the context of {target_title}.",
                        f"Provide a concrete example that demonstrates '{primary}'.",
                        f"Identify one misconception a learner may have about '{primary}' and correct it.",
                    ],
                    "points": 12,
                },
                {
                    "question": f"Apply {primary} and {secondary}",
                    "prompt": (
                        f"Design a realistic solution, explanation, or workflow for {target_title} that requires "
                        f"learners to use both '{primary}' and '{secondary}'."
                    ),
                    "parts": [
                        f"State the problem or scenario in which '{primary}' is needed.",
                        f"Show how '{secondary}' shapes your solution.",
                        "Justify the final decision using accurate domain reasoning.",
                    ],
                    "points": 14,
                },
                {
                    "question": f"Evaluate mastery across {target_title}",
                    "prompt": (
                        f"Evaluate a proposed learner response involving '{tertiary}' and determine whether it meets "
                        f"the stated expectations for {target_title}."
                    ),
                    "parts": [
                        f"Identify evidence of understanding for '{tertiary}'.",
                        f"Explain one improvement using '{primary}'.",
                        "Describe how you would verify the revised response is correct.",
                    ],
                    "points": 14,
                },
            ],
            "rubric": {
                "total_points": 40,
                "criteria": [
                    {
                        "criterion": f"Conceptual understanding of {primary}",
                        "points": 12,
                        "description": f"Accurately explains and applies '{primary}' in the context of {target_title}.",
                    },
                    {
                        "criterion": f"Integration of {secondary}",
                        "points": 14,
                        "description": f"Connects '{secondary}' to the target's real curriculum task with justified reasoning.",
                    },
                    {
                        "criterion": f"Evidence-based evaluation of {tertiary}",
                        "points": 10,
                        "description": f"Uses '{tertiary}' to evaluate correctness and propose a meaningful improvement.",
                    },
                    {
                        "criterion": f"Communication for {target_title}",
                        "points": 4,
                        "description": "Communicates a clear, precise, and well-structured response.",
                    },
                ],
            },
        }
