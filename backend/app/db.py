from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings


class Base(DeclarativeBase):
    pass


def make_engine(url: str):
    # prepare_threshold=None keeps psycopg compatible with Supabase's
    # transaction-mode pooler (pgbouncer), which can't hold prepared statements.
    return create_engine(
        url,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=5,
        connect_args={"prepare_threshold": None},
    )


engine = make_engine(get_settings().database_url)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Iterator[Session]:
    """Request-scoped session. Routes commit explicitly; anything left
    uncommitted (e.g. after an exception) is rolled back on close."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
