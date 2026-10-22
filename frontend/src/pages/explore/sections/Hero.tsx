import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../auth/AuthProvider'
import { AccountMenu } from '../../../components/AccountMenu'

interface Props {
  onOpenQuiz: () => void
  onOpenShivaji: () => void
}

/** New explore.html navigation, routed inside the SPA. */
const APP_LINKS: [string, string][] = [
  ['/quiz', 'Quiz Arena'],
  ['/apps/lost-legends', 'Heritage Game'],
  ['/apps/sentinel', 'Sentinel'],
  ['/apps/vastu-plan', 'VastuPlan'],
  ['/apps/bhasha', 'Bhasha'],
  ['/apps/vedic-maths', 'Vedic Maths'],
  ['/apps/rasoi-rescue', 'Rasoi'],
  ['/apps/jal-parampara', 'Jal Parampara'],
]

const ORBIT_RULE_TICKS = 19

export function Hero({ onOpenQuiz, onOpenShivaji }: Props) {
  const { role } = useAuth()
  const [navOpen, setNavOpen] = useState(false)
  const navRef = useRef<HTMLElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)

  // Mobile menu: closes on outside click, Escape (restoring focus) and when leaving the mobile layout.
  useEffect(() => {
    if (!navOpen) return
    const onClick = (e: globalThis.MouseEvent) => {
      const target = e.target as Node
      if (!navRef.current?.contains(target) && !toggleRef.current?.contains(target)) setNavOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setNavOpen(false)
      toggleRef.current?.focus()
    }
    const mobileNav = window.matchMedia('(max-width:1199px)')
    const onMedia = () => setNavOpen(false)
    document.addEventListener('click', onClick)
    document.addEventListener('keydown', onKey)
    mobileNav.addEventListener('change', onMedia)
    return () => {
      document.removeEventListener('click', onClick)
      document.removeEventListener('keydown', onKey)
      mobileNav.removeEventListener('change', onMedia)
    }
  }, [navOpen])

  const trigger = (fn: () => void) => (e: MouseEvent) => {
    e.preventDefault()
    setNavOpen(false)
    fn()
  }

  return (
    <header className="hero" id="top">
      <div className="mirava-hero-grid" aria-hidden="true"></div>
      <div className="top">
        <a className="brand" href="#top">
          mira<i>va</i>
        </a>
        <nav
          id="miravaPrimaryNav"
          aria-label="Main navigation"
          ref={navRef}
          className={navOpen ? 'mirava-nav-open' : undefined}
          onClick={(e) => (e.target as Element).closest('a') && setNavOpen(false)}
        >
          <a href="#" id="quizTrigger" onClick={trigger(onOpenQuiz)}>
            Daily Quiz
          </a>
          <a href="#" id="shivajiGameTrigger" className="shivaji-link" onClick={trigger(onOpenShivaji)}>
            ⚔️ Shivaji
          </a>
          {APP_LINKS.map(([to, label]) => (
            <Link key={to} to={to}>
              {label}
            </Link>
          ))}
          {role === 'admin' && (
            <Link to="/admin" aria-label="Editor administration">
              Admin
            </Link>
          )}
        </nav>
        <AccountMenu className="explore-account" />
        <button
          ref={toggleRef}
          className="mirava-menu-toggle"
          id="miravaMenuToggle"
          type="button"
          aria-label={navOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={navOpen}
          aria-controls="miravaPrimaryNav"
          onClick={() => setNavOpen((o) => !o)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
            <path d="M5 8h14M5 16h14" />
          </svg>
        </button>
      </div>
      <div className="hero-body">
        <div className="eyebrow">The member atlas — India, remembered</div>
        <h1>
          Walk through
          <br />
          <em>every</em> century.
        </h1>
        <p>
          Not a museum of the past — an alive, interactive map of India's makers, monuments, languages, celebrations and
          big ideas.
        </p>
        <div className="hero-actions">
          <a className="pill" href="#atlas">
            Open the atlas <b aria-hidden="true">↗</b>
          </a>
          <a className="mirava-hero-link" href="#time">
            Travel through time<span aria-hidden="true">↘</span>
          </a>
        </div>
        <div className="mirava-hero-caption">
          <i aria-hidden="true"></i>A living archive of the Indian subcontinent
        </div>
      </div>

      <div className="mirava-orbit" id="miravaOrbit" data-state="loading">
        <div className="orbit-fallback" aria-hidden="true">
          <div className="orbit-fallback-ring"></div>
          <div className="orbit-fallback-ring"></div>
          <div className="orbit-fallback-ball"></div>
        </div>
        <canvas
          id="miravaGlobe"
          tabIndex={0}
          role="img"
          aria-label="Interactive three-dimensional heritage globe, centred on India. Drag horizontally or use arrow keys to rotate; press Home to reset."
          aria-describedby="miravaGlobeInstructions"
        ></canvas>
        <p className="mirava-sr-only" id="miravaGlobeInstructions">
          The globe is a visual introduction. All heritage stories are available through the Open the atlas and Travel
          through time links. Swipe vertically to scroll the page.
        </p>
        <div className="orbit-topline" aria-hidden="true">
          <span>THE HERITAGE OBSERVATORY</span>
          <span>VOL. 01</span>
        </div>
        <div className="orbit-pin" aria-hidden="true">
          INDIA<small>THE STORY BEGINS HERE</small>
        </div>
        <a className="orbit-card orbit-card-one" href="#civilizations" aria-label="Explore ancient civilisations">
          <small>
            THE HUMAN STORY <span>↗</span>
          </small>
          <strong>Ancient roots.</strong>
          <span>Living connections.</span>
          <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
            <path d="M4 34h32M7 30h26M10 28V15h20v13M8 15l12-9 12 9zM16 28V19h8v9M6 31v-3h28v3M13 17v9m14-9v9M20 3v3" />
            <circle cx="20" cy="13" r="1.3" />
          </svg>
        </a>
        <a className="orbit-card orbit-card-two" href="#time" aria-label="Explore eleven eras in the Chronoscope">
          <small>
            THE CHRONOSCOPE <span>↗</span>
          </small>
          <strong>11 eras.</strong>
          <span>One continuous story.</span>
          <div className="orbit-card-rule" aria-hidden="true">
            {Array.from({ length: ORBIT_RULE_TICKS }, (_, i) => (
              <i key={i}></i>
            ))}
          </div>
        </a>
        <div className="orbit-bottomline" aria-hidden="true">
          DRAG TO ROTATE · SCROLL TO DISCOVER
        </div>
      </div>

      <div className="mirava-hero-footer">
        <a className="mirava-scroll-cue" href="#atlas">
          <b aria-hidden="true">↓</b>
          <span>SCROLL INTO THE STORY</span>
        </a>
        <nav className="mirava-chapter-nav" aria-label="Explore chapters">
          <a href="#atlas">
            <b>01</b>THE ATLAS
          </a>
          <a href="#time">
            <b>02</b>TIME
          </a>
          <a href="#civilizations">
            <b>03</b>CIVILISATIONS
          </a>
        </nav>
        <div className="mirava-orbit-tools">
          <button id="miravaOrbitReset" type="button">
            Reset globe
          </button>
          <button id="miravaMotionToggle" type="button" aria-pressed="false">
            <span data-motion-label>Pause motion</span>
          </button>
        </div>
      </div>
    </header>
  )
}
