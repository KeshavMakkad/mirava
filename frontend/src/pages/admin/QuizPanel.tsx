import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { api, type AdminQuestion, type QuestionIn } from '../../lib/api'
import { DIFFICULTIES, errMsg, questionToInput, toDifficulty, useDebounced, type Difficulty, type Toast } from './shared'

const PAGE = 15
const LETTERS = ['A', 'B', 'C', 'D']

interface Form {
  topic: string
  question: string
  options: string[]
  answer: number
  difficulty: Difficulty
}

const EMPTY: Form = { topic: '', question: '', options: ['', '', '', ''], answer: 0, difficulty: 'Explorer' }

export function QuizPanel({ toast }: { toast: Toast }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<Form>(EMPTY)
  const [editing, setEditing] = useState<AdminQuestion | null>(null)
  const [search, setSearch] = useState('')
  const [source, setSource] = useState<'' | 'bank' | 'admin'>('admin')
  const [page, setPage] = useState(0)
  const debounced = useDebounced(search.trim())

  const params = { search: debounced || undefined, source: source || undefined, limit: PAGE, offset: page * PAGE }
  const list = useQuery({
    queryKey: ['admin', 'questions', params],
    queryFn: () => api.admin.questions(params),
    placeholderData: keepPreviousData,
  })
  const total = list.data?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / PAGE))

  const invalidate = () => void qc.invalidateQueries({ queryKey: ['admin'] })

  const save = useMutation({
    mutationFn: ({ id, body }: { id?: string; body: QuestionIn }) =>
      id ? api.admin.updateQuestion(id, body) : api.admin.createQuestion(body),
    onSuccess: (_d, { id }) => {
      invalidate()
      toast(id ? 'Question updated' : 'Question published to the quiz bank')
      clear()
    },
    onError: (e) => toast(errMsg(e)),
  })

  const setActive = useMutation({
    mutationFn: async (q: AdminQuestion): Promise<void> => {
      if (q.is_active) await api.admin.deleteQuestion(q.id)
      else await api.admin.updateQuestion(q.id, { ...questionToInput(q), is_active: true })
    },
    onSuccess: (_d, q) => {
      invalidate()
      toast(q.is_active ? 'Question deactivated' : 'Question reactivated')
    },
    onError: (e) => toast(errMsg(e)),
  })

  function clear() {
    setForm(EMPTY)
    setEditing(null)
  }

  function startEdit(q: AdminQuestion) {
    setEditing(q)
    setForm({
      topic: q.topic,
      question: q.question,
      options: [...q.options, '', '', '', ''].slice(0, 4),
      answer: q.answer,
      difficulty: toDifficulty(q.difficulty),
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const question = form.question.trim()
    const filled = form.options.map((o, i) => ({ text: o.trim(), i })).filter((o) => o.text)
    if (question.length < 5) return toast('Write a question of at least 5 characters')
    if (filled.length < 2) return toast('Add at least two answer options')
    const answer = filled.findIndex((o) => o.i === form.answer)
    if (answer < 0) return toast('The correct answer must be one of the filled options')
    save.mutate({
      id: editing?.id,
      body: {
        topic: form.topic.trim() || 'Heritage Update',
        question,
        options: filled.map((o) => o.text),
        answer,
        difficulty: form.difficulty,
        is_active: editing ? editing.is_active : true,
      },
    })
  }

  return (
    <section className="panel active">
      <div className="grid">
        <form className="card" onSubmit={onSubmit} noValidate>
          <h2>{editing ? 'Edit quiz question' : 'Add quiz question'}</h2>
          <p className="hint">
            {editing
              ? `Editing ${editing.id} (${editing.source === 'bank' ? 'built-in bank' : 'admin'} question).`
              : 'These questions are merged with the MIRAVA question bank for daily quizzes, practice and classroom homework.'}
          </p>
          <div className="field">
            <label htmlFor="qTopic">Topic</label>
            <input
              id="qTopic"
              maxLength={80}
              placeholder="e.g. Chola Architecture"
              value={form.topic}
              onChange={(e) => setForm({ ...form, topic: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="qQuestion">Question</label>
            <textarea
              id="qQuestion"
              maxLength={500}
              placeholder="Write one clear heritage question"
              value={form.question}
              onChange={(e) => setForm({ ...form, question: e.target.value })}
            />
          </div>
          {form.options.map((opt, i) => (
            <div className="field" key={i}>
              <label htmlFor={`qOpt${i}`}>
                Option {LETTERS[i]}
                {i >= 2 ? ' (optional)' : ''}
              </label>
              <div className="opt-row">
                <input
                  type="radio"
                  name="qAnswer"
                  aria-label={`Option ${LETTERS[i]} is correct`}
                  title="Mark as the correct answer"
                  checked={form.answer === i}
                  onChange={() => setForm({ ...form, answer: i })}
                />
                <input
                  id={`qOpt${i}`}
                  type="text"
                  placeholder={`Option ${LETTERS[i]}`}
                  value={opt}
                  onChange={(e) => {
                    const options = [...form.options]
                    options[i] = e.target.value
                    setForm({ ...form, options })
                  }}
                />
              </div>
            </div>
          ))}
          <div className="row">
            <div className="field">
              <label htmlFor="qAnswerSel">Correct answer</label>
              <select
                id="qAnswerSel"
                value={form.answer}
                onChange={(e) => setForm({ ...form, answer: Number(e.target.value) })}
              >
                {LETTERS.map((l, i) => (
                  <option key={l} value={i}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="qDifficulty">Difficulty</label>
              <select
                id="qDifficulty"
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value as Difficulty })}
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="actions">
            <button className="btn gold" type="submit" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : editing ? 'Update question' : 'Publish question'}
            </button>
            <button className="btn" type="button" onClick={clear}>
              {editing ? 'Cancel edit' : 'Clear form'}
            </button>
          </div>
        </form>

        <div className="card">
          <h3>Quiz bank</h3>
          <p className="hint">
            Deactivated questions are no longer drawn into quizzes; past attempts and homework that used them keep
            working.
          </p>
          <div className="toolbar">
            <input
              type="search"
              placeholder="Search question or topic…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(0)
              }}
            />
            <select
              value={source}
              onChange={(e) => {
                setSource(e.target.value as typeof source)
                setPage(0)
              }}
            >
              <option value="admin">Admin questions</option>
              <option value="bank">Built-in bank</option>
              <option value="">All sources</option>
            </select>
          </div>
          <div className="list">
            {list.isLoading ? (
              <div className="empty">Loading questions…</div>
            ) : list.isError ? (
              <div className="empty">Could not load questions: {errMsg(list.error)}</div>
            ) : !list.data?.items.length ? (
              <div className="empty">
                {debounced ? 'No questions match your search.' : 'No administrator quiz questions yet.'}
              </div>
            ) : (
              list.data.items.map((q) => (
                <div className={`item${editing?.id === q.id ? ' editing' : ''}${q.is_active ? '' : ' off'}`} key={q.id}>
                  <div className="item-top">
                    <div>
                      <small>
                        {(q.topic || 'HERITAGE').toUpperCase()} · {q.difficulty}
                      </small>
                      <span className={`badge${q.source === 'admin' ? ' dark' : ''}`}>{q.source}</span>
                      {!q.is_active && <span className="badge gold">Inactive</span>}
                      <h4>{q.question}</h4>
                    </div>
                    <div className="item-actions">
                      <button type="button" className="ghost" onClick={() => startEdit(q)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className={q.is_active ? undefined : 'ok'}
                        disabled={setActive.isPending && setActive.variables?.id === q.id}
                        onClick={() => {
                          if (!q.is_active || window.confirm('Deactivate this question? It will no longer appear in quizzes.'))
                            setActive.mutate(q)
                        }}
                      >
                        {q.is_active ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </div>
                  </div>
                  <p>Answer: {q.options[q.answer] ?? '—'}</p>
                </div>
              ))
            )}
          </div>
          <div className="pager">
            <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              ← Prev
            </button>
            <span>
              {total} QUESTIONS · PAGE {Math.min(page + 1, pages)} / {pages}
              {list.isFetching && !list.isLoading ? ' · …' : ''}
            </span>
            <button type="button" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>
              Next →
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
