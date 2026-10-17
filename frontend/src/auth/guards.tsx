import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import type { Role } from '../lib/api'
import { useAuth } from './AuthProvider'

export function FullPageSpinner() {
  return (
    <div className="mv-spinner-page" role="status" aria-live="polite">
      <div className="mv-spinner" />
      <span>Loading Mirava…</span>
    </div>
  )
}

/** Requires any session (guests allowed unless `registered` is set). */
export function RequireAuth({ children, registered = false }: { children: ReactNode; registered?: boolean }) {
  const { session, loading, isGuest } = useAuth()
  const location = useLocation()
  if (loading) return <FullPageSpinner />
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  if (registered && isGuest) return <Navigate to="/signup" replace state={{ upgrade: true, from: location.pathname }} />
  return <>{children}</>
}

/** Requires one of the given profile roles (checked server-side too). */
export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { session, loading, me, role } = useAuth()
  const location = useLocation()
  if (loading || (session && !me)) return <FullPageSpinner />
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (!role || !roles.includes(role)) return <Navigate to="/explore" replace />
  return <>{children}</>
}

/** For login/signup pages: bounce signed-in (non-guest) users onward. */
export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { session, loading, isGuest } = useAuth()
  const location = useLocation()
  if (loading) return <FullPageSpinner />
  if (session && !isGuest) {
    const from = (location.state as { from?: string } | null)?.from
    return <Navigate to={from || '/explore'} replace />
  }
  return <>{children}</>
}
