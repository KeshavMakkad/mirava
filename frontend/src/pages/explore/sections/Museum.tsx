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
  { key: 'Madhubani', cat: 'Painting', extra: 'hero-piece', img: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTlxG1Q5oMoVN4E5xC4Kg92s8ooVcwdhdv-ulYYHPwzZg&s=10', alt: 'Madhubani painting', small: 'PAINTING · BIHAR', blurb: 'Line, symbol, and story — the frame is part of the tale.' },
  { key: 'Kalamkari', cat: 'Craft', img: 'https://static.wixstatic.com/media/1b2c9f_cdbe02f1e009485a9236387343c8a688~mv2.jpeg/v1/fill/w_553,h_798,al_c,q_85,enc_avif,quality_auto/1b2c9f_cdbe02f1e009485a9236387343c8a688~mv2.jpeg', alt: 'Kalamkari textile', small: 'CRAFT · ANDHRA' },
  { key: 'Bharatanatyam', cat: 'Performance', img: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTe1HZRIHhH6dcGaxb6qFuU5HURyuDzd-DDryVO16UaFA&s=10', alt: 'Bharatanatyam', small: 'PERFORMANCE · TAMIL NADU' },
  { key: 'Handloom', cat: 'Craft', img: 'https://img.etimg.com/thumb/width-1200,height-1200,imgsize-961164,resizemode-75,msid-68716260/magazines/panache/how-handloom-sarees-are-weaving-a-storm-in-bengaluru.jpg', alt: 'Handloom', small: 'TEXTILE · INDIA' },
  { key: 'Terracotta', cat: 'Craft', img: 'https://c9admin.cottage9.com/uploads/5519/terracotta-and-ceramic-art.png', alt: 'Terracotta', small: 'CRAFT · BENGAL' },
  { key: 'Pattachitra', cat: 'Painting', img: 'https://upload.wikimedia.org/wikipedia/commons/7/7d/Odisha_Pattachitara_Depicting_Unconditional_Love_between_Radha_Krushna.jpg?utm_source=en.wikipedia.org&utm_campaign=index&utm_content=original', alt: 'Pattachitra', small: 'PAINTING · ODISHA' },
  { key: 'Phulkari', cat: 'Craft', img: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSU0YMyvhrjUotcByVXJDtBfIGM82xBS-O7rtQlsRJchVCSY3w0R7oZW6c&s=10', alt: 'Phulkari', small: 'EMBROIDERY · PUNJAB' },
  { key: 'Channapatna', cat: 'Craft', img: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ3IynWFlOXwAnfyKyRTciw52eWabKL5OqPkyj0hkJfejz2JwByxwHWthw&s=10', alt: 'Channapatna toys', small: 'WOODCRAFT · KARNATAKA' },
  { key: 'Kathak', cat: 'Performance', extra: 'wide-piece', img: 'https://cdn11.bigcommerce.com/s-x49po/images/stencil/1500x1500/products/90513/249310/1672819583969_Kathak__________________________Uttar_Pradesh_________Size__24__x_30_______Oil_on_canvas__65494.1687000127.JPG?c=2&imbypass=on', alt: 'Kathak', small: 'PERFORMANCE · NORTH INDIA' },
  { key: 'Bidriware', cat: 'Craft', extra: 'wide-piece', img: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRqOo8aStqZXHld5G25UIODEUJEpkfwji9LhqArAFc-BH_Mn1iPbOHwQ4o-&s=10', alt: 'Bidriware', small: 'METALWORK · DECCAN' },
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
