import { useEffect, useRef, useState } from 'react'
import { REVIVAL_WORDS as WORDS } from '../data/revival'
import { speakText, stopSpeaking, useFadeSwap } from '../util'

const pickBank = () => [...WORDS.keys()].sort(() => Math.random() - 0.5).slice(0, 8)
const pad2 = (n: number) => String(n).padStart(2, '0')

export function Languages() {
  const [current, setCurrent] = useState(0)
  const [seen, setSeen] = useState<Set<number>>(() => new Set([0]))
  const [bank, setBank] = useState(pickBank)
  const [, meaningHidden, fadeMeaning] = useFadeSwap(0, 80)
  const [playing, setPlaying] = useState(false)
  const playTimer = useRef<number | undefined>(undefined)

  useEffect(
    () => () => {
      window.clearTimeout(playTimer.current)
      stopSpeaking()
    },
    [],
  )

  const showWord = (i: number) => {
    setCurrent(i)
    setSeen((s) => new Set(s).add(i))
    fadeMeaning(i)
  }

  const speak = (i: number) => {
    const w = WORDS[i]
    setPlaying(true)
    const done = () => setPlaying(false)
    if (!speakText(w.word, w.code, done)) done()
    window.clearTimeout(playTimer.current)
    playTimer.current = window.setTimeout(done, 4000)
  }

  const w = WORDS[current]

  return (
    <section className="section language language-revival" id="languages">
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
            Every word below once lived on someone's lips. Hear it. Trace it. Watch it return inside the languages you
            already speak.
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

        <div className="revival-stage" id="revivalStage">
          <div className="stage-rings" aria-hidden="true">
            <span className="ring r1"></span>
            <span className="ring r2"></span>
            <span className="ring r3"></span>
          </div>

          <div className="stage-top">
            <span className="stage-counter" id="revivalStageCounter">
              {pad2(current + 1)} / {pad2(WORDS.length)}
            </span>
            <span className="stage-script" id="revivalScript">
              {w.script}
            </span>
            <button
              className={`stage-speak${playing ? ' playing' : ''}`}
              id="revivalSpeak"
              type="button"
              aria-label="Hear the word"
              onClick={() => speak(current)}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 5 6 9H2v6h4l5 4V5z" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </svg>
            </button>
          </div>

          <div className="stage-core">
            <div className="revival-word swap" id="revivalWord" key={current}>
              {w.word}
            </div>
            <div className="revival-roman" id="revivalRoman">
              {w.roman} · {w.lang}
            </div>
            <div className="revival-meaning" id="revivalMeaning" style={{ opacity: meaningHidden ? 0 : 1 }}>
              {w.meaning}
            </div>
          </div>

          <div className="stage-foot">
            <div className="revival-modern">
              <small>STILL ALIVE IN</small>
              <strong id="revivalModern">{w.modern}</strong>
            </div>
            <button className="stage-next" id="revivalNext" type="button" onClick={() => showWord((current + 1) % WORDS.length)}>
              <span>Next</span>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="revival-progress" id="revivalProgress">
            {WORDS.map((_, i) => (
              <i key={i} data-i={i} className={i === current ? 'current' : seen.has(i) ? 'seen' : undefined}></i>
            ))}
          </div>
        </div>
      </div>

      <div className="revival-bank">
        <div className="bank-head">
          <h4>Word bank</h4>
          <div className="bank-meta">
            <span id="wordBankCount">24 words · 12 languages</span>
            <button className="bank-shuffle" id="duoRefreshBtn" type="button" onClick={() => setBank(pickBank())}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 3h5v5" />
                <path d="M4 20 21 3" />
                <path d="M21 16v5h-5" />
                <path d="m15 15 6 6" />
                <path d="M4 4l5 5" />
              </svg>
              Shuffle
            </button>
          </div>
        </div>
        <div className="duo-row" id="duoRow">
          {bank.map((i) => {
            const b = WORDS[i]
            return (
              <button
                key={i}
                type="button"
                className="duo-item"
                data-i={i}
                onClick={() => {
                  showWord(i)
                  speak(i)
                }}
              >
                <span className="duo-word">{b.word}</span>
                <span className="duo-meaning">{b.meaning}</span>
                <span className="duo-lang">{b.lang}</span>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
