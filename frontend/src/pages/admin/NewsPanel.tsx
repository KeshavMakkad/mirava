import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { api, type NewsIn, type NewsItem } from '../../lib/api'
import { errMsg, fmtDate, isHttpUrl, newsToInput, type Toast } from './shared'

const CATEGORIES = ['Heritage', 'Archaeology', 'Restoration', 'Culture', 'Architecture', 'Craft', 'Festival', 'Research']

interface Form {
  title: string
  category: string
  publishedAt: string // datetime-local value
  summary: string
  body: string
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

export function NewsPanel({ toast }: { toast: Toast }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<Form>(EMPTY)
  const [editing, setEditing] = useState<NewsItem | null>(null)
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
  }

  function startEdit(n: NewsItem) {
    setEditing(n)
    setForm({
      title: n.title,
      category: n.category,
      publishedAt: toLocalInput(n.published_at),
      summary: n.summary,
      body: n.body ?? '',
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
    if (!title || !summary) return toast('Headline and summary are required')
    const image = form.image.trim()
    const source = form.source.trim()
    if (image && !isHttpUrl(image)) return toast('Image URL must start with http(s)://')
    if (source && !isHttpUrl(source)) return toast('Source must be a link starting with http(s)://')
    const when = form.publishedAt ? new Date(form.publishedAt) : null
    save.mutate({
      id: editing?.id,
      body: {
        title,
        category: form.category,
        summary,
        body: form.body.trim() || null,
        image_url: image || null,
        source_url: source || null,
        published_at: when && !Number.isNaN(when.getTime()) ? when.toISOString() : null,
        is_published: form.published,
      },
    })
  }

  const categories = CATEGORIES.includes(form.category) ? CATEGORIES : [form.category, ...CATEGORIES]

  return (
    <section className="panel active">
      <div className="grid">
        <form className="card" onSubmit={onSubmit} noValidate>
          <h2>{editing ? 'Edit heritage story' : 'Publish heritage news'}</h2>
          <p className="hint">
            The newest published story becomes the large lead story in Explore. Up to five are displayed in the main
            newsroom.
          </p>
          <div className="field">
            <label htmlFor="nTitle">Headline</label>
            <input
              id="nTitle"
              maxLength={200}
              placeholder="e.g. Restoration team reveals new temple mural details"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
            />
          </div>
          <div className="row">
            <div className="field">
              <label htmlFor="nCategory">Category</label>
              <select id="nCategory" value={form.category} onChange={(e) => set('category', e.target.value)}>
                {categories.map((c) => (
                  <option key={c}>{c}</option>
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
            <label htmlFor="nSummary">Short summary</label>
            <textarea
              id="nSummary"
              maxLength={600}
              placeholder="Concise newsroom summary shown on Explore"
              value={form.summary}
              onChange={(e) => set('summary', e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="nBody">Full story</label>
            <textarea
              id="nBody"
              placeholder="Longer story shown when the visitor opens the item"
              value={form.body}
              onChange={(e) => set('body', e.target.value)}
            />
          </div>
          <div className="row">
            <div className="field">
              <label htmlFor="nImage">Image URL</label>
              <input id="nImage" placeholder="https://..." value={form.image} onChange={(e) => set('image', e.target.value)} />
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
            Published (visible on Explore)
          </label>
          {(form.title || form.summary) && (
            <div className="preview">
              <small>
                {(form.category || 'HERITAGE').toUpperCase()} ·{' '}
                {form.publishedAt ? fmtDate(new Date(form.publishedAt).toISOString(), false) : 'LATEST'}
              </small>
              <h3>{form.title || 'Headline'}</h3>
              <p>{form.summary}</p>
              {isHttpUrl(form.image.trim()) && <img src={form.image.trim()} alt="" />}
            </div>
          )}
          <div className="actions">
            <button className="btn gold" type="submit" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : editing ? 'Update story' : form.published ? 'Publish story' : 'Save draft'}
            </button>
            <button className="btn" type="button" onClick={clear}>
              {editing ? 'Cancel edit' : 'Clear form'}
            </button>
          </div>
        </form>

        <div className="card">
          <h3>Published newsroom</h3>
          <p className="hint">Newest stories are placed at the top automatically. Drafts stay hidden from Explore.</p>
          <div className="list">
            {news.isLoading ? (
              <div className="empty">Loading stories…</div>
            ) : news.isError ? (
              <div className="empty">Could not load stories: {errMsg(news.error)}</div>
            ) : !news.data?.length ? (
              <div className="empty">No heritage stories yet. Add one on the left.</div>
            ) : (
              news.data.map((n) => (
                <div className={`item${editing?.id === n.id ? ' editing' : ''}${n.is_published ? '' : ' off'}`} key={n.id}>
                  <div className="item-top">
                    <div>
                      <small>
                        {(n.category || 'HERITAGE').toUpperCase()} · {fmtDate(n.published_at, false).toUpperCase()}
                      </small>
                      {!n.is_published && <span className="badge gold">Draft</span>}
                      <h4>{n.title}</h4>
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
                        {n.is_published ? 'Unpublish' : 'Publish'}
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
                  <p>{n.summary}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
