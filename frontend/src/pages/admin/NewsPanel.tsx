import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { tr } from '../../components/quiz/tr'
import { useLanguage } from '../../i18n'
import { api, type NewsIn, type NewsItem } from '../../lib/api'
import {
  CATEGORY_HI,
  errMsg,
  fmtDate,
  hasHindi,
  hindiComplete,
  newsToInput,
  resolveImageUrl,
  type Toast,
} from './shared'

// The Heritage Studio categories first, then the ones older stories used.
const CATEGORIES = [
  'Archaeology',
  'Restoration',
  'Culture',
  'History',
  'Community',
  'Events',
  'Heritage',
  'Architecture',
  'Craft',
  'Festival',
  'Research',
]

interface Form {
  title: string
  category: string
  publishedAt: string // datetime-local value
  summary: string
  body: string
  titleHi: string
  categoryHi: string
  summaryHi: string
  bodyHi: string
  image: string
  source: string
  published: boolean
}

const EMPTY: Form = {
  title: '',
  category: 'Archaeology',
  publishedAt: '',
  summary: '',
  body: '',
  titleHi: '',
  categoryHi: '',
  summaryHi: '',
  bodyHi: '',
  image: '',
  source: '',
  published: true,
}

function toLocalInput(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

const orNull = (s: string) => s.trim() || null

export function NewsPanel({ toast }: { toast: Toast }) {
  const lang = useLanguage()
  const qc = useQueryClient()
  const [form, setForm] = useState<Form>(EMPTY)
  const [editing, setEditing] = useState<NewsItem | null>(null)
  const [previewLang, setPreviewLang] = useState<'en' | 'hi'>('en')
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }))

  const news = useQuery({ queryKey: ['admin', 'news'], queryFn: api.admin.news })

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['admin'] })
    void qc.invalidateQueries({ queryKey: ['news'] })
  }

  const save = useMutation({
    mutationFn: ({ id, body }: { id?: string; body: NewsIn }) =>
      id ? api.admin.updateNews(id, body) : api.admin.createNews(body),
    onSuccess: (_d, { id }) => {
      invalidate()
      toast(id ? 'Story updated' : 'Published to MIRAVA Explore')
      clear()
    },
    onError: (e) => toast(errMsg(e)),
  })

  const toggle = useMutation({
    mutationFn: (n: NewsItem) => api.admin.updateNews(n.id, { ...newsToInput(n), is_published: !n.is_published }),
    onSuccess: (n) => {
      invalidate()
      toast(n.is_published ? 'Story published' : 'Story moved to drafts')
    },
    onError: (e) => toast(errMsg(e)),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.admin.deleteNews(id),
    onSuccess: (_d, id) => {
      invalidate()
      if (editing?.id === id) clear()
      toast('Story deleted')
    },
    onError: (e) => toast(errMsg(e)),
  })

  function clear() {
    setForm(EMPTY)
    setEditing(null)
    setPreviewLang('en')
  }

  function startEdit(n: NewsItem) {
    setEditing(n)
    setForm({
      title: n.title,
      category: n.category,
      publishedAt: toLocalInput(n.published_at),
      summary: n.summary,
      body: n.body ?? '',
      titleHi: n.title_hi ?? '',
      categoryHi: n.category_hi ?? '',
      summaryHi: n.summary_hi ?? '',
      bodyHi: n.body_hi ?? '',
      image: n.image_url ?? '',
      source: n.source_url ?? '',
      published: n.is_published,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const title = form.title.trim()
    const summary = form.summary.trim()
    if (title.length < 6) return toast('Headline needs at least 6 characters')
    if (summary.length < 12) return toast('Summary needs at least 12 characters')
    const image = resolveImageUrl(form.image)
    if (image === undefined) return toast('Use a valid HTTPS image URL or a path such as images/diwali.jpg.')
    const source = resolveImageUrl(form.source, false)
    if (source === undefined) return toast('Source must be a link starting with http(s)://')
    const when = form.publishedAt ? new Date(form.publishedAt) : null
    const anyHi = [form.titleHi, form.summaryHi, form.bodyHi].some((s) => s.trim())
    save.mutate({
      id: editing?.id,
      body: {
        title,
        category: form.category,
        summary,
        body: orNull(form.body),
        title_hi: orNull(form.titleHi),
        // A Hindi category label is filled in automatically for the standard categories.
        category_hi: orNull(form.categoryHi) ?? (anyHi ? (CATEGORY_HI[form.category] ?? null) : null),
        summary_hi: orNull(form.summaryHi),
        body_hi: orNull(form.bodyHi),
        image_url: image,
        source_url: source,
        published_at: when && !Number.isNaN(when.getTime()) ? when.toISOString() : null,
        is_published: form.published,
      },
    })
  }

  const categories = CATEGORIES.includes(form.category) ? CATEGORIES : [form.category, ...CATEGORIES]
  const formHi = {
    title_hi: form.titleHi,
    category_hi: form.categoryHi || CATEGORY_HI[form.category] || '',
    summary_hi: form.summaryHi,
    body_hi: form.bodyHi,
  }
  const formHiComplete = hindiComplete(formHi)
  const previewHi = previewLang === 'hi'
  const pv = {
    category: previewHi && formHi.category_hi ? formHi.category_hi : form.category || 'HERITAGE',
    title: (previewHi && form.titleHi.trim()) || form.title || 'Headline',
    summary: (previewHi && form.summaryHi.trim()) || form.summary,
  }
  const previewImage = resolveImageUrl(form.image)

  return (
    <section className="panel active">
      <div className="grid studio-grid">
        <form className="card glass" onSubmit={onSubmit} noValidate>
          {editing ? (
            <h2>
              Edit: <span translate="no">{editing.title}</span>
            </h2>
          ) : (
            <h2>New heritage dispatch</h2>
          )}
          <p className="hint">
            The newest published story becomes the large lead story in Explore. Up to five are displayed in the main
            newsroom.
          </p>

          <fieldset className="cms-language-editor">
            <legend>English version</legend>
            <div className="field">
              <label htmlFor="nTitle">HEADLINE</label>
              <input
                id="nTitle"
                maxLength={200}
                placeholder="What happened at the heritage site?"
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
              />
            </div>
            <div className="row">
              <div className="field">
                <label htmlFor="nCategory">CATEGORY</label>
                <select id="nCategory" value={form.category} onChange={(e) => set('category', e.target.value)}>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="nDate">Publish date</label>
                <input
                  id="nDate"
                  type="datetime-local"
                  value={form.publishedAt}
                  onChange={(e) => set('publishedAt', e.target.value)}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="nSummary">SHORT SUMMARY</label>
              <textarea
                id="nSummary"
                maxLength={600}
                placeholder="Two lines for the website card..."
                value={form.summary}
                onChange={(e) => set('summary', e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="nBody">FULL STORY</label>
              <textarea
                id="nBody"
                className="tall"
                placeholder="Write the complete report; verify facts and sources before publishing."
                value={form.body}
                onChange={(e) => set('body', e.target.value)}
              />
            </div>
          </fieldset>

          <fieldset className="cms-language-editor cms-hindi-editor">
            <legend>
              Hindi version{' '}
              <span lang="hi" className="hi-tag">
                हिंदी
              </span>{' '}
              <span className="badge gold">Optional</span>
            </legend>
            <p className="muted">Add matching Hindi text so the complete story is available in both languages.</p>
            <div className="field">
              <label htmlFor="nTitleHi">HEADLINE — HINDI</label>
              <input
                id="nTitleHi"
                lang="hi"
                maxLength={200}
                placeholder="विरासत समाचार का हिन्दी शीर्षक"
                value={form.titleHi}
                onChange={(e) => set('titleHi', e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="nCategoryHi">CATEGORY — HINDI</label>
              <input
                id="nCategoryHi"
                lang="hi"
                maxLength={35}
                placeholder={CATEGORY_HI[form.category] ? `जैसे: ${CATEGORY_HI[form.category]}` : 'जैसे: संस्कृति या पुरातत्त्व'}
                value={form.categoryHi}
                onChange={(e) => set('categoryHi', e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="nSummaryHi">SHORT SUMMARY — HINDI</label>
              <textarea
                id="nSummaryHi"
                lang="hi"
                maxLength={600}
                placeholder="लेख का संक्षिप्त हिन्दी परिचय"
                value={form.summaryHi}
                onChange={(e) => set('summaryHi', e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="nBodyHi">FULL STORY — HINDI</label>
              <textarea
                id="nBodyHi"
                lang="hi"
                className="tall"
                placeholder="पूरा लेख हिन्दी में लिखें। तथ्यों और स्रोतों की जाँच करें।"
                value={form.bodyHi}
                onChange={(e) => set('bodyHi', e.target.value)}
              />
            </div>
          </fieldset>
          <p className="muted cms-translation-note">
            {tr(
              'Hindi is optional. Until a translation is added, Hindi readers see the English story.',
              'हिंदी वैकल्पिक है। अनुवाद जोड़े जाने तक हिंदी पाठकों को अंग्रेज़ी लेख दिखेगा।',
            )}
          </p>

          <div className="row">
            <div className="field">
              <label htmlFor="nImage">IMAGE URL — HTTPS, OPTIONAL</label>
              <input
                id="nImage"
                placeholder="https://... or images/diwali.jpg"
                value={form.image}
                onChange={(e) => set('image', e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="nSource">Source link</label>
              <input
                id="nSource"
                placeholder="https://asi.nic.in/..."
                value={form.source}
                onChange={(e) => set('source', e.target.value)}
              />
            </div>
          </div>
          <label className="check">
            <input type="checkbox" checked={form.published} onChange={(e) => set('published', e.target.checked)} />
            Publish immediately in Explore (uncheck to save draft)
          </label>

          {(form.title || form.summary || form.titleHi || form.summaryHi) && (
            <div className="preview">
              <div className="preview-head">
                <small>Preview</small>
                <div className="lang-toggle" role="group" aria-label="Preview language">
                  <button type="button" aria-pressed={!previewHi} onClick={() => setPreviewLang('en')}>
                    English
                  </button>
                  <button type="button" aria-pressed={previewHi} onClick={() => setPreviewLang('hi')}>
                    हिंदी
                  </button>
                </div>
              </div>
              <div translate="no" lang={previewHi ? 'hi' : 'en'}>
                <small>
                  {pv.category.toUpperCase()} ·{' '}
                  {form.publishedAt ? fmtDate(new Date(form.publishedAt).toISOString(), false) : 'LATEST'}
                </small>
                <h3>{pv.title}</h3>
                <p>{pv.summary}</p>
              </div>
              {previewHi && !formHiComplete && (
                <span className="translation-chip">Hindi translation incomplete</span>
              )}
              {previewImage && <img src={previewImage} alt="" onError={(e) => e.currentTarget.remove()} />}
            </div>
          )}
          <div className="actions">
            <button className="btn gold primary" type="submit" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : editing ? 'Save article changes' : 'Publish / save changes'}
            </button>
            <button className="btn" type="button" onClick={clear}>
              {editing ? 'Cancel edit' : 'Clear'}
            </button>
          </div>
        </form>

        <div className="card glass">
          <div className="list-head">
            <h2>Published &amp; drafts</h2>
            <span className="pill">{`${news.data?.length ?? 0} stories`}</span>
          </div>
          <p className="hint">Newest stories are placed at the top automatically. Drafts stay hidden from Explore.</p>
          <div className="list">
            {news.isLoading ? (
              <div className="empty">Loading...</div>
            ) : news.isError ? (
              <div className="empty">Could not load stories: {errMsg(news.error)}</div>
            ) : !news.data?.length ? (
              <div className="empty">No stories yet — publish your first article.</div>
            ) : (
              news.data.map((n) => {
                const ready = hindiComplete(n)
                const showHi = lang === 'hi' && ready
                return (
                  <article
                    className={`item entry${editing?.id === n.id ? ' editing' : ''}${n.is_published ? '' : ' off'}`}
                    key={n.id}
                  >
                    <div className="item-top">
                      <div>
                        <div className="meta">
                          <span>{n.is_published ? '● PUBLISHED' : '○ DRAFT'}</span>
                          {' · '}
                          <span translate="no">{showHi ? n.category_hi : n.category}</span>
                          {' · '}
                          <span>{fmtDate(n.published_at, false)}</span>
                        </div>
                        <h4 translate="no" lang={showHi ? 'hi' : 'en'}>
                          {showHi ? n.title_hi : n.title}
                        </h4>
                      </div>
                      <div className="item-actions">
                        <button type="button" className="ghost" onClick={() => startEdit(n)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className={n.is_published ? 'ghost' : 'ok'}
                          disabled={toggle.isPending && toggle.variables?.id === n.id}
                          onClick={() => toggle.mutate(n)}
                        >
                          {n.is_published ? tr('Unpublish', 'प्रकाशन हटाएँ') : 'Publish'}
                        </button>
                        <button
                          type="button"
                          disabled={remove.isPending && remove.variables === n.id}
                          onClick={() => {
                            if (window.confirm(`Delete “${n.title}”? This cannot be undone.`)) remove.mutate(n.id)
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <p translate="no" lang={showHi ? 'hi' : 'en'}>
                      {showHi ? n.summary_hi : n.summary}
                    </p>
                    <span className={`translation-chip${ready ? ' complete' : ''}`}>
                      {ready
                        ? 'English + Hindi ready'
                        : lang === 'hi'
                          ? 'English version shown'
                          : hasHindi(n)
                            ? 'Hindi translation incomplete'
                            : tr('English only', 'केवल अंग्रेज़ी')}
                    </span>
                  </article>
                )
              })
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
