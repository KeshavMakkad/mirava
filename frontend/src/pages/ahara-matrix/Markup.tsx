/**
 * Static markup of Ahara Matrix (from the new ahara-matrix.html), converted to JSX.
 * The imperative engine (engine.js) fills the dynamic regions inside it, so the
 * component is memoised and never re-renders.
 */
import { memo } from 'react'
import { Link } from 'react-router-dom'
import { AccountMenu } from '../../components/AccountMenu'

const orb = (left: string, top: string, delay?: string) => ({ left, top, ...(delay ? { animationDelay: delay } : {}) })

export const AharaMarkup = memo(function AharaMarkup() {
  return (
    <>
      <header className="top">
        <div className="top-in">
          <Link className="brand" to="/">
            mira<i>va</i>
          </Link>
          <span className="crumb">Ahara Matrix</span>
          <span className="top-sp"></span>
          <nav className="nav">
            <a href="#lab">Thali lab</a>
            <a href="#trail">Thali trail</a>
            <a href="#festivals">Festivals</a>
            <a href="#matrix">Matrix</a>
            <a href="#ritu">Seasons</a>
            <a href="#journal">Journal</a>
          </nav>
          <Link className="pill" to="/explore">
            ← Back to the atlas
          </Link>
          <AccountMenu className="am-account" />
        </div>
      </header>

      <section className="hero">
        <div className="hero-in">
          <div>
            <div className="eyebrow">Traditional food knowledge explorer</div>
            <h1>
              What belongs <em>together</em> on a plate?
            </h1>
            <p>
              Fill a brass thali with ingredients and watch the six tastes, the heating–cooling balance and the season
              come alive. Every combination reveals principles documented in classical Ayurvedic texts, regional food
              traditions and modern nutrition science — each clearly labelled.
            </p>
            <div className="hero-stats">
              <div>
                <b id="hsI">29</b>
                <span>Ingredients</span>
              </div>
              <div>
                <b id="hsP">0</b>
                <span>Principles to discover</span>
              </div>
              <div>
                <b>6</b>
                <span>Rasas · tastes</span>
              </div>
              <div>
                <b>9</b>
                <span>Regional kitchens</span>
              </div>
              <div>
                <b>9</b>
                <span>Festival dishes</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 26, flexWrap: 'wrap' }}>
              <a className="btn gold" href="#lab">
                Open the thali lab ↓
              </a>
              <a className="btn ghost" href="#trail">
                Travel the Thali Trail
              </a>
              <a className="btn ghost" href="#festivals">
                Festival kitchen
              </a>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="plate"></div>
            <div className="orb" style={orb('38%', '6%')}>🍚</div>
            <div className="orb" style={orb('68%', '24%', '-1s')}>🫛</div>
            <div className="orb" style={orb('68%', '56%', '-2s')}>🥛</div>
            <div className="orb" style={orb('38%', '70%', '-3s')}>🍯</div>
            <div className="orb" style={orb('8%', '56%', '-4s')}>🫚</div>
            <div className="orb" style={orb('8%', '24%', '-2.5s')}>🟡</div>
            <div className="orb" style={orb('38%', '38%', '-1.5s')}>🧈</div>
          </div>
        </div>
      </section>

      <main className="wrap">
        <div className="lab" id="lab">
          <aside className="card pantry" aria-label="Pantry">
            <div className="k">The pantry</div>
            <input
              className="search"
              id="q"
              type="search"
              placeholder="Search ingredients — e.g. ghee, haldi…"
              aria-label="Search ingredients"
            />
            <div className="tabs" id="tabs"></div>
            <div className="ing-list" id="ings"></div>
          </aside>

          <section className="card table-card" aria-label="Your thali">
            <div className="ctl">
              <label className="k" htmlFor="rituSel" style={{ color: 'var(--muted)' }}>
                Season
              </label>
              <select id="rituSel"></select>
              <div className="seg" id="timeSeg" role="group" aria-label="Time of day">
                <button data-t="morning">Morning</button>
                <button data-t="midday">Midday</button>
                <button data-t="evening">Evening</button>
                <button data-t="night">Night</button>
              </div>
            </div>
            <div className="plates" id="plates" role="group" aria-label="Serve on"></div>
            <div className="thali-box" id="thaliBox">
              <div className="thali" id="plate"></div>
              <div className="steam" id="steam" hidden>
                <i></i>
                <i></i>
                <i></i>
              </div>
              <div className="centre" id="centre"></div>
            </div>
            <p className="plate-note" id="plateNote"></p>
            <div className="acts">
              <button className="btn gold sm" id="surprise">
                ✦ Surprise me with a dish
              </button>
              <button className="btn line sm" id="clear">
                Clear thali
              </button>
            </div>
            <p className="tip">Tap up to six ingredients in the pantry. Tap a bowl to remove it.</p>
          </section>

          <div className="analysis">
            <section className="card an-card" aria-live="polite">
              <div className="k">Balance of the plate</div>
              <div className="an-row" style={{ marginTop: 10 }}>
                <div className="wheel" id="wheel"></div>
                <div className="rasa-list" id="rasaList"></div>
              </div>
              <div className="meter">
                <div className="lbl">
                  <span>❄ Cooling · sheeta</span>
                  <span>Warming · ushna 🔥</span>
                </div>
                <div className="trk">
                  <span className="mk" id="mk" style={{ left: '50%' }}></span>
                </div>
                <div className="val" id="vVal">
                  Add ingredients to see their potency (virya).
                </div>
              </div>
              <div className="fit" id="fit"></div>
            </section>
            <section className="card an-card">
              <div className="k">What the traditions say</div>
              <div className="finds" id="finds" style={{ marginTop: 10 }}></div>
            </section>
          </div>
        </div>

        <section className="block" id="trail">
          <div className="sec-h">
            <div>
              <div className="k">The Thali Trail</div>
              <h2>A journey through India’s kitchens</h2>
            </div>
            <p>
              From the Langar of Amritsar to the banana-leaf feasts of Kerala, every region serves its heritage on a
              plate. Tap a glowing kitchen on the map, read its story, then serve its thali.
            </p>
          </div>
          <div className="trail">
            <div className="card map-card" id="map"></div>
            <div className="card reg-card" id="regCard"></div>
          </div>
        </section>

        <section className="block" id="festivals">
          <div className="sec-h">
            <div>
              <div className="k">Festival kitchen</div>
              <h2>A year of festival food</h2>
            </div>
            <p>India’s calendar is written in food. Cook each festival’s dish on your thali to tick it off — swipe through the year.</p>
          </div>
          <div className="fest-strip" id="festStrip"></div>
        </section>

        <section className="block" id="matrix">
          <div className="sec-h">
            <div>
              <div className="k">The matrix</div>
              <h2>Every pairing, at a glance</h2>
            </div>
            <p>
              Each coloured square is a documented principle between two ingredients. Squares you have not yet
              discovered stay hidden as <b>?</b> — tap any square to try that pair on your thali.
            </p>
          </div>
          <div className="card mx-card">
            <div className="mx-bar">
              <div className="legend">
                <span>
                  <i style={{ background: '#5aa46a' }}></i>Harmonious
                </span>
                <span>
                  <i style={{ background: '#f0b240' }}></i>Use with care
                </span>
                <span>
                  <i style={{ background: '#d0533f' }}></i>Traditionally avoided
                </span>
                <span>
                  <i style={{ background: '#e6d6c0' }}></i>Not yet discovered
                </span>
                <span>
                  <i style={{ background: '#f3ece2' }}></i>No documented principle here
                </span>
              </div>
              <label style={{ fontSize: 12.5, fontWeight: 700, display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="checkbox" id="reveal" /> Reveal all
              </label>
            </div>
            <div className="mx-scroll">
              <table className="mx" id="mx"></table>
            </div>
            <div className="mx-info" id="mxInfo">
              Hover a square to see the pair.
            </div>
          </div>
        </section>

        <section className="block" id="ritu">
          <div className="sec-h">
            <div>
              <div className="k">Ritucharya · seasonal eating</div>
              <h2>Six seasons, six ways to eat</h2>
            </div>
            <p>
              Classical Ayurveda divides the year into six ritus and adjusts the diet to each. Tap a season to read its
              guidance, then add its foods to your thali.
            </p>
          </div>
          <div className="ritu-grid">
            <div className="card ritu-wheel" id="rituWheel"></div>
            <div className="card ritu-card" id="rituCard"></div>
          </div>
        </section>

        <section className="block" id="journal">
          <div className="sec-h">
            <div>
              <div className="k">Your journal</div>
              <h2>Principles you have discovered</h2>
            </div>
            <p>Every new combination, seasonal rule and dish you uncover is recorded here — saved to your Mirava account.</p>
          </div>
          <div className="jr">
            <div className="card jr-score">
              <div className="jr-ring">
                <svg viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" stroke="#efe4d4" strokeWidth="10" fill="none" />
                  <circle
                    id="jrArc"
                    cx="60"
                    cy="60"
                    r="52"
                    stroke="#e5562f"
                    strokeWidth="10"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray="326.7"
                    strokeDashoffset="326.7"
                    style={{ transition: 'stroke-dashoffset .7s' }}
                  />
                </svg>
                <div className="c">
                  <b id="jrN">0</b>
                  <small id="jrOf">OF 0 FOUND</small>
                </div>
              </div>
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }} id="jrTitle">
                Begin with any two ingredients.
              </p>
              <div className="k" style={{ marginTop: 16 }}>
                Rasoi stamps
              </div>
              <div className="stamps" id="stamps"></div>
              <button className="btn line sm" id="jrReset" style={{ marginTop: 12 }}>
                Reset journal
              </button>
            </div>
            <div className="card jr-list" id="jrList"></div>
          </div>
          <div className="card sources">
            <h3>Sources &amp; how to read the labels</h3>
            <ul>
              <li>
                <b>Classical text</b> — principles stated in classical Ayurvedic works, chiefly the{' '}
                <i>Charaka Samhita</i>: Sutrasthana 6 (Tasyashitiya — seasonal regimen), Sutrasthana 7 (Navegandharaniya —
                rules for curd), Sutrasthana 25 and 27 (properties of foods) and Sutrasthana 26 (Atreyabhadrakapyiya —
                incompatible foods, <i>viruddha ahara</i>).
              </li>
              <li>
                <b>Regional tradition</b> — well-known dishes, festival foods and household practices from across India.
              </li>
              <li>
                <b>Modern Ayurvedic teaching</b> — guidance widely given by present-day practitioners that is not one of
                the famous classical examples.
              </li>
              <li>
                <b>Nutrition science</b> — Shoba et al. (1998), <i>Planta Medica</i> 64: piperine and curcumin absorption;
                Hallberg et al. (1989), <i>American Journal of Clinical Nutrition</i> 49: ascorbic acid and iron
                absorption; protein complementation of cereals and pulses.
              </li>
              <li>
                The taste (rasa) and potency (virya) of each ingredient follow common Ayurvedic descriptions; individual
                texts sometimes differ, and they are simplified here.
              </li>
            </ul>
            <div className="disclaimer">
              <b>For learning, not prescription.</b> Ahara Matrix explains traditional and documented ideas about food. It
              is not medical or dietary advice — please speak to a qualified doctor or dietitian about your own health,
              allergies or diet.
            </div>
          </div>
        </section>
      </main>
      <footer>
        <b>
          mira<i>va</i>
        </b>
        Ahara Matrix · part of Mirava, a living home for Indian heritage.
      </footer>
      <div className="toast" id="toast" role="status"></div>
    </>
  )
})
