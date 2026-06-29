import hashlib
import hmac

import httpx

from app.config import settings

GITHUB_API = "https://api.github.com"
GITHUB_OAUTH = "https://github.com/login/oauth"


class GitHubAPIError(Exception):
    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        self.message = message
        super().__init__(message)


class GitHubService:
    def __init__(self, access_token: str | None = None):
        self.access_token = access_token
        self.headers = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }
        if access_token:
            self.headers["Authorization"] = f"Bearer {access_token}"

    async def _request(self, method: str, url: str, **kwargs) -> httpx.Response:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.request(method, url, headers=self.headers, **kwargs)
        if not resp.is_success:
            detail = resp.text[:200] if resp.text else resp.reason_phrase
            raise GitHubAPIError(resp.status_code, detail)
        return resp

    async def exchange_code(self, code: str) -> dict:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{GITHUB_OAUTH}/access_token",
                data={
                    "client_id": settings.github_client_id,
                    "client_secret": settings.github_client_secret,
                    "code": code,
                },
                headers={"Accept": "application/json"},
            )
        if not resp.is_success:
            raise GitHubAPIError(resp.status_code, "OAuth token exchange failed")
        return resp.json()

    async def get_user(self) -> dict:
        resp = await self._request("GET", f"{GITHUB_API}/user")
        return resp.json()

    async def get_user_emails(self) -> list[dict]:
        resp = await self._request("GET", f"{GITHUB_API}/user/emails")
        return resp.json()

    async def list_repos(self, page: int = 1, per_page: int = 100) -> list[dict]:
        resp = await self._request(
            "GET",
            f"{GITHUB_API}/user/repos",
            params={"page": page, "per_page": per_page, "sort": "updated"},
        )
        return resp.json()

    async def get_repo(self, full_name: str) -> dict:
        resp = await self._request("GET", f"{GITHUB_API}/repos/{full_name}")
        return resp.json()

    async def list_pull_requests(self, full_name: str, state: str = "all") -> list[dict]:
        resp = await self._request(
            "GET",
            f"{GITHUB_API}/repos/{full_name}/pulls",
            params={"state": state, "per_page": 50},
        )
        return resp.json()

    async def create_webhook(self, full_name: str) -> dict:
        webhook_url = f"{settings.backend_url}/api/webhooks/github"
        payload = {
            "name": "web",
            "active": True,
            "events": ["pull_request"],
            "config": {
                "url": webhook_url,
                "content_type": "json",
                "secret": settings.github_webhook_secret,
                "insecure_ssl": "0",
            },
        }
        resp = await self._request(
            "POST", f"{GITHUB_API}/repos/{full_name}/hooks", json=payload
        )
        return resp.json()

    async def delete_webhook(self, full_name: str, hook_id: int) -> None:
        await self._request("DELETE", f"{GITHUB_API}/repos/{full_name}/hooks/{hook_id}")

    async def get_pr_files(self, full_name: str, number: int) -> list[dict]:
        resp = await self._request(
            "GET", f"{GITHUB_API}/repos/{full_name}/pulls/{number}/files"
        )
        return resp.json()

    async def get_pr_diff(self, full_name: str, number: int) -> str:
        headers = {**self.headers, "Accept": "application/vnd.github.diff"}
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.get(
                f"{GITHUB_API}/repos/{full_name}/pulls/{number}",
                headers=headers,
            )
        if not resp.is_success:
            raise GitHubAPIError(resp.status_code, "Failed to fetch PR diff")
        return resp.text


def verify_webhook_signature(payload: bytes, signature: str | None) -> bool:
    if not signature or not settings.github_webhook_secret:
        return False
    expected = "sha256=" + hmac.new(
        settings.github_webhook_secret.encode(),
        payload,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


def is_demo_token(access_token: str) -> bool:
    return access_token in ("demo-token", "")
