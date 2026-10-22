import json
from functools import lru_cache
from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


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

    # Accepts a JSON list, a comma-separated list, or a single URL.
    cors_origins: Annotated[list[str], NoDecode] = ["http://localhost:5173"]

    # Daily quiz rolls over at midnight in this timezone.
    quiz_timezone: str = "Asia/Kolkata"

    openrouter_api_key: str | None = None
    openrouter_model: str = "openai/gpt-4o-mini"
    # Must be vision-capable (used by Sentinel's photo screening).
    sentinel_vision_model: str = "openai/gpt-4o-mini"
    ai_requests_per_minute: int = 10

    # Supabase secret key (sb_secret_… / legacy service_role). Server-only: used
    # to store Rasoi Rescue recipe photos/audio in a private Storage bucket.
    supabase_secret_key: str | None = None
    recipe_media_bucket: str = "mirava-recipe-media"

    # Public URL of the frontend, used in links inside emails when the request
    # has no allowed Origin header. Defaults to the first CORS origin.
    site_url: str | None = None

    # Outgoing email for auth links. Preferred: the Google Apps Script web app in
    # email/apps-script (sends from a Google account, logs to a Sheet).
    apps_script_url: str | None = None
    apps_script_secret: str | None = None
    # Alternatives: SMTP (e.g. Gmail: smtp.gmail.com, port 465, address + app
    # password) or a Resend API key.
    smtp_host: str | None = None
    smtp_port: int = 465
    smtp_username: str | None = None
    smtp_password: str | None = None
    resend_api_key: str | None = None
    # Sender, e.g. "Mirava <hello@yourdomain.com>". Defaults to the SMTP username.
    email_from: str | None = None

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _parse_origins(cls, v: object) -> object:
        if not isinstance(v, str):
            return v
        v = v.strip()
        if not v:
            return ["http://localhost:5173"]
        if v.startswith("["):
            try:
                v = json.loads(v)
            except ValueError:
                v = v.strip("[]")
        items = v if isinstance(v, list) else v.split(",")
        # Browsers send Origin without a trailing slash; quotes come from copy/paste.
        return [str(o).strip().strip("'\"").rstrip("/") for o in items if str(o).strip().strip("'\"")]


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
