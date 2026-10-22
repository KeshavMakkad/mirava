import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { api, type BankQuestion } from '../../lib/api'
import { locale, useLanguage } from '../../i18n'
import { DIFFICULTIES, errorMessage, MAX_QUESTIONS } from './util'

const PAGE = 25
/** Server pages pulled when a search has to run client-side (Hindi queries). */
const FETCH_PAGE = 200
const MAX_FETCH_PAGES = 25

/** Hindi queries can't hit the English-only server search, so they match locally
 *  against the question and its Hindi translation (MiravaI18n.matches, as in the new classroom.html). */
const hasNonLatin = (s: string) => /[\u0900-\u097F]/.test(s)
function matchesQuery(q: BankQuestion, query: string): boolean {
  const rt = window.MiravaI18n
  if (rt?.matches) return rt.matches([q.question, q.topic], query)
  const needle = query.toLocaleLowerCase()
  return q.question.toLocaleLowerCase().includes(needle) || q.topic.toLocaleLowerCase().includes(needle)
}

async function fetchAllQuestions(topic: string, difficulty: string): Promise<BankQuestion[]> {
  const out: BankQuestion[] = []
  for (let page = 0; page < MAX_FETCH_PAGES; page++) {
    const res = await api.classrooms.questions({ topic, difficulty, limit: FETCH_PAGE, offset: page * FETCH_PAGE })
    out.push(...res.items)
    if (res.items.length < FETCH_PAGE || out.length >= res.total) break
  }
  return out
}

interface Props {
  selected: Map<string, BankQuestion>
  onToggle: (q: BankQuestion) => boolean
  total: number | undefined
  onClear: () => void
  children?: ReactNode
}

export function QuestionBank({ selected, onToggle, onClear, total, children }: Props) {
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [topic, setTopic] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [page, setPage] = useState(0)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebounced(search.trim())
      setPage(0)
    }, 300)
    return () => window.clearTimeout(id)
  }, [search])
  useEffect(() => {
    if (!msg) return
    const id = window.setTimeout(() => setMsg(null), 2500)
    return () => window.clearTimeout(id)
  }, [msg])

  useLanguage() // re-render number formatting on language change
  const localSearch = hasNonLatin(debounced)

  const topics = useQuery({ queryKey: ['quiz-topics'], queryFn: api.quiz.topics, staleTime: 10 * 60_000 })
  const bank = useQuery({
    queryKey: ['bank', debounced, topic, difficulty, page],
    queryFn: () =>
      api.classrooms.questions({ search: debounced, topic, difficulty, limit: PAGE, offset: page * PAGE }),
    placeholderData: keepPreviousData,
    enabled: !localSearch,
  })
  const everything = useQuery({
    queryKey: ['bank-all', topic, difficulty],
    queryFn: () => fetchAllQuestions(topic, difficulty),
    enabled: localSearch,
    staleTime: 10 * 60_000,
  })
  const localMatches = localSearch ? (everything.data ?? []).filter((q) => matchesQuery(q, debounced)) : []
  const view = localSearch
    ? {
        isLoading: everything.isLoading,
        error: everything.error,
        isPlaceholderData: false,
        total: everything.data ? localMatches.length : undefined,
        items: localMatches.slice(page * PAGE, page * PAGE + PAGE),
      }
    : {
        isLoading: bank.isLoading,
        error: bank.error,
        isPlaceholderData: bank.isPlaceholderData,
        total: bank.data?.total,
        items: bank.data?.items ?? [],
      }
  const items = view.items
  const pages = Math.max(1, Math.ceil((view.total ?? 0) / PAGE))

  return (
    <div className="mirava-classroom-bank" style={{ marginTop: 20 }}>
      <div className="bank-header">
        <h3>📚 Question Bank</h3>
        <span style={{ fontSize: 12, color: '#624950' }}>
          {total !== undefined ? `${total.toLocaleString(locale())} heritage questions` : 'Heritage questions'}
        </span>
      </div>
      <div className="bank-controls">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search questions…"
          style={{ flex: 1, minWidth: 120 }}
          aria-label="Search questions"
        />
        <select value={topic} onChange={(e) => {
            setTopic(e.target.value)
            setPage(0)
          }} aria-label="Category">
          <option value="">All Categories</option>
          {(topics.data ?? []).map((t) => (
            <option key={t.topic} value={t.topic}>
              {t.topic} ({t.count})
            </option>
          ))}
        </select>
        <select value={difficulty} onChange={(e) => {
            setDifficulty(e.target.value)
            setPage(0)
          }} aria-label="Difficulty">
          <option value="">All Difficulties</option>
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>
      <div className="bank-selected">
        Selected: <strong>{selected.size}</strong> / {MAX_QUESTIONS}
        {selected.size > 0 && (
          <button className="link-btn" style={{ marginLeft: 8 }} onClick={onClear}>
            Clear
          </button>
        )}
      </div>
      {msg && <p className="bank-msg">{msg}</p>}
      <div className="bank-list" style={{ opacity: view.isPlaceholderData ? 0.6 : 1 }}>
        {view.isLoading ? (
          <div className="cls-muted">Loading questions…</div>
        ) : view.error ? (
          <div className="cls-muted">{errorMessage(view.error)}</div>
        ) : items.length === 0 ? (
          <div className="cls-muted">No questions match your filters.</div>
        ) : (
          items.map((q) => (
            <label className="bank-question" key={q.id}>
              <input
                type="checkbox"
                checked={selected.has(q.id)}
                onChange={() => {
                  if (!onToggle(q)) setMsg(`Maximum ${MAX_QUESTIONS} questions can be assigned.`)
                }}
              />
              <span className="q-text">{q.question}</span>
              <span className="q-meta">
                {q.topic} · {q.difficulty}
              </span>
            </label>
          ))
        )}
      </div>
      <div className="bank-pager">
        <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
          ← Prev
        </button>
        <span>
          Page {page + 1} of {pages}
          {view.total !== undefined ? ` · ${view.total} result${view.total === 1 ? '' : 's'}` : ''}
        </span>
        <button disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>
          Next →
        </button>
      </div>
      {children}
    </div>
  )
}
