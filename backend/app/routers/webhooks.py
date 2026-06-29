import json

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import PullRequest, Repository, Review, User
from app.schemas import DashboardStats
from app.services.github import verify_webhook_signature
from app.services.queue import enqueue_review

router = APIRouter(tags=["dashboard", "webhooks"])


@router.get("/dashboard/stats", response_model=DashboardStats)
def dashboard_stats(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    total_repos = (
        db.query(func.count(Repository.id))
        .filter(Repository.owner_id == user.id)
        .scalar()
    )
    open_prs = (
        db.query(func.count(PullRequest.id))
        .join(Repository)
        .filter(Repository.owner_id == user.id, PullRequest.state == "open")
        .scalar()
    )
    completed_reviews = (
        db.query(func.count(Review.id))
        .join(PullRequest)
        .join(Repository)
        .filter(Repository.owner_id == user.id, Review.status == "completed")
        .scalar()
    )
    avg_score = (
        db.query(func.avg(Review.security_score))
        .join(PullRequest)
        .join(Repository)
        .filter(Repository.owner_id == user.id, Review.status == "completed")
        .scalar()
    )
    return DashboardStats(
        total_repositories=total_repos or 0,
        open_pull_requests=open_prs or 0,
        reviews_completed=completed_reviews or 0,
        avg_security_score=round(avg_score, 1) if avg_score else None,
    )


@router.post("/webhooks/github")
async def github_webhook(
    request: Request,
    db: Session = Depends(get_db),
    x_hub_signature_256: str | None = Header(None),
    x_github_event: str | None = Header(None),
):
    payload = await request.body()
    if not verify_webhook_signature(payload, x_hub_signature_256):
        raise HTTPException(status_code=401, detail="Invalid signature")

    data = json.loads(payload)
    if x_github_event != "pull_request":
        return {"ok": True, "message": "ignored"}

    action = data.get("action")
    if action not in ("opened", "synchronize", "reopened"):
        return {"ok": True, "message": "ignored action"}

    pr_data = data.get("pull_request", {})
    repo_data = data.get("repository", {})

    repo = db.query(Repository).filter(Repository.github_id == repo_data.get("id")).first()
    if not repo:
        return {"ok": True, "message": "repo not tracked"}

    pr = (
        db.query(PullRequest)
        .filter(
            PullRequest.repository_id == repo.id,
            PullRequest.github_id == pr_data.get("id"),
        )
        .first()
    )
    if not pr:
        pr = PullRequest(
            github_id=pr_data["id"],
            number=pr_data["number"],
            title=pr_data["title"],
            state=pr_data["state"],
            author=pr_data.get("user", {}).get("login"),
            diff_url=pr_data.get("diff_url"),
            repository_id=repo.id,
        )
        db.add(pr)
        db.commit()
        db.refresh(pr)
    else:
        pr.title = pr_data["title"]
        pr.state = pr_data["state"]
        db.commit()

    pending = (
        db.query(Review)
        .filter(Review.pull_request_id == pr.id, Review.status.in_(["pending", "processing"]))
        .first()
    )
    if pending:
        return {"ok": True, "message": "review already queued"}

    review = Review(pull_request_id=pr.id, status="pending")
    db.add(review)
    db.commit()
    enqueue_review(pr.id)

    return {"ok": True, "review_queued": True}
