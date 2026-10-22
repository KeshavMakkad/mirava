import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { AuthShell, Field, GoogleButton, Msg } from './AuthShell'
import { errorText } from './authUtils'

type Mode = 'password' | 'magic' | 'forgot'
type Sent = { kind: 'magic' | 'reset'; email: string } | null

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Login() {
  const { signIn, signInWithGoogle, sendMagicLink, sendPasswordReset } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from || '/explore'

  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState<null | 'submit' | 'google'>(null)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState<Sent>(null)

  const switchMode = (m: Mode) => {
    setMode(m)
    setError(null)
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const addr = email.trim().toLowerCase()
    if (!addr || addr.length > 254 || !EMAIL_RE.test(addr)) return setError('Please enter a valid email address.')
    if (mode === 'password' && (!password || password.length > 128))
      return setError('Please enter your password (up to 128 characters).')
    setBusy('submit')
    try {
      if (mode === 'password') {
        try {
          await signIn(addr, password)
        } catch (err) {
          // Account exists but the confirmation link was never opened: offer a fresh link.
          if (/not confirmed/i.test(String((err as Error)?.message))) {
            setMode('magic')
            setError('Please confirm your email first — tap “Send magic link” and we’ll email you a fresh sign-in link.')
            setBusy(null)
            return
          }
          throw err
        }
        navigate(from, { replace: true })
        return
      }
      if (mode === 'magic') await sendMagicLink(addr, from)
      else await sendPasswordReset(addr)
      setSent({ kind: mode === 'magic' ? 'magic' : 'reset', email: addr })
    } catch (err) {
      setError(errorText(err))
    }
    setBusy(null)
  }

  const onGoogle = async () => {
    setError(null)
    setBusy('google')
    try {
      await signInWithGoogle(from)
      // The browser is now leaving for Google.
    } catch (err) {
      setError(errorText(err, 'Google sign-in is unavailable right now. Please use your email instead.'))
      setBusy(null)
    }
  }

  if (sent) {
    return (
      <AuthShell title="Check your inbox — Mirava">
        <div className="done">
          <div className="big">✉</div>
          <h1>Check your inbox</h1>
          <p>
            {sent.kind === 'magic'
              ? 'We sent a sign-in link to '
              : 'If an account exists for '}
            <b>{sent.email}</b>
            {sent.kind === 'magic'
              ? '. Open it on this device to continue to Mirava.'
              : ', you will receive a link to choose a new password.'}
          </p>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setSent(null)
              switchMode('password')
            }}
          >
            Back to log in
          </button>
        </div>
      </AuthShell>
    )
  }

  const heading = mode === 'password' ? 'Log in to your account' : mode === 'magic' ? 'Email me a magic link' : 'Reset your password'
  const sub =
    mode === 'password'
      ? 'Welcome back! Please enter your details.'
      : mode === 'magic'
        ? 'No password needed — we will email you a one-time sign-in link.'
        : 'Enter your email and we will send you a reset link.'
  const submitLabel =
    mode === 'password' ? 'Log in' : mode === 'magic' ? 'Send magic link' : 'Send reset link'

  return (
    <AuthShell title="Log in — Mirava">
      <h1>{heading}</h1>
      <p className="sub">{sub}</p>
      <Msg text={error} />
      <form onSubmit={onSubmit} noValidate>
        <Field
          id="email"
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          maxLength={254}
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {mode === 'password' && (
          <Field
            id="password"
            label="Password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            maxLength={128}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        )}
        <div className="links">
          {mode === 'password' ? (
            <>
              <button type="button" onClick={() => switchMode('magic')}>
                Email me a magic link
              </button>
              <button type="button" onClick={() => switchMode('forgot')}>
                Forgot password?
              </button>
            </>
          ) : (
            <button type="button" onClick={() => switchMode('password')}>
              ← Use my password instead
            </button>
          )}
        </div>
        {mode === 'password' && <GoogleButton onClick={onGoogle} busy={busy === 'google'} disabled={!!busy} />}
        <button className="btn" type="submit" disabled={!!busy}>
          {busy === 'submit' ? (mode === 'password' ? 'Opening Mirava…' : 'Sending…') : submitLabel}
        </button>
      </form>
      <p className="switch">
        Don't have an account? <Link to="/signup">Sign up</Link>
      </p>
      <p className="note">Your account is saved with MIRAVA and works across your devices.</p>
      <p className="note">Create an account to keep your progress and join the leaderboards.</p>
    </AuthShell>
  )
}
