from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Postgres connection string of the Supabase project, e.g.
    # postgresql+psycopg://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
    database_url: str

    # https://<ref>.supabase.co — used to fetch the JWKS that signs user tokens.
    supabase_url: str
    # Legacy HS256 JWT secret (Project Settings → API → JWT secret). Optional when
    # the project uses asymmetric JWT signing keys (verified through JWKS).
    supabase_jwt_secret: str | None = None

    cors_origins: list[str] = ["http://localhost:5173"]

    # Daily quiz rolls over at midnight in this timezone.
    quiz_timezone: str = "Asia/Kolkata"

    openrouter_api_key: str | None = None
    openrouter_model: str = "openai/gpt-4o-mini"
    ai_requests_per_minute: int = 10


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
