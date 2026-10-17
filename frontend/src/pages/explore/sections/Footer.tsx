import { Link } from 'react-router-dom'
import { useAuth } from '../../../auth/AuthProvider'

export function Footer() {
  const { isGuest, role } = useAuth()
  return (
    <footer className="footer">
      <div>
        <h2>
          mira<i style={{ color: '#f3b841' }}>va</i>
        </h2>
      </div>
      <p>© Mirava — made for stories that outlive us.</p>
      <div className="footer-grid">
        <div>
          <span className="footer-label">Mirava</span>
          <p className="footer-brand-copy">
            A living atlas for the stories, places and practices that make India endlessly alive.
          </p>
        </div>
        <div>
          <span className="footer-label">Explore</span>
          <div className="footer-links">
            <a href="#atlas">The living atlas</a>
            <a href="#time">Time travel</a>
            <a href="#civilizations">Civilizations</a>
            <a href="#festivals">Festival calendar</a>
          </div>
        </div>
        <div>
          <span className="footer-label">Your Mirava</span>
          <div className="footer-links">
            <a href="#languages">Language revival</a>
            <a href="#art">Interactive museum</a>
            <a href="#news">Heritage news</a>
            <Link to="/profile">Profile &amp; leaderboards</Link>
            {!isGuest && <Link to="/classroom">Classroom</Link>}
            {role === 'admin' && <Link to="/admin">Administrator console</Link>}
            <a href="#top">Back to top ↑</a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 Mirava. Made with care in India.</span>
        <span>Preserve · Discover · Pass it on</span>
      </div>
    </footer>
  )
}
