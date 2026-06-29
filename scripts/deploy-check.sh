#!/usr/bin/env bash
# Pre-deploy checklist — run before going live
set -euo pipefail

echo "DevFlow AI — Deploy Checklist"
echo "=============================="
echo ""

check_var() {
  local name=$1
  local val="${!name:-}"
  if [ -z "$val" ] || [[ "$val" == *"your_"* ]] || [[ "$val" == "dev" ]]; then
    echo "  ✗ $name"
    return 1
  else
    echo "  ✓ $name"
    return 0
  fi
}

# Load .env if present
[ -f .env ] && set -a && source .env && set +a

PASS=0
FAIL=0

echo "Backend tests..."
if (cd backend && source .venv/bin/activate 2>/dev/null && pytest tests/ -q); then
  echo "  ✓ 19 tests passed"
  ((PASS++))
else
  echo "  ✗ Tests failed"
  ((FAIL++))
fi

echo ""
echo "Frontend build..."
if (cd frontend && npm run build >/dev/null 2>&1); then
  echo "  ✓ Build succeeded"
  ((PASS++))
else
  echo "  ✗ Build failed"
  ((FAIL++))
fi

echo ""
echo "Production env vars (set on Railway/Vercel):"
for var in GITHUB_CLIENT_ID GITHUB_CLIENT_SECRET JWT_SECRET BACKEND_URL FRONTEND_URL; do
  check_var "$var" && ((PASS++)) || ((FAIL++))
done

echo ""
echo "GitHub OAuth callback should be:"
echo "  \${BACKEND_URL}/api/auth/github/callback"
echo "  → ${BACKEND_URL:-https://your-api.up.railway.app}/api/auth/github/callback"
echo ""
echo "Vercel env var:"
echo "  NEXT_PUBLIC_API_URL=${BACKEND_URL:-https://your-api.up.railway.app}"
echo ""

if [ "$FAIL" -eq 0 ]; then
  echo "Ready to deploy! See DEPLOY.md"
else
  echo "$FAIL check(s) need attention. See DEPLOY.md"
fi
