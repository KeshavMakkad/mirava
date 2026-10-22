import { Link } from 'react-router-dom'

/**
 * The new explore.html removed the Lost Language Revival section: its guided
 * word lessons, meanings, listening and practice now live in Bhasha. This
 * chapter keeps its place in the journey and links there.
 */
export function Languages() {
  return (
    <section className="section language language-revival bhasha-cta" id="languages">
      <div className="revival-aurora" aria-hidden="true"></div>

      <div className="language-hero-grid">
        <div className="revival-intro">
          <div className="eyebrow">05 — Lost language revival</div>
          <h2>
            Don't study a dead
            <br />
            <em>word. Bring it back.</em>
          </h2>
          <p className="section-intro">
            Guided word lessons with meanings, a hearing button and practice questions now live in Bhasha.
          </p>

          <div className="revival-loop">
            <span className="loop-num">01</span>
            <b>Hear</b>
            <span className="loop-arrow">→</span>
            <span className="loop-num">02</span>
            <b>Trace</b>
            <span className="loop-arrow">→</span>
            <span className="loop-num">03</span>
            <b>Use</b>
            <span className="loop-arrow">→</span>
            <span className="loop-num">04</span>
            <b>Remember</b>
          </div>
        </div>

        <div className="bhasha-cta-card">
          <div className="bhasha-glyphs" aria-hidden="true" translate="no">
            अ · க · ক
          </div>
          <p>Hear a word. Learn its meaning. Practise until it stays.</p>
          <Link className="pill" to="/apps/bhasha">
            Bhasha <b aria-hidden="true">↗</b>
          </Link>
        </div>
      </div>
    </section>
  )
}
