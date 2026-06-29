import os

os.environ["DATABASE_URL"] = "sqlite:///./test_api.db"
os.environ["JWT_SECRET"] = "test-secret"
os.environ["ALLOW_DEMO_LOGIN"] = "true"
os.environ["GITHUB_WEBHOOK_SECRET"] = "test-webhook-secret"
os.environ["SKIP_DB_INIT"] = "true"

import hashlib
import hmac
import json

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
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
def demo_token(client):
    resp = client.get("/api/auth/demo", follow_redirects=False)
    assert resp.status_code == 307
    return resp.headers["location"].split("token=")[1]


@pytest.fixture()
def auth_headers(demo_token):
    return {"Authorization": f"Bearer {demo_token}"}


class TestHealth:
    def test_health(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"


class TestAuth:
    def test_demo_login_redirects(self, client):
        resp = client.get("/api/auth/demo", follow_redirects=False)
        assert resp.status_code == 307
        assert "token=" in resp.headers["location"]

    def test_me_requires_auth(self, client):
        resp = client.get("/api/auth/me")
        assert resp.status_code == 401

    def test_me_with_demo_token(self, client, auth_headers):
        resp = client.get("/api/auth/me", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["username"] == "demo-user"

    def test_github_oauth_redirects_to_setup_when_not_configured(self, client):
        resp = client.get("/api/auth/github", follow_redirects=False)
        assert resp.status_code == 307
        assert "admin/setup" in resp.headers["location"]


class TestDashboard:
    def test_stats(self, client, auth_headers):
        resp = client.get("/api/dashboard/stats", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["total_repositories"] >= 3


class TestRepositories:
    def test_list_repos(self, client, auth_headers):
        resp = client.get("/api/repositories", headers=auth_headers)
        assert resp.status_code == 200
        repos = resp.json()
        assert len(repos) >= 3

    def test_available_repos_demo_returns_empty(self, client, auth_headers):
        resp = client.get("/api/repositories/available", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json() == []

    def test_import_blocked_for_demo(self, client, auth_headers):
        resp = client.post(
            "/api/repositories/import",
            headers=auth_headers,
            json={"full_name": "octocat/Hello-World"},
        )
        assert resp.status_code == 400

    def test_list_pull_requests(self, client, auth_headers, db):
        repo = db.query(Repository).first()
        resp = client.get(f"/api/repositories/{repo.id}/pull-requests", headers=auth_headers)
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    def test_sync_blocked_for_demo(self, client, auth_headers, db):
        repo = db.query(Repository).first()
        resp = client.post(f"/api/repositories/{repo.id}/sync", headers=auth_headers)
        assert resp.status_code == 400

    def test_delete_repo_cascades(self, client, auth_headers, db):
        repo = db.query(Repository).filter(Repository.name == "FinanceTracker").first()
        resp = client.delete(f"/api/repositories/{repo.id}", headers=auth_headers)
        assert resp.status_code == 200
        assert db.query(Repository).filter(Repository.id == repo.id).first() is None


class TestPullRequests:
    def test_get_pr(self, client, auth_headers, db):
        pr = db.query(PullRequest).first()
        resp = client.get(f"/api/pull-requests/{pr.id}", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["title"]

    def test_trigger_review(self, client, auth_headers, db):
        pr = db.query(PullRequest).first()
        resp = client.post(f"/api/pull-requests/{pr.id}/review", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["status"] in ("pending", "processing", "completed")

    def test_list_reviews(self, client, auth_headers, db):
        pr = db.query(PullRequest).join(Review).first()
        resp = client.get(f"/api/pull-requests/{pr.id}/reviews", headers=auth_headers)
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
