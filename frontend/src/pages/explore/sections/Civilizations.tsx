import { useState } from 'react'
import { CIV_ORDER, CIVS } from '../data/civilizations'
import { useFadeSwap } from '../util'

export function Civilizations() {
  const [index, setIndex] = useState(1) // starts on Harappa
  const [titleIndex, titleHidden, swapTitle] = useFadeSwap(1, 110)
  const select = (i: number) => {
    setIndex(i)
    swapTitle(i)
  }

  const key = CIV_ORDER[index]
  const civ = CIVS[key]

  return (
    <section className="section civil-upgrade" id="civilizations">
      <div className="civil-head">
        <div>
          <div className="eyebrow">03 — Ancient civilizations</div>
          <h2>
            Before the monuments,
            <br />
            <em>there were systems.</em>
          </h2>
        </div>
        <p className="section-intro">
          Long before the famous monuments, people were already building cities, managing water, organising craft and
          writing poetry. Choose a civilisation to step inside its systems.
        </p>
      </div>

      {/* Main experience */}
      <div className="civil-experience">
        {/* Left: hero card */}
        <div className="civil-hero" id="civilHero">
          <div className="civil-hero-image" id="civilHeroImage" style={{ backgroundImage: `url('${civ.image}')` }}></div>
          <div className="civil-hero-gradient"></div>
          <div className="civil-hero-pattern"></div>

          <div className="civil-hero-top">
            <span className="civil-hero-tag" id="civilHeroTag">
              {civ.tag}
            </span>
            <span className="civil-hero-count" id="civilHeroCount">
              {String(index + 1).padStart(2, '0')} / 06
            </span>
          </div>

          <div className="civil-hero-bottom">
            <span className="civil-hero-label" id="civilHeroLabel">
              {civ.label}
            </span>
            <h3
              className="civil-hero-title"
              id="civilHeroTitle"
              style={{ transition: 'opacity 0.3s ease', opacity: titleHidden ? 0 : 1 }}
            >
              {CIVS[CIV_ORDER[titleIndex]].title}
            </h3>
            <p className="civil-hero-sub" id="civilHeroSub">
              {civ.sub}
            </p>
            <div className="civil-hero-tags" id="civilHeroTags">
              {civ.tags.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Right: postcards */}
        <div className="civil-cards" id="civilCards">
          {civ.cards.map((c, i) => (
            <article key={`${key}-${i}`} className="civil-card" style={{ animationDelay: `${i * 0.08}s` }}>
              <span className="card-num">{String(i + 1).padStart(2, '0')}</span>
              <span className="card-label">{c.label}</span>
              <h3 className="card-headline">{c.headline}</h3>
              <p className="card-body">{c.body}</p>
              <span className="card-chip">{c.chip}</span>
            </article>
          ))}
        </div>
      </div>

      {/* Selector strip */}
      <div className="civil-selector" id="civilSelector">
        {CIV_ORDER.map((k, i) => {
          const c = CIVS[k]
          return (
            <button
              key={k}
              className={`civil-pick${i === index ? ' active' : ''}`}
              data-civ={k}
              type="button"
              onClick={() => select(i)}
            >
              <span className="pick-dot"></span>
              <span className="pick-era">{c.label.split(' · ')[0]}</span>
              <span className="pick-name">{c.title}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
