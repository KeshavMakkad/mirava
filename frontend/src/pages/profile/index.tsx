/**
 * Profile & leaderboards. New page (no legacy counterpart) in the legacy
 * site's visual language: cream / wine / gold, Playfair headings, DM Mono labels.
 */
import { useQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { AccountMenu } from '../../components/AccountMenu'
import { LeaderboardPanel } from '../../components/leaderboard/LeaderboardPanel'
import { PageScope } from '../../components/PageScope'
import { DailyQuizModal } from '../../components/quiz/DailyQuizModal'
import { ApiError, api, type Badge, type Me, type Role } from '../../lib/api'
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

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
            {name.trim().charAt(0).toUpperCase() || 'M'}
          </div>
          <div className="pf-id-text">
            <div className="pf-eyebrow">✦ {isGuest ? 'guest explorer' : 'mirava explorer'}</div>
            <h1>{name}</h1>
            <div className="pf-handle">
              @{p.username}
              <span className={`pf-role pf-role-${p.role}`}>{p.role}</span>
              {isGuest && <span className="pf-role pf-role-guest">guest</span>}
            </div>
            <div className="pf-since">Member since {formatDate(p.created_at)}</div>
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

      <div className="pf-grid">
        {/* Remount when the saved profile changes so the form follows the server. */}
        <EditProfile key={`${me.profile.display_name}|${me.profile.username}|${me.profile.role}`} me={me} saved={saved} onSaved={setSaved} />
        {isGuest ? <UpgradeGuest /> : <AccountInfo me={me} />}
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
                {got?.unlocked_at ? `Unlocked ${formatDate(got.unlocked_at)}` : (b.description ?? '')}
              </small>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function EditProfile({ me, saved, onSaved }: { me: Me; saved: boolean; onSaved: (v: boolean) => void }) {
  const { refreshMe } = useAuth()
  const p = me.profile
  const [displayName, setDisplayName] = useState(p.display_name ?? '')
  const [username, setUsername] = useState(p.username)
  const [role, setRole] = useState<Role>(p.role)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [usernameErr, setUsernameErr] = useState<string | null>(null)

  const isAdmin = p.role === 'admin'
  const dirty =
    displayName.trim() !== (p.display_name ?? '') || username.trim().toLowerCase() !== p.username || role !== p.role

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    onSaved(false)
    setUsernameErr(null)
    const u = username.trim().toLowerCase()
    if (!USERNAME_RE.test(u)) {
      setUsernameErr('Username must be 3–24 characters: a–z, 0–9 or _')
      return
    }
    const dn = displayName.trim()
    if (!dn) {
      setMsg({ ok: false, text: 'Display name cannot be empty.' })
      return
    }
    const body: Parameters<typeof api.me.update>[0] = {}
    if (dn !== (p.display_name ?? '')) body.display_name = dn
    if (u !== p.username) body.username = u
    if (!isAdmin && role !== p.role && role !== 'admin') body.role = role
    if (!Object.keys(body).length) return
    setBusy(true)
    try {
      await api.me.update(body)
      await refreshMe()
      onSaved(true)
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setUsernameErr('That username is taken — try another.')
      else setMsg({ ok: false, text: err instanceof Error ? err.message : 'Could not save your profile.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="pf-card pf-pad">
      <div className="pf-eyebrow">Edit profile</div>
      <h2>How you appear</h2>
      <form className="pf-form" onSubmit={onSubmit} noValidate>
        <label className="pf-field">
          <span>Display name</span>
          <input value={displayName} maxLength={40} onChange={(e) => setDisplayName(e.target.value)} />
        </label>
        <label className="pf-field">
          <span>Username</span>
          <div className="pf-at">
            <i>@</i>
            <input
              value={username}
              maxLength={24}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-invalid={!!usernameErr}
              onChange={(e) => {
                onSaved(false)
                setUsername(e.target.value)
                setUsernameErr(null)
              }}
            />
          </div>
          {usernameErr && <em className="pf-field-err">{usernameErr}</em>}
        </label>
        <fieldset className="pf-field pf-roles">
          <legend>I'm a…</legend>
          {isAdmin ? (
            <p className="pf-muted">You're an administrator — your role is managed by Mirava.</p>
          ) : (
            <div className="pf-role-switch">
              {ROLES.map((r) => (
                <label key={r.value} className={`pf-role-opt${role === r.value ? ' on' : ''}`}>
                  <input
                    type="radio"
                    name="role"
                    value={r.value}
                    checked={role === r.value}
                    onChange={() => setRole(r.value)}
                  />
                  <b>{r.label}</b>
                  <small>{r.hint}</small>
                </label>
              ))}
            </div>
          )}
        </fieldset>
        {msg && <p className={msg.ok ? 'pf-ok' : 'pf-error'}>{msg.text}</p>}
        {saved && !msg && !dirty && <p className="pf-ok">Profile saved.</p>}
        <button type="submit" className="pf-btn pf-btn-gold" disabled={busy || !dirty}>
          {busy ? 'Saving…' : 'Save changes'}
        </button>
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
          <dd>{p.email ?? user?.email ?? '—'}</dd>
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
