from collections import deque

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.module import Module
from app.models.module_prerequisite import ModulePrerequisite
from app.schemas.change import CurriculumPR


async def build_graph(session: AsyncSession, course_id: int) -> dict[int, list[int]]:
    """Build requires[module_id] = [direct prerequisite IDs]."""
    module_ids = set(await session.scalars(select(Module.id).where(Module.course_id == course_id)))
    requires = {module_id: [] for module_id in module_ids}
    rows = await session.execute(select(ModulePrerequisite.module_id, ModulePrerequisite.requires_module_id).where(ModulePrerequisite.module_id.in_(module_ids)))
    for module_id, prerequisite_id in rows:
        if prerequisite_id in module_ids:
            requires[module_id].append(prerequisite_id)
    return requires


def check_violations(positions: dict[int, int], requires: dict[int, list[int]]) -> list[tuple[int, int]]:
    """A violation means a module appears before one of its required prerequisites."""
    return [(module_id, prerequisite_id) for module_id, prerequisites in requires.items() for prerequisite_id in prerequisites if module_id in positions and prerequisite_id in positions and positions[module_id] < positions[prerequisite_id]]


def affected_modules(changed_id: int, requires: dict[int, list[int]]) -> set[int]:
    """BFS both upstream (prerequisites) and downstream (dependents) from a changed module."""
    dependents: dict[int, list[int]] = {module_id: [] for module_id in requires}
    for module_id, prerequisites in requires.items():
        for prerequisite_id in prerequisites:
            dependents.setdefault(prerequisite_id, []).append(module_id)
    visited = {changed_id}; queue: deque[int] = deque([changed_id])
    while queue:
        module_id = queue.popleft()
        for neighbor in [*requires.get(module_id, []), *dependents.get(module_id, [])]:
            if neighbor not in visited:
                visited.add(neighbor); queue.append(neighbor)
    return visited


async def enrich_proposal_with_graph_facts(session: AsyncSession, course_id: int, user_prompt: str, proposal: CurriculumPR) -> CurriculumPR:
    """Calculate PR impact/risk from persisted prerequisites; callers catch failures for Demo Fortress."""
    modules = list(await session.scalars(select(Module).where(Module.course_id == course_id).order_by(Module.position)))
    if not modules:
        return proposal
    requires = await build_graph(session, course_id)
    prompt = user_prompt.lower()
    mentioned = sorted((module for module in modules if module.title.lower() in prompt), key=lambda module: prompt.index(module.title.lower()))
    if not mentioned:
        return proposal
    changed = mentioned[0]
    proposed_positions = {module.id: module.position for module in modules}
    if len(mentioned) >= 2 and "before" in prompt:
        first, second = mentioned[0], mentioned[1]
        proposed_positions[first.id], proposed_positions[second.id] = proposed_positions[second.id], proposed_positions[first.id]
    violations = check_violations(proposed_positions, requires)
    impacted_ids = affected_modules(changed.id, requires)
    names = {module.id: module.title for module in modules}
    affected_items = [f"Module: {names[module_id]}" for module_id in sorted(impacted_ids, key=lambda module_id: proposed_positions.get(module_id, 0)) if module_id in names]
    risk_level = "high" if violations else "medium" if len(impacted_ids) > 3 else "low"
    return proposal.model_copy(update={"risk_level": risk_level, "affected_items": affected_items})
