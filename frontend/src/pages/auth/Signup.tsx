import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { FullPageSpinner } from '../../auth/guards'
import { api, type Role } from '../../lib/api'
import { AuthShell, Field, GoogleButton, Msg } from './AuthShell'
import { errorText } from './authUtils'
import { useAuthProviders } from '../../auth/useAuthProviders'

type SignupRole = Exclude<Role, 'admin'>

const ROLES: { value: SignupRole; icon: string; label: string; hint: string }[] = [
  { value: 'tourist', icon: '🧭', label: 'Explorer', hint: 'Travel & discover' },
  { value: 'student', icon: '📚', label: 'Student', hint: 'Learn & join a class' },
  { value: 'teacher', icon: '🎓', label: 'Teacher', hint: 'Run classrooms' },
]

const USERNAME_RE = /^[a-z0-9_]{3,24}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const STRENGTH_COLORS = ['#e5562f', '#e5562f', '#f5aa35', '#f5aa35', '#5a9e4b', '#2f8a4a']

function strength(p: string) {
  let s = 0
  if (p.length >= 12) s++
  if (p.length >= 16) s++
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++
  if (/\d/.test(p)) s++
  if (/[^A-Za-z0-9]/.test(p)) s++
  return s
}

export default function Signup() {
  const { session, loading, isGuest, me, signUp, signInWithGoogle, upgradeGuest, refreshMe } = useAuth()
  const providers = useAuthProviders()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from || '/explore'

  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [role, setRole] = useState<SignupRole>('tourist')
  const [busy, setBusy] = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<null | { email: string; upgrade: boolean }>(null)
  const [prefilled, setPrefilled] = useState(false)

  // Guests upgrading: prefill from their current (auto-generated) profile once it loads.
  if (isGuest && me && !prefilled) {
    setPrefilled(true)
    if (me.profile.display_name && me.profile.display_name !== 'Guest') setDisplayName(me.profile.display_name)
    if (me.profile.role !== 'admin') setRole(me.profile.role)
  }

  if (loading) return <FullPageSpinner />
  if (session && !isGuest && !done) return <Navigate to={from} replace />

  const upgrade = isGuest

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const name = username.trim().toLowerCase()
    const addr = email.trim().toLowerCase()
    const display = displayName.trim()
    if (!USERNAME_RE.test(name))
      return setError('Username must be 3–24 characters: lowercase letters, numbers and underscores.')
    if (display.length > 40) return setError('Display name must be at most 40 characters.')
    if (!addr || addr.length > 254 || !EMAIL_RE.test(addr)) return setError('Please enter a valid email address.')
    if (!upgrade) {
      if (password.length < 12) return setError('Use a password of at least 12 characters.')
      if (password.length > 128) return setError('Please enter your password (up to 128 characters).')
      if (password !== confirm) return setError('Passwords do not match.')
    }

    setBusy(true)
    try {
      if (upgrade) {
        // Profile fields first (the backend validates username uniqueness), then link the email.
        await api.me.update({ username: name, display_name: display || name, role })
        await upgradeGuest(addr)
        await refreshMe()
        setDone({ email: addr, upgrade: true })
      } else {
        const { needsConfirmation } = await signUp({
          email: addr,
          password,
          username: name,
          displayName: display || name,
          role,
        })
        if (needsConfirmation) setDone({ email: addr, upgrade: false })
        else navigate(from, { replace: true })
      }
    } catch (err) {
      setError(errorText(err))
    }
    setBusy(false)
  }

  if (done) {
    return (
      <AuthShell title="Confirm your email — Mirava" caption="Every craft has a story. Start yours here." eyebrow="Join the journey">
        <div className="done">
          <div className="big">✉</div>
          <h1>Confirm your email</h1>
          <p>
            We sent a confirmation link to <b>{done.email}</b>.{' '}
            {done.upgrade
              ? 'Your progress is already saved to this account — open the link to verify your email and choose a password. You can keep playing in the meantime.'
              : 'Open it to activate your account, then you will be signed in automatically.'}
          </p>
          {done.upgrade ? (
            <Link className="btn" to="/explore">
              Continue to Explore
            </Link>
          ) : (
            <Link className="btn" to="/login">
              Back to log in
            </Link>
          )}
        </div>
      </AuthShell>
    )
  }

  const s = strength(password)

  const onGoogle = async () => {
    setError(null)
    setGoogleBusy(true)
    try {
      await signInWithGoogle(from)
    } catch (err) {
      setError(errorText(err, 'Google sign-in is unavailable right now. Please use your email instead.'))
      setGoogleBusy(false)
    }
  }

  return (
    <AuthShell
      title={upgrade ? 'Save your progress — Mirava' : 'Sign up — Mirava'}
      caption="Every craft has a story. Start yours here."
      eyebrow="Join the journey"
    >
      <h1>{upgrade ? 'Save your progress' : 'Create your account'}</h1>
      <p className="sub">
        {upgrade ? 'Turn your guest session into a free account.' : 'Join Mirava and keep every story close.'}
      </p>
      {upgrade && (
        <p className="upgrade-note">
          You are playing as a guest. Your XP, streaks and scores stay with you — we will email you a link to confirm
          your address.
        </p>
      )}
      <Msg text={error} />
      {!upgrade && providers?.google && (
        <>
          <GoogleButton onClick={onGoogle} busy={googleBusy} disabled={busy} />
          <div className="divider" style={{ margin: '0 0 18px' }}>
            or
          </div>
        </>
      )}
      <form onSubmit={onSubmit} noValidate>
        <Field
          id="username"
          label="Username"
          placeholder="e.g. heritage_lover"
          autoComplete="username"
          maxLength={24}
          required
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
        />
        <Field
          id="displayName"
          label={
            <>
              Display name <em>(optional)</em>
            </>
          }
          placeholder="How should we greet you?"
          autoComplete="nickname"
          maxLength={40}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <Field
          id="email"
          label="Email ID"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          maxLength={254}
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {!upgrade && (
          <>
        <Field
          id="password"
          label="Password"
          type="password"
          placeholder="At least 12 characters"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        >
          <div className="strength">
            <i
              style={{
                width: `${password ? Math.max(12, s * 20) : 0}%`,
                background: STRENGTH_COLORS[s],
              }}
            />
          </div>
        </Field>
        <Field
          id="confirm"
          label="Confirm password"
          type="password"
          placeholder="Repeat password"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
          </>
        )}
        <fieldset className="roles">
          <legend>I am joining as</legend>
          {ROLES.map((r) => (
            <label key={r.value} className={role === r.value ? 'on' : undefined}>
              <input
                type="radio"
                name="role"
                value={r.value}
                checked={role === r.value}
                onChange={() => setRole(r.value)}
              />
              <span aria-hidden>{r.icon}</span>
              {r.label}
              <small>{r.hint}</small>
            </label>
          ))}
        </fieldset>
        <button className="btn" type="submit" disabled={busy || googleBusy}>
          {busy ? 'Creating account…' : upgrade ? 'Save my progress' : 'Sign up'}
        </button>
      </form>
      <p className="switch">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
      {!upgrade && <p className="note">Your account is saved with MIRAVA and works across your devices.</p>}
      {upgrade && (
        <p className="note">
          Logging in to an existing account instead will leave this guest session and its progress behind.
        </p>
      )}
    </AuthShell>
  )
}
