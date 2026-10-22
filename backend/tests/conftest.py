"""Integration tests run against a real Postgres.

Set TEST_DATABASE_URL to an EMPTY local database (never a Supabase project).
The fixture installs a tiny stand-in for Supabase's `auth` schema
(scripts/local_supabase_stub.sql), runs the Alembic migrations, and mints
HS256 tokens the way Supabase's legacy JWT secret does.
"""

import os
import time
import uuid
from pathlib import Path

import jwt
import pytest

TEST_DB = os.environ.get("TEST_DATABASE_URL")
JWT_SECRET = "test-secret-test-secret-test-secret-123"

os.environ["DATABASE_URL"] = TEST_DB or "postgresql+psycopg://unused@localhost/unused"
os.environ["SUPABASE_URL"] = "http://localhost:54321"
os.environ["SUPABASE_JWT_SECRET"] = JWT_SECRET
os.environ["OPENROUTER_API_KEY"] = ""
os.environ["SUPABASE_SECRET_KEY"] = ""  # never touch real Storage/Auth from tests
for _k in ("APPS_SCRIPT_URL", "APPS_SCRIPT_SECRET", "SMTP_HOST", "SMTP_USERNAME", "SMTP_PASSWORD", "RESEND_API_KEY", "EMAIL_FROM"):
    os.environ[_k] = ""  # never send real email from tests

from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine, text  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture(scope="session")
def engine():
    if not TEST_DB:
        pytest.skip("TEST_DATABASE_URL not set")
    eng = create_engine(TEST_DB)
    with eng.begin() as conn:
        conn.execute(text("drop schema if exists public cascade; create schema public;"))
        conn.execute(text("drop schema if exists auth cascade;"))
        conn.exec_driver_sql((ROOT / "scripts" / "local_supabase_stub.sql").read_text())
    command.upgrade(Config(str(ROOT / "alembic.ini")), "head")
    yield eng
    eng.dispose()


@pytest.fixture
def clean(engine):
    yield
    with engine.begin() as conn:
        conn.execute(text("delete from auth.users; delete from public.news; delete from public.questions where source = 'admin';"))


@pytest.fixture
def client(engine, clean):
    from app.main import app

    return TestClient(app)


@pytest.fixture
def make_user(engine):
    """Create an auth user (the trigger makes the profile) and return
    (user_id, auth headers)."""

    def _make(username: str | None = None, role: str = "tourist", anonymous: bool = False, admin: bool = False):
        uid = uuid.uuid4()
        email = None if anonymous else f"{username or uid.hex[:8]}@example.com"
        with engine.begin() as conn:
            conn.execute(
                text("insert into auth.users (id, email, raw_user_meta_data, is_anonymous) "
                     "values (:id, :email, cast(:meta as jsonb), :anon)"),
                {"id": uid, "email": email, "anon": anonymous,
                 "meta": f'{{"username": "{username or ""}", "role": "{role}"}}'},
            )
            if admin:
                conn.execute(text("update profiles set role = 'admin' where id = :id"), {"id": uid})
        token = jwt.encode(
            {"sub": str(uid), "aud": "authenticated", "role": "authenticated",
             "exp": int(time.time()) + 3600, "is_anonymous": anonymous},
            JWT_SECRET, algorithm="HS256",
        )
        return uid, {"Authorization": f"Bearer {token}"}

    return _make
