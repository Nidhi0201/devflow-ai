import json

from app.database import SessionLocal
from app.models import PullRequest, Repository, Review, User
from app.services.ai import AIService
from app.services.github import GitHubAPIError, GitHubService, is_demo_token


def run_ai_review(pull_request_id: int) -> dict:
    db = SessionLocal()
    review = None
    try:
        pr = db.query(PullRequest).filter(PullRequest.id == pull_request_id).first()
        if not pr:
            return {"error": "PR not found"}

        review = (
            db.query(Review)
            .filter(Review.pull_request_id == pr.id, Review.status == "pending")
            .order_by(Review.created_at.desc())
            .first()
        )
        if not review:
            review = Review(pull_request_id=pr.id, status="processing")
            db.add(review)
            db.commit()
            db.refresh(review)
        else:
            review.status = "processing"
            db.commit()

        repo = db.query(Repository).filter(Repository.id == pr.repository_id).first()
        user = db.query(User).filter(User.id == repo.owner_id).first() if repo else None

        diff = ""
        files = []
        if user and repo and not is_demo_token(user.access_token):
            import asyncio

            gh = GitHubService(user.access_token)

            async def fetch():
                nonlocal diff, files
                try:
                    diff = await gh.get_pr_diff(repo.full_name, pr.number)
                    files = await gh.get_pr_files(repo.full_name, pr.number)
                except GitHubAPIError:
                    pass

            asyncio.run(fetch())

        ai = AIService()
        result = ai.review_code(pr.title, diff, files)

        review.status = "completed"
        review.summary = result.get("summary", "")
        review.security_score = result.get("security_score", 5.0)
        review.suggestions = json.dumps(result.get("suggestions", []))
        review.security_issues = json.dumps(result.get("security_issues", []))
        review.bug_explanations = json.dumps(result.get("bug_explanations", []))
        db.commit()

        return {"status": "completed", "review_id": review.id}
    except Exception as e:
        if review:
            review.status = "failed"
            review.summary = str(e)
            db.commit()
        return {"error": str(e)}
    finally:
        db.close()
