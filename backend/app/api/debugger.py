from fastapi import APIRouter

router = APIRouter(tags=["debugger"])


@router.post("/projects/{project_id}/debugger/diagnose")
async def diagnose_project(project_id: int) -> dict[str, str]:
    return {
        "root_cause": "Missing prerequisite: Call-stack fluency.",
        "recommendation": "Move Recursion before Trees",
        "affected_module": "Trees",
    }
