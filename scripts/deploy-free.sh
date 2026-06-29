#!/usr/bin/env bash
# Free deploy helper — Vercel + Neon + Koyeb (no credit card)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "╔══════════════════════════════════════════════════╗"
echo "║  DevFlow AI — Free Deploy (Vercel + Neon + Koyeb) ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ── 1. GitHub ─────────────────────────────────────────
echo "▶ Step 1: Push to GitHub"
if git diff --quiet && git diff --cached --quiet; then
  echo "  ✓ Working tree clean"
else
  echo "  Committing changes..."
  git add -A
  git commit -m "Deploy: free tier Vercel + Neon + Koyeb"
fi
git push origin main
echo "  ✓ Pushed to origin/main"
echo ""

# ── 2. Neon ───────────────────────────────────────────
echo "▶ Step 2: Neon database"
echo "  1. Open https://console.neon.tech → New Project → name: devflow"
echo "  2. Copy the connection string (postgresql://...)"
echo ""
read -r -p "  Paste DATABASE_URL here: " DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo "  ✗ DATABASE_URL required"; exit 1
fi
echo ""

# ── 3. Secrets ────────────────────────────────────────
echo "▶ Step 3: Production secrets"
read -r -p "  GITHUB_CLIENT_ID: " GITHUB_CLIENT_ID
read -r -p "  GITHUB_CLIENT_SECRET: " GITHUB_CLIENT_SECRET
read -r -p "  OPENAI_API_KEY (optional, press Enter to skip): " OPENAI_API_KEY

JWT_SECRET=$(openssl rand -hex 32)
WEBHOOK_SECRET=$(openssl rand -hex 16)
echo "  ✓ Generated JWT_SECRET and GITHUB_WEBHOOK_SECRET"
echo ""

# ── 4. Vercel frontend ────────────────────────────────
echo "▶ Step 4: Deploy frontend to Vercel"
if ! command -v vercel &>/dev/null; then
  echo "  Installing Vercel CLI..."
  npm i -g vercel
fi

cd frontend
echo "  Deploying (you may need to log in to Vercel)..."
VERCEL_URL=$(vercel deploy --prod --yes 2>&1 | tail -1 || true)
cd "$ROOT"

if [ -z "$VERCEL_URL" ] || [[ "$VERCEL_URL" != http* ]]; then
  echo ""
  echo "  Manual Vercel deploy:"
  echo "  1. https://vercel.com/new → import devflow-ai"
  echo "  2. Root Directory: frontend"
  echo "  3. Env: NEXT_PUBLIC_API_URL = (your Koyeb URL from step 5)"
  read -r -p "  Paste your Vercel URL (https://....vercel.app): " FRONTEND_URL
else
  FRONTEND_URL="$VERCEL_URL"
fi
FRONTEND_URL="${FRONTEND_URL%/}"
echo "  ✓ Frontend: $FRONTEND_URL"
echo ""

# ── 5. Koyeb backend ─────────────────────────────────
echo "▶ Step 5: Deploy backend to Koyeb"
echo ""
echo "  Open https://app.koyeb.com → Create Web Service → GitHub → devflow-ai"
echo "  Settings:"
echo "    • Builder: Dockerfile (repo root)"
echo "    • Port: 8000"
echo "    • Instance: Nano (free)"
echo ""
echo "  Environment variables (copy these):"
echo "  ─────────────────────────────────"
cat <<ENV
ENVIRONMENT=production
DATABASE_URL=$DATABASE_URL
JWT_SECRET=$JWT_SECRET
GITHUB_CLIENT_ID=$GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET=$GITHUB_CLIENT_SECRET
GITHUB_WEBHOOK_SECRET=$WEBHOOK_SECRET
OPENAI_API_KEY=$OPENAI_API_KEY
FRONTEND_URL=$FRONTEND_URL
ENV
echo "  ─────────────────────────────────"
echo ""
read -r -p "  Paste your Koyeb URL after deploy (https://....koyeb.app): " BACKEND_URL
BACKEND_URL="${BACKEND_URL%/}"

# Update Vercel env
cd frontend
vercel env add NEXT_PUBLIC_API_URL production <<< "$BACKEND_URL" 2>/dev/null || true
vercel deploy --prod --yes 2>/dev/null || true
cd "$ROOT"

echo ""
echo "▶ Step 6: GitHub OAuth"
echo "  https://github.com/settings/developers → your OAuth App"
echo "    Homepage URL:  $FRONTEND_URL"
echo "    Callback URL:  $BACKEND_URL/api/auth/github/callback"
echo ""
echo "▶ Step 7: Verify"
echo "  Health:  $BACKEND_URL/health"
echo "  App:     $FRONTEND_URL"
echo ""
echo "Done! Sign in with GitHub on your live app."
