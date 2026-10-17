import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { api, type NewsItem } from '../../../lib/api'
import { STORY_DATA } from '../data/news'
import { useEscape, useScrollLock } from '../util'

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1600100397608-f0104b8c0e0c?auto=format&fit=crop&w=1200&q=80'

interface ModalStory {
  tag: string
  title: string
  meta: string[]
  body: string
  source?: string | null
  foot: string
}

const safeImage = (url: string | null) => (url && /^(https?:\/\/|data:image\/)/i.test(url.trim()) ? url.trim() : FALLBACK_IMAGE)
const safeLink = (url: string | null) => (url && /^https?:\/\//i.test(url.trim()) ? url.trim() : null)
const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

function staticStory(key: string): ModalStory | null {
  const d = STORY_DATA[key]
  return d ? { tag: d.tag, title: d.title, meta: d.meta, body: d.body, foot: 'July 31, 2026' } : null
}

function adminStory(n: NewsItem): ModalStory {
  const category = n.category || 'Heritage'
  return {
    tag: `${category.toUpperCase()} · ${shortDate(n.published_at).toUpperCase()}`,
    title: n.title,
    meta: ['Mirava Heritage Desk', category],
    body: n.body || n.summary,
    source: safeLink(n.source_url),
    foot: longDate(n.published_at),
  }
}

/** Static stories from the legacy page; shown when no admin news is published. */
const STATIC_STREAM: { key: string; cat: string; small: string; time: string; title: string; text: string }[] = [
  { key: 'Restoration', cat: 'Restoration', small: 'RESTORATION', time: '2h ago', title: 'New conservation methods for old stone', text: 'A quiet revolution is happening in conservation labs — breathable consolidants are changing how we treat centuries-old sandstone.' },
  { key: 'Discovery', cat: 'Archaeology', small: 'ANCIENT DISCOVERIES', time: '5h ago', title: 'A small seal, a very large question', text: 'A newly surfaced Indus seal fragment has reignited one of the oldest debates in South Asian archaeology — what did the script mean?' },
  { key: 'Culture', cat: 'Culture', small: 'CULTURE', time: '1d ago', title: 'The makers putting handloom back on the map', text: 'A new generation of weavers is reimagining traditional looms — and finding global audiences without losing the grammar of the craft.' },
  { key: 'Pattadakal', cat: 'Restoration', small: 'RESTORATION', time: '2d ago', title: "Pattadakal's stone is breathing again", text: 'A ten-year conservation project at the Chalukyan site has removed decades of damaging coatings without harming original carvings.' },
]

export function Newsroom() {
  const { data } = useQuery({ queryKey: ['news', 10], queryFn: () => api.news.list(10), staleTime: 60_000 })
  const items = (data ?? []).filter((n) => n.title && n.summary)
  const hasAdmin = items.length > 0

  const [story, setStory] = useState<ModalStory | null>(null)
  const [open, setOpen] = useState(false)
  useScrollLock(open)
  useEscape(open, () => setOpen(false))
  const show = (s: ModalStory | null) => {
    if (!s) return
    setStory(s)
    setOpen(true)
  }

  const lead = items[0]
  const rest = items.slice(1, 5)

  return (
    <>
      <section className="section news newsroom" id="news">
        {/* ambient background layers */}
        <div className="news-aurora" aria-hidden="true"></div>
        <div className="news-grid-lines" aria-hidden="true"></div>
        <div className="news-glyph-field" aria-hidden="true">
          <span className="ng ng1">अ</span>
          <span className="ng ng2">𑀅</span>
          <span className="ng ng3">க</span>
        </div>

        <div className="news-header">
          <div className="news-header-left">
            <div className="eyebrow">07 — Heritage news</div>
            <h2>
              What's being
              <br />
              <em>unearthed now.</em>
            </h2>
            <p className="news-lede">
              Live dispatches from the field — archaeology, restoration, culture and the quiet work of keeping heritage
              alive.
            </p>
            <div className={`admin-published-ribbon${hasAdmin ? ' show' : ''}`} id="adminPublishedRibbon">
              <i></i>
              <span>Administrator-updated feed</span>
            </div>
          </div>
          <div className="news-header-right">
            <div className="news-live-badge">
              <span className="live-dot"></span>
              <span>LIVE FEED</span>
              <span className="live-count" id="newsLiveCount">
                {hasAdmin ? `${items.length} administrator dispatch${items.length === 1 ? '' : 'es'}` : '5 dispatches'}
              </span>
            </div>
          </div>
        </div>

        <div className="newsroom-layout">
          {hasAdmin ? (
            <>
              <article className="news-lead" data-cat={lead.category || 'Heritage'} onClick={() => show(adminStory(lead))}>
                <div className="news-lead-image">
                  <img src={safeImage(lead.image_url)} alt={lead.title} />
                  <div className="news-lead-veil"></div>
                  <div className="news-lead-tag">
                    <span className="tag-dot"></span>
                    <span>
                      {(lead.category || 'HERITAGE').toUpperCase()} · {shortDate(lead.published_at).toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="news-lead-body">
                  <span className="news-lead-kicker">ADMINISTRATOR DISPATCH</span>
                  <h3>{lead.title}</h3>
                  <p>{lead.summary}</p>
                  <div className="news-lead-meta">
                    <span>Mirava Heritage Desk</span>
                    <span className="meta-dot"></span>
                    <span>{shortDate(lead.published_at)}</span>
                  </div>
                  <button className="news-open-btn" type="button">
                    Open full story <span>↗</span>
                  </button>
                </div>
              </article>
              <div className="news-stream" id="newsStream">
                {rest.map((n, i) => (
                  <article key={n.id} className="news-item" data-cat={n.category || 'Heritage'} onClick={() => show(adminStory(n))}>
                    <div className="news-item-index">{String(i + 2).padStart(2, '0')}</div>
                    <div className="news-item-body">
                      <div className="news-item-top">
                        <small>{(n.category || 'HERITAGE').toUpperCase()}</small>
                        <span className="news-item-time">{shortDate(n.published_at)}</span>
                      </div>
                      <h3>{n.title}</h3>
                      <p>{n.summary}</p>
                      <div className="news-item-foot">
                        <span className="news-read">Read →</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <>
              {/* ---------- LEAD STORY ---------- */}
              <article className="news-lead" data-news-card="Dholavira" data-cat="Archaeology" onClick={() => show(staticStory('Dholavira'))}>
                <div className="news-lead-image">
                  <img
                    src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRtttuUySAHjoY9MBih6Uw4RLikXeIgc7zXSdYQP_R9bg&s=10"
                    alt="Heritage architecture"
                  />
                  <div className="news-lead-veil"></div>
                  <div className="news-lead-tag">
                    <span className="tag-dot"></span>
                    <span>ARCHAEOLOGY · JUL 31, 2026</span>
                  </div>
                </div>
                <div className="news-lead-body">
                  <span className="news-lead-kicker">EXCLUSIVE DISPATCH</span>
                  <h3>How a desert city keeps rewriting what we know.</h3>
                  <p>
                    New readings of Dholavira's reservoir system suggest the city wasn't just surviving scarcity — it was
                    engineering around it with astonishing precision.
                  </p>
                  <div className="news-lead-meta">
                    <span>By Mirava Desk</span>
                    <span className="meta-dot"></span>
                    <span>6 min read</span>
                  </div>
                  <button className="news-open-btn" type="button">
                    Open full story <span>↗</span>
                  </button>
                </div>
              </article>

              {/* ---------- STORY LIST ---------- */}
              <div className="news-stream" id="newsStream">
                {STATIC_STREAM.map((s, i) => (
                  <article key={s.key} className="news-item" data-news-card={s.key} data-cat={s.cat} onClick={() => show(staticStory(s.key))}>
                    <div className="news-item-index">{String(i + 2).padStart(2, '0')}</div>
                    <div className="news-item-body">
                      <div className="news-item-top">
                        <small>{s.small}</small>
                        <span className="news-item-time">{s.time}</span>
                      </div>
                      <h3>{s.title}</h3>
                      <p>{s.text}</p>
                      <div className="news-item-foot">
                        <span className="news-read">Read →</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ---------- FOOTER ---------- */}
        <div className="news-footer">
          <div className="news-footer-left">
            <span className="news-footer-dot"></span>
            <span>Updated continuously · Mirava heritage desk</span>
          </div>
          <div className="news-footer-right">
            <span>6 dispatches</span>
            <span className="footer-sep">·</span>
            <span>4 categories</span>
            <span className="footer-sep">·</span>
            <span>Jul 31, 2026</span>
          </div>
        </div>
      </section>

      {/* Story reader (outside the section so position:fixed is not trapped by its transform) */}
      <div id="newsStoryModal" className={`news-modal${open ? ' open' : ''}`}>
        <div className="news-modal-backdrop" onClick={() => setOpen(false)}></div>
        <div className="news-modal-box" role="dialog" aria-modal="true">
          <button type="button" className="news-modal-close" aria-label="Close" onClick={() => setOpen(false)}>
            ×
          </button>
          {story && (
            <>
              <span className="news-modal-tag" id="newsModalTag">
                {story.tag}
              </span>
              <h2 id="newsModalTitle">{story.title}</h2>
              <div className="news-modal-meta" id="newsModalMeta">
                {story.meta.map((m) => (
                  <span key={m}>{m}</span>
                ))}
              </div>
              <p id="newsModalBody" style={{ whiteSpace: 'pre-line' }}>
                {story.body}
              </p>
              {story.source && (
                <p>
                  <b>Source:</b>{' '}
                  <a href={story.source} target="_blank" rel="noopener noreferrer">
                    {story.source}
                  </a>
                </p>
              )}
              <div className="news-modal-foot">
                <span>Mirava heritage desk</span>
                <span>·</span>
                <span>{story.foot}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
