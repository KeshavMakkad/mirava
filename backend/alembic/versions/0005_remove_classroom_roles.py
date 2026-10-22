"""Remove the classroom feature and self-service roles.

Every account is now a plain 'member'; 'admin' is still granted manually.
Classroom tables (classrooms, members, assignments, results) are dropped.

Revision ID: 0005
Revises: 0004
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0005"
down_revision: str | Sequence[str] | None = "0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("drop table if exists public.assignment_results, public.assignments, "
               "public.classroom_members, public.classrooms cascade")

    op.execute("alter table public.profiles drop constraint if exists profiles_role_check")
    op.execute("update public.profiles set role = 'member' where role <> 'admin'")
    op.execute("alter table public.profiles alter column role set default 'member'")
    op.execute("alter table public.profiles add constraint profiles_role_check check (role in ('member','admin'))")

    # Same as 0002's trigger, minus the role picked at signup.
    op.execute("""
        create or replace function public.handle_new_user()
        returns trigger language plpgsql security definer set search_path = public as $$
        declare
            base_name  text;
            final_name text;
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

            insert into public.profiles (id, username, display_name, email, role, is_guest)
            values (
                new.id,
                final_name,
                coalesce(nullif(new.raw_user_meta_data->>'display_name', ''),
                         nullif(new.raw_user_meta_data->>'username', ''),
                         final_name),
                new.email,
                'member',
                coalesce(new.is_anonymous, false)
            );
            return new;
        end $$;
    """)


def downgrade() -> None:
    op.execute("alter table public.profiles drop constraint if exists profiles_role_check")
    op.execute("update public.profiles set role = 'tourist' where role = 'member'")
    op.execute("alter table public.profiles alter column role set default 'tourist'")
    op.execute("alter table public.profiles add constraint profiles_role_check "
               "check (role in ('tourist','student','teacher','admin'))")
    # Classroom tables are not recreated; restore from a backup if needed.
