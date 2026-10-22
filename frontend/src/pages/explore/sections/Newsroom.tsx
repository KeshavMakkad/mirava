import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { t as translate, useLanguage, type Language } from '../../../i18n'
import { api, type NewsItem } from '../../../lib/api'
import { useEscape, useScrollLock } from '../util'

/*
 * New explore.html: the original hard-coded newsroom stays hidden; only
 * admin-published stories (api.news.list) appear, as "Published dispatches"
 * cards with an article dialog (from public/mirava-live.js). Those blocks are
 * self-localised (data-mirava-localized), so their labels carry both languages
 * here and stories use the admin's *_hi fields in Hindi mode.
 */
const COPY = {
  editorial: ['FROM THE MIRAVA EDITORIAL DESK', 'मिरावा संपादकीय विभाग से'],
  dispatches: ['Published dispatches', 'प्रकाशित समाचार'],
  emptyNews: [
    'No published stories yet. Admins can publish and replace all news here.',
    'संपादकों की नई खबरें यहाँ दिखेंगी। नीचे विरासत संग्रह देखें।',
  ],
  loading: ['Loading…', 'लोड हो रहा है…'],
  unavailable: ['Live content is temporarily unavailable. Please retry.', 'नई सामग्री अभी उपलब्ध नहीं है। फिर कोशिश करें।'],
  retry: ['Retry', 'फिर कोशिश करें'],
  fallback: ['English original — Hindi translation pending', 'मूल अंग्रेज़ी सामग्री — हिंदी अनुवाद बाकी है'],
  close: ['Close dialog', 'संवाद बंद करें'],
  dialog: ['MIRAVA interactive experience', 'मिरावा का संवाद'],
  read: ['Read {title}', '{title} पढ़ें'],
  count: ['{count} editor dispatches', 'संपादकों की {count} खबरें'],
  source: ['Source', 'स्रोत'],
} satisfies Record<string, [string, string]>

const MONUMENT_PHOTOS = [
  {
    name: 'Dholavira · Gujarat',
    label: 'Harappan reservoir',
    img: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/78/Water_reservoir_at_Dholavira_site.jpg/960px-Water_reservoir_at_Dholavira_site.jpg',
    source: 'https://commons.wikimedia.org/wiki/File:Water_reservoir_at_Dholavira_site.jpg',
    credit: 'Bhajish Bharathan · CC BY-SA 4.0',
  },
  {
    name: 'Hampi · Karnataka',
    label: 'Stone Chariot at Vittala Temple',
    img: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2e/Hampi_chariot.jpg/960px-Hampi_chariot.jpg',
    source: 'https://commons.wikimedia.org/wiki/File:Hampi_chariot.jpg',
    credit: 'Apadegal · CC BY-SA 3.0',
  },
  {
    name: 'Konark · Odisha',
    label: 'Sun Temple',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Sun_Temple_of_Konark.jpg/960px-Sun_Temple_of_Konark.jpg',
    source: 'https://commons.wikimedia.org/wiki/File:Sun_Temple_of_Konark.jpg',
    credit: 'Pkumark · CC BY-SA 3.0',
  },
]

const fill = (s: string, p: Record<string, string | number> = {}) => s.replace(/\{(\w+)\}/g, (_, k) => String(p[k] ?? ''))
const copy = (lang: Language, key: keyof typeof COPY, p?: Record<string, string | number>) =>
  fill(COPY[key][lang === 'hi' ? 1 : 0], p)
const safeLink = (url: string | null) => (url && /^https?:\/\//i.test(url.trim()) ? url.trim() : null)
const safeImage = (url: string | null) => (url && /^(https?:\/\/|\/|data:image\/)/i.test(url.trim()) ? url.trim() : null)

interface Authored {
  text: string
  lang: Language
  /** Hindi mode, but neither an admin translation nor a dictionary entry exists. */
  missing: boolean
}

/** Admin-written text: the *_hi field in Hindi mode, else the dictionary, else English. */
function authored(lang: Language, en: string, hi: string | null | undefined): Authored {
  if (lang !== 'hi' || !en) return { text: en, lang: 'en', missing: false }
  if (hi && hi.trim()) return { text: hi, lang: 'hi', missing: false }
  const viaDictionary = translate(en)
  return viaDictionary !== en ? { text: viaDictionary, lang: 'hi', missing: false } : { text: en, lang: 'en', missing: true }
}

function storyText(lang: Language, n: NewsItem) {
  const title = authored(lang, n.title, n.title_hi)
  const summary = authored(lang, n.summary, n.summary_hi)
  const category = authored(lang, n.category || 'Heritage', n.category_hi)
  const body = authored(lang, n.body || n.summary, n.body_hi || (n.body ? null : n.summary_hi))
  return { title, summary, category, body, missing: title.missing || summary.missing || body.missing }
}

function Text({ as: Tag, value, className }: { as: 'div' | 'h2' | 'h3' | 'p'; value: Authored; className?: string }) {
  return (
    <Tag className={className} translate="no" lang={value.lang}>
      {value.text}
    </Tag>
  )
}

export function Newsroom() {
  const lang = useLanguage()
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['news', 10],
    queryFn: () => api.news.list(10),
    staleTime: 60_000,
  })
  const items = (data ?? []).filter((n) => n.title && n.summary)

  const [openId, setOpenId] = useState<string | null>(null)
  const story = openId ? items.find((n) => n.id === openId) : undefined
  const open = !!story
  const closeRef = useRef<HTMLButtonElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  useScrollLock(open)
  useEscape(open, () => setOpenId(null))
  useEffect(() => {
    if (open) closeRef.current?.focus()
    else previousFocus.current?.focus?.()
  }, [open])

  const show = (id: string) => {
    previousFocus.current = document.activeElement as HTMLElement | null
    setOpenId(id)
  }
  const s = story ? storyText(lang, story) : null
  const sourceUrl = story ? safeLink(story.source_url) : null
  const storyImage = story ? safeImage(story.image_url) : null

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
              Admin-managed dispatches — archaeology, restoration, culture and the quiet work of keeping heritage
              alive.
            </p>
          </div>
          <div className="news-header-right">
            <div className="news-live-badge">
              <span className="live-dot"></span>
              <span>HERITAGE DESK</span>
              <span className="live-count" id="newsLiveCount" data-mirava-localized="true">
                {data ? copy(lang, 'count', { count: items.length.toLocaleString(lang === 'hi' ? 'hi-IN' : 'en-IN') }) : '5 dispatches'}
              </span>
            </div>
          </div>
        </div>

        {/* Admin-published stories (replaces the hidden hard-coded newsroom). */}
        <div id="publishedNews" data-mirava-localized="true">
          <div className="cms-kicker" id="cmsEditorial">
            {copy(lang, 'editorial')}
          </div>
          <h3 id="cmsDispatches" style={{ font: '600 32px Playfair Display,serif', margin: '13px 0' }}>
            {copy(lang, 'dispatches')}
          </h3>
          <div id="cmsNewsCards" className="cms-news-grid">
            {isPending ? (
              <p className="cms-news-empty">{copy(lang, 'loading')}</p>
            ) : isError ? (
              <p className="cms-news-empty">
                {copy(lang, 'unavailable')}{' '}
                <button type="button" className="cms-option" style={{ width: 'auto' }} onClick={() => void refetch()}>
                  {copy(lang, 'retry')}
                </button>
              </p>
            ) : items.length === 0 ? (
              <p className="cms-news-empty">{copy(lang, 'emptyNews')}</p>
            ) : (
              items.map((n) => {
                const st = storyText(lang, n)
                const img = safeImage(n.image_url)
                return (
                  <button
                    key={n.id}
                    type="button"
                    className="cms-news-card"
                    aria-label={copy(lang, 'read', { title: st.title.text })}
                    onClick={() => show(n.id)}
                  >
                    {img && (
                      <img
                        src={img}
                        alt={st.title.text}
                        loading="lazy"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    )}
                    <div className="cms-pad">
                      <Text as="div" className="cms-kicker" value={st.category} />
                      <Text as="h3" value={st.title} />
                      <Text as="p" value={st.summary} />
                      {st.missing && <span className="mirava-language-fallback">{copy(lang, 'fallback')}</span>}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        <div className="cms-portrait-strip" id="miravaMonumentPhotos">
          {MONUMENT_PHOTOS.map((photo) => (
            <figure key={photo.name}>
              <a href={photo.source} target="_blank" rel="noopener noreferrer" aria-label={`Image credits for ${photo.name}`}>
                <img src={photo.img} alt={`${photo.label}, ${photo.name}`} loading="lazy" />
              </a>
              <figcaption>
                {photo.name} · {photo.label} · {photo.credit}
              </figcaption>
            </figure>
          ))}
        </div>

        {/* ---------- FOOTER ---------- */}
        <div className="news-footer">
          <div className="news-footer-left">
            <span className="news-footer-dot"></span>
            <span>Updated continuously · Mirava heritage desk</span>
          </div>
          {items.length > 0 && (
            <div className="news-footer-right">
              <span>{items.length === 1 ? '1 dispatch' : `${items.length} dispatches`}</span>
              <span className="footer-sep">·</span>
              <span>{(() => { const n = new Set(items.map((i) => i.category)).size; return n === 1 ? '1 category' : `${n} categories` })()}</span>
              <span className="footer-sep">·</span>
              <span>
                {new Date(items[0].published_at).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Article dialog (outside the section so position:fixed is not trapped by its transform). */}
      <div
        className="cms-modal"
        id="cmsModal"
        hidden={!open}
        data-mirava-localized="true"
        onClick={(e) => e.target === e.currentTarget && setOpenId(null)}
      >
        <div className="cms-modal-panel" role="dialog" aria-modal="true" aria-label={copy(lang, 'dialog')} tabIndex={-1}>
          <button
            ref={closeRef}
            type="button"
            className="cms-modal-close"
            aria-label={copy(lang, 'close')}
            onClick={() => setOpenId(null)}
          >
            ×
          </button>
          {story && s && (
            <>
              <Text as="div" className="cms-kicker" value={s.category} />
              <Text as="h2" value={s.title} />
              {s.missing && <span className="mirava-language-fallback">{copy(lang, 'fallback')}</span>}
              {storyImage && (
                <img className="cms-modal-img" src={storyImage} alt={s.title.text} onError={(e) => (e.currentTarget.style.display = 'none')} />
              )}
              <p translate="no" lang={s.body.lang} style={{ whiteSpace: 'pre-line' }}>
                {s.body.text}
              </p>
              {sourceUrl && (
                <p>
                  <b>{copy(lang, 'source')}:</b>{' '}
                  <a href={sourceUrl} target="_blank" rel="noopener noreferrer" translate="no">
                    {sourceUrl}
                  </a>
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
