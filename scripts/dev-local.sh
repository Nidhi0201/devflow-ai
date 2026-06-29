#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

free_port() {
  local port=$1
  local pids
  pids=$(lsof -ti ":$port" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "Stopping existing process on port $port..."
    kill $pids 2>/dev/null || true
    sleep 1
  fi
}

# Env files
[ -f .env ] || cp .env.example .env
[ -f frontend/.env.local ] || cp frontend/.env.local.example frontend/.env.local

# Backend venv
if [ ! -d backend/.venv ]; then
  echo "Creating Python virtual environment..."
  python3 -m venv backend/.venv
fi
# shellcheck disable=SC1091
source backend/.venv/bin/activate
pip install -q -r backend/requirements.txt

# Frontend deps
(cd frontend && npm install --silent 2>/dev/null || npm install)

# Load .env into this shell
set -a
# shellcheck disable=SC1091
source .env
set +a

export DATABASE_URL="${DATABASE_URL:-sqlite:///./devflow.db}"
export REDIS_URL="${REDIS_URL:-redis://localhost:6379/0}"
export FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"
export BACKEND_URL="${BACKEND_URL:-http://localhost:8000}"
export JWT_SECRET="${JWT_SECRET:-dev-local-secret}"
export ALLOW_DEMO_LOGIN="${ALLOW_DEMO_LOGIN:-true}"

free_port 8000
free_port 3000

cleanup() {
  echo ""
  echo "Stopping servers..."
  kill "$BACKEND_PID" 2>/dev/null || true
  kill "$FRONTEND_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Starting backend at http://localhost:8000"
(
  cd backend
  export DATABASE_URL REDIS_URL FRONTEND_URL BACKEND_URL JWT_SECRET ALLOW_DEMO_LOGIN
  export GITHUB_CLIENT_ID GITHUB_CLIENT_SECRET GITHUB_WEBHOOK_SECRET OPENAI_API_KEY
  uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
) &
BACKEND_PID=$!

echo "Waiting for backend..."
for i in $(seq 1 30); do
  if curl -sf http://127.0.0.1:8000/health >/dev/null 2>&1; then
    echo "Backend ready."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "ERROR: Backend failed to start. Check the output above."
    exit 1
  fi
  sleep 1
done

echo "Starting frontend at http://localhost:3000"
(cd frontend && npm run dev) &
FRONTEND_PID=$!

echo ""
echo "============================================"
echo "  DevFlow AI is running"
echo ""
echo "  App:  http://localhost:3000"
echo "  API:  http://localhost:8000"
echo "  Demo: http://localhost:8000/api/auth/demo"
echo "============================================"
echo "Press Ctrl+C to stop."
echo ""

wait
