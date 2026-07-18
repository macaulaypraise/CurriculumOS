# AI Architecture
Version: 1.0

## The AI Gateway
Business services NEVER call OpenAI directly. They call the `AIGateway`.

## Provider Pattern
The Gateway routes requests to a Provider based on configuration:
1. **DemoProvider**: Returns pre-computed, highly realistic JSON scenarios from `seed_data.json`. Used for judging, offline mode, and testing.
2. **OpenAIProvider**: Makes live API calls using GPT-5.6 Structured Outputs.

## The AI Pipeline
1. **Prompting**: Context + User Request + Pydantic Schema.
2. **Generation**: LLM generates JSON.
3. **Validation**: Pydantic strictly validates the output.
4. **Retry/Fallback**: On failure, retry once. On second failure, fallback to previous valid state or DemoProvider.
5. **Persistence**: Only validated data reaches the database.
