# DevFlow AI

AI-powered GitHub code review platform.

## Quick Start (local)

```bash
npm run dev
```

Open http://localhost:3000 → **Try Demo** or set up GitHub sign-in once via `npm run setup:github`.

## Deploy to production

**→ See [DEPLOY.md](./DEPLOY.md)** for the full guide (Vercel + Railway, ~20 min).

```bash
npm run deploy:check   # verify before deploying
```

| Service | Host |
|---------|------|
| Frontend | [Vercel](https://vercel.com) |
| API + Worker | [Railway](https://railway.app) |
| Database | PostgreSQL (Railway) |
| Queue | Redis (Railway) |

## Features

- GitHub OAuth — one-click sign-in for all users
- Import repos + auto webhooks
- AI code reviews (OpenAI + mock fallback)
- Security scoring, review history
- Demo mode for local dev

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Local development |
| `npm run setup:github` | One-time GitHub OAuth setup (owner) |
| `npm run deploy:check` | Pre-deploy checklist |
| `cd backend && pytest tests/ -v` | Run 19 API tests |

## Tech Stack

Next.js 14 · FastAPI · PostgreSQL · Redis · OpenAI · GitHub OAuth · Docker

## License

MIT
