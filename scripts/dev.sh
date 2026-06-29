#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Create env files if missing
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi
if [ ! -f frontend/.env.local ]; then
  cp frontend/.env.local.example frontend/.env.local
  echo "Created frontend/.env.local"
fi

echo "Starting PostgreSQL, Redis, Backend API, and AI Worker..."
docker compose up --build -d postgres redis backend worker

echo "Waiting for API to be ready..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:8000/health >/dev/null 2>&1; then
    echo "Backend ready at http://localhost:8000"
    break
  fi
  sleep 1
  if [ "$i" -eq 30 ]; then
    echo "Backend did not start in time. Check: docker compose logs backend"
    exit 1
  fi
done

echo ""
echo "Starting frontend at http://localhost:3000"
echo "API docs: http://localhost:8000/docs"
echo ""
cd frontend
npm install --silent 2>/dev/null || npm install
npm run dev
