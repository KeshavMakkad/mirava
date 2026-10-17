import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ERA_ORDER, ERAS } from '../data/time'
import { isTypingTarget, pageHasOpenOverlay, useFadeSwap } from '../util'

const NODES: { year: string; region: string; theme: string; label: string; era: string; name: string }[] = [
  { year: '-500', region: 'Gangetic Plain', theme: 'Philosophy & Cities', label: '500', era: 'BCE', name: 'Questions' },
  { year: '120', region: 'Indian Ocean', theme: 'Trade & Ports', label: '120', era: 'CE', name: 'Ocean Routes' },
  { year: '250', region: 'Magadha', theme: 'Empire & Edicts', label: '250', era: 'CE', name: 'Mauryan Echo' },
  { year: '450', region: 'North India', theme: 'Science & Court', label: '450', era: 'CE', name: 'Gupta World' },
  { year: '800', region: 'Deccan & South', theme: 'Temples & Cities', label: '800', era: 'CE', name: 'Temple Cities' },
  { year: '1200', region: 'Both Coasts', theme: 'Trade & Temples', label: '1200', era: 'CE', name: 'Ocean Networks' },
  { year: '1400', region: 'Vijayanagara', theme: 'Water & Market', label: '1400', era: 'CE', name: 'Vijayanagara' },
  { year: '1650', region: 'Mughal Courts', theme: 'Miniature Worlds', label: '1650', era: 'CE', name: 'Miniatures' },
  { year: '1857', region: 'North India', theme: 'Resistance', label: '1857', era: 'CE', name: 'Turning Point' },
  { year: '1947', region: 'Republic of India', theme: 'Freedom & Framing', label: '1947', era: 'CE', name: 'Independence' },
  { year: '2025', region: 'India & Diaspora', theme: 'Living Heritage', label: '2025', era: 'CE', name: 'Today' },
]

const LAST = ERA_ORDER.length - 1

export function TimeTravel() {
  const [index, setIndex] = useState(0)
  const indexRef = useRef(0)
  // Title / caption fade out, swap text, fade back in (legacy timings).
  const [titleIndex, titleHidden, swapTitle] = useFadeSwap(0, 120)
  const [captionIndex, captionHidden, swapCaption] = useFadeSwap(0, 140)
  const [glowLeft, setGlowLeft] = useState<number | null>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const nodeRefs = useRef<(HTMLButtonElement | null)[]>([])

  const goTo = useCallback(
    (i: number) => {
      const next = Math.max(0, Math.min(LAST, i))
      indexRef.current = next
      setIndex(next)
      swapTitle(next)
      swapCaption(next)
    },
    [swapTitle, swapCaption],
  )

  // Glow under the active node.
  const positionGlow = useCallback(() => {
    const track = trackRef.current
    const node = nodeRefs.current[index]
    if (!track || !node) return
    const trackRect = track.getBoundingClientRect()
    const nodeRect = node.getBoundingClientRect()
    setGlowLeft(nodeRect.left - trackRect.left + track.scrollLeft + nodeRect.width / 2)
  }, [index])

  useLayoutEffect(() => {
    positionGlow()
    const t = window.setTimeout(positionGlow, 60)
    window.addEventListener('resize', positionGlow)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('resize', positionGlow)
    }
  }, [positionGlow])

  // Arrow keys move through eras while the section is on screen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
      if (isTypingTarget(e.target) || pageHasOpenOverlay(sectionRef.current)) return
      const rect = sectionRef.current?.getBoundingClientRect()
      if (!rect || rect.bottom < 0 || rect.top > window.innerHeight) return
      goTo(indexRef.current + (e.key === 'ArrowRight' ? 1 : -1))
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [goTo])

  const key = ERA_ORDER[index]
  const era = ERAS[key]
  const node = NODES[index]
  const yearVal = Number(key)
  const pct = (index / LAST) * 100
  const hue = 38 + index * 4

  return (
    <section className="section time-immersive" id="time" ref={sectionRef}>
      {/* Ambient background layers */}
      <div className="time-ambient" aria-hidden="true">
        <div className="time-aurora"></div>
        <div className="time-grid-lines"></div>
        <div className="time-vignette"></div>
      </div>

      {/* Section header */}
      <div className="time-header">
        <div className="time-header-left">
          <div className="eyebrow">02 — Chronoscope</div>
          <h2>
            Travel through the eras
            <br />
            <em>of a living civilisation.</em>
          </h2>
          <p className="time-intro">
            Drag the timeline. Choose a moment. Watch the subcontinent reorganise itself — its cities, ideas, ports,
            courts, and questions — into a story you can step into.
          </p>
        </div>

        <div className="time-hud" id="timeHud">
          <div className="hud-row hud-top">
            <span className="hud-label">NOW VIEWING</span>
            <span className="hud-live">
              <i></i>LIVE
            </span>
          </div>
          <div className="hud-year">
            <span id="yearNumber">{Math.abs(yearVal)}</span>
            <span className="hud-era" id="yearEra">
              {yearVal < 0 ? 'BCE' : 'CE'}
            </span>
          </div>
          <div className="hud-title" id="hudEraTitle" style={{ opacity: titleHidden ? 0 : 1 }}>
            {ERAS[ERA_ORDER[titleIndex]].title}
          </div>
          <div className="hud-meta">
            <div>
              <small>REGION</small>
              <strong id="hudRegion">{node.region}</strong>
            </div>
            <div>
              <small>THEME</small>
              <strong id="hudTheme">{node.theme}</strong>
            </div>
          </div>
          <div className="hud-progress">
            <div className="hud-progress-fill" id="hudProgressFill" style={{ width: `${pct}%` }}></div>
          </div>
        </div>
      </div>

      {/* The interactive timeline rail */}
      <div className="time-timeline-wrap">
        <div className="time-timeline-track" id="timeRail" ref={trackRef}>
          {NODES.map((n, i) => (
            <button
              key={n.year}
              type="button"
              ref={(el) => {
                nodeRefs.current[i] = el
              }}
              className={`time-node${i === index ? ' active' : ''}`}
              data-year={n.year}
              onClick={() => goTo(i)}
            >
              <span className="node-dot"></span>
              <span className="node-year">
                {n.label} <i>{n.era}</i>
              </span>
              <span className="node-name">{n.name}</span>
            </button>
          ))}
          <div
            className="timeline-glow"
            id="timelineGlow"
            style={glowLeft === null ? undefined : { left: `${glowLeft}px` }}
          ></div>
        </div>

        <div className="time-slider-wrap">
          <input
            type="range"
            min={0}
            max={LAST}
            step={1}
            value={index}
            onChange={(e) => goTo(Number(e.target.value))}
            className="time-slider"
            id="timeSlider"
            aria-label="Time slider"
            style={{
              background: `linear-gradient(90deg, rgba(244,187,64,0.85) 0%, rgba(244,187,64,0.85) ${pct}%, rgba(245,234,217,0.12) ${pct}%)`,
            }}
          />
          <div className="time-slider-labels">
            <span>500 BCE</span>
            <span>0</span>
            <span>2025 CE</span>
          </div>
        </div>
      </div>

      {/* The immersive stage */}
      <div className="time-stage">
        <div className="stage-visual" id="stageVisual">
          <div
            className="stage-glow"
            id="stageGlow"
            style={{ background: `radial-gradient(circle, hsla(${hue}, 90%, 60%, 0.45), transparent 65%)` }}
          ></div>
          <div className="stage-orb"></div>
          <div className="stage-ring ring-1"></div>
          <div className="stage-ring ring-2"></div>
          <div className="stage-ring ring-3"></div>
          <div className="stage-floaty" id="stageFloaty"></div>

          <div className="stage-number">
            <small>ERA</small>
            <strong id="stageNumber">{era.number}</strong>
          </div>

          <div className="stage-caption">
            <small id="stageCaptionLabel">{era.captionLabel}</small>
            <p id="stageCaption" style={{ opacity: captionHidden ? 0 : 1 }}>
              {ERAS[ERA_ORDER[captionIndex]].caption}
            </p>
          </div>
        </div>

        <div className="stage-cards" id="stageCards">
          {era.cards.map((c, i) => (
            <article key={`${key}-${i}`} className="era-card" style={{ animationDelay: `${i * 0.08}s` }}>
              <span className="card-index">{String(i + 1).padStart(2, '0')}</span>
              <span className="card-label">{c.label}</span>
              <h3 className="card-headline">{c.text}</h3>
            </article>
          ))}
        </div>
      </div>

      {/* Footer strip */}
      <div className="time-footer">
        <div className="time-footer-left">
          <span className="footer-dot"></span>
          <span>Historical-cultural exploration · Interpretive journey across 2,500+ years</span>
        </div>
        <div className="time-footer-right">
          <button type="button" className="footer-nav" id="prevEraBtn" aria-label="Previous era" onClick={() => goTo(index - 1)}>
            ←
          </button>
          <span id="eraCounter">
            {index + 1} / {ERA_ORDER.length}
          </span>
          <button type="button" className="footer-nav" id="nextEraBtn" aria-label="Next era" onClick={() => goTo(index + 1)}>
            →
          </button>
        </div>
      </div>
    </section>
  )
}
