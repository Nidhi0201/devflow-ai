import json

from sqlalchemy.orm import Session

from app.models import PullRequest, Repository, Review, User


def seed_demo_data(db: Session, user: User) -> None:
    """Populate sample repos, PRs, and a review for local demo mode."""
    if db.query(Repository).filter(Repository.owner_id == user.id).first():
        return

    demos = [
        {
            "github_id": 1001,
            "name": "ResumeBuilder",
            "full_name": "demo/ResumeBuilder",
            "description": "AI-powered resume builder",
            "prs": [
                {
                    "github_id": 2001,
                    "number": 12,
                    "title": "Add PDF export endpoint",
                    "state": "open",
                    "author": "demo-dev",
                    "review": {
                        "summary": "Adds PDF generation for resumes. Overall solid, but a few issues to address.",
                        "security_score": 8.7,
                        "suggestions": [
                            "Function could be simplified by extracting PDF layout into a helper",
                            "Suggested caching for frequently accessed resume templates",
                            "Add unit tests for the export endpoint",
                        ],
                        "security_issues": [
                            "Found SQL Injection risk in user input passed directly to query",
                        ],
                        "bug_explanations": [
                            "Missing null check on resume data could cause export to fail silently",
                        ],
                    },
                },
                {
                    "github_id": 2002,
                    "number": 11,
                    "title": "Fix template rendering bug",
                    "state": "open",
                    "author": "demo-dev",
                },
            ],
        },
        {
            "github_id": 1002,
            "name": "EcommerceAPI",
            "full_name": "demo/EcommerceAPI",
            "description": "REST API for e-commerce platform",
            "prs": [
                {
                    "github_id": 2003,
                    "number": 8,
                    "title": "Add payment webhook handler",
                    "state": "open",
                    "author": "demo-dev",
                },
            ],
        },
        {
            "github_id": 1003,
            "name": "FinanceTracker",
            "full_name": "demo/FinanceTracker",
            "description": "Personal finance tracking app",
            "prs": [],
        },
    ]

    for d in demos:
        repo = Repository(
            github_id=d["github_id"],
            name=d["name"],
            full_name=d["full_name"],
            description=d["description"],
            owner_id=user.id,
        )
        db.add(repo)
        db.flush()

        for pr_data in d["prs"]:
            pr = PullRequest(
                github_id=pr_data["github_id"],
                number=pr_data["number"],
                title=pr_data["title"],
                state=pr_data["state"],
                author=pr_data["author"],
                repository_id=repo.id,
            )
            db.add(pr)
            db.flush()

            if "review" in pr_data:
                r = pr_data["review"]
                review = Review(
                    pull_request_id=pr.id,
                    status="completed",
                    summary=r["summary"],
                    security_score=r["security_score"],
                    suggestions=json.dumps(r["suggestions"]),
                    security_issues=json.dumps(r["security_issues"]),
                    bug_explanations=json.dumps(r["bug_explanations"]),
                )
                db.add(review)

    db.commit()
