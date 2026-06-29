from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, parse_json_list
from app.models import PullRequest, Repository, Review, User
from app.schemas import ReviewOut
from app.services.queue import enqueue_review

router = APIRouter(prefix="/pull-requests", tags=["pull-requests"])


def _review_to_out(review: Review) -> ReviewOut:
    return ReviewOut(
        id=review.id,
        pull_request_id=review.pull_request_id,
        status=review.status,
        summary=review.summary,
        security_score=review.security_score,
        suggestions=parse_json_list(review.suggestions),
        security_issues=parse_json_list(review.security_issues),
        bug_explanations=parse_json_list(review.bug_explanations),
        created_at=review.created_at,
    )


@router.get("/{pr_id}/reviews", response_model=list[ReviewOut])
def list_reviews(
    pr_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pr = _get_user_pr(pr_id, user, db)
    reviews = (
        db.query(Review)
        .filter(Review.pull_request_id == pr.id)
        .order_by(Review.created_at.desc())
        .all()
    )
    return [_review_to_out(r) for r in reviews]


@router.post("/{pr_id}/review", response_model=ReviewOut)
def trigger_review(
    pr_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pr = _get_user_pr(pr_id, user, db)

    pending = (
        db.query(Review)
        .filter(Review.pull_request_id == pr.id, Review.status.in_(["pending", "processing"]))
        .first()
    )
    if pending:
        return _review_to_out(pending)

    review = Review(pull_request_id=pr.id, status="pending")
    db.add(review)
    db.commit()
    db.refresh(review)

    enqueue_review(pr.id)
    return _review_to_out(review)


@router.get("/{pr_id}", response_model=dict)
def get_pull_request(
    pr_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pr = _get_user_pr(pr_id, user, db)
    repo = db.query(Repository).filter(Repository.id == pr.repository_id).first()
    latest_review = (
        db.query(Review)
        .filter(Review.pull_request_id == pr.id)
        .order_by(Review.created_at.desc())
        .first()
    )
    return {
        "id": pr.id,
        "number": pr.number,
        "title": pr.title,
        "state": pr.state,
        "author": pr.author,
        "repository": {"id": repo.id, "full_name": repo.full_name} if repo else None,
        "latest_review": _review_to_out(latest_review) if latest_review else None,
    }


def _get_user_pr(pr_id: int, user: User, db: Session) -> PullRequest:
    pr = (
        db.query(PullRequest)
        .join(Repository)
        .filter(PullRequest.id == pr_id, Repository.owner_id == user.id)
        .first()
    )
    if not pr:
        raise HTTPException(status_code=404, detail="Pull request not found")
    return pr
