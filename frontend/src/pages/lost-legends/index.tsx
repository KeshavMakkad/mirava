import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { PageScope } from '../../components/PageScope'
import { useLegacyPage, type LegacyContext } from '../../lib/legacy'
import { initLostLegends } from './engine.js'
import './lost-legends.page.css'

/** Lost Legends of Bharat (ported from the hackathon's game.html: 2D open world + arenas, trials, 3D monuments). */
export default function LostLegendsPage() {
  const { me, refreshMe } = useAuth()
  const navigate = useNavigate()
  const ref = useLegacyPage(
    (root: HTMLElement, ctx: LegacyContext) => initLostLegends(root, ctx, { onScore: () => refreshMe() }),
    { me, navigate },
  )

  return (
    <PageScope name="lost-legends" title="Lost Legends of Bharat · Mirava">
      <div ref={ref}>
        {/* ================= DASHBOARD ================= */}
        <div className="screen hidden" id="dashScreen">
          <div className="dash" id="dash" />
        </div>

        {/* ================= GAME ================= */}
        <div className="screen hidden" id="gameScreen">
          <canvas id="cv" />
          <div id="hud">
            <div className="hud-player glass">
              <div className="hp-av" id="hpAv">
                🧭<span className="hp-lvl" id="hpLvl">1</span>
              </div>
              <div className="hp-info">
                <div className="hp-name" id="hpName" translate="no">
                  Explorer
                </div>
                <div className="hp-title" id="hpTitle">
                  Wanderer
                </div>
                <div className="bar xp">
                  <i id="hpXp" style={{ width: 0 }} />
                </div>
                <div className="bar st">
                  <i id="hpSt" style={{ width: '100%' }} />
                </div>
              </div>
            </div>
            <div className="hud-quest glass" id="hudQuest">
              <div className="hq-k">◆ Current quest</div>
              <div className="hq-t" id="hqT">
                —
              </div>
              <div className="hq-d" id="hqD" />
            </div>
            <div className="hud-btns">
              <button className="hb glass" id="bMap" title="Map">
                🗺️<kbd>M</kbd>
              </button>
              <button className="hb glass" id="bQuest" title="Quests & honours">
                📜<kbd>Q</kbd>
              </button>
              <button className="hb glass" id="bBag" title="Bag">
                🎒<kbd>I</kbd>
              </button>
              <button className="hb glass" id="bCodex" title="Heritage codex">
                📖<kbd>C</kbd>
              </button>
              <button className="hb glass" id="bPhoto" title="Take a postcard">
                📸<kbd>P</kbd>
              </button>
              <button className="hb glass" id="bTrial" title="Trials & tasks">
                ⚔️<kbd>T</kbd>
              </button>
              <button className="hb glass" id="bAR" title="3D monuments">
                🏛️<kbd>R</kbd>
              </button>
              <button className="hb glass" id="bPause" title="Menu">
                ☰<kbd>Esc</kbd>
              </button>
            </div>
            <div className="hud-clock glass" id="hudClock">
              ☀️ 07:00
            </div>
            <div className="hud-banner" id="banner">
              <small id="banK" />
              <span id="banT" />
            </div>
            <div className="hud-prompt glass hidden" id="prompt">
              <kbd>E</kbd>
              <span id="promptT" />
            </div>
            <div className="mini-label" id="miniLabel" />
            <div className="hud-mini glass">
              <canvas id="mini" width={220} height={220} />
            </div>
            <div className="toasts" id="toasts" />
            <div className="stick hidden" id="stick">
              <i id="knob" />
            </div>
            <button className="touch-act hidden" id="tAct">
              E
            </button>
            <button className="touch-run glass hidden" id="tRun">
              🏃
            </button>
          </div>
          <div className="dlg glass hidden" id="dlg">
            <div className="dlg-av" id="dlgAv" />
            <div className="dlg-main">
              <div>
                <span className="dlg-name" id="dlgName" />
                <span className="dlg-role" id="dlgRole" />
              </div>
              <div className="dlg-text" id="dlgText" data-mirava-localized="true" />
              <div className="dlg-hint">click · E · space ▸</div>
            </div>
          </div>
          <div className="panel-wrap hidden" id="panelWrap">
            <div className="panel" id="panel">
              <button className="panel-x" data-close="">
                ×
              </button>
              <div className="panel-k" id="panelK" />
              <h2 id="panelT" />
              <div id="panelB" />
            </div>
          </div>
          <div className="mg hidden" id="mg">
            <div className="mg-shell">
              <div className="mg-head">
                <div>
                  <div className="mg-k" id="mgK" />
                  <h2 id="mgT" />
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className="mg-status" id="mgS" />
                  <button className="panel-x" style={{ position: 'static' }} id="mgX">
                    ×
                  </button>
                </div>
              </div>
              <div className="mg-body" id="mgB" />
              <div className="mg-prog" id="mgPW">
                <i id="mgP" />
              </div>
            </div>
          </div>
          <div id="fade" />
          <div id="loading" className="hidden">
            <div className="spin" />
            <div id="loadT">Charting the subcontinent…</div>
          </div>
        </div>
      </div>
    </PageScope>
  )
}
