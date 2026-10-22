import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { AuthShell, Spinner } from './AuthShell'
import { urlAuthError } from './authUtils'

const TIMEOUT_MS = 10_000

/** Same-origin path from `?next=` (set by Google sign-in), else Explore. */
function nextPath(): string {
  const next = new URLSearchParams(window.location.search).get('next')
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/auth/') ? next : '/explore'
}

/**
 * Landing spot for magic-link, Google OAuth, signup-confirmation and email-change links.
 * supabase-js (PKCE + detectSessionInUrl) exchanges the `?code=` itself; we
 * just wait for the session to appear, then continue into the app.
 */
export default function AuthCallback() {
  const { session, loading, refreshMe } = useAuth()
  const navigate = useNavigate()
  const [urlError] = useState(urlAuthError)
  const [next] = useState(nextPath)
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
    navigate(next, { replace: true })
  }, [urlError, loading, session, navigate, refreshMe, next])

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
