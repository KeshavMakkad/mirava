# Mirava — Living Indian Heritage

Mirava started as a set of static HTML pages from a hackathon. It is now a full application. The original HTML isn't in this repo because it contained leaked API keys.

| Layer | Stack | Folder |
|---|---|---|
| Frontend | Vite + React 19 + TypeScript, React Router, TanStack Query | [`frontend/`](frontend/) |
| Backend | FastAPI, SQLAlchemy 2, Alembic, psycopg 3 | [`backend/`](backend/) |
| Auth + DB | Supabase (Auth + Postgres) | — |

```
Browser ──(email/password · magic link · guest)──▶ Supabase Auth
   │                                                   │ JWT
   └──── /api/* + Bearer <Supabase access token> ──▶ FastAPI ──▶ Supabase Postgres
                                                       └──▶ OpenRouter (AI, server-side key)
```

The browser talks to Supabase **only for auth**. All data, including quiz scoring, leaderboards, classrooms,
the admin CMS and AI chat, goes through FastAPI. FastAPI verifies the Supabase JWT and connects to Postgres
directly. RLS is enabled on every table with no policies, so the public key can't read or write tables
through Supabase's REST API.

## Features

- **Explore**: the heritage atlas (Leaflet map), time travel, civilizations, festival calendar, language
  revival, interactive museum and newsroom. The newsroom shows stories published from the admin console.
- **Daily quiz**: 10 questions a day from a 1,000-question bank, the same set for everyone. Scoring is
  done on the server: answers are revealed only after you answer, and timing is measured by the server.
  Streaks, badges, XP, and daily and global leaderboards.
- **Mini-apps**: Lost Legends of Bharat, Sentinel (monument health scanner), Rasoi Rescue, Vedic Maths /
  The Ancient Heist, Bhāṣā (translator), JalParampara and Quiz Arena. Scores feed XP and the game leaderboards.
- **Classroom**: teachers create classes (join codes), browse the question bank, and assign homework to
  one student or a whole class (10 per day). Students join, take the homework, and review their answers.
- **Admin console** (role `admin`): heritage news CMS, question manager, user roles, stats, and JSON
  export/import.
- **Auth**: email + password (with confirmation and password reset), magic link, and guest mode. A
  guest can upgrade to a full account and keep their progress.

## Setup

### 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. **Authentication → Sign In / Providers**: enable **Email** (keep "Confirm email" on) and
   **Allow anonymous sign-ins** (needed for guest mode).
3. **Authentication → URL Configuration**:
   - Site URL: `http://localhost:5173` (your production URL later)
   - Redirect URLs: `http://localhost:5173/**` (and the same for production). This covers
     `/auth/callback` (magic links, confirmations) and `/reset-password` (password reset, and the
     guest-upgrade step where a guest sets their password after verifying their email).
4. Collect these values:
   - Project URL and **publishable key** (Project Settings → API Keys), for the frontend.
   - Database connection string, for the backend. Use the **Session pooler** or direct connection
     (Project Settings → Database). Change the scheme to `postgresql+psycopg://`.

### 2. Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env          # fill in DATABASE_URL, SUPABASE_URL, OPENROUTER_API_KEY
alembic upgrade head          # creates tables, auth triggers, RLS; seeds badges + 1,000 questions
uvicorn app.main:app --reload # http://localhost:8000/docs
```

Migrations live in [`backend/alembic/versions/`](backend/alembic/versions/):

- `0001`: tables (generated from [`app/models.py`](backend/app/models.py))
- `0002`: Supabase integration: `profiles.id → auth.users`, a trigger that creates a profile on signup
  (email, magic link or guest), syncs the profile when a guest upgrades, adds the leaderboard view,
  indexes, and deny-all RLS
- `0003`: seed badges and the question bank

After changing models, run `alembic revision --autogenerate -m "..."`. The `auth` schema is excluded
from autogenerate.

**Make yourself an admin.** Sign up in the app, then run this in the Supabase SQL editor:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env   # VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY
npm run dev            # http://localhost:5173 (proxies /api → :8000)
```

For production, set `VITE_API_URL` to the backend URL and add the frontend origin to the backend's
`CORS_ORIGINS`.

## Tests

The backend integration tests run against a throwaway local Postgres. They install a small stand-in
for Supabase's `auth` schema ([`backend/scripts/local_supabase_stub.sql`](backend/scripts/local_supabase_stub.sql)),
run the Alembic migrations, and mint HS256 JWTs.

```bash
createdb mirava_test
TEST_DATABASE_URL=postgresql+psycopg://postgres@localhost:5432/mirava_test pytest
```

**Never** point `TEST_DATABASE_URL` at a Supabase project, because the tests drop the `public` schema.

## API overview

All endpoints are under `/api`. Interactive docs are at `/docs`.

| Area | Endpoints |
|---|---|
| Me | `GET/PATCH /me`, `GET/PUT/DELETE /me/state/{key}` (per-user progress) |
| Quiz | `GET /quiz/daily/status`, `POST /quiz/daily/start`, `POST /quiz/practice/start`, `POST /quiz/sessions/{id}/answer · next · finish`, `GET /quiz/topics` |
| Leaderboards | `GET /leaderboard/global · daily · games/{game}` |
| Games | `POST /games/{game}/scores`, `GET /games/{game}/scores/me` |
| Classroom | `POST/GET /classrooms`, `POST /classrooms/join`, `GET /questions`, `POST /classrooms/{id}/assignments`, `GET /assignments`, `POST /assignments/{id}/submit`, … |
| News | `GET /news` |
| Admin | `/admin/stats · news · questions · users` |
| AI | `POST /ai/chat` (OpenRouter proxy, rate-limited per user) |

## Security notes

- The legacy pages hard-coded an OpenRouter API key (`sk-or-v1-01ab…`) and admin credentials in
  client-side JavaScript. **Revoke that OpenRouter key.** It has been published. In the new app, the
  key exists only in the backend's `.env`.
- Roles are enforced on the server. Users can pick `tourist`, `student` or `teacher`. Only an
  existing admin, or SQL, can grant `admin`.
