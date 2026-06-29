from datetime import datetime

from pydantic import BaseModel


class UserOut(BaseModel):
    id: int
    github_id: int
    username: str
    email: str | None
    avatar_url: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class RepositoryOut(BaseModel):
    id: int
    github_id: int
    name: str
    full_name: str
    description: str | None
    is_active: bool
    created_at: datetime
    open_pr_count: int = 0
    webhook_active: bool = False

    model_config = {"from_attributes": True}


class PullRequestOut(BaseModel):
    id: int
    github_id: int
    number: int
    title: str
    state: str
    author: str | None
    repository_id: int
    created_at: datetime
    has_review: bool = False

    model_config = {"from_attributes": True}


class ReviewOut(BaseModel):
    id: int
    pull_request_id: int
    status: str
    summary: str | None
    security_score: float | None
    suggestions: list[str] = []
    security_issues: list[str] = []
    bug_explanations: list[str] = []
    created_at: datetime

    model_config = {"from_attributes": True}


class DashboardStats(BaseModel):
    total_repositories: int
    open_pull_requests: int
    reviews_completed: int
    avg_security_score: float | None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class ImportRepoRequest(BaseModel):
    full_name: str
