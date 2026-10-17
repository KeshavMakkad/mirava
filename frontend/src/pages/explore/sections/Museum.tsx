import { useState } from 'react'
import { MUSEUM_LENS } from '../data/museum'
import { useEscape, useScrollLock } from '../util'

interface Piece {
  key: string
  cat: 'Painting' | 'Performance' | 'Craft'
  img: string
  alt: string
  small: string
  extra?: string
  blurb?: string
}

const PIECES: Piece[] = [
  { key: 'Madhubani', cat: 'Painting', extra: 'hero-piece', img: 'https://images.unsplash.com/photo-1605640840605-14ac1855827b?auto=format&fit=crop&w=1400&q=90', alt: 'Madhubani painting', small: 'PAINTING · BIHAR', blurb: 'Line, symbol, and story — the frame is part of the tale.' },
  { key: 'Kalamkari', cat: 'Craft', img: 'https://images.unsplash.com/photo-1584556812952-905a8d920a94?auto=format&fit=crop&w=1200&q=90', alt: 'Kalamkari textile', small: 'CRAFT · ANDHRA' },
  { key: 'Bharatanatyam', cat: 'Performance', img: 'https://images.unsplash.com/photo-1604600160534-0f6ad25a41c2?auto=format&fit=crop&w=1200&q=90', alt: 'Bharatanatyam', small: 'PERFORMANCE · TAMIL NADU' },
  { key: 'Handloom', cat: 'Craft', img: 'https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=1200&q=90', alt: 'Handloom', small: 'TEXTILE · INDIA' },
  { key: 'Terracotta', cat: 'Craft', img: 'https://images.unsplash.com/photo-1565193298357-c6b5f0201d5a?auto=format&fit=crop&w=1200&q=90', alt: 'Terracotta', small: 'CRAFT · BENGAL' },
  { key: 'Pattachitra', cat: 'Painting', img: 'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=1200&q=90', alt: 'Pattachitra', small: 'PAINTING · ODISHA' },
  { key: 'Phulkari', cat: 'Craft', img: 'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?auto=format&fit=crop&w=1200&q=90', alt: 'Phulkari', small: 'EMBROIDERY · PUNJAB' },
  { key: 'Channapatna', cat: 'Craft', img: 'https://images.unsplash.com/photo-1602874801006-e26c9b3f9b8b?auto=format&fit=crop&w=1200&q=90', alt: 'Channapatna toys', small: 'WOODCRAFT · KARNATAKA' },
  { key: 'Kathak', cat: 'Performance', extra: 'wide-piece', img: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1400&q=90', alt: 'Kathak', small: 'PERFORMANCE · NORTH INDIA' },
  { key: 'Bidriware', cat: 'Craft', extra: 'wide-piece', img: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=1400&q=90', alt: 'Bidriware', small: 'METALWORK · DECCAN' },
]

const CATS = ['All', 'Painting', 'Performance', 'Craft'] as const

export function Museum() {
  const [cat, setCat] = useState<(typeof CATS)[number]>('All')
  const [lensKey, setLensKey] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  useScrollLock(open)
  useEscape(open, () => setOpen(false))

  const lens = lensKey ? MUSEUM_LENS[lensKey] : null
  const lensPiece = PIECES.find((p) => p.key === lensKey)

  return (
    <>
    <section className="section art museum-upgrade" id="art">
      <div className="museum-aurora" aria-hidden="true"></div>
      <div className="museum-glyph-field" aria-hidden="true">
        <span className="mg mg1">अ</span>
        <span className="mg mg2">𑀅</span>
        <span className="mg mg3">க</span>
        <span className="mg mg4">ক</span>
        <span className="mg mg5">ଅ</span>
        <span className="mg mg6">ਅ</span>
      </div>

      <div className="museum-head">
        <div className="museum-head-left">
          <div className="eyebrow" style={{ color: '#f3bc43' }}>
            06 — Interactive museum
          </div>
          <h2>
            The museum has
            <br />
            <em>no velvet ropes.</em>
          </h2>
        </div>
        <div className="museum-head-right">
          <p className="museum-lede">
            Walk through a living gallery. Every object is a doorway — to the soil it came from, the hands that shaped it,
            and the rhythm it still carries.
          </p>
          <div className="art-cats" id="museumCats">
            {CATS.map((c) => (
              <button key={c} type="button" className={c === cat ? 'active' : undefined} data-cat={c} onClick={() => setCat(c)}>
                <span>{c}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="museum-rail">
        {PIECES.map((p, i) => {
          const match = cat === 'All' || p.cat === cat
          return (
            <article
              key={p.key}
              className={['museum-piece', p.extra, match ? '' : 'dimmed'].filter(Boolean).join(' ')}
              data-museum={p.key}
              data-cat={p.cat}
              data-index={String(i + 1).padStart(2, '0')}
              style={{ display: match ? 'block' : 'none' }}
              onClick={() => {
                setLensKey(p.key)
                setOpen(true)
              }}
            >
              <img src={p.img} alt={p.alt} />
              <div className="piece-sheen"></div>
              <div className="piece-plaque">
                <span className="plaque-num">{String(i + 1).padStart(2, '0')}</span>
              </div>
              <div className="piece-info">
                <small>{p.small}</small>
                <h3>{p.key}</h3>
                {p.blurb && <p>{p.blurb}</p>}
                <span className="piece-open">Open lens ↗</span>
              </div>
            </article>
          )
        })}
      </div>

      <div className="museum-note">
        <div className="museum-note-left">
          <span className="note-dot"></span>
          <span>Curator mode · every object opens a lens</span>
        </div>
        <div className="museum-note-right">
          <span>Material</span>
          <i>→</i>
          <span>Technique</span>
          <i>→</i>
          <span>Place</span>
          <i>→</i>
          <span>Living legacy</span>
        </div>
      </div>
    </section>

      {/* Curator lens modal — outside the section: .section uses transforms, which would trap position:fixed */}
      <div id="museumLensV2" className={open ? 'open' : undefined}>
        <div className="lens-backdrop" onClick={() => setOpen(false)}></div>
        <div className="lens-panel" role="dialog" aria-modal="true">
          <button type="button" className="lens-close" id="museumLensClose" aria-label="Close" onClick={() => setOpen(false)}>
            ×
          </button>
          {lens && lensPiece && (
            <>
              <div className="lens-hero">
                <div className="lens-hero-img" id="lensHeroImg" style={{ backgroundImage: `url('${lensPiece.img}')` }}></div>
                <div className="lens-hero-veil"></div>
                <div className="lens-hero-caption">
                  <span className="lens-hero-eyebrow" id="lensCategory">
                    {lensPiece.cat.toUpperCase()} · CURATOR LENS
                  </span>
                  <h2 id="lensTitle">{lensPiece.key}</h2>
                  <p className="lens-hero-sub" id="lensRegionTop">
                    {lens.region}
                  </p>
                </div>
              </div>
              <div className="lens-body">
                <div className="lens-grid">
                  <div className="lens-block">
                    <small>REGION</small>
                    <strong id="lensRegion">{lens.region}</strong>
                  </div>
                  <div className="lens-block">
                    <small>ERA</small>
                    <strong id="lensEra">{lens.era}</strong>
                  </div>
                  <div className="lens-block wide">
                    <small>MATERIAL / MEDIUM</small>
                    <strong id="lensMaterial">{lens.material}</strong>
                  </div>
                </div>
                <section className="lens-section">
                  <h3>
                    <span className="dash"></span>The story
                  </h3>
                  <p id="lensStory">{lens.story}</p>
                </section>
                <section className="lens-section">
                  <h3>
                    <span className="dash"></span>Technique
                  </h3>
                  <p id="lensTechnique">{lens.technique}</p>
                </section>
                <section className="lens-section lens-lens">
                  <h3>
                    <span className="dash"></span>Curator's lens
                  </h3>
                  <p id="lensLens">{lens.lens}</p>
                </section>
                <div className="lens-swatches" id="lensSwatches">
                  {lens.palette.map((c) => (
                    <span key={c} className="lens-swatch" style={{ background: c }} title={c}></span>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
