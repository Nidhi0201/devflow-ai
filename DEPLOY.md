# Deploy DevFlow AI

Deploy frontend on **Vercel**, backend + worker on **Railway**, with PostgreSQL and Redis.

**Total time: ~20 minutes**

---

## Architecture (production)

```
Vercel (Next.js)  →  Railway API (FastAPI)  →  PostgreSQL
                              ↓
                        GitHub Webhooks
                              ↓
                   Railway Worker + Redis  →  OpenAI
```

---

## Step 1: Push to GitHub

```bash
cd devflow
git init
git add .
git commit -m "DevFlow AI — ready for deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/devflow-ai.git
git push -u origin main
```

---

## Step 2: Deploy backend on Railway

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Select your repo
3. Railway creates a service — click it → **Settings**:
   - **Root Directory:** `backend`
   - **Builder:** Dockerfile
4. Click **+ New** → **Database** → **PostgreSQL**
5. Click **+ New** → **Database** → **Redis**
6. Click the **API service** → **Variables** → add:

| Variable | Value |
|----------|-------|
| `ENVIRONMENT` | `production` |
| `ALLOW_DEMO_LOGIN` | `false` |
| `JWT_SECRET` | Run `openssl rand -hex 32` |
| `GITHUB_CLIENT_ID` | From GitHub OAuth App |
| `GITHUB_CLIENT_SECRET` | From GitHub OAuth App |
| `GITHUB_WEBHOOK_SECRET` | Any random string |
| `OPENAI_API_KEY` | Your OpenAI key |
| `FRONTEND_URL` | `https://YOUR-APP.vercel.app` (update after Step 3) |
| `BACKEND_URL` | Your Railway API URL (see below) |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (reference variable) |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` (reference variable) |

7. **Settings → Networking → Generate Domain** — copy the URL (e.g. `https://devflow-api.up.railway.app`)
8. Set `BACKEND_URL` to that URL
9. Deploy should succeed — test: `https://YOUR-API.up.railway.app/health`

---

## Step 3: Deploy worker on Railway

1. In the same Railway project → **+ New** → **GitHub Repo** → same repo
2. **Settings:**
   - **Root Directory:** `backend`
   - **Start Command:** `python -m app.worker.runner`
3. **Variables** — copy the same env vars from the API service (use **Shared Variables** or duplicate)
4. Deploy — worker has no public URL, it runs in the background

---

## Step 4: Deploy frontend on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your GitHub repo
2. **Settings:**
   - **Root Directory:** `frontend`
   - **Framework:** Next.js (auto-detected)
3. **Environment Variables:**

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://YOUR-API.up.railway.app` |

4. Deploy → copy your Vercel URL (e.g. `https://devflow-ai.vercel.app`)
5. Go back to **Railway API service** → update `FRONTEND_URL` to your Vercel URL → redeploy

---

## Step 5: Configure GitHub OAuth (one-time)

1. [GitHub Developer Settings](https://github.com/settings/developers) → your OAuth App (or create new)
2. Update:
   - **Homepage URL:** `https://YOUR-APP.vercel.app`
   - **Authorization callback URL:** `https://YOUR-API.up.railway.app/api/auth/github/callback`
3. Save — all users can now sign in with one click

---

## Step 6: Verify

- [ ] `https://YOUR-API.up.railway.app/health` returns `{"status":"ok"}`
- [ ] `https://YOUR-APP.vercel.app` loads
- [ ] Sign in with GitHub works
- [ ] Import a repo → Sync PRs → Run AI Review

---

## Environment variables reference

See `.env.production.example` for the full list.

**Generate JWT secret:**
```bash
openssl rand -hex 32
```

---

## Webhooks (optional, for auto-reviews)

GitHub webhooks need a public API URL. Your Railway API URL works directly:

```
https://YOUR-API.up.railway.app/api/webhooks/github
```

Webhooks are auto-registered when users import repos. Ensure `GITHUB_WEBHOOK_SECRET` matches in Railway and your GitHub OAuth App settings.

---

## CI/CD

GitHub Actions runs tests on every push (`.github/workflows/ci.yml`).

Railway and Vercel auto-deploy on push to `main` when connected to GitHub.

---

## Costs (approximate)

| Service | Free tier |
|---------|-----------|
| Vercel | Free for hobby |
| Railway | $5/month credit (enough for demo) |
| OpenAI | Pay per use |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| CORS error | Set `FRONTEND_URL` on Railway to exact Vercel URL (no trailing slash) |
| GitHub OAuth fails | Callback URL must match Railway `BACKEND_URL` + `/api/auth/github/callback` |
| AI reviews stuck | Check worker service is running and `REDIS_URL` is set |
| 502 on import | Verify `GITHUB_CLIENT_ID` / `SECRET` are set on Railway |

---

## Local vs production

| | Local | Production |
|--|-------|------------|
| Start | `npm run dev` | Auto-deploy on git push |
| Database | SQLite | PostgreSQL (Railway) |
| Demo login | Enabled | Disabled |
| OAuth setup | `/admin/setup` | Env vars on Railway |
