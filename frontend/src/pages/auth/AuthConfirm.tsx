import type { EmailOtpType } from '@supabase/supabase-js'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { supabase } from '../../lib/supabase'
import { AuthShell, Spinner } from './AuthShell'

const TYPES: EmailOtpType[] = ['signup', 'magiclink', 'recovery', 'email', 'invite', 'email_change']

function safeNext(next: string | null, fallback: string): string {
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/auth/') ? next : fallback
}

/**
 * Landing page for links in emails sent by our backend
 * (/auth/confirm?token_hash=…&type=signup|magiclink|recovery&next=…).
 * Exchanges the one-time token for a session, then continues into the app.
 */
export default function AuthConfirm() {
  const { refreshMe } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)

  useEffect(() => {
    // StrictMode runs effects twice in dev; a token can only be used once.
    if (started.current) return
    started.current = true
    const params = new URLSearchParams(window.location.search)
    const tokenHash = params.get('token_hash')
    const type = params.get('type') as EmailOtpType | null
    if (!tokenHash || !type || !TYPES.includes(type)) {
      setError('This link is incomplete. Request a new one and try again.')
      return
    }
    const fallback = type === 'recovery' ? '/reset-password' : '/explore'
    void supabase.auth.verifyOtp({ token_hash: tokenHash, type }).then(({ error: err }) => {
      if (err) {
        setError(/expired|invalid/i.test(err.message) ? 'This link has expired or was already used. Request a new one.' : err.message)
        return
      }
      void refreshMe()
      navigate(safeNext(params.get('next'), fallback), { replace: true })
    })
  }, [navigate, refreshMe])

  return (
    <AuthShell title="Confirming — Mirava">
      {error ? (
        <div className="done">
          <div className="big">⚠</div>
          <h1>This link didn't work</h1>
          <p>{error}</p>
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
