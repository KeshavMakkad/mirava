import { Fragment, useEffect, useRef, useState, type RefObject } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { AccountMenu } from '../../components/AccountMenu'
import { LanguageToggle } from '../../components/LanguageToggle'
import { PageScope } from '../../components/PageScope'
import './landing.page.css'

const MEMBERS = [
  ['AP', 'Adirut Pandita', 'Team Leader & Lead Developer'],
  ['BS', 'Baijayik Saha', 'Lead Developer & Technical Implementation'],
  ['PM', 'Priyanshi Malhotra', 'UI/UX Design & Interactive Mapping'],
  ['SS', 'Shambhavi Singh', 'Research & Heritage Content'],
  ['EP', 'Eekansh Patni', 'Project Support'],
]

const REASONS = [
  ['Living voices', 'We go to the source — artists, elders and local communities tell it in their own words.'],
  ['Made to feel', 'Immersive visual stories turn every discovery into a small act of wonder.'],
  ['Culture in motion', 'Discover ways to attend, learn, support and keep every story moving forward.'],
]

const NAV_LINKS: [string, string][] = [
  ['about', 'Our story'],
  ['experiences', 'Experiences'],
  ['people', 'The people'],
  ['why', 'Why Mirava'],
]

const MARQUEE = ['Folk wisdom', 'Living traditions', 'Handcrafted futures', 'Stories worth carrying']

/** Scroll effects, reveal-on-scroll, spotlight and magnetic CTA (ported from the legacy inline script). */
function useLandingEffects(root: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = root.current
    if (!el) return
    const cleanups: (() => void)[] = []
    const on = <K extends keyof HTMLElementEventMap>(
      target: HTMLElement,
      type: K,
      fn: (e: HTMLElementEventMap[K]) => void,
    ) => {
      target.addEventListener(type, fn)
      cleanups.push(() => target.removeEventListener(type, fn))
    }

    // Staggered reveal delays.
    ;['.members .member', '.testimonial-grid .testimonial-card', '.heritage-grid .heritage-card', '.reasons .reason', '.faq-grid .faq-item'].forEach(
      (sel) => {
        el.querySelectorAll<HTMLElement>(sel).forEach((node, i) => {
          node.style.transitionDelay = `${i * 0.09}s`
          const clear = () => {
            node.style.transitionDelay = ''
          }
          node.addEventListener('transitionend', clear, { once: true })
          cleanups.push(() => node.removeEventListener('transitionend', clear))
        })
      },
    )
    const reveal = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('show')),
      { threshold: 0.13 },
    )
    el.querySelectorAll('.reveal').forEach((n) => reveal.observe(n))
    cleanups.push(() => reveal.disconnect())

    // Scroll progress, sticky nav, parallax, back-to-top.
    const bar = el.querySelector<HTMLElement>('.m-progress')
    const topBtn = el.querySelector<HTMLElement>('.m-top')
    const nav = el.querySelector<HTMLElement>('nav')
    const photo = el.querySelector<HTMLElement>('.hero-photo')
    const sun = el.querySelector<HTMLElement>('.sun')
    let ticking = false
    let raf = 0
    const onScroll = () => {
      const y = window.scrollY
      const h = document.documentElement.scrollHeight - window.innerHeight
      if (bar) bar.style.transform = `scaleX(${h > 0 ? y / h : 0})`
      nav?.classList.toggle('scrolled', y > 40)
      topBtn?.classList.toggle('show', y > 700)
      if (y < window.innerHeight * 1.2) {
        if (photo) photo.style.translate = `0 ${y * 0.22}px`
        if (sun) sun.style.translate = `0 ${y * 0.4}px`
      }
      ticking = false
    }
    const onWinScroll = () => {
      if (!ticking) {
        ticking = true
        raf = requestAnimationFrame(onScroll)
      }
    }
    window.addEventListener('scroll', onWinScroll, { passive: true })
    cleanups.push(() => {
      window.removeEventListener('scroll', onWinScroll)
      cancelAnimationFrame(raf)
    })
    onScroll()

    // Team card spotlight.
    el.querySelectorAll<HTMLElement>('.member').forEach((m) => {
      on(m, 'pointermove', (e) => {
        const r = m.getBoundingClientRect()
        m.style.setProperty('--mx', `${e.clientX - r.left}px`)
        m.style.setProperty('--my', `${e.clientY - r.top}px`)
      })
    })

    // Magnetic hero button.
    const cta = el.querySelector<HTMLElement>('.hero-cta')
    if (cta && window.matchMedia('(hover:hover)').matches) {
      on(cta, 'pointermove', (e) => {
        const r = cta.getBoundingClientRect()
        cta.style.translate = `${(e.clientX - r.left - r.width / 2) * 0.18}px ${(e.clientY - r.top - r.height / 2) * 0.3}px`
      })
      on(cta, 'pointerleave', () => {
        cta.style.translate = '0 0'
      })
    }

    // Active nav link.
    const links: Record<string, HTMLElement> = {}
    el.querySelectorAll<HTMLAnchorElement>('.links a').forEach((a) => {
      links[a.getAttribute('href') ?? ''] = a
    })
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return
          Object.values(links).forEach((a) => a.classList.remove('active'))
          links[`#${en.target.id}`]?.classList.add('active')
        })
      },
      { rootMargin: '-45% 0px -50% 0px' },
    )
    NAV_LINKS.forEach(([id]) => {
      const s = el.querySelector(`#${id}`)
      if (s) spy.observe(s)
    })
    cleanups.push(() => spy.disconnect())

    return () => cleanups.forEach((fn) => fn())
  }, [root])
}

export default function Landing() {
  const { user, me, isGuest, loading, continueAsGuest } = useAuth()
  const navigate = useNavigate()
  const rootRef = useRef<HTMLDivElement>(null)
  const [guestBusy, setGuestBusy] = useState(false)
  const [guestError, setGuestError] = useState<string | null>(null)
  useLandingEffects(rootRef)

  const signedIn = !!user
  const name = me?.profile.display_name || me?.profile.username || (isGuest ? 'explorer' : null)

  const startGuest = async () => {
    setGuestError(null)
    setGuestBusy(true)
    try {
      await continueAsGuest()
      navigate('/explore')
    } catch (e) {
      setGuestError(e instanceof Error ? e.message : 'Could not start a guest session. Please try again.')
      setGuestBusy(false)
    }
  }

  return (
    <PageScope name="landing" title="Mirava — Living Indian Heritage">
      <div ref={rootRef}>
        <div className="noise" />
        <div className="m-progress" />

        <header className="hero" id="home">
          <div className="hero-photo" />
          <div className="sun" />
          <nav>
            <a className="logo" href="#home">
              mira<i>va</i>
            </a>
            <div className="links">
              {NAV_LINKS.map(([id, label]) => (
                <a key={id} href={`#${id}`}>
                  {label}
                </a>
              ))}
            </div>
            <div className="nav-auth">
              {loading ? null : signedIn ? (
                <>
                  <Link className="login ghost" to="/explore">
                    Continue to Explore
                  </Link>
                  <AccountMenu />
                </>
              ) : (
                <>
                  <LanguageToggle />
                  <Link className="login ghost" to="/login">
                    Log in
                  </Link>
                  <Link className="login" to="/signup">
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </nav>
          <div className="hero-content">
            <div className="eyebrow">India, remembered differently</div>
            <h1>
              Culture isn't
              <br />
              kept. It is <em>lived.</em>
            </h1>
            <p>Mirava is a new home for the rituals, art, voices and stories that make India endlessly alive.</p>
            <div className="hero-actions">
              <a className="hero-cta" href="#about">
                Begin the journey <b>↗</b>
              </a>
              {signedIn ? (
                <Link className="hero-ghost" to="/explore">
                  Continue to Explore ↗
                </Link>
              ) : (
                <button type="button" className="hero-ghost" onClick={startGuest} disabled={guestBusy || loading}>
                  {guestBusy ? 'Opening Mirava…' : 'Continue as guest'}
                </button>
              )}
            </div>
            {guestError && (
              <p className="cta-error" role="alert">
                {guestError}
              </p>
            )}
          </div>
        </header>

        <div className="marquee">
          <div className="marquee-track">
            {[...MARQUEE, ...MARQUEE].map((t, i) => (
              <Fragment key={i}>
                {t} <span>✦</span>{' '}
              </Fragment>
            ))}
          </div>
        </div>

        <main>
          <section className="about" id="about">
            <div className="reveal">
              <div className="section-kicker">01 — Meet Mirava</div>
              <h2>More than an archive. A pulse.</h2>
            </div>
            <div className="about-right reveal">
              <p>
                We built <strong>Mirava</strong> to make Indian heritage feel as magnetic as it truly is — not frozen
                behind glass, but in the hands, homes and hearts of people everywhere.
              </p>
              <a className="text-link" href="#why">
                Our shared mission ↗
              </a>
            </div>
          </section>

          <section style={{ paddingTop: 0 }}>
            <div className="heritage-grid reveal">
              {['Crafts that carry time', 'Festivals, up close', 'Taste of tradition'].map((t) => (
                <div className="heritage-card" key={t}>
                  <i>↗</i>
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="team" id="people">
            <div className="team-top reveal">
              <div>
                <div className="section-kicker">03 — The people behind it</div>
                <h2>
                  Five minds.
                  <br />
                  One shared story.
                </h2>
              </div>
            </div>
            <div className="members">
              {MEMBERS.map(([initials, n, roleText], i) => (
                <article className="member reveal" key={n}>
                  <span className="member-number">0{i + 1} / 05</span>
                  <div className="member-avatar">{initials}</div>
                  <h3>{n}</h3>
                  <p>{roleText}</p>
                  <div className="member-line" />
                </article>
              ))}
            </div>
          </section>

          <section className="testimonial">
            <div className="testimonial-heading reveal">
              <div className="section-kicker">04 — What people think</div>
              <h2>Heritage hits different when you experience it.</h2>
              <p>
                Mirava is built to make Indian heritage feel personal, interactive and relevant to the generation
                growing up with it today.
              </p>
            </div>
            <div className="testimonial-grid">
              <article className="testimonial-card reveal">
                <div className="quote-mark-small">"</div>
                <blockquote>
                  Mirava makes history feel <em>less like a textbook</em> and more like something I actually want to
                  explore.
                </blockquote>
                <div className="person">
                  <div className="person-avatar">SS</div>
                  <div className="person-info">
                    <strong>Sarth Sharma</strong>
                    <span>Student of XB</span>
                  </div>
                </div>
              </article>
              <article className="testimonial-card reveal">
                <div className="quote-mark-small">"</div>
                <blockquote>
                  I never thought learning about <em>Indian heritage could feel this immersive</em> and actually be
                  fun.
                </blockquote>
                <div className="person">
                  <div className="person-avatar">SS</div>
                  <div className="person-info">
                    <strong>Smarth Sharma</strong>
                    <span>Student of XA</span>
                  </div>
                </div>
              </article>
            </div>
          </section>

          <section className="why" id="why">
            <div className="why-head">
              <div className="reveal">
                <div className="section-kicker" style={{ color: 'var(--wine)' }}>
                  05 — Why Mirava
                </div>
                <h2>Made for roots that refuse to stand still.</h2>
              </div>
              <p className="why-intro reveal">
                The web has plenty of information. Mirava has intimacy — a thoughtful, ever-growing way to encounter
                what makes India extraordinary.
              </p>
            </div>
            <div className="reasons reveal">
              {REASONS.map(([h, p], i) => (
                <article className="reason" key={h}>
                  <div className="reason-no">0{i + 1} / 03</div>
                  <h3>{h}</h3>
                  <p>{p}</p>
                  <div className="reason-arrow">↗</div>
                </article>
              ))}
            </div>
          </section>

          <section className="faq" id="faq">
            <div className="about" style={{ paddingTop: 40, paddingBottom: 0 }}>
              <div className="reveal">
                <div className="section-kicker">06 — Frequently asked</div>
                <h2>Questions we often hear.</h2>
              </div>
              <div className="about-right reveal">
                <p style={{ fontSize: '1rem', lineHeight: 1.7 }}>
                  From what we stand for to how you can join, here are the answers that help you feel at home with
                  Mirava.
                </p>
              </div>
            </div>
            <div className="faq-grid reveal">
              <div className="faq-item">
                <h4>What makes Mirava different?</h4>
                <p>
                  We focus on living heritage — not static artifacts. Every story, craft and ritual is shared with
                  context, heart and a connection to the present.
                </p>
              </div>
              <div className="faq-item">
                <h4>Is Mirava free to explore?</h4>
                <p>
                  Yes. All stories, articles and visual journeys are free. Members get early access to new features and
                  community events.
                </p>
              </div>
              <div className="faq-item">
                <h4>Can I contribute a story?</h4>
                <p>
                  Absolutely. We welcome stories from families, artisans and communities. Email us at{' '}
                  <a href="mailto:hello@mirava.in" style={{ color: 'var(--orange)' }}>
                    hello@mirava.in
                  </a>{' '}
                  with your idea.
                </p>
              </div>
              <div className="faq-item">
                <h4>Who creates the content?</h4>
                <p>
                  Our team works with historians, artists and local storytellers. Every piece is vetted for authenticity
                  and cultural sensitivity.
                </p>
              </div>
              <div className="faq-item">
                <h4>How do I stay updated?</h4>
                <p>
                  Follow us on Instagram and LinkedIn, or sign up for our newsletter (coming soon). We also share updates
                  directly with members.
                </p>
              </div>
              <div className="faq-item">
                <h4>Can I use Mirava for research?</h4>
                <p>
                  Yes, many educators and researchers use our archives. Please cite us as "Mirava Living Heritage" and
                  reach out for collaboration.
                </p>
              </div>
            </div>
          </section>

          {/* Join band (legacy CSS + copy from the legacy account script). */}
          <div className="join reveal" id="experiences">
            <div>
              <div className="section-kicker">Join Mirava</div>
              <h2>
                {signedIn ? (
                  <>
                    Welcome back, <span translate="no">{name || 'explorer'}</span>.
                  </>
                ) : (
                  'Your journey through India starts with one click.'
                )}
              </h2>
            </div>
            <div className="join-actions">
              {signedIn ? (
                <>
                  <p>Pick up where you left off: the atlas, the daily quiz and every story are waiting.</p>
                  <Link className="btn-light" to="/explore">
                    Continue to Explore ↗
                  </Link>
                </>
              ) : (
                <>
                  <p>Create a free account to unlock the atlas, save your progress and take the daily heritage quiz.</p>
                  <Link className="btn-light" to="/signup">
                    Create free account ↗
                  </Link>
                  <div className="alt-row">
                    <Link className="alt" to="/login">
                      I already have an account
                    </Link>
                    <button type="button" className="alt" onClick={startGuest} disabled={guestBusy || loading}>
                      {guestBusy ? 'Opening Mirava…' : 'Continue as guest'}
                    </button>
                  </div>
                  {guestError && (
                    <p className="cta-error" role="alert">
                      {guestError}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </main>

        <footer id="join">
          <div className="footer-top">
            <div>
              <div className="footer-logo">mirava</div>
              <p className="footer-p">A home for the many ways India remembers, makes and imagines.</p>
            </div>
            <div>
              <div className="footer-title">Explore</div>
              <div className="footer-links">
                <a href="#about">Our story</a>
                <a href="#experiences">Experiences</a>
                <a href="#people">The people</a>
                <a href="#why">Why Mirava</a>
                <a href="#faq">FAQs</a>
                {signedIn ? (
                  <Link to="/explore">Explore</Link>
                ) : (
                  <>
                    <Link to="/login">Log in</Link>
                    <Link to="/signup">Sign up</Link>
                  </>
                )}
              </div>
            </div>
            <div>
              <div className="footer-title">Stay in the loop</div>
              <div className="footer-links">
                <a href="mailto:hello@mirava.in">hello@mirava.in</a>
                <a href="#home">Instagram ↗</a>
                <a href="#home">LinkedIn ↗</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2024 Mirava. Made with care in India.</span>
            <span>Privacy · Terms · Accessibility</span>
          </div>
        </footer>

        <button
          type="button"
          className="m-top"
          aria-label="Back to top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          ↑
        </button>
      </div>
    </PageScope>
  )
}
