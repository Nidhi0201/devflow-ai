# Deploy DevFlow AI — Free (no credit card)

**Vercel** (frontend) + **Koyeb** (backend) + **Neon** (Postgres)

No worker, no Redis, no paid plans. AI reviews run in-process on the API (already built in).

**Total time: ~20 minutes · $0**

---

## Why not Render?

Render asks for a card when you add a **background worker** (~$7/mo) or sometimes for Postgres. This guide avoids that entirely.

---

## Architecture

```
Vercel (Next.js)  →  Koyeb API (FastAPI)  →  Neon (Postgres)
                              ↓
                        GitHub OAuth / Webhooks
                              ↓
                     In-process AI reviews  →  OpenAI
```

---

## Step 1: Push to GitHub

```bash
cd "/Users/nidhiprajapati/DevFlow AI"
git add -A
git commit -m "Free deploy config"
git push origin main
```

---

## Step 2: Neon — free database (no card)

1. Go to [neon.tech](https://neon.tech) → sign up (GitHub login works)
2. **New Project** → name it `devflow`
3. Copy the **connection string** (starts with `postgresql://...`)
4. Keep this for Step 3

---

## Step 3: Koyeb — free backend (no card)

1. Go to [koyeb.com](https://www.koyeb.com) → sign up
2. **Create Web Service** → **GitHub** → select `devflow-ai`
3. Settings:
   - **Name:** `devflow-api`
   - **Root directory / build:** set **Dockerfile path** or use build settings below
   - **Builder:** Docker — use `backend/Dockerfile`
   - **Port:** `8000`
   - **Instance:** Nano (free)

4. **Environment variables:**

| Variable | Value |
|----------|-------|
| `ENVIRONMENT` | `production` |
| `DATABASE_URL` | Neon connection string from Step 2 |
| `JWT_SECRET` | run `openssl rand -hex 32` |
| `GITHUB_CLIENT_ID` | GitHub OAuth App |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App |
| `GITHUB_WEBHOOK_SECRET` | any random string |
| `OPENAI_API_KEY` | your OpenAI key |
| `FRONTEND_URL` | `https://YOUR-APP.vercel.app` (after Step 4) |

5. Deploy → copy your Koyeb URL (e.g. `https://devflow-api-xxx.koyeb.app`)
6. Test: `https://YOUR-KOYEB-URL/health`

> No `REDIS_URL` needed — reviews run in-process automatically when Redis is absent.

---

## Step 4: Vercel — free frontend (no card)

1. [vercel.com](https://vercel.com) → **Add New Project** → import `devflow-ai`
2. **Root Directory:** `frontend`
3. **Environment Variable:**

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | your Koyeb URL |

4. Deploy → copy URL (e.g. `https://devflow-ai.vercel.app`)

---

## Step 5: Link frontend ↔ backend

1. **Koyeb** → your service → **Environment** → set:
   - `FRONTEND_URL` = your Vercel URL (no trailing slash)
   - `BACKEND_URL` = your Koyeb URL
2. Redeploy

---

## Step 6: GitHub OAuth

[GitHub Developer Settings](https://github.com/settings/developers) → OAuth App:

| Field | Value |
|-------|-------|
| Homepage URL | `https://YOUR-APP.vercel.app` |
| Callback URL | `https://YOUR-KOYEB-URL/api/auth/github/callback` |

---

## Step 7: Verify

- [ ] `/health` on Koyeb returns `{"status":"ok"}`
- [ ] Vercel app loads
- [ ] Sign in with GitHub works
- [ ] Add repo → Refresh → Start review

---

## If Koyeb also asks for a card

Try these alternatives (all free tier, Docker-friendly):

| Platform | Notes |
|----------|-------|
| [SnapDeploy](https://snapdeploy.dev) | Free containers, no card |
| [Fly.io](https://fly.io) | Often requires card for verification |
| [Render](https://render.com) | Web service only (use slim `render.yaml` in repo) — may still ask for card |

**Portfolio fallback:** Deploy **frontend only on Vercel** and keep the backend running locally (`npm run dev`) for live demos.

---

## Costs

| Service | Cost |
|---------|------|
| Vercel | $0 |
| Koyeb Nano | $0 |
| Neon | $0 (3 GB storage) |
| OpenAI | Pay per use (only when running reviews) |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| CORS error | `FRONTEND_URL` must exactly match Vercel URL |
| OAuth fails | Callback URL must match Koyeb URL + `/api/auth/github/callback` |
| DB connection error | Use Neon `postgresql://` string; app auto-normalizes `postgres://` |
| Cold start slow | Free tiers sleep when idle — first request takes ~10–30s |
| Review takes long | Normal on free tier (no background worker) |

---

## Render + Vercel (optional, may require card)

See `render.yaml` for a slim Render blueprint (API + Postgres only, no worker). Use only if Render accepts your account without a card.
