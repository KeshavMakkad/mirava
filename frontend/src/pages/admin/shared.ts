import { useEffect, useState } from 'react'
import { locale } from '../../i18n'
import { api, type AdminQuestion, type NewsIn, type NewsItem, type QuestionIn } from '../../lib/api'

export type Toast = (msg: string) => void

export const errMsg = (e: unknown) => (e instanceof Error && e.message ? e.message : 'Something went wrong')

export function fmtDate(iso: string | number | null | undefined, withTime = true): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(locale(), withTime
    ? { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { month: 'short', day: 'numeric', year: 'numeric' })
}

export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), ms)
    return () => window.clearTimeout(t)
  }, [value, ms])
  return v
}

export const isHttpUrl = (s: string) => /^https?:\/\/\S+$/i.test(s)

/**
 * Normalises an image/source field: '' → null, http(s) URL → as is, and (for
 * images) a site asset such as `images/diwali.jpg` → absolute URL on this
 * origin (the API only stores absolute URLs). `undefined` means invalid.
 */
export function resolveImageUrl(raw: string, allowLocal = true): string | null | undefined {
  const v = raw.trim()
  if (!v) return null
  if (isHttpUrl(v)) return v
  if (allowLocal && /^\/?images\/[\w. %()-]+$/i.test(v)) {
    return new URL(v.replace(/^\/?/, '/'), window.location.origin).href
  }
  return undefined
}

/** Default Hindi labels for the standard news categories. */
export const CATEGORY_HI: Record<string, string> = {
  Archaeology: 'पुरातत्त्व',
  Restoration: 'जीर्णोद्धार',
  Culture: 'संस्कृति',
  History: 'इतिहास',
  Community: 'समुदाय',
  Events: 'कार्यक्रम',
  Heritage: 'विरासत',
  Architecture: 'वास्तुकला',
  Craft: 'शिल्प',
  Festival: 'त्योहार',
  Research: 'शोध',
}

type HindiFields = Pick<NewsItem, 'title_hi' | 'category_hi' | 'summary_hi' | 'body_hi'>
const filled = (v: string | null | undefined, min = 2) => typeof v === 'string' && v.trim().length >= min

/** Headline, category and summary in Hindi — enough for Explore to show the Hindi card. */
export const hindiComplete = (n: Partial<HindiFields>) =>
  filled(n.title_hi) && filled(n.category_hi, 1) && filled(n.summary_hi)

export const hasHindi = (n: Partial<HindiFields>) =>
  [n.title_hi, n.category_hi, n.summary_hi, n.body_hi].some((v) => filled(v, 1))

export const DIFFICULTIES = ['Explorer', 'Scholar', 'Master'] as const
export type Difficulty = (typeof DIFFICULTIES)[number]

export const toDifficulty = (d: unknown): Difficulty =>
  d === 'Expert' ? 'Master' : DIFFICULTIES.includes(d as Difficulty) ? (d as Difficulty) : 'Explorer'

export const newsToInput = (n: NewsItem): NewsIn => ({
  title: n.title,
  category: n.category,
  summary: n.summary,
  body: n.body,
  title_hi: n.title_hi ?? null,
  category_hi: n.category_hi ?? null,
  summary_hi: n.summary_hi ?? null,
  body_hi: n.body_hi ?? null,
  image_url: n.image_url,
  source_url: n.source_url,
  published_at: n.published_at,
  is_published: n.is_published,
})

export const questionToInput = (q: AdminQuestion): QuestionIn => ({
  topic: q.topic,
  question: q.question,
  options: q.options,
  answer: q.answer,
  difficulty: toDifficulty(q.difficulty),
  is_active: q.is_active,
})

/** Every admin-authored question (paged through the API). */
export async function fetchAllAdminQuestions(): Promise<AdminQuestion[]> {
  const out: AdminQuestion[] = []
  for (let offset = 0; ; offset += 200) {
    const page = await api.admin.questions({ source: 'admin', limit: 200, offset })
    out.push(...page.items)
    if (page.items.length < 200 || out.length >= page.total) return out
  }
}

export interface ContentExport {
  version: 2
  exported_at: string
  news: NewsIn[]
  quiz: QuestionIn[]
}

export async function buildExport(): Promise<ContentExport> {
  const [news, quiz] = await Promise.all([api.admin.news(), fetchAllAdminQuestions()])
  return {
    version: 2,
    exported_at: new Date().toISOString(),
    news: news.map(newsToInput),
    quiz: quiz.map(questionToInput),
  }
}

export function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 500)
}

type Loose = Record<string, unknown>
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

/** Accepts both the new export format and the legacy localStorage CMS format. */
export function parseNewsImport(raw: Loose): NewsIn {
  const image = str(raw.image_url) || str(raw.imageUrl) || str(raw.image)
  const source = str(raw.source_url) || str(raw.source)
  const when = str(raw.published_at) || str(raw.date)
  const parsed = when ? new Date(when) : null
  // Heritage Studio exports nest Hindi under translations.hi.
  const tr = (raw.translations as Loose | undefined)?.hi as Loose | undefined
  const hi = (key: string) => str(raw[`${key}_hi`]) || (tr ? str(tr[key]) : '') || null
  return {
    title: str(raw.title),
    category: str(raw.category) || 'Heritage',
    summary: str(raw.summary),
    body: str(raw.body) || null,
    title_hi: hi('title'),
    category_hi: hi('category'),
    summary_hi: hi('summary'),
    body_hi: hi('body'),
    image_url: resolveImageUrl(image) ?? null,
    source_url: isHttpUrl(source) ? source : null,
    published_at: parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : null,
    is_published:
      raw.is_published !== undefined ? !!raw.is_published : raw.published !== undefined ? !!raw.published : true,
  }
}

export function parseQuestionImport(raw: Loose): QuestionIn {
  const options = Array.isArray(raw.options) ? raw.options.map((o) => String(o ?? '').trim()) : []
  return {
    topic: str(raw.topic) || 'Heritage Update',
    question: str(raw.question),
    options,
    answer: Number(raw.answer) || 0,
    difficulty: toDifficulty(raw.difficulty),
    is_active: raw.is_active === undefined ? true : !!raw.is_active,
  }
}
