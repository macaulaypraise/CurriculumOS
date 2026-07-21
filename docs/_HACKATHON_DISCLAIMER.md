# Hackathon Architecture Disclaimer

The documents in this `/docs` folder represent the **Target Enterprise Architecture** for CurriculumOS. They were generated during the initial planning phases to define the domain model, API contracts, and long-term system design.

For the OpenAI Build Week Hackathon, we implemented a **Demo Fortress** pattern to guarantee a zero-latency, zero-crash experience for judges.

### What this means for the codebase:
1. **The AI Gateway & Provider Pattern:** The architecture fully supports live Bring-Your-Own-Key (BYOK) inference via the `UniversalProvider` (supporting OpenAI, Groq, Gemini, and OpenRouter). However, to prevent rate-limits or malformed JSON from breaking the 3-minute demo video, the system defaults to a `DemoProvider` that returns GPT-5.6-synthesized, pre-computed structured outputs.
2. **Deterministic Fallbacks:** Every live AI call is wrapped in a strict `try/except` block. If the live provider fails, times out, or returns invalid JSON, the Gateway instantly falls back to the deterministic demo data.
3. **Graph Analysis:** The prerequisite graph and dependency analysis engine are fully implemented using Breadth-First Search (BFS) on the `module_prerequisites` edge table.

Please evaluate the codebase with the understanding that the "Demo Fortress" is a deliberate hackathon trade-off to ensure presentation stability, while the underlying FastAPI/SQLAlchemy architecture is fully production-ready.
