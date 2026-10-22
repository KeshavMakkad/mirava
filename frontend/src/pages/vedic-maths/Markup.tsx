/**
 * Static markup of Mirava Gaṇita (from vedicmaths.html). engine.js fills the
 * dynamic regions, so these components are memoised and never re-render.
 */
import { memo } from 'react'
import { Link } from 'react-router-dom'
import { HabitPractice } from './HabitPractice'

function Header() {
  return (
    <header className="top">
      <Link className="brand" to="/explore" title="Back to the Mirava atlas">
        Mirava<i>.</i>
      </Link>
      <span className="tag">🧮 Gaṇita</span>
      <nav className="nav" aria-label="Sections">
        <a href="#lab">Sutra Lab</a>
        <a href="#sutras">16 Sutras</a>
        <a href="#arena">Challenge</a>
        <a href="#heist-sec">Heist</a>
        <a href="#heritage">Heritage</a>
      </nav>
      <span className="sp"></span>
      <Link className="tbtn" to="/explore">
        ← <span>Atlas</span>
      </Link>
      <a className="tbtn" href="#passport" title="Your Heist stars">
        ⚔️ <span>Heist</span> <b id="heistTop">0★</b>
      </a>
      <a className="tbtn" href="#arena" id="bestBtn">
        🏆 <span>Best</span> <b id="bestTop">0</b>
      </a>
    </header>
  )
}

function Hero() {
  return (
    <>
      <section className="wrap hero">
        <div>
          <div className="k">Mental mathematics · Indian heritage</div>
          <h1>
            Sixteen sutras.
            <br />
            <em>Answers in one line.</em>
          </h1>
          <p className="lead">
            Vedic Mathematics turns long multiplication, squares and roots into short patterns you can do in your
            head. Type any numbers into the Sutra Lab and watch each step unfold, then race the clock in the
            60-second challenge.
          </p>
          <div className="cta">
            <a className="btn gold" href="#lab">
              🧮 Open the Sutra Lab
            </a>
            <a className="btn" href="#arena">
              ⏱️ Take the 60-second challenge
            </a>
            <a className="btn ink" href="#heist-sec">
              ⚔️ Enter the Ancient Heist
            </a>
          </div>
          <div className="sotd" id="sotd"></div>
        </div>
        <div className="demo" aria-label="Animated example">
          <div className="dh">
            <div>
              <div className="k" id="dK">
                <span lang="sa-Latn" translate="no">
                  Ūrdhva-Tiryagbhyām
                </span>
              </div>
              <div className="dq" id="dQ">
                23 × 41
              </div>
              <div className="dm" id="dM">
                vertically and crosswise
              </div>
            </div>
            <div className="dots" id="dDots"></div>
          </div>
          <div className="vis" id="dVis"></div>
          <div className="dline" id="dLine"></div>
        </div>
      </section>
      <div className="wrap facts">
        <div className="fact">
          <b>16</b>
          <small>sutras (formulae)</small>
        </div>
        <div className="fact">
          <b>13</b>
          <small>sub-sutras (corollaries)</small>
        </div>
        <div className="fact">
          <b>7</b>
          <small>methods you can run here</small>
        </div>
        <div className="fact">
          <b>1 line</b>
          <small>instead of stacked partial products</small>
        </div>
      </div>
    </>
  )
}

function Passport() {
  return (
    <section className="wrap sec" id="passport">
      <div className="sh">
        <div>
          <div className="k">Quick draw</div>
          <h2>
            Spot the <em>Sutra</em>
          </h2>
        </div>
      </div>
      <div className="card spot" id="spot"></div>
      <div className="sh" style={{ marginTop: 34 }}>
        <div>
          <div className="k">Progress</div>
          <h2>
            Your <em>Passport</em>
          </h2>
        </div>
      </div>
      <div className="pp">
        <div className="card pp-rank">
          <div className="k">Current rank</div>
          <div className="pp-title" id="ppTitle">
            Śiṣya
          </div>
          <div className="pp-sub" id="ppSub">
            student
          </div>
          <div className="pp-bar">
            <i id="ppFill"></i>
          </div>
          <div className="pp-next" id="ppNext"></div>
        </div>
        <div className="card pp-track">
          <div className="k">Track 1 · Lab &amp; Challenge</div>
          <div className="pp-stats" id="ppA"></div>
          <a className="btn sm" href="#arena">
            ⏱️ Beat a score
          </a>
        </div>
        <div className="card pp-track">
          <div className="k">Track 2 · The Ancient Heist</div>
          <div className="pp-stats" id="ppB"></div>
          <a className="btn sm ink" href="#heist-sec">
            ⚔️ Continue the heist
          </a>
        </div>
      </div>
      <div className="quest" id="ppQuest"></div>
    </section>
  )
}

function Lab() {
  return (
    <section className="wrap sec" id="lab">
      <div className="sh">
        <div>
          <div className="k">Interactive solver</div>
          <h2>
            The Sutra <em>Lab</em>
          </h2>
        </div>
        <p>
          Pick a sutra, enter your own numbers and step through the working. Every answer is checked two ways: by
          exact arithmetic and by the traditional digit-sum check (navasesh).
        </p>
      </div>
      <div className="lab">
        <div className="mlist" id="mlist" role="tablist" aria-label="Methods"></div>
        <div className="card">
          <div className="mhead">
            <div>
              <h3 id="mName"></h3>
              <div className="dv" id="mDev" lang="sa" translate="no"></div>
              <p id="mDesc"></p>
            </div>
          </div>
          <div className="inrow" id="inrow"></div>
          <div className="exs" id="exs"></div>
          <div className="err" id="err" role="alert"></div>
          <div id="result"></div>
          <div className="quest" id="labBridge" style={{ marginTop: 16 }}></div>
        </div>
      </div>
    </section>
  )
}

function Sutras() {
  return (
    <section className="wrap sec" id="sutras">
      <div className="sh">
        <div>
          <div className="k">The sixteen formulae</div>
          <h2>
            Sixteen <em>sutras</em>
          </h2>
        </div>
        <div className="filters" id="sfilt">
          <button className="chip on" data-f="all" type="button">
            All
          </button>
          <button className="chip" data-f="arith" type="button">
            Arithmetic
          </button>
          <button className="chip" data-f="alg" type="button">
            Algebra
          </button>
          <button className="chip" data-f="lab" type="button">
            Runs in the Lab
          </button>
        </div>
      </div>
      <div className="sgrid" id="sgrid"></div>
      <div className="subs">
        <b>Sub-sutras used on this page:</b>{' '}
        <span className="dev" lang="sa" translate="no">
          आनुरूप्येण
        </span>{' '}
        <i lang="sa-Latn" translate="no">
          Ānurūpyeṇa
        </i>{' '}
        (proportionately: working bases such as 50),{' '}
        <span className="dev" lang="sa" translate="no">
          अन्त्ययोर्दशकेऽपि
        </span>{' '}
        <i lang="sa-Latn" translate="no">
          Antyayordaśake'pi
        </i>{' '}
        (last digits summing to ten, used with Ekādhika),{' '}
        <span className="dev" lang="sa" translate="no">
          यावदूनं तावदूनीकृत्य वर्गं च योजयेत्
        </span>{' '}
        <i lang="sa-Latn" translate="no">
          Yāvadūnaṁ tāvadūnīkṛtya vargaṁ ca yojayet
        </i>{' '}
        (squares near a base) and{' '}
        <span className="dev" lang="sa" translate="no">
          विलोकनम्
        </span>{' '}
        <i lang="sa-Latn" translate="no">
          Vilokanam
        </i>{' '}
        (by observation: the root tricks).
      </div>
    </section>
  )
}

function Arena() {
  return (
    <section className="wrap sec" id="arena">
      <div className="sh">
        <div>
          <div className="k">Mental-maths drill</div>
          <h2>
            The 60-second <em>challenge</em>
          </h2>
        </div>
        <p>
          Solve as many as you can in a minute, in your head. Three right in a row starts a streak bonus. Afterwards,
          open any miss to see the sutra that cracks it.
        </p>
      </div>
      <div className="arena">
        <div className="card aset">
          <h4>Sutra</h4>
          <div className="agrid" id="aMode"></div>
          <h4>Level</h4>
          <div className="lvls" id="aLvl">
            <button data-l="1" className="on" type="button">
              Śiṣya<small>student</small>
            </button>
            <button data-l="2" type="button">
              Gaṇaka<small>reckoner</small>
            </button>
            <button data-l="3" type="button">
              Ācārya<small>master</small>
            </button>
          </div>
          <div className="bests" id="bests"></div>
        </div>
        <div className="stage" id="stage">
          <div className="hud">
            <div className="pill">
              <small>Score</small>
              <b id="hScore">0</b>
            </div>
            <div className="pill">
              <small>Streak</small>
              <b id="hStreak">0</b>
            </div>
            <div className="pill">
              <small>Solved</small>
              <b id="hSolved">0</b>
            </div>
            <span className="sp"></span>
            <div className="ring">
              <svg width="58" height="58" viewBox="0 0 58 58">
                <circle cx="29" cy="29" r="25" fill="none" stroke="#eadfce" strokeWidth="5" />
                <circle
                  id="hRing"
                  cx="29"
                  cy="29"
                  r="25"
                  fill="none"
                  stroke="#f1b43c"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray="157.08"
                  strokeDashoffset="0"
                />
              </svg>
              <b id="hTime">60</b>
            </div>
          </div>
          <div className="play" aria-live="polite">
            <span className="qm" id="pM">
              —
            </span>
            <div className="q" id="pQ">
              Ready?
            </div>
            <form className="ain" id="pForm" autoComplete="off">
              <input
                className="in"
                id="pIn"
                inputMode="numeric"
                pattern="[0-9]*"
                aria-label="Your answer"
                placeholder="answer"
                disabled
              />
              <button className="btn gold" type="submit" id="pGo" disabled>
                ↵
              </button>
            </form>
            <div className="fb" id="pFb"></div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn sm" id="pHint" type="button" disabled>
                💡 Hint
              </button>
              <button className="btn sm" id="pSkip" type="button" disabled>
                Skip →
              </button>
            </div>
            <div className="hint" id="pHintBox" hidden></div>
          </div>
          <div className="cover" id="cStart">
            <div style={{ fontSize: 48 }}>⏱️</div>
            <h3>60 seconds. Pure mental maths.</h3>
            <p>
              Choose a sutra and level on the left, then start. Type the answer and press Enter. No calculators, only
              the sutras.
            </p>
            <button className="btn gold" id="aStart" type="button">
              ▶ Start challenge
            </button>
          </div>
          <div className="cover" id="cCount" hidden>
            <div className="count" id="cNum">
              3
            </div>
          </div>
          <div className="cover" id="cEnd" hidden>
            <div className="res" id="cRes"></div>
          </div>
        </div>
      </div>
    </section>
  )
}

function HeistStart() {
  return (
    <div id="startScreen" className="start-screen">
      <h1>The Ancient Heist</h1>
      <div className="subtitle">Secrets of Akbar's Court — A Mathematical Adventure Through the Mughal Empire</div>
      <div className="divider">❁ ❁ ❁</div>
      <div className="story">
        <p>
          🏛️ <em>Fatehpur Sikri, in the reign of Emperor Akbar.</em> A mysterious message reaches you — a lost
          manuscript of mathematical knowledge has been hidden within the imperial complex, its fragments scattered
          across the royal halls.
        </p>
        <p>
          You are an adventurer drawn into the court's shadows. To recover the manuscript, you must pass through the
          gates, the audience halls, the library, the house of discussion, and finally the imperial treasury — each
          protected by mathematical locks devised for this adventure.
        </p>
        <p>⚡ Every wrong answer raises the alarm. Reach the final chamber before the alarm reaches 100%.</p>
      </div>
      <button id="startBtn" type="button">
        ⚔️ Begin the Heist ⚔️
      </button>
      <div className="small-note">Progress is saved to your Mirava account</div>
    </div>
  )
}

function HeistMap() {
  return (
    <div id="mapScreen" className="map-screen hidden">
      <div className="map-title">🗺️ Map of the Imperial Complex</div>
      <div className="map-subtitle">Choose your next destination. Locked locations open as you progress.</div>
      <div className="rewards-strip" id="rewardsStrip">
        <div className="reward-pill stars" id="pillStars">
          ⭐ 0 / 15
        </div>
        <div className="reward-pill coins" id="pillCoins">
          💰 0
        </div>
        <div className="reward-pill xp" id="pillXP">
          ✨ 0 XP
        </div>
        <div className="reward-pill badges" id="pillBadges">
          🏅 0 / 8
        </div>
      </div>
      <div className="map-stats" id="mapStats">
        <span>📜 Chronicles: 0 / 12</span> · <span>📖 Knowledge Scroll: 0 / 5</span>
      </div>
      <div className="map-actions">
        <button className="secondary" id="viewBadgesBtn" type="button">
          🏅 View Badges
        </button>
        <button className="danger" id="resetProgressBtn" type="button">
          🔄 Reset Progress
        </button>
      </div>
      <div className="map-message" id="mapMessage"></div>
      <div className="map-grid" id="mapGrid"></div>
      <button className="secondary" id="backToStartBtn" type="button">
        ↩ Back to Start
      </button>
    </div>
  )
}

function HeistGame() {
  return (
    <div id="gameScreen" className="hidden">
      <div className="stats-bar">
        <div className="alarm-meter">
          <span>🔔 Alarm</span>
          <div className="alarm-bar-bg">
            <div id="alarmFill" className="alarm-fill" style={{ width: '0%' }}></div>
          </div>
          <span id="alarmPercent">0%</span>
        </div>
        <div className="progress-indicator" id="progressText">
          Stage 1 / 5
        </div>
        <div className="score-display" id="scoreDisplay">
          🏆 0
        </div>
      </div>

      <div className="room-card" id="roomCard">
        <div className="room-title" id="roomTitle">
          🕌 The Gates of Fatehpur Sikri
        </div>
        <div className="room-subtitle" id="roomSubtitle">
          Beyond the great gateway, the guards listen for every whisper…
        </div>
        <div className="historical-role" id="historicalRole">
          Historical role: …
        </div>
        <div className="boss-strip hidden" id="bossStrip"></div>
        <div className="objects-row" id="objectsRow"></div>

        <div className="lesson-toggle-row">
          <button className="lesson-toggle" id="lessonToggle" type="button">
            📖 Learn the Technique
          </button>
        </div>
        <div className="lesson-panel hidden" id="lessonPanel">
          <h3 id="lessonTitle">Technique</h3>
          <p id="lessonExplain"></p>
          <div className="example-box" id="lessonExample"></div>
          <div className="compare-box" id="lessonCompare"></div>
          <div className="lesson-toggle-row" id="labBridgeRow" style={{ margin: '0.2rem 0 0.9rem' }}>
            <button type="button" className="secondary" id="openInLabBtn">
              🧮 Watch this technique step by step in the Sutra Lab ↗
            </button>
          </div>
          <div className="practice-box">
            <div className="practice-title">Practice (optional — no alarm, no score)</div>
            <div className="practice-question" id="practiceQuestion">
              …
            </div>
            <div className="practice-row">
              <input type="text" inputMode="decimal" id="practiceInput" placeholder="?" autoComplete="off" />
              <button type="button" id="practiceCheckBtn">
                Check
              </button>
              <button type="button" className="secondary" id="practiceNewBtn">
                New question
              </button>
            </div>
            <div className="practice-feedback" id="practiceFeedback"></div>
          </div>
          <div className="lesson-toggle-row" style={{ marginTop: '0.9rem', marginBottom: 0 }}>
            <button type="button" className="secondary" id="lessonGotItBtn">
              ✔ I've got it — back to the challenge
            </button>
          </div>
        </div>

        <div id="challengeArea">
          <div className="challenge" id="challengeText">
            Loading challenge…
          </div>
          <div className="technique-hint" id="techniqueHint"></div>
          <div className="input-area">
            <input type="text" inputMode="decimal" id="answerInput" placeholder="?" autoComplete="off" />
            <button id="submitBtn" type="button">
              Unlock
            </button>
          </div>
          <div className="feedback" id="feedbackMsg"></div>
          <div className="game-actions">
            <button className="secondary" id="mapBtn" type="button">
              🗺️ Return to Map
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function HeistSummary() {
  const totals: [string, string, string][] = [
    ['sumScore', '0', 'Score'],
    ['sumXP', '0', 'XP'],
    ['sumCoins', '0', 'Coins'],
    ['sumStars', '0 / 15', 'Stars'],
    ['sumBadges', '0 / 8', 'Badges'],
  ]
  return (
    <div id="summaryScreen" className="summary-screen hidden">
      <div className="summary-manuscript">
        <div className="summary-scroll-icon">📜</div>
      </div>
      <div className="summary-title">The Manuscript Recovered</div>
      <div className="summary-subtitle">
        Every lock opened. Every chamber crossed. The lost knowledge is yours.
      </div>
      <div className="summary-closing" id="summaryClosing">
        You have crossed the gates, the audience halls, the library, the house of discussion, and the imperial
        treasury. Here is everything you gathered along the way.
      </div>
      <div className="summary-section">
        <h3>🏆 Grand Totals</h3>
        <div className="summary-totals">
          {totals.map(([id, v, l]) => (
            <div className="summary-total-pill" key={id}>
              <span className="val" id={id}>
                {v}
              </span>
              <span className="lbl">{l}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="summary-section">
        <h3>🏛️ Levels Completed</h3>
        <div id="summaryLevels"></div>
      </div>
      <div className="summary-section">
        <h3>📖 The Knowledge Scroll — Techniques Learned</h3>
        <div id="summaryTechniques"></div>
      </div>
      <div className="summary-section">
        <h3>📜 Chronicles of the Mughal Court</h3>
        <div id="summaryChronicles"></div>
      </div>
      <div className="summary-section">
        <h3>🏅 Badges Earned</h3>
        <div className="summary-badges-row" id="summaryBadgesRow"></div>
      </div>
      <div className="summary-closing">
        India's mathematical heritage stretches back millennia — through the decimal place-value system, early
        algebra, and contributions to astronomy and calculation. The Vedic Maths techniques you practised here are a
        modern educational approach built on a set of sutras. Thank you for exploring the Mughal court and its
        scholarly world alongside them.
      </div>
      <div className="summary-actions">
        <button className="secondary" id="sumReturnToMapBtn" type="button">
          🗺️ Return to Map
        </button>
        <button className="secondary" id="sumPlayAgainBtn" type="button">
          🔄 Play Again
        </button>
        <button className="secondary" id="sumBackToStartBtn" type="button">
          ↩️ Back to Start
        </button>
      </div>
    </div>
  )
}

function HeistModals() {
  return (
    <>
      <div id="factModal" className="modal-backdrop hidden">
        <div className="fact-card">
          <div className="card-count" id="factCardCount">
            Chronicle 1 / 12
          </div>
          <h3 id="factTitle">Discover: …</h3>
          <div className="fact-label">What it means</div>
          <div className="fact-text" id="factMeans">
            …
          </div>
          <div className="fact-label">Why it matters</div>
          <div className="fact-text" id="factMatters">
            …
          </div>
          <div className="fact-reward" id="factReward">
            Unlock reward: One History Knowledge Card.
          </div>
          <button id="factCloseBtn" type="button">
            Close Chronicle
          </button>
        </div>
      </div>

      <div id="rewardsModal" className="modal-backdrop hidden">
        <div className="rewards-card">
          <h3 id="rewardsTitle">Level Complete!</h3>
          <div className="rewards-sub" id="rewardsSub">
            Rewards earned in this attempt:
          </div>
          <div className="rewards-stars" id="rewardsStars">
            ★★★
          </div>
          <div className="rewards-lines" id="rewardsLines">
            <div>🏅 Coins: +0</div>
            <div>✨ XP: +0</div>
          </div>
          <div className="rewards-badges" id="rewardsBadges"></div>
          <button id="rewardsContinueBtn" type="button">
            Continue
          </button>
        </div>
      </div>

      <div id="badgesModal" className="modal-backdrop hidden">
        <div className="badges-card">
          <h3>🏅 Badges of the Heist</h3>
          <div id="badgesList"></div>
          <button id="badgesCloseBtn" type="button">
            Close
          </button>
        </div>
      </div>

      <div id="resetModal" className="modal-backdrop hidden">
        <div className="confirm-card">
          <h3>⚠️ Erase all progress?</h3>
          <p>
            This will permanently remove all unlocked levels, stars, coins, XP, badges, and collected chronicles. This
            cannot be undone.
          </p>
          <div className="confirm-actions">
            <button className="secondary" id="resetCancelBtn" type="button">
              Cancel
            </button>
            <button className="danger" id="resetConfirmBtn" type="button">
              Yes, erase everything
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function Heist() {
  return (
    <section className="wrap sec" id="heist-sec">
      <span id="heist-anchor" style={{ position: 'relative', top: -72 }}></span>
      <div className="sh">
        <div>
          <div className="k">Story mode</div>
          <h2>
            The Ancient <em>Heist</em>
          </h2>
        </div>
      </div>
      <div className="bridgebar">
        <span className="k">Learn first</span>
        <button className="chip" type="button" data-lab="nikhilam">
          Stage 2 · Nikhilam
        </button>
        <button className="chip" type="button" data-lab="ekadhika">
          Stage 3 · Ekādhika (squares ending in 5)
        </button>
        <button className="chip" type="button" data-lab="nikhilam">
          Stage 5 · Boss locks
        </button>
      </div>
      <div id="heist">
        <div className="game-wrapper">
          <HeistStart />
          <HeistMap />
          <HeistGame />
          <HeistSummary />
          <HeistModals />
        </div>
      </div>
    </section>
  )
}

/** Timeline section (`#tl` is filled from TIMELINE by the engine). */
function Heritage() {
  return (
    <section className="wrap sec" id="heritage">
      <div className="sh">
        <div>
          <div className="k">Indian heritage</div>
          <h2>Mathematics through time</h2>
        </div>
      </div>
      <div className="tl" id="tl"></div>
    </section>
  )
}

export const VedicMarkup = memo(function VedicMarkup() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Passport />
        <Lab />
        <Sutras />
        <Arena />
        <Heist />
        <Heritage />
      </main>
      <div className="toasts" id="toasts" aria-live="polite"></div>
      <HabitPractice />
    </>
  )
})
