#!/usr/bin/env bash
# One-time setup — run this ONCE as the app owner, then every user can sign in with GitHub.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env"
CALLBACK="http://localhost:8000/api/auth/github/callback"

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  DevFlow AI — One-Time GitHub Setup (app owner only)    ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "You only do this ONCE. After this, every user clicks"
echo "'Sign in with GitHub' and it just works."
echo ""
echo "Step 1: Create a GitHub OAuth App"
echo "  → https://github.com/settings/developers"
echo "  → New OAuth App"
echo "  → Callback URL: $CALLBACK"
echo "  → Homepage URL: http://localhost:3000"
echo ""

read -rp "Paste your GitHub Client ID: " CLIENT_ID
read -rp "Paste your GitHub Client Secret: " CLIENT_SECRET
read -rp "Webhook secret (press Enter for default): " WEBHOOK_SECRET
WEBHOOK_SECRET="${WEBHOOK_SECRET:-devflow-webhook-secret}"

[ -f "$ENV_FILE" ] || cp "$ROOT/.env.example" "$ENV_FILE"

update_env() {
  local key=$1 val=$2
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    sed -i.bak "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
  else
    echo "${key}=${val}" >> "$ENV_FILE"
  fi
}

update_env "GITHUB_CLIENT_ID" "$CLIENT_ID"
update_env "GITHUB_CLIENT_SECRET" "$CLIENT_SECRET"
update_env "GITHUB_WEBHOOK_SECRET" "$WEBHOOK_SECRET"
rm -f "$ENV_FILE.bak"

echo ""
echo "✓ Saved to .env"
echo ""
echo "Now restart the app:"
echo "  npm run dev"
echo ""
echo "Then anyone can click 'Sign in with GitHub' — no setup needed for them."
