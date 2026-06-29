from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, is_demo_user
from app.models import PullRequest, Repository, Review, User
from app.schemas import ImportRepoRequest, PullRequestOut, RepositoryOut
from app.services.github import GitHubAPIError, GitHubService, is_demo_token

router = APIRouter(prefix="/repositories", tags=["repositories"])


def _repo_out(db: Session, repo: Repository) -> RepositoryOut:
    open_count = (
        db.query(func.count(PullRequest.id))
        .filter(PullRequest.repository_id == repo.id, PullRequest.state == "open")
        .scalar()
    )
    out = RepositoryOut.model_validate(repo)
    out.open_pr_count = open_count or 0
    out.webhook_active = repo.webhook_active
    return out


@router.get("", response_model=list[RepositoryOut])
def list_repositories(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    repos = db.query(Repository).filter(Repository.owner_id == user.id).all()
    return [_repo_out(db, r) for r in repos]


@router.get("/available")
async def list_available_repos(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if is_demo_user(user) or is_demo_token(user.access_token):
        return []

    try:
        gh = GitHubService(user.access_token)
        github_repos = await gh.list_repos()
    except GitHubAPIError as e:
        raise HTTPException(status_code=502, detail=f"GitHub API error: {e.message}")

    imported_ids = {
        r.github_id
        for r in db.query(Repository.github_id).filter(Repository.owner_id == user.id).all()
    }
    return [
        {
            "github_id": r["id"],
            "name": r["name"],
            "full_name": r["full_name"],
            "description": r.get("description"),
            "imported": r["id"] in imported_ids,
        }
        for r in github_repos
    ]


@router.post("/import", response_model=RepositoryOut)
async def import_repository(
    body: ImportRepoRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if is_demo_user(user) or is_demo_token(user.access_token):
        raise HTTPException(
            status_code=400,
            detail="Sign in with GitHub to import real repositories",
        )

    existing = (
        db.query(Repository)
        .filter(Repository.full_name == body.full_name, Repository.owner_id == user.id)
        .first()
    )
    if existing:
        return _repo_out(db, existing)

    try:
        gh = GitHubService(user.access_token)
        gh_repo = await gh.get_repo(body.full_name)
    except GitHubAPIError as e:
        if e.status_code == 404:
            raise HTTPException(status_code=404, detail="Repository not found on GitHub")
        raise HTTPException(status_code=502, detail=f"GitHub API error: {e.message}")

    repo = Repository(
        github_id=gh_repo["id"],
        name=gh_repo["name"],
        full_name=gh_repo["full_name"],
        description=gh_repo.get("description"),
        owner_id=user.id,
    )
    db.add(repo)
    db.commit()
    db.refresh(repo)

    try:
        webhook = await gh.create_webhook(body.full_name)
        repo.webhook_id = webhook.get("id")
        repo.webhook_active = True
        db.commit()
    except GitHubAPIError:
        repo.webhook_active = False
        db.commit()

    return _repo_out(db, repo)


@router.delete("/{repo_id}")
async def delete_repository(
    repo_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    repo = (
        db.query(Repository)
        .filter(Repository.id == repo_id, Repository.owner_id == user.id)
        .first()
    )
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    if repo.webhook_id and not is_demo_user(user):
        try:
            gh = GitHubService(user.access_token)
            await gh.delete_webhook(repo.full_name, repo.webhook_id)
        except GitHubAPIError:
            pass

    db.delete(repo)
    db.commit()
    return {"ok": True}


@router.get("/{repo_id}/pull-requests", response_model=list[PullRequestOut])
def list_pull_requests(
    repo_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    repo = (
        db.query(Repository)
        .filter(Repository.id == repo_id, Repository.owner_id == user.id)
        .first()
    )
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    prs = (
        db.query(PullRequest)
        .filter(PullRequest.repository_id == repo_id)
        .order_by(PullRequest.created_at.desc())
        .all()
    )
    result = []
    for pr in prs:
        has_review = (
            db.query(Review)
            .filter(Review.pull_request_id == pr.id, Review.status == "completed")
            .first()
            is not None
        )
        pr_out = PullRequestOut.model_validate(pr)
        pr_out.has_review = has_review
        result.append(pr_out)
    return result


@router.post("/{repo_id}/sync")
async def sync_pull_requests(
    repo_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if is_demo_user(user) or is_demo_token(user.access_token):
        raise HTTPException(
            status_code=400,
            detail="Sign in with GitHub to sync real pull requests",
        )

    repo = (
        db.query(Repository)
        .filter(Repository.id == repo_id, Repository.owner_id == user.id)
        .first()
    )
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    try:
        gh = GitHubService(user.access_token)
        github_prs = await gh.list_pull_requests(repo.full_name)
    except GitHubAPIError as e:
        raise HTTPException(status_code=502, detail=f"GitHub API error: {e.message}")

    synced = 0
    for gh_pr in github_prs:
        pr = (
            db.query(PullRequest)
            .filter(
                PullRequest.repository_id == repo.id,
                PullRequest.github_id == gh_pr["id"],
            )
            .first()
        )
        if not pr:
            pr = PullRequest(
                github_id=gh_pr["id"],
                number=gh_pr["number"],
                title=gh_pr["title"],
                state=gh_pr["state"],
                author=gh_pr.get("user", {}).get("login"),
                diff_url=gh_pr.get("diff_url"),
                repository_id=repo.id,
            )
            db.add(pr)
            synced += 1
        else:
            pr.title = gh_pr["title"]
            pr.state = gh_pr["state"]

    db.commit()
    return {"synced": synced, "total": len(github_prs)}
