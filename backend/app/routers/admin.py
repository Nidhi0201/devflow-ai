from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import settings

router = APIRouter(prefix="/admin", tags=["admin"])

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
ENV_FILE = PROJECT_ROOT / ".env"

PLACEHOLDER_IDS = {"", "dev", "your_github_client_id"}
PLACEHOLDER_SECRETS = {"", "dev", "your_github_client_secret"}


def is_oauth_configured() -> bool:
    return bool(
        settings.github_client_id
        and settings.github_client_secret
        and settings.github_client_id not in PLACEHOLDER_IDS
        and settings.github_client_secret not in PLACEHOLDER_SECRETS
    )


class OAuthSetupRequest(BaseModel):
    github_client_id: str
    github_client_secret: str
    github_webhook_secret: str = "devflow-webhook-secret"


def _update_env_file(updates: dict[str, str]) -> None:
    lines: list[str] = []
    if ENV_FILE.exists():
        lines = ENV_FILE.read_text().splitlines()

    updated_keys = set()
    new_lines: list[str] = []
    for line in lines:
        matched = False
        for key, value in updates.items():
            if line.startswith(f"{key}="):
                new_lines.append(f"{key}={value}")
                updated_keys.add(key)
                matched = True
                break
        if not matched:
            new_lines.append(line)

    for key, value in updates.items():
        if key not in updated_keys:
            new_lines.append(f"{key}={value}")

    ENV_FILE.write_text("\n".join(new_lines) + "\n")


@router.get("/setup/status")
def setup_status():
    return {
        "oauth_configured": is_oauth_configured(),
        "callback_url": f"{settings.backend_url}/api/auth/github/callback",
        "needs_restart": False,
    }


@router.post("/setup/oauth")
def setup_oauth(body: OAuthSetupRequest):
    if settings.is_production:
        raise HTTPException(
            status_code=403,
            detail="In production, set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET as environment variables on your host.",
        )
    if is_oauth_configured():
        raise HTTPException(status_code=400, detail="GitHub OAuth is already configured")

    client_id = body.github_client_id.strip()
    client_secret = body.github_client_secret.strip()
    if not client_id or not client_secret:
        raise HTTPException(status_code=400, detail="Client ID and Client Secret are required")

    try:
        _update_env_file(
            {
                "GITHUB_CLIENT_ID": client_id,
                "GITHUB_CLIENT_SECRET": client_secret,
                "GITHUB_WEBHOOK_SECRET": body.github_webhook_secret.strip() or "devflow-webhook-secret",
            }
        )
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"Could not write .env file: {e}")

    return {
        "ok": True,
        "message": "GitHub OAuth saved. Restart the server — then all users can sign in with one click.",
        "callback_url": f"{settings.backend_url}/api/auth/github/callback",
    }
