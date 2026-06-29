from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parent.parent
_PROJECT_ROOT = _BACKEND_DIR.parent
_ENV_FILES = [
    p for p in (_PROJECT_ROOT / ".env", _BACKEND_DIR / ".env", Path(".env"))
    if p.is_file()
]


class Settings(BaseSettings):
    github_client_id: str = ""
    github_client_secret: str = ""
    github_webhook_secret: str = ""
    openai_api_key: str = ""
    frontend_url: str = "http://localhost:3000"
    backend_url: str = "http://localhost:8000"
    jwt_secret: str = "dev-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7
    database_url: str = "sqlite:///./devflow.db"
    redis_url: str = "redis://localhost:6379/0"
    allow_demo_login: bool = True
    environment: str = "development"
    port: int = 8000

    model_config = SettingsConfigDict(
        env_file=_ENV_FILES or ".env",
        extra="ignore",
    )

    @property
    def is_production(self) -> bool:
        return self.environment.lower() in ("production", "prod")

    @property
    def cors_origins(self) -> list[str]:
        origins = {self.frontend_url, "http://localhost:3000"}
        return [o for o in origins if o]


settings = Settings()
