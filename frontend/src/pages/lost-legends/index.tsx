import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { PageScope } from '../../components/PageScope'
import { useLegacyPage, type LegacyContext } from '../../lib/legacy'
import { initLostLegends } from './engine.js'
import './lost-legends.page.css'

export default function LostLegendsPage() {
  const { me, isGuest, refreshMe } = useAuth()
  const navigate = useNavigate()
  const ref = useLegacyPage(
    (root: HTMLElement, ctx: LegacyContext) => initLostLegends(root, ctx, { onScore: () => refreshMe() }),
    { me, isGuest, navigate },
  )

  return (
    <PageScope name="lost-legends" title="Lost Legends of Bharat | MIRAVA">
      <div ref={ref}>
      <div id="app">
        <canvas
          id="scene"
          tabIndex={0}
          aria-label="3D heritage adventure. WASD moves, drag to look, E interacts, F flies, T changes the time lens."
        />
        <div id="shade" />
        <div id="labels" hidden />
        <section id="title" aria-label="Title screen">
          <header className="title-nav">
            <div className="brand">
              <div className="brand-mark">
                <span>M</span>
              </div>
              <div>
                <strong>MIRAVA</strong>
                <small>India&apos;s living heritage</small>
              </div>
            </div>
            <div className="title-actions">
              <Link className="back-explore" to="/explore" aria-label="Go back to Explore">
                ← Go back to Explore
              </Link>
              <span className="mirava">OFFLINE EDITION</span>
            </div>
          </header>
          <div className="hero">
            <span className="pill">A world worth remembering</span>
            <h1>
              Lost Legends
              <br />
              of <em>Bharat.</em>
            </h1>
            <p>
              Seven fading lamps. A missing chronicle.
              <br />
              Walk through the past, uncover its stories,
              <br />
              and build a future that remembers.
            </p>
            <div className="actions">
              <button className="btn primary" id="startBtn">
                Begin your journey &nbsp; &#8599;
              </button>
              <button className="btn" id="continueBtn" hidden>
                Continue
              </button>
            </div>
            <p className="fine">
              An original, fictional 3D heritage park. Inspired by real places, not a reconstruction. Everything you
              need is in this file.
            </p>
          </div>
          <footer className="title-bottom">
            <div className="title-stats">
              <div>
                <b>07</b>
                <span>Heritage lamps</span>
              </div>
              <div>
                <b>08</b>
                <span>Discovery systems</span>
              </div>
              <div>
                <b>&#8734;</b>
                <span>Curiosity welcome</span>
              </div>
            </div>
            <div className="title-caption">
              The past isn&apos;t lost. It&apos;s waiting.<small>Explore &middot; discover &middot; restore</small>
            </div>
          </footer>
        </section>
        <div id="hud" hidden>
          <header className="hud-top">
            <div className="hud-logo">
              <span className="eyebrow">MIRAVA / FIELD NOTES</span>Lost Legends
            </div>
            <div className="lamp-strip" id="lampStrip" />
            <div className="hud-tools">
              <Link to="/explore" className="tool hud-back" title="Back to Explore" aria-label="Go back to Explore">
                <svg viewBox="0 0 24 24">
                  <path d="M19 12H5m6-6-6 6 6 6" />
                </svg>
              </Link>
              <button id="mapBtn" className="tool" title="Atlas (M)" aria-label="Open atlas">
                <svg viewBox="0 0 24 24">
                  <path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2Zm6-2v16m6-14v16" />
                </svg>
              </button>
              <button id="journalBtn" className="tool" title="Living Codex (J)" aria-label="Open Living Codex">
                <svg viewBox="0 0 24 24">
                  <path d="M3 4h6a3 3 0 0 1 3 3v14a4 4 0 0 0-3-2H3zm9 3a3 3 0 0 1 3-3h6v15h-6a4 4 0 0 0-3 2" />
                </svg>
              </button>
              <button id="questBtn" className="tool" title="Journey (Q)" aria-label="Open quest journal">
                <svg viewBox="0 0 24 24">
                  <path d="M7 3h10v4H7zM6 5H4v17h16V5h-2M8 12h8M8 17h6" />
                </svg>
              </button>
              <button id="pauseBtn" className="tool" title="Pause (Escape)" aria-label="Pause">
                <svg viewBox="0 0 24 24">
                  <path d="M8 5v14M16 5v14" strokeWidth="3" />
                </svg>
              </button>
            </div>
          </header>
          <section id="objective">
            <div className="objective-head">
              <span className="eyebrow" id="objTag">
                THE FADING LAMPS
              </span>
              <button id="hintBtn">Guide me</button>
            </div>
            <h3 id="objTitle">Begin your journey</h3>
            <p id="objText">Meet Dadi Saraswati in the central garden.</p>
            <div className="obj-footer">
              <span id="xpText">0 XP</span>
              <span id="saveState">Saved to your account</span>
            </div>
          </section>
          <div className="interact-wrap">
            <button id="interactBtn" className="interact" hidden>
              <span className="key">E</span>
              <span id="interactText">Talk</span>
            </button>
          </div>
          <div className="world-help">
            <span className="key">W A S D</span> Move &nbsp; Drag to look &nbsp; <span className="key">F</span> Fly
            &nbsp; <span className="key">T</span> Time lens &nbsp; <span className="key">V</span> View
          </div>
          <div className="world-side">
            <div id="locationName">The keeper&apos;s garden</div>
            <canvas
              id="minimap"
              width={240}
              height={240}
              title="Open the atlas"
              aria-label="Mini map. Open atlas with M."
            />
            <div id="eraBadge">PRESENT / IMAGINED RUINS</div>
            <div className="row">
              <button id="flyBtn" className="btn small">
                Fly [F]
              </button>
              <button id="lensBtn" className="btn small">
                Lens [T]
              </button>
            </div>
          </div>
          <div id="reticle" hidden />
          <div id="touch">
            <div id="joystick" aria-label="Movement joystick">
              <div id="thumb" />
            </div>
            <div id="touchButtons">
              <div className="vertical">
                <button id="touchUp" aria-label="Jump or fly up">
                  &#8593;
                </button>
                <button id="touchDown" aria-label="Fly down">
                  &#8595;
                </button>
              </div>
              <button id="touchE" aria-label="Interact">
                INTERACT
              </button>
            </div>
          </div>
        </div>
        <section id="modal" hidden role="dialog" aria-modal="true" aria-labelledby="modalTitle">
          <div className="dialog" id="dialog">
            <button
              id="modalPause"
              data-act="pause"
              className="close"
              style={{ right: 56, fontSize: 14 }}
              aria-label="Pause activity (P)"
              title="Pause (P)"
            >
              &#10074;&#10074;
            </button>
            <button id="closeModal" className="close" aria-label="Close">
              &times;
            </button>
            <div id="modalBody" />
          </div>
        </section>
        <section id="activity" hidden aria-label="3D activity">
          <div className="activity-top">
            <div className="eyebrow" id="activityTag" />
            <h2 id="activityTitle" />
            <p id="activityCaption" />
          </div>
          <div id="stageGesture" className="stage-gesture" aria-label="Drag to rotate the 3D scene" />
          <div id="hotspots" />
          <div id="stageBottom" className="stage-bottom" />
          <aside id="activitySide" className="activity-side" />
        </section>
        <div className="toast" id="toast">
          <b id="toastTitle" />
          <p id="toastText" />
        </div>
        <div className="sr-only" id="live" aria-live="polite" />
        <div id="loading">
          <div>
            <div className="orb" />
            <div className="eyebrow">A little world is taking shape</div>
          </div>
        </div>
        <div id="error" hidden>
          <div>
            <div className="eyebrow">A small technical pause</div>
            <h2>
              Let&apos;s get you back
              <br />
              to the journey.
            </h2>
            <p id="errorText">This game needs a browser with WebGL 2 and hardware acceleration.</p>
            <div className="actions">
              <button className="btn primary" onClick={() => window.location.reload()}>
                Reload game
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>
    </PageScope>
  )
}
