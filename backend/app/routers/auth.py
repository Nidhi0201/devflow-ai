from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.deps import create_access_token, create_oauth_state, get_current_user, verify_oauth_state
from app.models import User
from app.routers.admin import is_oauth_configured
from app.schemas import TokenResponse, UserOut
from app.services.github import GitHubAPIError, GitHubService
from app.services.seed import seed_demo_data

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/demo")
def demo_login(db: Session = Depends(get_db)):
    if not settings.allow_demo_login:
        raise HTTPException(status_code=404, detail="Demo login disabled")

    user = db.query(User).filter(User.github_id == 0).first()
    if not user:
        user = User(
            github_id=0,
            username="demo-user",
            email="demo@devflow.ai",
            avatar_url="https://avatars.githubusercontent.com/u/9919?s=64&v=4",
            access_token="demo-token",
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    seed_demo_data(db, user)
    token = create_access_token(user.id)
    return RedirectResponse(f"{settings.frontend_url}/auth/callback?token={token}")


@router.get("/github/status")
def github_oauth_status():
    return {
        "configured": is_oauth_configured(),
        "callback_url": f"{settings.backend_url}/api/auth/github/callback",
    }


@router.get("/github")
async def github_login():
    if not is_oauth_configured():
        return RedirectResponse(f"{settings.frontend_url}/admin/setup")
    state = create_oauth_state()
    params = urlencode(
        {
            "client_id": settings.github_client_id,
            "redirect_uri": f"{settings.backend_url}/api/auth/github/callback",
            "scope": "read:user user:email repo",
            "state": state,
        }
    )
    return RedirectResponse(f"https://github.com/login/oauth/authorize?{params}")


@router.get("/github/callback")
async def github_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: Session = Depends(get_db),
):
    if not verify_oauth_state(state):
        return RedirectResponse(
            f"{settings.frontend_url}/auth/callback?error=invalid_state"
        )

    try:
        gh = GitHubService()
        token_data = await gh.exchange_code(code)
        access_token = token_data.get("access_token")
        if not access_token:
            return RedirectResponse(
                f"{settings.frontend_url}/auth/callback?error=no_token"
            )

        gh = GitHubService(access_token)
        gh_user = await gh.get_user()
        emails = await gh.get_user_emails()
    except (GitHubAPIError, httpx.HTTPError):
        return RedirectResponse(
            f"{settings.frontend_url}/auth/callback?error=github_failed"
        )

    user = db.query(User).filter(User.github_id == gh_user["id"]).first()
    if not user:
        primary_email = next((e["email"] for e in emails if e.get("primary")), None)
        user = User(
            github_id=gh_user["id"],
            username=gh_user["login"],
            email=primary_email or gh_user.get("email"),
            avatar_url=gh_user.get("avatar_url"),
            access_token=access_token,
        )
        db.add(user)
    else:
        user.access_token = access_token
        user.username = gh_user["login"]
        user.avatar_url = gh_user.get("avatar_url")

    db.commit()
    db.refresh(user)

    token = create_access_token(user.id)
    return RedirectResponse(f"{settings.frontend_url}/auth/callback?token={token}")


@router.get("/me", response_model=UserOut)
def get_me(user: User = Depends(get_current_user)):
    return user


@router.post("/token", response_model=TokenResponse)
def get_token(user: User = Depends(get_current_user)):
    return TokenResponse(access_token=create_access_token(user.id), user=user)
