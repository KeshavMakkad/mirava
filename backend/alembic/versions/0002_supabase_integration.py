"""Supabase integration: auth.users link + signup triggers, leaderboard views,
extra indexes and row-level security.

The React client only talks to Supabase for auth; the FastAPI backend connects
as the `postgres` role and owns all writes. RLS is enabled on every table with
no policies, so the public anon key can't read or write anything directly.

Revision ID: 0002
Revises: 0001
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0002"
down_revision: str | Sequence[str] | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

TABLES = [
    "profiles", "questions", "quiz_sessions", "quiz_attempts", "badges", "player_badges",
    "game_scores", "user_state", "classrooms", "classroom_members", "assignments",
    "assignment_results", "news",
]


def upgrade() -> None:
    op.execute("""
        alter table public.profiles
            add constraint profiles_id_auth_users_fkey
            foreign key (id) references auth.users(id) on delete cascade;
    """)

    # A profile is created for every new auth user (email, magic link or
    # anonymous guest). Username collisions get a numeric suffix. Only
    # tourist/student/teacher can be self-selected; admin is granted manually.
    op.execute("""
        create or replace function public.handle_new_user()
        returns trigger language plpgsql security definer set search_path = public as $$
        declare
            base_name   text;
            final_name  text;
            wanted_role text;
            n int := 0;
        begin
            base_name := lower(regexp_replace(
                coalesce(new.raw_user_meta_data->>'username',
                         split_part(coalesce(new.email, ''), '@', 1), ''),
                '[^a-zA-Z0-9_]', '', 'g'));
            if base_name = '' then
                base_name := 'explorer' || substr(replace(new.id::text, '-', ''), 1, 6);
            end if;
            base_name := left(base_name, 24);
            final_name := base_name;
            while exists (select 1 from public.profiles where username = final_name) loop
                n := n + 1;
                final_name := base_name || n;
            end loop;

            wanted_role := coalesce(new.raw_user_meta_data->>'role', 'tourist');
            if wanted_role not in ('tourist', 'student', 'teacher') then
                wanted_role := 'tourist';
            end if;

            insert into public.profiles (id, username, display_name, email, role, is_guest)
            values (
                new.id,
                final_name,
                coalesce(nullif(new.raw_user_meta_data->>'display_name', ''),
                         nullif(new.raw_user_meta_data->>'username', ''),
                         case when coalesce(new.is_anonymous, false) then 'Guest Explorer' end,
                         final_name),
                new.email,
                wanted_role,
                coalesce(new.is_anonymous, false)
            );
            return new;
        end $$;

        create trigger on_auth_user_created
            after insert on auth.users
            for each row execute function public.handle_new_user();
    """)

    # Keep email / guest flag in sync, e.g. when a guest upgrades to a real account.
    op.execute("""
        create or replace function public.handle_user_updated()
        returns trigger language plpgsql security definer set search_path = public as $$
        begin
            update public.profiles
               set email    = new.email,
                   is_guest = coalesce(new.is_anonymous, false)
             where id = new.id
               and (email is distinct from new.email
                    or is_guest is distinct from coalesce(new.is_anonymous, false));
            return new;
        end $$;

        create trigger on_auth_user_updated
            after update on auth.users
            for each row execute function public.handle_user_updated();
    """)

    op.execute("""
        create index ix_quiz_attempts_date_score on public.quiz_attempts (quiz_date, score desc);
        create index ix_quiz_sessions_player_date on public.quiz_sessions (player_id, quiz_date);
        create index ix_game_scores_game_score on public.game_scores (game, score desc);
        create index ix_news_published on public.news (is_published, published_at desc);
        create index ix_profiles_total_xp on public.profiles (total_xp desc);
    """)

    op.execute("""
        create view public.global_leaderboard with (security_invoker = true) as
        select
            row_number() over (order by p.total_xp desc, p.best_quiz_score desc, p.created_at) as rank,
            p.id as player_id, p.username, p.display_name, p.avatar_url,
            p.total_xp, p.best_quiz_score, p.daily_streak,
            (select count(*) from public.player_badges pb where pb.player_id = p.id) as badges_count
        from public.profiles p
        where not p.is_guest;
    """)

    # RLS on with no policies = deny-all for Supabase's anon/authenticated
    # roles, so the public publishable key can't read (e.g. emails) or write
    # anything through the auto-generated REST API. The backend connects as the
    # table owner, which bypasses RLS.
    for table in TABLES:
        op.execute(f"alter table public.{table} enable row level security;")
    op.execute("revoke all on public.global_leaderboard from anon, authenticated;")


def downgrade() -> None:
    op.execute("""
        drop view if exists public.global_leaderboard;
        drop trigger if exists on_auth_user_updated on auth.users;
        drop trigger if exists on_auth_user_created on auth.users;
        drop function if exists public.handle_user_updated();
        drop function if exists public.handle_new_user();
        drop index if exists public.ix_quiz_attempts_date_score;
        drop index if exists public.ix_quiz_sessions_player_date;
        drop index if exists public.ix_game_scores_game_score;
        drop index if exists public.ix_news_published;
        drop index if exists public.ix_profiles_total_xp;
        alter table public.profiles drop constraint if exists profiles_id_auth_users_fkey;
    """)
    for table in TABLES:
        op.execute(f"alter table public.{table} disable row level security;")
