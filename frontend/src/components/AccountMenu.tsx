import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { LanguageToggle } from './LanguageToggle'
import { ProfileSymbolIcon } from './ProfileSymbol'

/**
 * EN | हिंदी toggle + avatar button + dropdown with profile, classroom/admin
 * links and sign out. Every page header renders this, so the language toggle
 * is global. The avatar shows the profile symbol chosen on /profile.
 */
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
      <div className={['mv-account', className].filter(Boolean).join(' ')}>
        <LanguageToggle />
        <Link className="mv-account-btn mv-account-signin" to="/login">
          Sign in
        </Link>
      </div>
    )
  }

  const name = me?.profile.display_name || me?.profile.username || (isGuest ? 'Guest' : 'Explorer')

  return (
    <div className={['mv-account', className].filter(Boolean).join(' ')} ref={ref}>
      <LanguageToggle />
      <button
        type="button"
        className="mv-account-btn"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="mv-avatar" aria-hidden>
          <ProfileSymbolIcon symbol={me?.profile.avatar} strokeWidth={3} />
        </span>
        <span className="mv-account-name" translate="no">
          {name}
        </span>
      </button>
      {open && (
        <div className="mv-account-menu" role="menu">
          <div className="mv-who" translate="no">
            {name}
          </div>
          {isGuest ? <div className="mv-sub">Guest session</div> : <div className="mv-sub" translate="no">{user.email}</div>}
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
