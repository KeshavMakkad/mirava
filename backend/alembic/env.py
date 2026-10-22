from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine, pool

from app import models  # noqa: F401  (registers tables on Base.metadata)
from app.config import get_settings
from app.db import Base

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


# Created with raw SQL in migrations (0002/0004), not declared on the models.
MANUAL_OBJECTS = {
    "profiles_id_auth_users_fkey", "ix_quiz_attempts_date_score", "ix_quiz_sessions_player_date",
    "ix_game_scores_game_score", "ix_news_published", "ix_profiles_total_xp", "ix_recipes_shared",
}


def include_object(obj, name, type_, reflected, compare_to):
    # Supabase owns the auth/storage/realtime schemas; never autogenerate for them.
    if reflected and compare_to is None and name in MANUAL_OBJECTS:
        return False
    return getattr(obj, "schema", None) in (None, "public")


def run_migrations_offline() -> None:
    context.configure(
        url=get_settings().database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=include_object,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = create_engine(
        get_settings().database_url, poolclass=pool.NullPool, connect_args={"prepare_threshold": None}
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata, include_object=include_object)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
