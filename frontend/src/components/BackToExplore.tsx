import { Link } from 'react-router-dom'

/** Floating "back" pill for the standalone heritage apps. */
export function BackToExplore({ to = '/explore', label = 'Back to Explore' }: { to?: string; label?: string }) {
  return (
    <Link className="mv-back" to={to}>
      ← {label}
    </Link>
  )
}
