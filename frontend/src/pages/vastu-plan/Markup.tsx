/* Static markup of VastuPlan.html, converted to JSX (behaviour lives in engine.js). */
import { Link } from 'react-router-dom'
import { AccountMenu } from '../../components/AccountMenu'

const GOLD = { color: '#f8c35b' }

export function VastuMarkup({ who }: { who: string | null }) {
  return (
    <>
      <header className="top">
        <div className="top-in">
          <Link className="brand" to="/">
            mira<i>va</i>
          </Link>
          <span className="crumb">VastuPlan AI</span>
          <span className="top-sp"></span>
          <span className="who" id="who" hidden={!who} translate="no">
            {who ? `Sthapati ${who}` : ''}
          </span>
          <Link className="pill" to="/explore">
            ← Back to the atlas
          </Link>
          <AccountMenu className="vp-account" />
        </div>
      </header>

      <section className="hero">
        <div className="hero-in">
          <div>
            <div className="eyebrow">Ancient town-planning simulator</div>
            <h1>
              Plan a city the way the <em>Sthapatis</em> did.
            </h1>
            <p>
              Lay streets, raise temples, dig tanks and build homes on a 9 × 9 Vastu Purusha Mandala. Every move is scored for{' '}
              <b style={GOLD}>orientation</b>, <b style={GOLD}>layout</b> and <b style={GOLD}>spatial organisation</b> — and Sthapati
              AI, your master-builder, can suggest the next move or plan a whole city.
            </p>
            <div className="hero-cta">
              <a className="btn gold" href="#planner">
                Start planning ↓
              </a>
              <a className="btn ghost" href="#heritage">
                Rebuild a heritage city
              </a>
              <a className="btn ghost" href="#learn">
                Learn the mandala
              </a>
            </div>
          </div>
          <div className="mandala-art" aria-hidden="true">
            <svg viewBox="-110 -110 220 220" id="heroArt"></svg>
          </div>
        </div>
      </section>

      <main className="app" id="planner">
        <div className="shell">
          <aside className="card tools" aria-label="Building tools">
            <div className="k">Build</div>
            <div className="tool-list" id="tools"></div>
            <p className="hint">
              Click or drag on the land to build. Right-click (or the eraser) clears a plot. Click a gate in the wall to open or close it.
            </p>
          </aside>

          <section className="card board-card" aria-label="City plan">
            <div className="bar">
              <button className="ib" id="undo" title="Undo (Ctrl+Z)" aria-label="Undo">
                ↶
              </button>
              <button className="ib" id="redo" title="Redo (Ctrl+Y)" aria-label="Redo">
                ↷
              </button>
              <div className="seg" id="overlaySeg" role="group" aria-label="Map overlay">
                <button data-ov="none" className="on">
                  City
                </button>
                <button data-ov="zones">Zones</button>
                <button data-ov="ideal">Best plots</button>
                <button data-ov="purusha">Purusha</button>
              </div>
              <span className="sp"></span>
              <select id="preset" aria-label="Start from a plan" defaultValue="">
                <option value="">Start from…</option>
                <option value="blank">Empty land</option>
                <option value="sarvato">Sarvatobhadra-inspired (temple centre)</option>
                <option value="grid">Harappan-style grid</option>
                <option value="village">Riverside village</option>
              </select>
              <button className="btn line sm" id="saveCard">
                ⤓ City card
              </button>
            </div>
            <div className="canvas-wrap" id="wrap">
              <canvas id="board" aria-label="Interactive 9 by 9 city grid"></canvas>
              <div className="floaty" id="floaty"></div>
            </div>
            <div className="sunrow">
              <span>🌅 Sunrise · east</span>
              <input type="range" id="sun" min="6" max="18" step=".25" defaultValue="9" aria-label="Time of day" />
              <span>Sunset · west 🌇</span>
              <span id="sunT" style={{ minWidth: 44, textAlign: 'right' }}>
                09:00
              </span>
            </div>
            <div className="legend" id="legend"></div>
            <div className="heri">
              <span className="lab">Festivals</span>
              <button className="btn sm ratha-btn" id="ratha">
                🛕 Ratha Yatra
              </button>
              <button className="btn line sm" id="deepa" aria-pressed="false">
                🪔 Deepotsava
              </button>
              <span className="sp"></span>
              <button className="btn line sm" id="sound" aria-pressed="true" title="Festival sounds">
                🔊 Sound
              </button>
            </div>
          </section>

          <div className="side">
            <section className="card quest-card" id="questCard" hidden aria-live="polite"></section>
            <section className="card score-card" aria-live="polite">
              <div className="k">Vastu score</div>
              <div className="score-top" style={{ marginTop: 10 }}>
                <div className="ring">
                  <svg viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="52" stroke="#efe4d4" strokeWidth="10" fill="none" />
                    <circle
                      id="ringArc"
                      cx="60"
                      cy="60"
                      r="52"
                      stroke="url(#rg)"
                      strokeWidth="10"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray="326.7"
                      strokeDashoffset="326.7"
                      style={{ transition: 'stroke-dashoffset .7s cubic-bezier(.22,1,.36,1)' }}
                    />
                    <defs>
                      <linearGradient id="rg">
                        <stop offset="0" stopColor="#f5aa35" />
                        <stop offset="1" stopColor="#e5562f" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="rc">
                    <b id="scoreN">0</b>
                    <small>OF 100</small>
                  </div>
                </div>
                <div className="grade">
                  <b id="gradeT">Empty land</b>
                  <p id="gradeP"></p>
                  <div className="best" id="best"></div>
                </div>
              </div>
              <div className="cats" id="cats"></div>
              <div className="rules" id="rules"></div>
            </section>
            <section className="card ai-card">
              <div className="k">✦ Sthapati AI</div>
              <h3>Your master-builder</h3>
              <p className="sub">
                A planning engine running in your browser. It tests every possible move against the principles and explains its reasoning.
              </p>
              <div className="ai-msg" id="aiMsg">
                Namaste! Place a few buildings — or ask me for a suggestion. I'll tell you why each move matters.
              </div>
              <div className="prog" id="prog">
                <i id="progI"></i>
              </div>
              <div className="ai-acts">
                <button className="btn gold sm" id="suggest">
                  ✦ Suggest a move
                </button>
                <button className="btn ghost sm" id="apply" hidden>
                  Apply it
                </button>
                <button className="btn ghost sm" id="auto">
                  Auto-plan my city
                </button>
                <button className="btn ghost sm" id="explain">
                  Explain my score
                </button>
              </div>
            </section>
          </div>
        </div>
      </main>

      <section className="heritage" id="heritage">
        <div className="k">Heritage city challenges</div>
        <h2>Rebuild four cities of India</h2>
        <p className="lead">
          India has been planning cities for over 4,500 years. Pick a city, read its story, and rebuild its plan on the mandala. Each
          objective ticks off live as you build — complete them all to earn that city's seal. Stuck? Ask for the historic layout.
        </p>
        <div className="tline" id="tline"></div>
        <div className="qgrid" id="qgrid"></div>
        <div className="seals" id="seals"></div>
      </section>
      <section className="ritual" id="rituals">
        <div className="k">Living traditions</div>
        <h2>Bring your city to life</h2>
        <div className="rgrid">
          <div className="rc2 a">
            <div className="k">Ratha Yatra · chariot festival</div>
            <h3>Pull the temple chariot</h3>
            <p>
              In temple towns like Madurai and Puri, the deity leaves the shrine on a towering wooden chariot (<i>ratha</i> or <i>ther</i>)
              pulled by thousands of devotees. It always circles the temple clockwise — <i>pradakshina</i>, keeping the deity on the
              right. Build a ring of streets around a temple and start the procession.
            </p>
            <button className="btn gold sm" data-go="ratha">
              🛕 Start the procession
            </button>
            <svg className="bg" viewBox="0 0 100 100">
              <path d="M50 6 L70 40 H30Z M26 40 H74 V62 H26Z" fill="#fff" />
              <circle cx="34" cy="76" r="14" fill="none" stroke="#fff" strokeWidth="5" />
              <circle cx="66" cy="76" r="14" fill="none" stroke="#fff" strokeWidth="5" />
            </svg>
          </div>
          <div className="rc2 b">
            <div className="k">Deepotsava · festival of lamps</div>
            <h3>Light the city at night</h3>
            <p>
              On the new-moon night of Deepavali, homes, temples, walls and tanks across India glow with rows of clay lamps (
              <i>diyas</i>). Switch your city to night and watch every home, street and temple light up, with lamps floating on the
              water. Light a city of at least ten homes and a temple to earn the seal.
            </p>
            <button className="btn gold sm" data-go="deepa">
              🪔 Light the lamps
            </button>
            <svg className="bg" viewBox="0 0 100 100">
              <path d="M20 62 Q50 92 80 62 Z" fill="#fff" />
              <path d="M50 58 C38 44 46 30 50 14 C54 30 62 44 50 58Z" fill="#fff" />
            </svg>
          </div>
          <div className="rc2 c">
            <div className="k">Vastu Purusha · the cosmic being</div>
            <h3>See who lies beneath</h3>
            <p>
              In Vastu tradition, a cosmic being — the <i>Vastu Purusha</i> — lies across every plot of land, pinned down by the gods:
              head to the north-east, feet to the south-west, navel at the open Brahmasthana. That is why the centre stays open and the
              north-east is kept light and pure. Turn on the Purusha overlay.
            </p>
            <button className="btn gold sm" data-go="purusha">
              ✦ Show the Purusha
            </button>
            <svg className="bg" viewBox="0 0 100 100">
              <circle cx="72" cy="28" r="10" fill="#fff" />
              <path d="M64 36 L36 64" stroke="#fff" strokeWidth="14" strokeLinecap="round" />
              <path d="M36 64 L18 70 M36 64 L30 82" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </section>

      <section className="learn" id="learn">
        <div className="k">Learn the principles</div>
        <h2>The Vastu Purusha Mandala</h2>
        <p className="lead">
          Traditional Indian architecture and town planning begin with a square grid — the <b>Vastu Purusha Mandala</b>. The 81-square
          version (<i>Paramashayika</i>) is used here: its central nine squares belong to Brahma (the <b>Brahmasthana</b>), and each
          direction is guarded by a deity whose nature suggests what should be built there. Tap a zone to see it on the plan.
        </p>
        <div className="mandala-grid" id="mgrid"></div>
        <div className="two">
          <div className="card info">
            <h3>Village &amp; town plans of the Manasara</h3>
            <p>
              The <i>Manasara</i>, an ancient Sanskrit treatise on architecture, describes several plan types for villages and towns,
              each with its own arrangement of streets, gates and temple. Among them:
            </p>
            <div className="chips">
              <span>Dandaka</span>
              <span>Sarvatobhadra</span>
              <span>Nandyavarta</span>
              <span>Padmaka</span>
              <span>Swastika</span>
              <span>Prastara</span>
              <span>Karmuka</span>
              <span>Chaturmukha</span>
            </div>
            <p style={{ marginTop: 10 }}>
              Try the <b>Sarvatobhadra-inspired</b> plan above — a square town with a central shrine and streets running to gates on all
              four sides.
            </p>
          </div>
          <div className="card info">
            <h3>How your city is scored</h3>
            <ul>
              <li>
                <b>Orientation (40)</b> — water in the north-east, fire in the south-east, heavy buildings in the south-west, granary in
                the north-west, trade to the north and gates facing east and north.
              </li>
              <li>
                <b>Layout (35)</b> — an open sacred centre, a temple at the heart, streets from every gate to the centre, a street beside
                every building, cardinal avenues and balance.
              </li>
              <li>
                <b>Spatial organisation (25)</b> — a complete set of civic buildings, enough homes, fire and water apart, open space,
                gardens to the north-east and a market on a gate street.
              </li>
            </ul>
          </div>
        </div>
        <p className="note">
          VastuPlan is an educational game. Its rules are simplified from principles commonly described in Vastu Shastra and classical
          texts such as the Manasara and Mayamata, which vary in their details. It is not architectural or planning advice. Your plans are
          saved to your Mirava account.
        </p>
      </section>
      <footer>
        <b>
          mira<i>va</i>
        </b>
        VastuPlan AI · part of Mirava, a living home for Indian heritage.
      </footer>
      <div className="toast" id="toast" role="status"></div>
    </>
  )
}
