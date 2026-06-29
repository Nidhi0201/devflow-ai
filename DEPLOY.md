# Deploy DevFlow AI

**Vercel** (frontend) + **Render** (backend, worker, Postgres, Redis)

**Total time: ~25 minutes**

---

## Architecture

```
Vercel (Next.js)  →  Render API (FastAPI)  →  PostgreSQL
                              ↓
                        GitHub Webhooks
                              ↓
                   Render Worker + Redis  →  OpenAI
```

---

## Step 1: Push to GitHub

```bash
cd "/Users/nidhiprajapati/DevFlow AI"
git add -A
git commit -m "Production deploy: Vercel + Render"
git push origin main
```

Repo: https://github.com/Nidhi0201/devflow-ai

---

## Step 2: Deploy backend on Render

### Option A — Blueprint (recommended)

1. Go to [dashboard.render.com](https://dashboard.render.com) → **New** → **Blueprint**
2. Connect GitHub → select `devflow-ai`
3. Render reads `render.yaml` and creates:
   - **devflow-api** (web service)
   - **devflow-worker** (background worker)
   - **devflow-db** (PostgreSQL)
   - **devflow-redis** (Redis)
4. When prompted, fill in **sync: false** variables on the **devflow-api** service:

| Variable | Value |
|----------|-------|
| `GITHUB_CLIENT_ID` | From GitHub OAuth App |
| `GITHUB_CLIENT_SECRET` | From GitHub OAuth App |
| `OPENAI_API_KEY` | Your OpenAI key |
| `FRONTEND_URL` | `https://YOUR-APP.vercel.app` (set after Step 3) |

5. Copy the same GitHub/OpenAI/`FRONTEND_URL` vars onto **devflow-worker**
6. Wait for deploy → copy API URL (e.g. `https://devflow-api.onrender.com`)
7. Test: `https://devflow-api.onrender.com/health` → `{"status":"ok"}`

> **Note:** Render sets `RENDER_EXTERNAL_URL` automatically — `BACKEND_URL` is optional on Render.

> **Worker plan:** The worker uses Render's **Starter** plan (~$7/mo). Without it, AI reviews still run via a thread fallback on the API (fine for testing, not ideal for production).

### Option B — Manual setup

1. **New** → **PostgreSQL** (free) → name it `devflow-db`
2. **New** → **Redis** (free) → name it `devflow-redis`
3. **New** → **Web Service** → connect repo:
   - **Root Directory:** `backend`
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path:** `/health`
4. Add env vars (see table below)
5. **New** → **Background Worker** → same repo, root `backend`:
   - **Start Command:** `python -m app.worker.runner`
   - Same env vars as API

---

## Step 3: Deploy frontend on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project** → import `devflow-ai`
2. **Root Directory:** `frontend`
3. **Environment Variable:**

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://devflow-api.onrender.com` |

4. Deploy → copy your URL (e.g. `https://devflow-ai.vercel.app`)

---

## Step 4: Link frontend ↔ backend

1. **Render** → **devflow-api** → **Environment** → set:
   - `FRONTEND_URL` = your Vercel URL (no trailing slash)
2. Copy the same `FRONTEND_URL` to **devflow-worker**
3. Redeploy both Render services

---

## Step 5: GitHub OAuth (one-time)

1. [GitHub Developer Settings](https://github.com/settings/developers) → OAuth App (create if needed)
2. Set:
   - **Homepage URL:** `https://YOUR-APP.vercel.app`
   - **Authorization callback URL:** `https://devflow-api.onrender.com/api/auth/github/callback`
3. Save

---

## Step 6: Verify

- [ ] `https://devflow-api.onrender.com/health` returns `{"status":"ok"}`
- [ ] `https://YOUR-APP.vercel.app` loads
- [ ] **Sign in with GitHub** works
- [ ] Add a repository → Refresh → Start review

---

## Environment variables reference

### Render (API + worker)

| Variable | Required | Notes |
|----------|----------|-------|
| `ENVIRONMENT` | yes | `production` |
| `DATABASE_URL` | yes | Auto from Postgres |
| `REDIS_URL` | yes | Auto from Redis |
| `JWT_SECRET` | yes | Auto-generated in blueprint |
| `GITHUB_CLIENT_ID` | yes | OAuth App |
| `GITHUB_CLIENT_SECRET` | yes | OAuth App |
| `GITHUB_WEBHOOK_SECRET` | yes | Any random string |
| `OPENAI_API_KEY` | yes | For AI reviews |
| `FRONTEND_URL` | yes | Your Vercel URL |
| `BACKEND_URL` | no | Auto via `RENDER_EXTERNAL_URL` |

### Vercel (frontend)

| Variable | Required |
|----------|----------|
| `NEXT_PUBLIC_API_URL` | yes — Render API URL |

**Generate JWT secret manually (if not using blueprint):**
```bash
openssl rand -hex 32
```

---

## Webhooks

Auto-registered when users add repos. Endpoint:

```
https://devflow-api.onrender.com/api/webhooks/github
```

---

## CI/CD

GitHub Actions runs tests on push (`.github/workflows/ci.yml`).

Render and Vercel auto-deploy on push to `main`.

---

## Costs (approximate)

| Service | Tier |
|---------|------|
| Vercel | Free (hobby) |
| Render API | Free (spins down after 15 min idle — first request may be slow) |
| Render Postgres | Free for 90 days, then ~$7/mo |
| Render Redis | Free |
| Render Worker | Starter ~$7/mo (optional but recommended) |
| OpenAI | Pay per use |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| CORS error | `FRONTEND_URL` on Render must exactly match Vercel URL (no trailing slash) |
| GitHub OAuth fails | Callback must be `https://YOUR-API.onrender.com/api/auth/github/callback` |
| API slow on first load | Render free tier cold start — wait ~30s or upgrade plan |
| AI reviews stuck | Check worker is running; verify `REDIS_URL` and `OPENAI_API_KEY` |
| 502 on import | Verify GitHub OAuth credentials on Render |
| Database error | Ensure `DATABASE_URL` uses Postgres (Render auto-fixes `postgres://` → `postgresql://`) |

---

## Local vs production

| | Local | Production |
|--|-------|------------|
| Start | `npm run dev` | Auto-deploy on git push |
| Frontend | localhost:3000 | Vercel |
| Backend | localhost:8000 | Render |
| Database | SQLite | PostgreSQL (Render) |
| Sign in | GitHub OAuth | GitHub OAuth |
