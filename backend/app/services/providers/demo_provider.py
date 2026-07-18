import asyncio
import json
from pathlib import Path
from typing import Any

from app.schemas.change import CurriculumPR


class DemoProvider:
    """Returns deterministic, pre-computed outputs for the interactive demo."""

    def __init__(self) -> None:
        seed_path = Path(__file__).resolve().parents[3] / "seed_data.json"
        seed_data: dict[str, Any] = json.loads(seed_path.read_text(encoding="utf-8"))
        self._changes = {change["id"]: change for change in seed_data["proposed_changes"]}

    async def propose_change(self, course_id: int, user_prompt: str) -> CurriculumPR:
        _ = course_id
        prompt = user_prompt.lower()
        if "recursion" in prompt or "move" in prompt:
            change = self._changes["pr-001"]
        elif "esl" in prompt or "accessibility" in prompt or "accommodation" in prompt:
            change = self._changes["pr-002"]
        else:
            change = self._changes["pr-003"]

        await asyncio.sleep(1.5)
        return CurriculumPR.model_validate(change)

    async def generate_assessment(self, outcome_text: str) -> dict[str, Any]:
        _ = outcome_text
        await asyncio.sleep(1.5)
        return {
            "title": "Recursion & Call Stack Mastery Quiz",
            "questions": [
                {
                    "question": "Trace a recursive execution",
                    "prompt": "Given factorial(n), trace factorial(4) from the initial call through every stack frame and return value.",
                    "parts": [
                        "Draw the call stack immediately before the base case returns.",
                        "List the return value produced by each frame in order.",
                        "Explain why factorial(0) is an essential base case.",
                    ],
                    "points": 10,
                },
                {
                    "question": "Diagnose recursive correctness",
                    "prompt": "A recursive binary-search implementation never terminates for a target that is absent. Analyze the failure and repair the algorithm.",
                    "parts": [
                        "Identify the missing or incorrect termination condition.",
                        "Provide corrected pseudocode with preconditions and base cases.",
                        "State the time and space complexity of the repaired implementation.",
                    ],
                    "points": 12,
                },
                {
                    "question": "Design a recursive algorithm",
                    "prompt": "Design a recursive function that determines whether a singly linked list is a palindrome without modifying node values.",
                    "parts": [
                        "Define the recursive subproblem and base case.",
                        "Provide clear pseudocode or strongly typed code.",
                        "Explain how the call stack contributes to the solution and discuss complexity trade-offs.",
                    ],
                    "points": 15,
                },
            ],
            "rubric": {
                "total_points": 37,
                "criteria": [
                    {"criterion": "Call stack reasoning", "points": 10, "description": "Accurately represents frames, arguments, and return order."},
                    {"criterion": "Base cases and termination", "points": 10, "description": "Identifies valid base cases and explains termination precisely."},
                    {"criterion": "Algorithmic correctness", "points": 12, "description": "Produces correct logic that handles boundary conditions."},
                    {"criterion": "Complexity and communication", "points": 5, "description": "States justified complexity and communicates the recursive strategy clearly."},
                ],
            },
        }
