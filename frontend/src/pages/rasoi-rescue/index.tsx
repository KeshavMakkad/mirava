import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { PageScope } from '../../components/PageScope'
import { useLegacyPage } from '../../lib/legacy'
import { initRasoi } from './rasoi.js'
import './rasoi.page.css'

const NAV: [string, string][] = [
  ['#/', 'Home'],
  ['#/cookbook', 'Recipe book'],
  ['#/record', 'Preserve a recipe'],
  ['#/vault', 'My vault'],
]

function currentRoute() {
  try {
    return decodeURIComponent((window.location.hash || '#/').slice(1))
  } catch {
    return '/'
  }
}

/** Rasoi Rescue — Recipes That Remember (port of legacy rasoi-rescue.html). */
export default function RasoiRescue() {
  const { me, isGuest } = useAuth()
  const navigate = useNavigate()
  const ref = useLegacyPage(initRasoi, { me, isGuest, navigate })
  const [route, setRoute] = useState(currentRoute)
  const [navOpen, setNavOpen] = useState(false)

  useEffect(() => {
    const onHash = () => {
      setRoute(currentRoute())
      setNavOpen(false)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const isActive = (href: string) =>
    href === '#' + route || (href === '#/cookbook' && route.startsWith('/cookbook/'))

  return (
    <PageScope name="rasoi-rescue" title="Rasoi Rescue — Recipes That Remember">
      <div ref={ref}>
        <header className="top">
          <div className="wrap top-inner">
            <a className="brand" href="#/">
              rasoi<span>rescue.</span>
            </a>
            <button aria-label="Toggle menu" className="mobile-toggle" type="button" onClick={() => setNavOpen((o) => !o)}>
              ☰
            </button>
            <nav aria-label="Main navigation" className={navOpen ? 'nav open' : 'nav'}>
              {NAV.map(([href, label]) => (
                <a key={href} href={href} className={isActive(href) ? 'active' : undefined}>
                  {label}
                </a>
              ))}
              <Link className="back" to="/explore">
                ← Mirava
              </Link>
            </nav>
          </div>
        </header>

        <main id="app"></main>

        <footer className="footer">
          <div className="wrap">
            <a className="brand" href="#/">
              rasoi<span>rescue.</span>
            </a>
            <p>Recipes that remember. A Mirava initiative.</p>
            <p>
              Personal recordings are stored in your browser. Library samples are illustrative, not verified culinary
              instructions.
            </p>
          </div>
        </footer>

        <div aria-live="polite" className="toast" id="toast" role="status"></div>
      </div>
    </PageScope>
  )
}
