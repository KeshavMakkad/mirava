/**
 * Profile & leaderboards. New page (no legacy counterpart) in the legacy
 * site's visual language: cream / wine / gold, Playfair headings, DM Mono labels.
 */
import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { AccountMenu } from '../../components/AccountMenu'
import { LeaderboardPanel } from '../../components/leaderboard/LeaderboardPanel'
import { PageScope } from '../../components/PageScope'
import { PROFILE_SYMBOLS, ProfileSymbolIcon } from '../../components/ProfileSymbol'
import { DailyQuizModal } from '../../components/quiz/DailyQuizModal'
import { setLanguageAsync, useLanguage } from '../../i18n'
import { ApiError, api, type Badge, type Me, type Profile, type ProfileSymbol, type Role } from '../../lib/api'
import './profile.page.css'

/** Badge catalogue (mirrors the backend seed) so locked badges can be shown too. */
const BADGE_CATALOG: Badge[] = [
  { badge_key: 'heritage_scholar', name: 'Heritage Scholar', description: 'Score 8/10 or higher in a daily quiz.', icon: '📚' },
  { badge_key: 'perfect_explorer', name: 'Perfect Explorer', description: 'Get 10/10 in a daily quiz.', icon: '🏆' },
  { badge_key: 'swift_scholar', name: 'Swift Scholar', description: 'Score 8/10+ in under 90 seconds.', icon: '⚡' },
  { badge_key: 'seven_day_streak', name: '7-Day Streak', description: 'Complete daily quizzes 7 days in a row.', icon: '🔥' },
  { badge_key: 'heritage_legend', name: 'Heritage Legend', description: 'Maintain a 30-day streak.', icon: '👑' },
  { badge_key: 'five_perfects', name: 'Five Perfects', description: 'Complete five perfect daily quizzes.', icon: '💎' },
  { badge_key: 'legend_finder', name: 'Legend Finder', description: 'Complete Lost Legends of Bharat.', icon: '🪔' },
  { badge_key: 'shivaji_warrior', name: "Shivaji's Warrior", description: 'Finish the Shivaji fort challenge.', icon: '⚔️' },
]

const ROLES: { value: Exclude<Role, 'admin'>; label: string; hint: string }[] = [
  { value: 'tourist', label: 'Tourist', hint: 'Exploring India’s heritage' },
  { value: 'student', label: 'Student', hint: 'Join classrooms & homework' },
  { value: 'teacher', label: 'Teacher', hint: 'Create classrooms & assign quizzes' },
]

const USERNAME_RE = /^[a-z0-9_]{3,24}$/

function formatDate(iso: string, lang: 'en' | 'hi' = 'en') {
  return new Date(iso).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const LANGUAGE_NAMES = { en: 'English', hi: 'हिन्दी' } as const
const BIO_MAX = 600
const LOCATION_MAX = 100
const NAME_MAX = 40
/** Same rules as the 2026 profile.js: no markup or control characters. */
// eslint-disable-next-line no-control-regex
const UNSAFE_LINE = /[<>\u0000-\u001f\u007f]/
// eslint-disable-next-line no-control-regex
const UNSAFE_TEXT = /[<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/

export default function ProfilePage() {
  const { me } = useAuth()
  return (
    <PageScope name="profile" title="Your profile · Mirava">
      <header className="pf-top">
        <Link className="pf-logo" to="/explore">
          mira<i>va</i>
        </Link>
        <Link className="pf-back" to="/explore">
          ← Back to Explore
        </Link>
        <div className="pf-top-r">
          <Link className="pf-navlink" to="/quiz">
            Quiz Arena
          </Link>
          <AccountMenu />
        </div>
      </header>
      {me ? (
        <ProfileBody me={me} />
      ) : (
        <div className="mv-spinner-page" role="status">
          <div className="mv-spinner" />
          <span>Loading your profile…</span>
        </div>
      )}
    </PageScope>
  )
}

function ProfileBody({ me }: { me: Me }) {
  const { isGuest } = useAuth()
  const lang = useLanguage()
  const [quizOpen, setQuizOpen] = useState(false)
  const [saved, setSaved] = useState(false)
  const p = me.profile
  const name = p.display_name || p.username
  const accuracy = p.total_questions ? Math.round((p.total_correct / p.total_questions) * 100) : null

  return (
    <main className="pf-wrap">
      <section className="pf-hero">
        <div className="pf-card pf-id">
          <div className="pf-mandala" aria-hidden />
          <div className="pf-avatar" aria-hidden>
            <ProfileSymbolIcon symbol={p.avatar} />
          </div>
          <div className="pf-id-text">
            <div className="pf-eyebrow">✦ {isGuest ? 'guest explorer' : 'mirava explorer'}</div>
            <h1 translate="no">{name}</h1>
            <div className="pf-handle">
              @{p.username}
              <span className={`pf-role pf-role-${p.role}`}>{p.role}</span>
              {isGuest && <span className="pf-role pf-role-guest">guest</span>}
            </div>
            <div className="pf-since">Member since {formatDate(p.created_at, lang)}</div>
            {p.location && (
              <div className="pf-location">
                <span aria-hidden>⌖</span> <span translate="no">{p.location}</span>
              </div>
            )}
            {p.bio && (
              <p className="pf-bio" translate="no">
                {p.bio}
              </p>
            )}
          </div>
        </div>

        <div className="pf-stats">
          <Stat value={p.total_xp.toLocaleString()} label="Total XP" accent />
          <Stat value={me.rank ? `#${me.rank}` : '—'} label={isGuest ? 'Rank · guests unranked' : 'Global rank'} />
          <Stat value={`🔥 ${p.daily_streak}`} label={`Day streak · best ${p.longest_streak}`} />
          <Stat value={p.best_quiz_score} label="Best quiz score" />
          <Stat value={accuracy == null ? '—' : `${accuracy}%`} label={`Accuracy · ${p.total_correct}/${p.total_questions}`} />
          <Stat value={p.perfect_quizzes} label="Perfect quizzes" />
        </div>
      </section>

      <div className="pf-grid">
        <TodayQuiz onOpen={() => setQuizOpen(true)} />
        <section className="pf-card pf-pad">
          <div className="pf-eyebrow">Badges · {me.badges.length} unlocked</div>
          <h2>Your honours</h2>
          <BadgeGrid badges={me.badges} />
        </section>
      </div>

      <EditProfile key={me.profile.id} profile={me.profile} saved={saved} onSaved={setSaved} />

      <div className="pf-grid">
        {isGuest ? <UpgradeGuest /> : <AccountInfo me={me} />}
        <section className="pf-card pf-pad pf-discover">
          <span className="pf-discover-icon" aria-hidden>
            ↗
          </span>
          <h2>There is more to discover.</h2>
          <p className="pf-muted">
            Meet remarkable people, explore monuments, and put your heritage knowledge to the test.
          </p>
          <Link className="pf-btn" to="/explore">
            Back to Explore →
          </Link>
        </section>
      </div>

      <section className="pf-section">
        <div className="pf-sec-head">
          <div>
            <div className="pf-eyebrow">Leaderboards</div>
            <h2>Where you stand</h2>
          </div>
          {isGuest && (
            <p className="pf-note">
              Guests aren't ranked. <Link to="/signup" state={{ upgrade: true }}>Create an account</Link> to appear on the
              boards.
            </p>
          )}
        </div>
        <LeaderboardPanel boards={['global', 'daily', 'shivaji', 'lost-legends']} theme="light" />
      </section>

      <DailyQuizModal open={quizOpen} onClose={() => setQuizOpen(false)} />
    </main>
  )
}

function Stat({ value, label, accent }: { value: string | number; label: string; accent?: boolean }) {
  return (
    <div className={`pf-stat${accent ? ' pf-stat-accent' : ''}`}>
      <b>{value}</b>
      <small>{label}</small>
    </div>
  )
}

function TodayQuiz({ onOpen }: { onOpen: () => void }) {
  const q = useQuery({ queryKey: ['quiz', 'daily-status'], queryFn: api.quiz.dailyStatus, staleTime: 30_000 })
  const s = q.data
  const a = s?.attempt
  return (
    <section className="pf-card pf-pad pf-today">
      <span className="pf-sun" aria-hidden>
        ☀️
      </span>
      <div className="pf-eyebrow">Daily heritage quiz{s ? ` · ${s.quiz_date}` : ''}</div>
      {q.isPending ? (
        <p className="pf-muted">Checking today's challenge…</p>
      ) : q.isError ? (
        <p className="pf-error">Couldn't load today's quiz status.</p>
      ) : a ? (
        <>
          <h2>Done for today</h2>
          <p className="pf-muted">
            You scored <b>{a.correct_answers}/{a.total_questions}</b> ({a.score} pts)
            {a.time_taken_seconds != null && <> in {a.time_taken_seconds}s</>}. A new set appears at midnight.
          </p>
          <div className="pf-today-stats">
            <span>🔥 Streak {a.streak}</span>
            <span>✦ {a.score} pts</span>
          </div>
          <button type="button" className="pf-btn" onClick={onOpen}>
            View result
          </button>
        </>
      ) : (
        <>
          <h2>{s?.in_progress_session ? 'Quiz in progress' : "Today's ten"}</h2>
          <p className="pf-muted">
            {s?.total ?? 10} questions · {s?.seconds_per_question ?? 15} seconds each. The same set for every explorer
            today — one attempt. Keep your streak burning.
          </p>
          <button type="button" className="pf-btn pf-btn-gold" onClick={onOpen}>
            {s?.in_progress_session ? 'Resume quiz →' : 'Start today’s quiz →'}
          </button>
        </>
      )}
    </section>
  )
}

function BadgeGrid({ badges }: { badges: Badge[] }) {
  const lang = useLanguage()
  const owned = new Map(badges.map((b) => [b.badge_key, b]))
  const extra = badges.filter((b) => !BADGE_CATALOG.some((c) => c.badge_key === b.badge_key))
  const all = [...BADGE_CATALOG, ...extra]
  return (
    <div className="pf-badges">
      {all.map((b) => {
        const got = owned.get(b.badge_key)
        return (
          <div key={b.badge_key} className={`pf-badge${got ? '' : ' pf-locked'}`} title={b.description ?? ''}>
            <div className="pf-badge-icon">{got ? (got.icon ?? b.icon ?? '🏅') : '🔒'}</div>
            <div>
              <b>{b.name}</b>
              <small>
                {got?.unlocked_at ? `Unlocked ${formatDate(got.unlocked_at, lang)}` : (b.description ?? '')}
              </small>
            </div>
          </div>
        )
      })}
    </div>
  )
}

type FormValues = {
  avatar: ProfileSymbol
  display_name: string
  username: string
  location: string
  bio: string
  preferred_language: 'en' | 'hi'
  role: Role
}

const toForm = (p: Profile): FormValues => ({
  avatar: PROFILE_SYMBOLS.some((s) => s.id === p.avatar) ? p.avatar : 'lotus',
  display_name: p.display_name ?? '',
  username: p.username,
  location: p.location ?? '',
  bio: p.bio ?? '',
  preferred_language: p.preferred_language === 'hi' ? 'hi' : 'en',
  role: p.role,
})

type Status = { kind: 'ok' | 'error' | 'info'; text: string } | null

function EditProfile({ profile: p, saved, onSaved }: { profile: Profile; saved: boolean; onSaved: (v: boolean) => void }) {
  const { refreshMe } = useAuth()
  const [form, setForm] = useState<FormValues>(() => toForm(p))
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<Status>(null)
  const [usernameErr, setUsernameErr] = useState<string | null>(null)
  const symbolRefs = useRef<(HTMLButtonElement | null)[]>([])

  // When the server profile changes (e.g. the header language toggle saved a
  // new preferred_language), follow it for every field the user hasn't edited.
  const baseline = useRef<FormValues>(toForm(p))
  useEffect(() => {
    const next = toForm(p)
    const prev = baseline.current
    baseline.current = next
    setForm((f) => {
      const merged = { ...f }
      for (const k of Object.keys(next) as (keyof FormValues)[]) {
        if (f[k] === prev[k]) (merged as Record<string, unknown>)[k] = next[k]
      }
      return merged
    })
  }, [p])

  const isAdmin = p.role === 'admin'
  const server = toForm(p)
  const clean = (f: FormValues) => ({ ...f, display_name: f.display_name.trim(), username: f.username.trim().toLowerCase(), location: f.location.trim(), bio: f.bio.trim() })
  const cur = clean(form)
  const changed = (Object.keys(server) as (keyof FormValues)[]).filter((k) => cur[k] !== server[k])
  const dirty = changed.length > 0

  const set = <K extends keyof FormValues>(k: K, v: FormValues[K]) => {
    setForm((f) => ({ ...f, [k]: v }))
    onSaved(false)
    setStatus(null)
  }

  const onSymbolKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const step: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }
    let next: number
    if (e.key in step) next = (i + step[e.key] + PROFILE_SYMBOLS.length) % PROFILE_SYMBOLS.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = PROFILE_SYMBOLS.length - 1
    else return
    e.preventDefault()
    if (busy) return
    set('avatar', PROFILE_SYMBOLS[next].id)
    symbolRefs.current[next]?.focus()
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus(null)
    onSaved(false)
    setUsernameErr(null)
    if (!USERNAME_RE.test(cur.username)) {
      setUsernameErr('Username must be 3–24 characters: a–z, 0–9 or _')
      return
    }
    if (cur.display_name.length < 2 || cur.display_name.length > NAME_MAX)
      return setStatus({ kind: 'error', text: `Enter a display name between 2 and ${NAME_MAX} characters.` })
    if (cur.location.length > LOCATION_MAX) return setStatus({ kind: 'error', text: 'Keep your location within 100 characters.' })
    if (cur.bio.length > BIO_MAX) return setStatus({ kind: 'error', text: 'Keep your bio within 600 characters.' })
    if (UNSAFE_LINE.test(cur.display_name) || UNSAFE_LINE.test(cur.location) || UNSAFE_TEXT.test(cur.bio))
      return setStatus({ kind: 'error', text: 'Use plain text without markup or special control characters.' })

    const body: Parameters<typeof api.me.update>[0] = {}
    if (cur.display_name !== server.display_name) body.display_name = cur.display_name
    if (cur.username !== server.username) body.username = cur.username
    if (cur.location !== server.location) body.location = cur.location
    if (cur.bio !== server.bio) body.bio = cur.bio
    if (cur.avatar !== server.avatar) body.avatar = cur.avatar
    if (cur.preferred_language !== server.preferred_language) body.preferred_language = cur.preferred_language
    if (!isAdmin && cur.role !== server.role && cur.role !== 'admin') body.role = cur.role
    if (!Object.keys(body).length) return
    setBusy(true)
    setStatus({ kind: 'info', text: 'Saving…' })
    try {
      await api.me.update(body)
      // Saving a preferred language also switches the site to it (2026 profile.js).
      if (body.preferred_language)
        await setLanguageAsync(body.preferred_language, { syncProfile: false, source: 'profile-save' })
      await refreshMe()
      setStatus(null)
      onSaved(true)
    } catch (err) {
      setStatus(null)
      if (err instanceof ApiError && err.status === 409) setUsernameErr('That username is taken — try another.')
      else setStatus({ kind: 'error', text: err instanceof Error && err.message ? err.message : 'Your changes could not be saved. Please try again.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="pf-card pf-pad pf-edit" aria-labelledby="pf-edit-title">
      <div className="pf-eyebrow">01 / Personal details</div>
      <h2 id="pf-edit-title">Your profile</h2>
      <p className="pf-muted pf-intro">A name to greet you by, a place you call home, and a little of your story.</p>
      <form className="pf-form" onSubmit={onSubmit} noValidate aria-busy={busy}>
        <fieldset className="pf-field pf-symbols" disabled={busy}>
          <legend>Choose your symbol</legend>
          <div className="pf-symbol-row" role="radiogroup" aria-label="Profile symbol">
            {PROFILE_SYMBOLS.map((sym, i) => {
              const on = form.avatar === sym.id
              return (
                <button
                  key={sym.id}
                  ref={(el) => {
                    symbolRefs.current[i] = el
                  }}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={sym.label}
                  tabIndex={on ? 0 : -1}
                  className={`pf-symbol${on ? ' on' : ''}`}
                  onClick={() => set('avatar', sym.id)}
                  onKeyDown={(e) => onSymbolKey(e, i)}
                >
                  <ProfileSymbolIcon symbol={sym.id} />
                  <span>{sym.label}</span>
                </button>
              )
            })}
          </div>
        </fieldset>

        <div className="pf-two">
          <label className="pf-field">
            <span>Display name</span>
            <input
              value={form.display_name}
              minLength={2}
              maxLength={NAME_MAX}
              autoComplete="nickname"
              translate="no"
              onChange={(e) => set('display_name', e.target.value)}
            />
            <small className="pf-help">{`2–${NAME_MAX} characters. This is how MIRAVA greets you.`}</small>
          </label>
          <label className="pf-field">
            <span>Username</span>
            <div className="pf-at">
              <i>@</i>
              <input
                value={form.username}
                maxLength={24}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                translate="no"
                aria-invalid={!!usernameErr}
                onChange={(e) => {
                  set('username', e.target.value)
                  setUsernameErr(null)
                }}
              />
            </div>
            {usernameErr && <em className="pf-field-err">{usernameErr}</em>}
          </label>
        </div>

        <label className="pf-field">
          <span>Location</span>
          <input
            value={form.location}
            maxLength={LOCATION_MAX}
            autoComplete="address-level2"
            placeholder="Your city or region"
            translate="no"
            onChange={(e) => set('location', e.target.value)}
          />
        </label>

        <label className="pf-field">
          <span className="pf-label-row">
            About you
            <em className="pf-count">
              {form.bio.length} / {BIO_MAX}
            </em>
          </span>
          <textarea
            value={form.bio}
            rows={4}
            maxLength={BIO_MAX}
            placeholder="What part of India's heritage makes you curious?"
            onChange={(e) => set('bio', e.target.value)}
          />
          <small className="pf-help">Share a favourite place, tradition, or something you want to learn.</small>
        </label>

        <div className="pf-lang-block">
          <div>
            <label htmlFor="pf-language">Read in your language</label>
            <p>Save a preferred language with your account. You can also switch languages anywhere on the website.</p>
          </div>
          <select
            id="pf-language"
            aria-label="Preferred language"
            value={form.preferred_language}
            onChange={(e) => set('preferred_language', e.target.value === 'hi' ? 'hi' : 'en')}
          >
            <option value="en" lang="en">
              English
            </option>
            <option value="hi" lang="hi">
              हिन्दी
            </option>
          </select>
        </div>

        <fieldset className="pf-field pf-roles">
          <legend>I'm a…</legend>
          {isAdmin ? (
            <p className="pf-muted">You're an administrator — your role is managed by Mirava.</p>
          ) : (
            <div className="pf-role-switch">
              {ROLES.map((r) => (
                <label key={r.value} className={`pf-role-opt${form.role === r.value ? ' on' : ''}`}>
                  <input
                    type="radio"
                    name="role"
                    value={r.value}
                    checked={form.role === r.value}
                    onChange={() => set('role', r.value)}
                  />
                  <b>{r.label}</b>
                  <small>{r.hint}</small>
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <div className="pf-save-row">
          <p className={`pf-status${status ? ` pf-status-${status.kind}` : saved && !dirty ? ' pf-status-ok' : ''}`} role="status" aria-live="polite">
            {status ? status.text : saved && !dirty ? 'Your profile is saved.' : dirty ? 'You have unsaved changes.' : ''}
          </p>
          <div className="pf-save-buttons">
            <button
              type="button"
              className="pf-btn"
              disabled={busy || !dirty}
              onClick={() => {
                setForm(toForm(p))
                setUsernameErr(null)
                setStatus({ kind: 'info', text: 'Changes discarded.' })
              }}
            >
              Discard changes
            </button>
            <button type="submit" className="pf-btn pf-btn-gold" disabled={busy || !dirty}>
              {busy ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </div>
      </form>
    </section>
  )
}

function UpgradeGuest() {
  const { upgradeGuest } = useAuth()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    const addr = email.trim()
    if (!/^\S+@\S+\.\S+$/.test(addr)) {
      setErr('Please enter a valid email address.')
      return
    }
    setBusy(true)
    try {
      await upgradeGuest(addr)
      setSentTo(addr)
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Could not upgrade your account.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="pf-card pf-pad pf-upgrade">
      <div className="pf-eyebrow">Upgrade account</div>
      <h2>Keep your progress for good</h2>
      <p className="pf-muted">
        You're exploring as a guest. Add your email to turn this guest session into a full Mirava account — your XP,
        streak and badges come with you, and you'll appear on the leaderboards.
      </p>
      {sentTo ? (
        <div className="pf-sent">
          <b>📬 Check your inbox</b>
          <p>
            We've sent a confirmation email to <b>{sentTo}</b>. Open the link in it to verify your address and choose a
            password — that finishes the upgrade. Until then you can keep playing as a guest.
          </p>
          <button type="button" className="pf-linkbtn" onClick={() => setSentTo(null)}>
            Use a different email
          </button>
        </div>
      ) : (
        <form className="pf-form" onSubmit={onSubmit} noValidate>
          <label className="pf-field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <p className="pf-small">
            We'll email you a confirmation link. After confirming, you'll set your password and your guest progress is
            kept.
          </p>
          {err && <p className="pf-error">{err}</p>}
          <button type="submit" className="pf-btn pf-btn-gold" disabled={busy}>
            {busy ? 'Sending…' : 'Upgrade my account'}
          </button>
        </form>
      )}
    </section>
  )
}

function AccountInfo({ me }: { me: Me }) {
  const { user } = useAuth()
  const p = me.profile
  return (
    <section className="pf-card pf-pad">
      <div className="pf-eyebrow">Account</div>
      <h2>Your Mirava account</h2>
      <dl className="pf-dl">
        <div>
          <dt>Email</dt>
          <dd translate="no">{p.email ?? user?.email ?? '—'}</dd>
        </div>
        <div>
          <dt>Preferred language</dt>
          <dd>{LANGUAGE_NAMES[p.preferred_language === 'hi' ? 'hi' : 'en']}</dd>
        </div>
        <div>
          <dt>Questions answered</dt>
          <dd>{p.total_questions}</dd>
        </div>
        <div>
          <dt>Correct answers</dt>
          <dd>{p.total_correct}</dd>
        </div>
        <div>
          <dt>Longest streak</dt>
          <dd>{p.longest_streak} days</dd>
        </div>
      </dl>
      <div className="pf-links">
        <Link className="pf-btn" to="/quiz">
          🧠 Quiz Arena
        </Link>
        {p.role !== 'tourist' && (
          <Link className="pf-btn" to="/classroom">
            🏫 Classroom
          </Link>
        )}
        <Link className="pf-btn" to="/explore">
          🗺️ Explore
        </Link>
      </div>
    </section>
  )
}
