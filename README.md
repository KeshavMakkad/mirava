# Mirava — Living Indian Heritage

Mirava started as a set of static HTML pages from a hackathon. It is now a full application. The original HTML isn't in this repo because it contained leaked API keys.

| Layer | Stack | Folder |
|---|---|---|
| Frontend | Vite + React 19 + TypeScript, React Router, TanStack Query | [`frontend/`](frontend/) |
| Backend | FastAPI, SQLAlchemy 2, Alembic, psycopg 3 | [`backend/`](backend/) |
| Auth + DB | Supabase (Auth + Postgres) | — |

```
Browser ──(email/password · magic link · Google)──▶ Supabase Auth
   │                                                   │ JWT
   └──── /api/* + Bearer <Supabase access token> ──▶ FastAPI ──▶ Supabase Postgres
                                                       ├──▶ Supabase Storage (private recipe media)
                                                       ├──▶ Apps Script emailer (auth emails, logged to a Sheet)
                                                       └──▶ OpenRouter (AI, server-side key)
```

The browser talks to Supabase **only for auth**. All data, including quiz scoring, leaderboards, classrooms,
the admin CMS and AI chat, goes through FastAPI. FastAPI verifies the Supabase JWT and connects to Postgres
directly. RLS is enabled on every table with no policies, so the public key can't read or write tables
through Supabase's REST API.

## Features

- **English / हिंदी**: a site-wide language toggle. A translation runtime ([`frontend/src/i18n/`](frontend/src/i18n/))
  translates the rendered page from a 10,700-entry dictionary (`frontend/public/locales/`). The choice is
  remembered per browser and saved to the profile.
- **Explore**: interactive 3D globe hero, the heritage atlas (Leaflet map), the Chronoscope time machine with a
  "Then & Now" year comparator, civilizations, a 2026 festival calendar with verified dates, an interactive
  museum, and a newsroom fed by the admin console (with optional Hindi versions of each story).
- **Daily quiz**: 10 questions a day from a 1,000-question bank, the same set for everyone. Scoring is
  done on the server: answers are revealed only after you answer, and timing is measured by the server.
  Streaks, badges, XP, and daily and global leaderboards.
- **Mini-apps**: Scores from all of these feed XP and the game leaderboards.
  - **Lost Legends of Bharat**: an open-world game with martial-arts arenas, Trials and the 3D Monument Gallery (press **R**). A classic edition is also included.
  - **Sentinel**: a monument health scanner with AI vision screening of photos.
  - **Rasoi Rescue**: a 100-recipe heritage book. Each user has a private family-recipe vault with photos and voice notes, and can share recipes publicly. Every shared recipe passes an AI safety screen first.
  - **Vedic Maths / The Ancient Heist**: includes daily habit drills.
  - **Bhāṣā**: a translator with guided language lessons.
  - **JalParampara**: includes a water-strategy mission.
  - **Quiz Arena**: has its Hall of Scholars leaderboard.
- **Admin console** (role `admin`): heritage news CMS, question manager, user roles, stats, and JSON
  export/import.
- **Auth**: email + password (with email confirmation and password reset), magic link, and Google. Auth
  emails are sent by Mirava's own emailer: Supabase generates the one-time links, and a Google Apps Script
  web app delivers them ([`email/apps-script/`](email/apps-script/)), so Supabase's mailer rate limit doesn't apply.
- **Profile**: a profile symbol, bio, location, preferred language, stats, badges and leaderboards.

## Setup

### 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. **Authentication → Sign In / Providers**: enable **Email** (keep "Confirm email" on). For **Google**, create an OAuth client in Google
   Cloud Console with the redirect URI `https://<project-ref>.supabase.co/auth/v1/callback`, then paste its
   client ID and secret into Supabase's Google provider.
3. **Storage**: create a **private** bucket named `mirava-recipe-media` (for recipe photos and audio).
4. **Authentication → URL Configuration**:
   - Site URL: `http://localhost:5173` (your production URL later)
   - Redirect URLs: `http://localhost:5173/**` (and the same for production). This covers
     `/auth/callback` (Google sign-in). Links in emails go to `/auth/confirm`, which is built by the backend.
5. Collect these values:
   - Project URL and **publishable key** (Project Settings → API Keys), for the frontend.
   - **Secret key** (`sb_secret_…`, same page), for the backend. It's used only to read and write the private media bucket.
   - Database connection string, for the backend. Use the **Session pooler** or direct connection
     (Project Settings → Database). Change the scheme to `postgresql+psycopg://`.

### 2. Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env          # DATABASE_URL, SUPABASE_URL, SUPABASE_SECRET_KEY, OPENROUTER_API_KEY
alembic upgrade head          # creates tables, auth triggers, RLS; seeds badges + 1,000 questions
uvicorn app.main:app --reload # http://localhost:8000/docs
```

Migrations live in [`backend/alembic/versions/`](backend/alembic/versions/):

- `0001`: tables (generated from [`app/models.py`](backend/app/models.py))
- `0002`: Supabase integration: `profiles.id → auth.users`, a trigger that creates a profile on signup
  (email, magic link or Google), keeps the profile's email in sync, adds the leaderboard view,
  indexes, and deny-all RLS
- `0003`: seed badges and the question bank
- `0004`: profile symbol, bio, location and language; Hindi news fields; the recipe vault and media tables
- `0005`: remove the classroom feature; every account is a `member` (`admin` is granted manually)

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

## Deploy

The backend runs on **Render** using [`render.yaml`](render.yaml) and the Docker image. The container runs
`alembic upgrade head` on start. The frontend runs on **Vercel** using [`frontend/vercel.json`](frontend/vercel.json).

1. **Render** → New → Blueprint → pick this repo. Set the environment variables: `DATABASE_URL`,
   `SUPABASE_SECRET_KEY`, `OPENROUTER_API_KEY`, `CORS_ORIGINS` and `SITE_URL` (your Vercel URL), and
   `APPS_SCRIPT_URL` and `APPS_SCRIPT_SECRET` (see [`email/apps-script/README.md`](email/apps-script/README.md)).
2. **Vercel** → New Project → this repo, **Root Directory `frontend`**. Set `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_API_URL` (the Render URL).
3. **Supabase** → URL Configuration: add `https://<vercel-domain>/**` and set it as the Site URL.

Render's free tier sleeps after 15 minutes idle, and the first request after that takes about 50 seconds.

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
| Auth emails | `POST /auth/signup`, `POST /auth/magic-link`, `POST /auth/password-reset` |
| News | `GET /news` |
| Admin | `/admin/stats · news · questions · users` |
| Rasoi | `GET/POST /rasoi/recipes`, `DELETE /rasoi/recipes/{id}`, `GET /rasoi/public`, `POST /rasoi/review`, `GET/PUT/DELETE /rasoi/recipes/{id}/media/{media_id}` |
| Sentinel | `POST /sentinel/vision` (AI photo screening) |
| AI | `POST /ai/chat` (OpenRouter proxy, rate-limited per user) |

## Security notes

- The legacy pages hard-coded an OpenRouter API key (`sk-or-v1-01ab…`) and admin credentials in
  client-side JavaScript. **Revoke that OpenRouter key.** It has been published. In the new app, the
  key exists only in the backend's `.env`.
- Roles are enforced on the server. Every account is a `member`; only an existing admin, or SQL, can
  grant `admin`.
