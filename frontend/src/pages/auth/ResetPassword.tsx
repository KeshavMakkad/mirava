import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { AuthShell, Field, Msg, Spinner } from './AuthShell'
import { errorText, urlAuthError } from './authUtils'

/** How long to wait for supabase-js to exchange the recovery code from the URL. */
const GRACE_MS = 5_000

export default function ResetPassword() {
  const { session, loading, updatePassword } = useAuth()
  const navigate = useNavigate()
  // ?setup=1: a guest who just verified their email is choosing their first password.
  const setup = useSearchParams()[0].get('setup') === '1'
  const [urlError] = useState(urlAuthError)
  const [waited, setWaited] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (session || urlError) return
    const t = window.setTimeout(() => setWaited(true), GRACE_MS)
    return () => window.clearTimeout(t)
  }, [session, urlError])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 12) return setError('Use a password of at least 12 characters.')
    if (password !== confirm) return setError('Passwords do not match.')
    setBusy(true)
    try {
      await updatePassword(password)
      navigate('/explore', { replace: true })
    } catch (err) {
      setError(errorText(err))
      setBusy(false)
    }
  }

  let content
  if (session) {
    content = (
      <>
        <h1>{setup ? 'Choose your password' : 'Choose a new password'}</h1>
        <p className="sub">
          {setup
            ? 'Your email is verified. Set a password to finish saving your progress.'
            : "Pick something you haven't used before."}
        </p>
        <Msg text={error} />
        <form onSubmit={onSubmit} noValidate>
          <Field
            id="password"
            label="New password"
            type="password"
            placeholder="At least 12 characters"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Field
            id="confirm"
            label="Confirm new password"
            type="password"
            placeholder="Repeat password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          <button className="btn" type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save password'}
          </button>
        </form>
      </>
    )
  } else if (urlError || (!loading && waited)) {
    content = (
      <div className="done">
        <div className="big">⌛</div>
        <h1>Link expired</h1>
        <p>{urlError || 'This password reset link is invalid or has expired. Request a new one from the log in page.'}</p>
        <Link className="btn" to="/login">
          Back to log in
        </Link>
      </div>
    )
  } else {
    content = <Spinner label="Checking your reset link" />
  }

  return <AuthShell title={setup ? 'Set password — Mirava' : 'Reset password — Mirava'}>{content}</AuthShell>
}
