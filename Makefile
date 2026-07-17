.PHONY: start stop db

start:
	@echo "🚀 Starting CurriculumOS Stack..."
	@cd backend && docker compose up -d || cd backend && docker-compose up -d
	@echo "⏳ Waiting for PostgreSQL to be ready..."
	@sleep 3
	@echo "🗄️ Running Database Migrations..."
	@cd backend && uv run alembic upgrade head
	@echo "🐍 Starting FastAPI Backend (Background)..."
	@cd backend && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 > backend.log 2>&1 &
	@echo "⚛️  Starting React Frontend (Background)..."
	@cd frontend && npm run dev > frontend.log 2>&1 &
	@echo "✅ CurriculumOS is live at http://localhost:5173"

stop:
	@echo "🛑 Stopping CurriculumOS..."
	@pkill -f "uvicorn app.main" || true
	@pkill -f "vite" || true
	@cd backend && docker compose down || cd backend && docker-compose down
	@echo "✅ Stack stopped."
