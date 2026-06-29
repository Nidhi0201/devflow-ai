import json
import os

os.environ["DATABASE_URL"] = "sqlite:///./test_api.db"
os.environ["JWT_SECRET"] = "test-secret"
os.environ["GITHUB_WEBHOOK_SECRET"] = "test-webhook-secret"
os.environ["SKIP_DB_INIT"] = "true"

import hashlib
import hmac

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.deps import create_access_token
from app.main import app
from app.models import PullRequest, Repository, Review, User

engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture()
def db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def test_user(db):
    user = User(
        github_id=1001,
        username="test-user",
        email="test@example.com",
        access_token="test-token",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture()
def auth_headers(test_user):
    token = create_access_token(test_user.id)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def seeded_data(db, test_user):
    repos_data = [
        {
            "github_id": 2001,
            "name": "ResumeBuilder",
            "full_name": "test/ResumeBuilder",
            "description": "AI-powered resume builder",
            "prs": [
                {
                    "github_id": 3001,
                    "number": 12,
                    "title": "Add PDF export endpoint",
                    "state": "open",
                    "author": "test-dev",
                    "review": {
                        "summary": "Adds PDF generation for resumes.",
                        "security_score": 8.7,
                        "suggestions": ["Add unit tests for the export endpoint"],
                        "security_issues": ["Found SQL Injection risk in user input"],
                        "bug_explanations": ["Missing null check on resume data"],
                    },
                },
                {
                    "github_id": 3002,
                    "number": 11,
                    "title": "Fix template rendering bug",
                    "state": "open",
                    "author": "test-dev",
                },
            ],
        },
        {
            "github_id": 2002,
            "name": "EcommerceAPI",
            "full_name": "test/EcommerceAPI",
            "description": "REST API for e-commerce platform",
            "prs": [
                {
                    "github_id": 3003,
                    "number": 8,
                    "title": "Add payment webhook handler",
                    "state": "open",
                    "author": "test-dev",
                },
            ],
        },
        {
            "github_id": 2003,
            "name": "FinanceTracker",
            "full_name": "test/FinanceTracker",
            "description": "Personal finance tracking app",
            "prs": [],
        },
    ]

    for d in repos_data:
        repo = Repository(
            github_id=d["github_id"],
            name=d["name"],
            full_name=d["full_name"],
            description=d["description"],
            owner_id=test_user.id,
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


@pytest.fixture()
def auth_headers_with_data(test_user, seeded_data, auth_headers):
    return auth_headers


class TestHealth:
    def test_health(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"


class TestAuth:
    def test_demo_login_removed(self, client):
        resp = client.get("/api/auth/demo", follow_redirects=False)
        assert resp.status_code == 404

    def test_me_requires_auth(self, client):
        resp = client.get("/api/auth/me")
        assert resp.status_code == 401

    def test_me_with_token(self, client, auth_headers, test_user):
        resp = client.get("/api/auth/me", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["username"] == test_user.username

    def test_github_oauth_redirects_to_setup_when_not_configured(self, client):
        resp = client.get("/api/auth/github", follow_redirects=False)
        assert resp.status_code == 307
        assert "admin/setup" in resp.headers["location"]


class TestDashboard:
    def test_stats(self, client, auth_headers_with_data):
        resp = client.get("/api/dashboard/stats", headers=auth_headers_with_data)
        assert resp.status_code == 200
        assert resp.json()["total_repositories"] >= 3


class TestRepositories:
    def test_list_repos(self, client, auth_headers_with_data):
        resp = client.get("/api/repositories", headers=auth_headers_with_data)
        assert resp.status_code == 200
        repos = resp.json()
        assert len(repos) >= 3

    def test_list_pull_requests(self, client, auth_headers_with_data, db):
        repo = db.query(Repository).first()
        resp = client.get(f"/api/repositories/{repo.id}/pull-requests", headers=auth_headers_with_data)
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    def test_delete_repo_cascades(self, client, auth_headers_with_data, db):
        repo = db.query(Repository).filter(Repository.name == "FinanceTracker").first()
        resp = client.delete(f"/api/repositories/{repo.id}", headers=auth_headers_with_data)
        assert resp.status_code == 200
        assert db.query(Repository).filter(Repository.id == repo.id).first() is None


class TestPullRequests:
    def test_get_pr(self, client, auth_headers_with_data, db):
        pr = db.query(PullRequest).first()
        resp = client.get(f"/api/pull-requests/{pr.id}", headers=auth_headers_with_data)
        assert resp.status_code == 200
        assert resp.json()["title"]

    def test_trigger_review(self, client, auth_headers_with_data, db):
        pr = db.query(PullRequest).first()
        resp = client.post(f"/api/pull-requests/{pr.id}/review", headers=auth_headers_with_data)
        assert resp.status_code == 200
        assert resp.json()["status"] in ("pending", "processing", "completed")

    def test_list_reviews(self, client, auth_headers_with_data, db):
        pr = db.query(PullRequest).join(Review).first()
        resp = client.get(f"/api/pull-requests/{pr.id}/reviews", headers=auth_headers_with_data)
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    def test_pr_not_found(self, client, auth_headers):
        resp = client.get("/api/pull-requests/99999", headers=auth_headers)
        assert resp.status_code == 404


class TestWebhooks:
    def _sign(self, payload: bytes) -> str:
        sig = hmac.new(b"test-webhook-secret", payload, hashlib.sha256).hexdigest()
        return f"sha256={sig}"

    def test_invalid_signature(self, client):
        resp = client.post(
            "/api/webhooks/github",
            content=b"{}",
            headers={"X-GitHub-Event": "pull_request"},
        )
        assert resp.status_code == 401

    def test_ignored_event(self, client):
        payload = json.dumps({"action": "opened"}).encode()
        resp = client.post(
            "/api/webhooks/github",
            content=payload,
            headers={
                "X-GitHub-Event": "push",
                "X-Hub-Signature-256": self._sign(payload),
            },
        )
        assert resp.status_code == 200

    def test_pr_webhook_queues_review(self, client, db):
        user = User(github_id=99, username="wh-user", access_token="real-token")
        db.add(user)
        db.commit()
        repo = Repository(
            github_id=555,
            name="test-repo",
            full_name="wh-user/test-repo",
            owner_id=user.id,
        )
        db.add(repo)
        db.commit()

        payload = json.dumps(
            {
                "action": "opened",
                "pull_request": {
                    "id": 777,
                    "number": 1,
                    "title": "Test PR",
                    "state": "open",
                    "user": {"login": "wh-user"},
                },
                "repository": {"id": 555, "full_name": "wh-user/test-repo"},
            }
        ).encode()
        resp = client.post(
            "/api/webhooks/github",
            content=payload,
            headers={
                "X-GitHub-Event": "pull_request",
                "X-Hub-Signature-256": self._sign(payload),
            },
        )
        assert resp.status_code == 200
        assert resp.json().get("review_queued") is True
        pr = db.query(PullRequest).filter(PullRequest.github_id == 777).first()
        assert pr is not None
