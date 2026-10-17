import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'

/** Avatar button + dropdown with profile, classroom/admin links and sign out. */
export function AccountMenu({ className }: { className?: string }) {
  const { me, user, isGuest, role, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  if (!user) {
    return (
      <Link className={['mv-account-btn', className].filter(Boolean).join(' ')} to="/login">
        Sign in
      </Link>
    )
  }

  const name = me?.profile.display_name || me?.profile.username || (isGuest ? 'Guest' : 'Explorer')
  const initial = name.trim().charAt(0).toUpperCase() || 'M'

  return (
    <div className={['mv-account', className].filter(Boolean).join(' ')} ref={ref}>
      <button type="button" className="mv-account-btn" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="mv-avatar" aria-hidden>
          {initial}
        </span>
        {name}
      </button>
      {open && (
        <div className="mv-account-menu" role="menu">
          <div className="mv-who">{name}</div>
          <div className="mv-sub">{isGuest ? 'Guest session' : user.email}</div>
          {me && (
            <div className="mv-stats">
              <span>✦ {me.profile.total_xp} XP</span>
              <span>🔥 {me.profile.daily_streak}</span>
              {me.rank && <span>#{me.rank}</span>}
            </div>
          )}
          {isGuest && (
            <div className="mv-guest-note">
              Playing as a guest. <Link to="/signup" state={{ upgrade: true }}>Create an account</Link> to keep your
              progress and join the leaderboard.
            </div>
          )}
          <Link to="/profile" role="menuitem" onClick={() => setOpen(false)}>
            Profile &amp; leaderboards
          </Link>
          <Link to="/explore" role="menuitem" onClick={() => setOpen(false)}>
            Explore
          </Link>
          {!isGuest && (
            <Link to="/classroom" role="menuitem" onClick={() => setOpen(false)}>
              Classroom
            </Link>
          )}
          {role === 'admin' && (
            <Link to="/admin" role="menuitem" onClick={() => setOpen(false)}>
              Administrator console
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              await signOut()
              navigate('/')
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
