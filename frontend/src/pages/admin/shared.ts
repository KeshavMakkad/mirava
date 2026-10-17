import { useEffect, useState } from 'react'
import { api, type AdminQuestion, type NewsIn, type NewsItem, type QuestionIn } from '../../lib/api'

export type Toast = (msg: string) => void

export const errMsg = (e: unknown) => (e instanceof Error && e.message ? e.message : 'Something went wrong')

export function fmtDate(iso: string | number | null | undefined, withTime = true): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, withTime
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

export const DIFFICULTIES = ['Explorer', 'Scholar', 'Master'] as const
export type Difficulty = (typeof DIFFICULTIES)[number]

export const toDifficulty = (d: unknown): Difficulty =>
  d === 'Expert' ? 'Master' : DIFFICULTIES.includes(d as Difficulty) ? (d as Difficulty) : 'Explorer'

export const newsToInput = (n: NewsItem): NewsIn => ({
  title: n.title,
  category: n.category,
  summary: n.summary,
  body: n.body,
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
  const image = str(raw.image_url) || str(raw.image)
  const source = str(raw.source_url) || str(raw.source)
  const when = str(raw.published_at) || str(raw.date)
  const parsed = when ? new Date(when) : null
  return {
    title: str(raw.title),
    category: str(raw.category) || 'Heritage',
    summary: str(raw.summary),
    body: str(raw.body) || null,
    image_url: isHttpUrl(image) ? image : null,
    source_url: isHttpUrl(source) ? source : null,
    published_at: parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : null,
    is_published: raw.is_published === undefined ? true : !!raw.is_published,
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
