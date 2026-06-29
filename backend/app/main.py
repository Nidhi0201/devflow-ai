import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
from app.routers import admin, auth, pull_requests, repositories, webhooks


@asynccontextmanager
async def lifespan(app: FastAPI):
    if os.getenv("SKIP_DB_INIT") != "true":
        Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="DevFlow AI",
    description="AI-Powered GitHub Code Review Platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(admin.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(repositories.router, prefix="/api")
app.include_router(pull_requests.router, prefix="/api")
app.include_router(webhooks.router, prefix="/api")


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "devflow-ai",
        "environment": settings.environment,
    }
