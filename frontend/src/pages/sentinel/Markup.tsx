/**
 * Static markup of Mirava Sentinel (from legacy/Sentinel.html). The imperative
 * engine (engine.js) fills the dynamic regions (drops, findings, Command Centre…)
 * inside it, so these components are memoised and never re-render.
 */
import { memo } from 'react'
import { Link } from 'react-router-dom'

function Header() {
  return (
    <header className="top">
      <Link className="brand" to="/explore" title="Back to the Mirava atlas">
        Mirava<i>.</i>
      </Link>
      <span className="tag">🛡️ Sentinel</span>
      <span className="sp"></span>
      <Link className="tbtn" to="/explore">
        ← <span>Atlas</span>
      </Link>
      <button className="tbtn" id="ccBtn" type="button">
        📊 <span>Command Centre</span>{' '}
        <b id="ccN" className="crit" title="Critical, unresolved" style={{ display: 'none' }}>
          0
        </b>
      </button>
      <button className="tbtn" id="histBtn" type="button">
        🗂️ <span>Tickets</span> <b id="histN">0</b>
      </button>
    </header>
  )
}

function Intro() {
  return (
    <>
      <section className="intro">
        <div>
          <div className="k">Monument health · field inspection</div>
          <h1>
            Spot the damage
            <br />
            <em>before it spreads.</em>
          </h1>
          <p>
            India has more than 3,600 centrally protected monuments, and only a few have guards on site all the time.
            Take one photo of a carving, wall or pillar. Sentinel flags fresh graffiti, tool scratches, cracks,
            bio-growth and salt damage. It rates the severity and turns the finding into an incident ticket in one
            click.
          </p>
        </div>
        <div className="stats">
          <div className="stat">
            <b>&lt; 2 s</b>
            <small>on-device scan, no upload</small>
          </div>
          <div className="stat">
            <b>7</b>
            <small>defect classes screened</small>
          </div>
          <div className="stat">
            <b>SSIM + ΔE</b>
            <small>before / after change map</small>
          </div>
          <div className="stat">
            <b>1-click</b>
            <small>PDF incident ticket</small>
          </div>
        </div>
      </section>
      <div className="newbar" aria-label="New in Sentinel">
        <span className="k">New</span>
        {(
          [
            ['live', '🎥', 'Live camera scan', 'boxes on the video feed'],
            ['patrol', '🗂️', 'Patrol batch', 'whole round, ranked by risk'],
            ['cc', '📊', 'Command Centre', 'map, trends & dispatch'],
            ['mark', '✏️', 'Mark damage', 'add what the scan missed'],
            ['loupe', '🔍', 'Loupe', 'inspect at up to 8×'],
            ['notes', '🎙️', 'Voice field notes', 'printed on the ticket'],
          ] as const
        ).map(([go, icon, title, sub]) => (
          <button key={go} type="button" className="nb" data-go={go}>
            <i>{icon}</i>
            <b>{title}</b>
            <small>{sub}</small>
          </button>
        ))}
      </div>
    </>
  )
}

function Panel() {
  return (
    <aside className="panel">
      <div className="card">
        <h3>
          <span className="n">1</span>Monument &amp; inspector
        </h3>
        <label className="f" htmlFor="mon">
          Monument
        </label>
        <select className="in" id="mon"></select>
        <div id="customBox" style={{ display: 'none' }}>
          <label className="f" htmlFor="cName">
            Monument name
          </label>
          <input className="in" id="cName" placeholder="e.g. Rani ki Vav" maxLength={80} />
          <label className="f" htmlFor="cLoc">
            Location
          </label>
          <input className="in" id="cLoc" placeholder="e.g. Patan, Gujarat" maxLength={80} />
          <label className="f" htmlFor="cMat">
            Main material
          </label>
          <select className="in" id="cMat" defaultValue="sandstone">
            <option value="sandstone">Sandstone</option>
            <option value="calcareous">Marble / limestone</option>
            <option value="igneous">Granite / basalt</option>
            <option value="laterite">Laterite / khondalite</option>
            <option value="lime">Brick &amp; lime plaster</option>
          </select>
        </div>
        <div className="mat" id="matInfo"></div>
        <div className="row2">
          <div>
            <label className="f" htmlFor="insp">
              Inspector
            </label>
            <input className="in" id="insp" placeholder="Your name" maxLength={60} />
          </div>
          <div>
            <label className="f" htmlFor="role">
              Role
            </label>
            <select className="in" id="role">
              <option>ASI ground officer</option>
              <option>Security staff</option>
              <option>Conservation assistant</option>
              <option>Visiting tourist</option>
            </select>
          </div>
        </div>
        <div className="gps">
          <button className="chip" id="gpsBtn" type="button">
            📍 Attach GPS
          </button>
          <span id="gpsOut">Optional</span>
        </div>
      </div>

      <div className="card">
        <h3>
          <span className="n">2</span>Inspection mode
        </h3>
        <div className="seg" id="modeSeg" role="tablist">
          <button className="on" data-mode="single" role="tab" aria-selected="true" type="button">
            Single scan<small>one photo</small>
          </button>
          <button data-mode="temporal" role="tab" aria-selected="false" type="button">
            Before vs after<small>archive + today</small>
          </button>
          <button data-mode="patrol" role="tab" aria-selected="false" type="button">
            Patrol batch<small>many photos</small>
          </button>
        </div>
        <p className="note" id="modeNote"></p>
      </div>

      <div className="card">
        <h3>
          <span className="n">3</span>Detector settings
        </h3>
        <label className="f" htmlFor="sens">
          Sensitivity{' '}
          <span id="sensV" className="mono">
            6
          </span>
          /10
        </label>
        <input type="range" className="rng" id="sens" min={1} max={10} step={1} defaultValue={6} />
        <div className="rngl">
          <span>fewer false alarms</span>
          <span>catch faint damage</span>
        </div>
        <div className="dets" id="dets"></div>
        <label className="det" id="alignRow" style={{ display: 'none', marginTop: 12 }}>
          <input type="checkbox" id="autoAlign" defaultChecked /> Auto-align photos (feature matching)
        </label>
        <p className="note">
          This is automated visual screening that runs on your device. A finding is a prompt to look closer, not a
          diagnosis. Untick any false alarm before you raise the ticket.
        </p>
      </div>
    </aside>
  )
}

function Work() {
  return (
    <section className="work">
      <div className="drops" id="drops"></div>
      <div className="samples" id="samples">
        <span className="k">No photo handy? Try:</span>
      </div>
      <div className="scanbar">
        <button className="btn gold" id="scanBtn" type="button" disabled>
          🔍 Scan surface
        </button>
        <span className="hint" id="scanHint">
          Add a JPG or PNG photo to begin.
        </span>
      </div>
      <div className="prog" id="prog">
        <ol id="progList"></ol>
        <div className="bar">
          <i id="progBar"></i>
        </div>
      </div>
      <div className="patrol" id="patrol"></div>

      <div className="results" id="results">
        <div className="viewer">
          <div className="vbar">
            <div className="seg" id="viewSeg"></div>
            <div className="vtools">
              <button
                className="tool"
                id="markBtn"
                type="button"
                aria-pressed="false"
                title="Draw a box around damage the scan missed (M)"
              >
                ✏️ Mark damage
              </button>
              <button
                className="tool"
                id="loupeBtn"
                type="button"
                aria-pressed="false"
                title="Magnify the photo under the cursor (L)"
              >
                🔍 Loupe
              </button>
            </div>
            <span className="meta" id="vMeta"></span>
          </div>
          <div className="panes" id="panes">
            <div className="pane">
              <span className="lbl" id="lblL">
                Original
              </span>
              <canvas id="cvL"></canvas>
            </div>
            <div className="pane">
              <span className="lbl" id="lblR">
                Annotated
              </span>
              <canvas id="cvR"></canvas>
              <div className="mrect" id="mrect"></div>
            </div>
          </div>
          <div className="swipe" id="swipe">
            <div className="sw" id="swWrap">
              <span className="lbl" style={{ left: 10 }}>
                ARCHIVE (ALIGNED)
              </span>
              <span className="lbl" style={{ right: 10 }}>
                CURRENT
              </span>
              <canvas id="swB"></canvas>
              <div className="top-c" id="swTop">
                <canvas id="swA"></canvas>
              </div>
              <div className="handle" id="swH"></div>
              <input
                type="range"
                min={0}
                max={100}
                defaultValue={50}
                id="swR"
                aria-label="Swipe between archive and current photo"
              />
            </div>
          </div>
        </div>

        <div className="grid2">
          <div className="triage" id="triage"></div>
          <div className="findings">
            <div className="fh">
              <b>Findings</b>
              <small id="fCount"></small>
            </div>
            <div className="flist" id="flist"></div>
          </div>
        </div>

        <div className="reco" id="reco"></div>

        <div className="notes" id="notesCard">
          <div className="nh">
            <h3>📝 Inspector field notes</h3>
            <span className="sp"></span>
            <button className="btn sm" id="dictBtn" type="button">
              🎙️ Dictate
            </button>
          </div>
          <textarea
            className="in"
            id="notes"
            rows={3}
            maxLength={1200}
            placeholder="What did you see on site? Is the paint still wet, was anyone nearby, has this spot been hit before…"
          ></textarea>
          <div className="qtags" id="qtags"></div>
          <small className="nfoot">
            Printed on the ticket and included in the copied summary · <span id="nCount">0</span>/1200 · English
            (Latin script) prints best in the PDF
          </small>
        </div>

        <div className="actbar">
          <button className="btn red" id="ticketBtn" type="button">
            📄 Generate Incident Ticket
          </button>
          <button className="btn" id="pngBtn" type="button">
            ⬇ Annotated image
          </button>
          <span className="sp"></span>
          <button className="btn sm" id="newBtn" type="button">
            ↺ New inspection
          </button>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer>
      <b>About the analysis.</b> Sentinel uses classical computer vision in your browser. Single scans run
      morphological black-hat and top-hat filters for thin cracks and scratches, and colour-anomaly segmentation in
      CIELAB for paint, bio-growth, crust and salt. Before/after mode aligns the two photos with corner features,
      rotation-aware patch descriptors and RANSAC. It then computes a windowed SSIM map plus a ΔE colour difference.
      Photos never leave your device. Shadows, stains and carved details can trigger false alarms, so verify every
      finding on site. Treatment should be carried out or supervised by a qualified conservator. The Monument Health
      Index (0–100) is a screening score: 100 minus weighted penalties for each included finding's severity and
      extent, kept within the range its severity level allows (a Level 3 site never scores above 64). It is not a
      structural assessment. Live scan, patrol batches and the Command Centre also run entirely on this device; the
      Command Centre log and ticket details (no photos) are saved to your Mirava account. Tickets are field reports
      for submission to the site in-charge or ASI Circle office. They are not official ASI documents until an
      authorised officer countersigns them.
    </footer>
  )
}

function Overlays() {
  return (
    <>
      <div className="modal" id="tModal" role="dialog" aria-modal="true" aria-labelledby="tTitle">
        <div className="mbox">
          <div className="mhead">
            <h3 id="tTitle">
              <span id="tTitleT">Monument Health Assessment Ticket</span>
              <small id="tSub"></small>
            </h3>
            <a className="btn gold sm" id="pdfDl" download>
              ⬇ Download PDF
            </a>
            <button className="btn sm" id="pdfShare" type="button" hidden>
              📤 Share
            </button>
            <button
              className="btn sm"
              id="pdfCopy"
              type="button"
              title="Copy a text summary for WhatsApp, SMS or email"
            >
              📋 Copy summary
            </button>
            <a className="btn sm" id="pdfOpen" target="_blank" rel="noopener">
              ↗ Open
            </a>
            <button className="x" id="tClose" aria-label="Close" type="button">
              ×
            </button>
          </div>
          <div className="mbody" id="mbody">
            <iframe id="pdfFrame" title="Ticket preview"></iframe>
            <div className="fallback">
              <div style={{ fontSize: 44 }}>📄</div>
              <b>Your ticket is ready</b>
              <p style={{ color: 'var(--mute)', fontSize: 13 }}>
                This browser can't preview PDFs inline. Use Download or Open above.
              </p>
            </div>
          </div>
        </div>
      </div>

      <aside className="drawer" id="drawer" aria-label="Saved tickets">
        <div className="dhead">
          <h3>🗂️ Saved tickets</h3>
          <button className="x" id="dClose" aria-label="Close" type="button">
            ×
          </button>
        </div>
        <div className="dlist" id="dlist"></div>
      </aside>
      <div className="mpop" id="markPop" role="dialog" aria-label="Classify marked damage">
        <b>Classify this mark</b>
        <label className="f" htmlFor="mpType">
          Defect type
        </label>
        <select className="in" id="mpType"></select>
        <label className="f">Severity</label>
        <div className="seg sevseg" id="mpSev">
          <button type="button" data-s="1">
            Low
          </button>
          <button type="button" data-s="2" className="on">
            Medium
          </button>
          <button type="button" data-s="3">
            Critical
          </button>
        </div>
        <label className="f" htmlFor="mpNote">
          Short note (optional)
        </label>
        <input className="in" id="mpNote" maxLength={120} placeholder="e.g. initials scratched, ~12 cm" />
        <div className="mpa">
          <button className="btn sm" id="mpCancel" type="button">
            Cancel
          </button>
          <button className="btn gold sm" id="mpAdd" type="button">
            ＋ Add finding
          </button>
        </div>
      </div>
      <canvas className="loupe" id="loupe" aria-hidden="true"></canvas>

      <div className="modal" id="camModal" role="dialog" aria-modal="true" aria-labelledby="camTitle">
        <div className="mbox cbox">
          <div className="mhead">
            <h3 id="camTitle">
              🎥 Live scan<small id="camSub">Point at the surface and hold steady</small>
            </h3>
            <button className="x" id="camClose" aria-label="Close camera" type="button">
              ×
            </button>
          </div>
          <div className="cstage" id="camStage">
            <video id="camVid" playsInline muted autoPlay></video>
            <canvas id="camOv"></canvas>
            <div className="chud" id="camHud">
              Starting camera…
            </div>
          </div>
          <div className="cbar">
            <button className="btn sm" id="camFlip" type="button">
              🔄 Switch camera
            </button>
            <label className="det">
              <input type="checkbox" id="camBoxes" defaultChecked /> Show boxes
            </label>
            <span className="sp"></span>
            <button className="btn gold" id="camShot" type="button">
              📸 Capture &amp; full scan
            </button>
          </div>
        </div>
      </div>

      <div className="cc" id="cc" role="dialog" aria-modal="true" aria-labelledby="ccTitle">
        <div className="cchead">
          <div>
            <div className="k">Network overview · all sites</div>
            <h2 id="ccTitle">Command Centre</h2>
          </div>
          <span className="sp"></span>
          <button className="btn sm" id="ccDemo" type="button">
            ✨ Load demo data
          </button>
          <button className="btn sm" id="ccCsv" type="button">
            ⬇ Export CSV
          </button>
          <button className="x" id="ccClose" aria-label="Close Command Centre" type="button">
            ×
          </button>
        </div>
        <div className="ccbody" id="ccBody"></div>
      </div>
      <div className="toasts" id="toasts" aria-live="polite"></div>
    </>
  )
}

export const SentinelMarkup = memo(function SentinelMarkup() {
  return (
    <>
      <Header />
      <Intro />
      <main className="app">
        <Panel />
        <Work />
      </main>
      <Footer />
      <Overlays />
    </>
  )
})
