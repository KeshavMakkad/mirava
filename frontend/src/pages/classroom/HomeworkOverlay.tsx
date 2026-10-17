import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { api, type Assignment, type HomeworkResult } from '../../lib/api'
import { errorMessage } from './util'

type Stage = 'questions' | 'confirm' | 'result' | 'review'

interface Props {
  assignment: Assignment
  /** 'take' starts the homework; 'review' shows the stored result. */
  mode: 'take' | 'review'
  onClose: () => void
  onSubmitted: () => void
}

function verdict(pct: number): [string, string] {
  if (pct === 100) return ['🏆', 'Perfect score! Outstanding!']
  if (pct >= 80) return ['🌟', 'Excellent work!']
  if (pct >= 60) return ['📖', 'Good effort! Keep learning.']
  if (pct >= 40) return ['🌱', 'Keep exploring and learning!']
  return ['🔄', 'Review the questions and try again.']
}

export function HomeworkOverlay({ assignment, mode, onClose, onSubmitted }: Props) {
  const [stage, setStage] = useState<Stage>(mode === 'review' ? 'review' : 'questions')
  const [current, setCurrent] = useState(0)
  const [picked, setPicked] = useState<Record<number, number>>({})
  const [result, setResult] = useState<HomeworkResult | null>(null)

  const questionsQ = useQuery({
    queryKey: ['homework-questions', assignment.id],
    queryFn: () => api.homework.questions(assignment.id),
    enabled: mode === 'take',
    staleTime: Infinity,
  })
  const reviewQ = useQuery({
    queryKey: ['homework-review', assignment.id],
    queryFn: () => api.homework.review(assignment.id),
    enabled: mode === 'review',
  })

  const questions = questionsQ.data ?? []

  const submit = useMutation({
    mutationFn: () => api.homework.submit(assignment.id, answers),
    onSuccess: (res) => {
      setResult(res)
      setStage('result')
      onSubmitted()
    },
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const answers = questions.map((_, i) => picked[i] ?? null)
  const shownResult = result ?? reviewQ.data ?? null
  const answered = answers.filter((a) => a !== null).length

  let content: ReactNode
  if ((mode === 'take' && questionsQ.isLoading) || (stage === 'review' && !shownResult && reviewQ.isLoading)) {
    content = <div className="hw-center"><p>Loading…</p></div>
  } else if (mode === 'take' && questionsQ.error) {
    content = <div className="hw-center"><p className="cls-error">{errorMessage(questionsQ.error)}</p></div>
  } else if (stage === 'review') {
    if (!shownResult) {
      content = <div className="hw-center"><p className="cls-error">{errorMessage(reviewQ.error, 'Could not load your answers.')}</p></div>
    } else {
      const total = shownResult.total_questions || 1
      content = (
        <>
          <div className="hw-result">
            <span className="big-emoji">📖</span>
            <div className="big-score">
              {shownResult.correct_answers} / {shownResult.total_questions}
            </div>
            <div className="big-label">
              {Math.round((shownResult.correct_answers / total) * 100)}% — Review your answers below
            </div>
          </div>
          <div style={{ marginTop: 16, borderTop: '1px solid var(--line)', paddingTop: 16 }}>
            {shownResult.review.map((r, i) => (
              <div key={r.id} className={`hw-review-item${r.correct ? ' ok' : ''}`}>
                <div className="q">
                  {i + 1}. {r.question}
                </div>
                <div className="a">
                  <span className="yours">
                    {r.correct ? '✅' : '❌'} Your answer: {r.selected !== null ? r.options[r.selected] : 'Not answered'}
                  </span>
                  {!r.correct && <span className="right">Correct: {r.options[r.correct_index]}</span>}
                </div>
              </div>
            ))}
          </div>
          <div className="hw-btns">
            <button className="pill" style={{ padding: '10px 28px' }} onClick={onClose}>
              Close
            </button>
          </div>
        </>
      )
    }
  } else if (stage === 'result' && result) {
    const pct = Math.round((result.correct_answers / (result.total_questions || 1)) * 100)
    const [emoji, message] = verdict(pct)
    content = (
      <div className="hw-result">
        <span className="big-emoji">{emoji}</span>
        <div className="big-score">
          {result.correct_answers} / {result.total_questions}
        </div>
        <div className="big-label">
          {pct}% — {message}
        </div>
        <div className="big-label" style={{ fontSize: 14, marginTop: 6 }}>
          ✦ +{result.score} XP earned
        </div>
        <div className="hw-btns" style={{ marginTop: 20 }}>
          <button className="review-answers-btn" onClick={() => setStage('review')}>
            📖 Review Answers
          </button>
          <button className="pill" style={{ padding: '10px 28px' }} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    )
  } else if (stage === 'confirm') {
    const total = questions.length
    content = (
      <div className="hw-center">
        <div style={{ fontSize: 50, marginBottom: 8 }}>📝</div>
        <h3>Review your answers</h3>
        <p>
          You&apos;ve answered <strong>{answered}</strong> out of <strong>{total}</strong> questions.
        </p>
        {answered < total && (
          <p style={{ color: '#e58667', fontSize: 13 }}>⚠️ You have unanswered questions. Please go back and answer them.</p>
        )}
        {submit.error && <p className="cls-error">{errorMessage(submit.error)}</p>}
        <div className="hw-btns">
          <button
            className="pill ghost"
            style={{ padding: '10px 24px' }}
            onClick={() => {
              setCurrent(total - 1)
              setStage('questions')
            }}
          >
            ⬅ Back
          </button>
          <button
            className="pill"
            style={{ padding: '10px 32px' }}
            disabled={answered < total || submit.isPending}
            onClick={() => submit.mutate()}
          >
            {submit.isPending ? 'Submitting…' : '✅ Submit Homework'}
          </button>
        </div>
      </div>
    )
  } else if (questions.length === 0) {
    content = <div className="hw-center"><p>This assignment has no questions.</p></div>
  } else {
    const q = questions[current]
    const selected = answers[current] ?? null
    content = (
      <>
        <div className="hw-progress">
          <span>
            Question {current + 1} / {questions.length}
          </span>
          <span style={{ fontSize: 12, color: '#8a7a7d' }}>
            {Math.round((answered / questions.length) * 100)}% complete
          </span>
        </div>
        <div className="hw-question">{q.question}</div>
        <div className="hw-options">
          {q.options.map((opt, idx) => (
            <button
              key={idx}
              disabled={selected !== null}
              className={selected === idx ? 'selected' : ''}
              onClick={() =>
                setPicked((prev) => (current in prev ? prev : { ...prev, [current]: idx }))
              }
            >
              {String.fromCharCode(65 + idx)}. {opt}
            </button>
          ))}
        </div>
        <div className="hw-nav">
          <button disabled={current === 0} onClick={() => setCurrent((c) => Math.max(0, c - 1))}>
            ⬅ Previous
          </button>
          <span style={{ fontSize: 12, color: '#8a7a7d', alignSelf: 'center' }}>
            {selected !== null ? '✅ Answered' : '⬜ Not answered'}
          </span>
          <button
            className="primary"
            onClick={() => (current === questions.length - 1 ? setStage('confirm') : setCurrent((c) => c + 1))}
          >
            {current === questions.length - 1 ? '📝 Review' : 'Next →'}
          </button>
        </div>
      </>
    )
  }

  return (
    <div
      className="mirava-classroom-homework-overlay open"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="hw-modal-box" role="dialog" aria-modal="true" aria-label={assignment.title}>
        <button className="hw-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <div className="eyebrow" style={{ marginBottom: 10 }}>
          {assignment.class_name ?? 'Homework'} · {assignment.title}
        </div>
        {content}
      </div>
    </div>
  )
}
