import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { useAuthProviders } from '../../auth/useAuthProviders'
import { AuthShell, Field, GoogleButton, Msg } from './AuthShell'
import { errorText } from './authUtils'

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
  const { signUp, signInWithGoogle, sendMagicLink } = useAuth()
  const providers = useAuthProviders()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from || '/explore'

  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [resend, setResend] = useState<'idle' | 'sending' | 'sent'>('idle')

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
    if (password.length < 12) return setError('Use a password of at least 12 characters.')
    if (password.length > 128) return setError('Please enter your password (up to 128 characters).')
    if (password !== confirm) return setError('Passwords do not match.')

    setBusy(true)
    try {
      await signUp({ email: addr, password, username: name, displayName: display || name, next: from })
      setSentTo(addr)
    } catch (err) {
      setError(errorText(err))
    }
    setBusy(false)
  }

  const onResend = async () => {
    if (!sentTo) return
    setResend('sending')
    try {
      // A magic link also confirms the address.
      await sendMagicLink(sentTo, from)
      setResend('sent')
    } catch (err) {
      setError(errorText(err))
      setResend('idle')
    }
  }

  if (sentTo) {
    return (
      <AuthShell title="Confirm your email — Mirava" caption="Every craft has a story. Start yours here." eyebrow="Join the journey">
        <div className="done">
          <div className="big">✉</div>
          <h1>Confirm your email</h1>
          <p>
            We sent a confirmation link to <b translate="no">{sentTo}</b>. Open it to activate your account — you'll be
            signed in automatically.
          </p>
          <p className="note">Can't find it? Check your spam folder.</p>
          <Msg text={error} />
          <button className="btn g" type="button" onClick={onResend} disabled={resend !== 'idle'}>
            {resend === 'sending' ? 'Sending…' : resend === 'sent' ? 'Sent — check your inbox' : 'Resend the link'}
          </button>
          <Link className="btn" to="/login">
            Back to log in
          </Link>
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
    <AuthShell title="Sign up — Mirava" caption="Every craft has a story. Start yours here." eyebrow="Join the journey">
      <h1>Create your account</h1>
      <p className="sub">Join Mirava and keep every story close.</p>
      <Msg text={error} />
      {providers?.google && (
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
        <button className="btn" type="submit" disabled={busy || googleBusy}>
          {busy ? 'Creating account…' : 'Sign up'}
        </button>
      </form>
      <p className="switch">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
      <p className="note">Your account is saved with MIRAVA and works across your devices.</p>
    </AuthShell>
  )
}
