import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { AuthShell, Spinner } from './AuthShell'
import { urlAuthError } from './authUtils'

const TIMEOUT_MS = 10_000

/**
 * Landing spot for magic-link, signup-confirmation and email-change links.
 * supabase-js (PKCE + detectSessionInUrl) exchanges the `?code=` itself; we
 * just wait for the session to appear, then continue into the app.
 */
export default function AuthCallback() {
  const { session, loading, refreshMe } = useAuth()
  const navigate = useNavigate()
  const [urlError] = useState(urlAuthError)
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    if (urlError || session) return
    const t = window.setTimeout(() => setTimedOut(true), TIMEOUT_MS)
    return () => window.clearTimeout(t)
  }, [urlError, session])

  useEffect(() => {
    if (urlError || loading || !session) return
    // Email confirmation may have turned a guest into a full account.
    void refreshMe()
    navigate('/explore', { replace: true })
  }, [urlError, loading, session, navigate, refreshMe])

  const failed = urlError || (timedOut && !session)

  return (
    <AuthShell title="Signing you in — Mirava">
      {failed ? (
        <div className="done">
          <div className="big">⚠</div>
          <h1>This link didn't work</h1>
          <p>{urlError || 'The link is invalid or has expired. Request a new one and try again.'}</p>
          <Link className="btn" to="/login">
            Back to log in
          </Link>
        </div>
      ) : (
        <>
          <h1>Signing you in…</h1>
          <p className="sub">Hold on while we open your Mirava account.</p>
          <Spinner label="Verifying your link" />
        </>
      )}
    </AuthShell>
  )
}
