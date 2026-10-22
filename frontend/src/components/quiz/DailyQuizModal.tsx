/**
 * Daily heritage quiz popup (port of the legacy #quizModal + daily-quiz.js).
 *
 * The flow is server-driven: the server picks today's ten questions, starts
 * each question's 15s clock when it is served, scores answers and only
 * reveals the correct option after an answer is submitted.
 */
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { useLanguage } from '../../i18n'
import {
  ApiError,
  api,
  type AnswerRecord,
  type DailyStatus,
  type QuizAttempt,
  type QuizQuestion,
  type QuizResult,
  type QuizSession,
} from '../../lib/api'
import { tr } from './tr'
import './daily-quiz.css'

export interface DailyQuizModalProps {
  open: boolean
  onClose: () => void
}

type Phase = 'loading' | 'start' | 'play' | 'result' | 'done' | 'error'

interface Play {
  sessionId: string
  total: number
  secondsPer: number
  index: number
  score: number
  answers: AnswerRecord[]
  question: QuizQuestion | null
}

const CONFETTI_GLYPHS = ['✦', '◆', '✧', '●', '✺']

interface ConfettiBurst {
  id: number
  pieces: { left: number; delay: number; size: number; glyph: string }[]
}

function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong. Please try again.'
}

function resultHeading(correct: number, total: number) {
  if (correct === total) return { emoji: '🏆', title: 'PERFECT EXPLORER!' }
  if (correct >= 8) return { emoji: '🌟', title: 'HERITAGE SCHOLAR!' }
  if (correct >= 5) return { emoji: '📚', title: 'SOLID EXPLORATION!' }
  return { emoji: '🌱', title: 'KEEP EXPLORING!' }
}

export function DailyQuizModal({ open, onClose }: DailyQuizModalProps) {
  // Mounting the dialog fresh on every open resets it to the start screen.
  if (!open) return null
  return <DailyQuizDialog onClose={onClose} />
}

function DailyQuizDialog({ onClose }: { onClose: () => void }) {
  const { me, refreshMe } = useAuth()
  const queryClient = useQueryClient()
  useLanguage()

  const [phase, setPhase] = useState<Phase>('loading')
  const [status, setStatus] = useState<DailyStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [play, setPlay] = useState<Play | null>(null)
  const [reveal, setReveal] = useState<AnswerRecord | null>(null)
  const [busy, setBusy] = useState(false)
  const [timeLeft, setTimeLeft] = useState(15)
  const [questionKey, setQuestionKey] = useState(0)
  const [result, setResult] = useState<QuizResult | null>(null)
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null)
  const [confetti, setConfetti] = useState<ConfettiBurst[]>([])
  // The free-tier API sleeps when idle; say so instead of spinning silently.
  const [slow, setSlow] = useState<0 | 1 | 2>(0)

  const deadline = useRef(0)
  const answering = useRef(false)
  const timers = useRef<number[]>([])
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    const pending = timers.current
    return () => {
      alive.current = false
      pending.forEach((t) => window.clearTimeout(t))
    }
  }, [])

  const burst = useCallback((big: boolean) => {
    const id = Date.now() + Math.random()
    const pieces = Array.from({ length: big ? 130 : 35 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      size: 8 + Math.random() * 18,
      glyph: CONFETTI_GLYPHS[i % CONFETTI_GLYPHS.length],
    }))
    setConfetti((c) => [...c, { id, pieces }])
    timers.current.push(window.setTimeout(() => setConfetti((c) => c.filter((b) => b.id !== id)), 3500))
  }, [])

  const invalidate = useCallback(() => {
    void refreshMe()
    void queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
    void queryClient.invalidateQueries({ queryKey: ['quiz', 'daily-status'] })
  }, [queryClient, refreshMe])

  const onStatus = useCallback((s: DailyStatus) => {
    if (!alive.current) return
    setStatus(s)
    if (s.attempt) {
      setAttempt(s.attempt)
      setPhase('done')
    } else {
      setPhase('start')
    }
  }, [])
  const onStatusError = useCallback((e: unknown) => {
    if (!alive.current) return
    setError(errMessage(e))
    setPhase('error')
  }, [])

  const loadStatus = useCallback(async () => {
    setPhase('loading')
    setError(null)
    await api.quiz.dailyStatus().then(onStatus, onStatusError)
  }, [onStatus, onStatusError])

  useEffect(() => {
    api.quiz.dailyStatus().then(onStatus, onStatusError)
  }, [onStatus, onStatusError])

  useEffect(() => {
    if (phase !== 'loading') return
    setSlow(0)
    const a = window.setTimeout(() => setSlow(1), 4000)
    const b = window.setTimeout(() => setSlow(2), 30000)
    return () => {
      window.clearTimeout(a)
      window.clearTimeout(b)
    }
  }, [phase])

  const applySession = useCallback((s: QuizSession) => {
    setPlay({
      sessionId: s.session_id,
      total: s.total,
      secondsPer: s.seconds_per_question,
      index: s.index,
      score: s.score,
      answers: s.answers,
      question: s.question,
    })
    setReveal(null)
    answering.current = false
    const left = s.time_left ?? s.seconds_per_question
    deadline.current = Date.now() + left * 1000
    setTimeLeft(Math.ceil(left))
    setQuestionKey((k) => k + 1)
  }, [])

  const finish = useCallback(
    async (sessionId: string) => {
      setBusy(true)
      try {
        const r = await api.quiz.finish(sessionId)
        if (!alive.current) return
        setResult(r)
        setPhase('result')
        if (r.correct_answers >= 8) burst(true)
        invalidate()
      } catch (e) {
        if (!alive.current) return
        if (e instanceof ApiError && e.status === 409) {
          // Already recorded (e.g. finished in another tab) — show today's attempt.
          setNotice(e.message)
          invalidate()
          await loadStatus()
        } else {
          setError(errMessage(e))
          setPhase('error')
        }
      } finally {
        if (alive.current) setBusy(false)
      }
    },
    [burst, invalidate, loadStatus],
  )

  /** Bring the UI back in line with the server after a 409. */
  const resync = useCallback(
    async (sessionId: string, message: string) => {
      setNotice(message)
      try {
        const s = await api.quiz.session(sessionId)
        if (!alive.current) return
        if (s.finished) {
          invalidate()
          await loadStatus()
        } else if (s.index >= s.total) {
          await finish(sessionId)
        } else if (s.question) {
          applySession(s)
        } else {
          applySession(await api.quiz.next(sessionId))
        }
      } catch (e) {
        if (!alive.current) return
        setError(errMessage(e))
        setPhase('error')
      }
    },
    [applySession, finish, invalidate, loadStatus],
  )

  const start = useCallback(async () => {
    setBusy(true)
    setNotice(null)
    try {
      const s = await api.quiz.startDaily()
      if (!alive.current) return
      if (s.finished) {
        await loadStatus()
        return
      }
      if (s.index >= s.total) {
        setPlay({
          sessionId: s.session_id, total: s.total, secondsPer: s.seconds_per_question,
          index: s.index, score: s.score, answers: s.answers, question: null,
        })
        await finish(s.session_id)
        return
      }
      applySession(s)
      setPhase('play')
    } catch (e) {
      if (!alive.current) return
      if (e instanceof ApiError && e.status === 409) {
        setNotice(e.message)
        await loadStatus()
      } else {
        setError(errMessage(e))
        setPhase('error')
      }
    } finally {
      if (alive.current) setBusy(false)
    }
  }, [applySession, finish, loadStatus])

  const submit = useCallback(
    async (selected: number | null) => {
      if (!play || answering.current || reveal) return
      answering.current = true
      setBusy(true)
      try {
        const rec = await api.quiz.answer(play.sessionId, play.index, selected)
        if (!alive.current) return
        setReveal(rec)
        setPlay((p) => (p ? { ...p, score: p.score + rec.points, answers: [...p.answers, rec] } : p))
        if (rec.correct) burst(false)
      } catch (e) {
        if (!alive.current) return
        answering.current = false
        if (e instanceof ApiError && e.status === 409) await resync(play.sessionId, e.message)
        else setNotice(errMessage(e))
      } finally {
        if (alive.current) setBusy(false)
      }
    },
    [burst, play, resync, reveal],
  )

  const next = useCallback(async () => {
    if (!play || !reveal) return
    if (play.index + 1 >= play.total) {
      await finish(play.sessionId)
      return
    }
    setBusy(true)
    try {
      const s = await api.quiz.next(play.sessionId)
      if (!alive.current) return
      if (s.index >= s.total || !s.question) await finish(play.sessionId)
      else applySession(s)
    } catch (e) {
      if (!alive.current) return
      if (e instanceof ApiError && e.status === 409) await resync(play.sessionId, e.message)
      else setNotice(errMessage(e))
    } finally {
      if (alive.current) setBusy(false)
    }
  }, [applySession, finish, play, resync, reveal])

  // Question countdown (driven by the server-provided deadline).
  const submitRef = useRef(submit)
  useEffect(() => {
    submitRef.current = submit
  }, [submit])
  useEffect(() => {
    if (phase !== 'play' || reveal || !play?.question) return
    const tick = () => {
      const left = Math.max(0, (deadline.current - Date.now()) / 1000)
      setTimeLeft(Math.ceil(left))
      if (left <= 0) {
        window.clearInterval(id)
        void submitRef.current(null)
      }
    }
    const id = window.setInterval(tick, 250)
    tick()
    return () => window.clearInterval(id)
  }, [phase, reveal, play?.question, questionKey])

  // Escape closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const total = status?.total ?? play?.total ?? 10
  const secs = status?.seconds_per_question ?? 15

  const optionClass = (i: number) => {
    let c = 'dq-option dq-option-enter'
    if (!reveal) return c
    if (i === reveal.correct_index) c += ' correct'
    else if (i === reveal.selected) c += ' wrong'
    return c
  }

  const dots = play
    ? Array.from({ length: play.total }, (_, i) => {
        const a = play.answers.find((x) => x.index === i)
        let c = 'dq-dot'
        if (a) c += a.correct ? ' done' : a.selected === null ? ' timedout' : ' wrong'
        else if (i === play.index) c += ' active'
        return (
          <span key={i} className={c}>
            {i + 1}
          </span>
        )
      })
    : null

  return (
    <div
      className="dq-root dq-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dqTitle"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="dq-box">
        <button type="button" className="dq-close" aria-label="Close" onClick={onClose}>
          ×
        </button>

        {notice && <div className="dq-notice">{notice}</div>}

        {phase === 'loading' && (
          <div className="dq-loading">
            <div className="dq-spinner" />
            {tr("Loading today's challenge…", 'आज की चुनौती लोड हो रही है…')}
            {slow >= 1 && (
              <small className="dq-slow">
                {tr('Waking up the Mirava server — this can take up to a minute the first time.', 'मिरावा सर्वर शुरू हो रहा है — पहली बार में एक मिनट तक लग सकता है।')}
              </small>
            )}
            {slow === 2 && (
              <button type="button" className="dq-start" onClick={() => void loadStatus()}>
                {tr('Try again', 'फिर कोशिश करें')}
              </button>
            )}
          </div>
        )}

        {phase === 'error' && (
          <div className="dq-center">
            <div className="dq-result-emoji">⚠️</div>
            <h3 className="dq-result-title">{tr("Couldn't load the quiz", 'प्रश्नोत्तरी लोड नहीं हो सकी')}</h3>
            <p className="dq-desc">{error}</p>
            <div className="dq-actions dq-actions-center">
              <button type="button" className="dq-pill dq-pill-gold" onClick={() => void loadStatus()}>
                Try again
              </button>
              <button type="button" className="dq-pill dq-pill-ghost" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        )}

        {phase === 'start' && (
          <div>
            <div className="dq-eyebrow">✦ knowledge challenge</div>
            <h2 id="dqTitle" className="dq-h2">
              Heritage quiz
            </h2>
            <p className="dq-sub">
              {tr('Ten questions on India’s heritage — the same set for everyone, new every midnight.', 'भारत की विरासत पर दस प्रश्न — सबके लिए एक जैसे, हर आधी रात नए।')}
            </p>
            <div className="dq-banner">
              <div>
                <strong>🌅 TODAY'S HERITAGE CHALLENGE</strong>
                <small>{`1,000-question bank · ${total} fresh questions every day · new set at midnight.`}</small>
              </div>
              <div>
                <span className="dq-chip">{`🎯 ${total} QUESTIONS`}</span>
                <span className="dq-chip">{`⚡ ${secs}s EACH`}</span>
                <span className="dq-chip">🏅 BADGES</span>
              </div>
            </div>
            <div className="dq-rules">
              <span>
                <b>✦</b> {tr('Speed & streak bonus', 'गति और लगातार सही उत्तर का बोनस')}
              </span>
              <span>
                <b>🔥</b> Daily streak
              </span>
            </div>
            <button type="button" className="dq-start" disabled={busy} onClick={() => void start()}>
              {status?.in_progress_session ? tr('Resume quiz →', 'प्रश्नोत्तरी जारी रखें →') : 'Start quiz →'}
            </button>
            {status?.in_progress_session && (
              <p className="dq-hint">
                {tr(
                  'You have a quiz in progress — the clock kept running while you were away.',
                  'आपकी प्रश्नोत्तरी अधूरी है — आपके दूर रहने पर भी घड़ी चलती रही।',
                )}
              </p>
            )}
          </div>
        )}

        {phase === 'play' && play && (
          <div>
            <div className="dq-play-top">
              <span
                className={`dq-timer${!reveal && timeLeft <= 5 ? ' warning' : ''}${reveal ? (reveal.correct ? ' is-right' : ' is-wrong') : ''}`}
                id="quizTimer"
              >
                {reveal
                  ? reveal.correct
                    ? `✓ +${reveal.points} ${tr('pts', 'अंक')}`
                    : reveal.selected === null
                      ? `⌛ ${tr("Time's up", 'समय समाप्त')}`
                      : `✗ ${tr('Wrong', 'गलत')}`
                  : `⏱ ${timeLeft}s`}
              </span>
              <span className="dq-counter">
                {tr('Question', 'प्रश्न')} <b>{Math.min(play.index + 1, play.total)}</b> / {play.total}
              </span>
            </div>
            <div className="dq-dots">{dots}</div>
            {play.question && (
              <>
                <div className="dq-topic">{`${play.question.topic} · ${play.question.difficulty}`}</div>
                <h3 key={questionKey} className="dq-question dq-question-enter">
                  {play.question.question}
                </h3>
                <div className="dq-options" key={`o${questionKey}`}>
                  {play.question.options.map((opt, i) => (
                    <button
                      key={i}
                      type="button"
                      className={optionClass(i)}
                      style={{ animationDelay: `${i * 60}ms` }}
                      disabled={!!reveal || busy}
                      onClick={() => void submit(i)}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </>
            )}
            {reveal && (
              <div className={`dq-feedback ${reveal.correct ? 'ok' : 'no'}`}>
                {reveal.correct
                  ? `Correct! +${reveal.points} pts`
                  : reveal.selected === null
                    ? "Time's up!"
                    : 'Not quite.'}
              </div>
            )}
            <div className="dq-actions">
              <button
                type="button"
                className="dq-pill dq-pill-night"
                disabled={!reveal || busy}
                onClick={() => void next()}
              >
                {play.index + 1 >= play.total ? 'Finish →' : 'Next →'}
              </button>
              <span className="dq-live">{`✦ ${play.score} pts`}</span>
            </div>
          </div>
        )}

        {phase === 'result' && result && (
          <ResultView
            correct={result.correct_answers}
            total={result.total_questions}
            score={result.score}
            streak={result.streak ?? me?.profile.daily_streak ?? 0}
            seconds={result.time_taken_seconds}
            best={result.best_score}
            xp={result.xp_earned}
            badges={result.new_badges}
            heading="TODAY'S CHALLENGE COMPLETE"
            onClose={onClose}
          />
        )}

        {phase === 'done' && attempt && (
          <ResultView
            correct={attempt.correct_answers}
            total={attempt.total_questions}
            score={attempt.score}
            streak={attempt.streak}
            seconds={attempt.time_taken_seconds}
            best={me?.profile.best_quiz_score ?? attempt.score}
            heading={tr("YOU'VE COMPLETED TODAY'S QUIZ", 'आपने आज की प्रश्नोत्तरी पूरी कर ली है')}
            footer={
              <p className="dq-tomorrow">
                {tr('🌅 Come back tomorrow for a fresh set of {count} questions.', '🌅 कल {count} नए प्रश्नों के लिए फिर आएँ।', {
                  count: attempt.total_questions,
                })}
              </p>
            }
            onClose={onClose}
          />
        )}
      </div>

      {confetti.map((b) => (
        <div key={b.id} className="dq-confetti" aria-hidden>
          {b.pieces.map((p, i) => (
            <span
              key={i}
              style={{ left: `${p.left}%`, animationDelay: `${p.delay}s`, fontSize: `${p.size}px` }}
            >
              {p.glyph}
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}

interface ResultViewProps {
  correct: number
  total: number
  score: number
  streak: number
  seconds: number | null
  best: number
  xp?: number
  badges?: QuizResult['new_badges']
  heading: string
  footer?: ReactNode
  onClose: () => void
}

function ResultView({ correct, total, score, streak, seconds, best, xp, badges, heading, footer, onClose }: ResultViewProps) {
  useLanguage()
  const { emoji, title } = resultHeading(correct, total)
  const metaLine = [seconds != null ? `⚡ ${seconds}s` : null, `Best score: ${best}`, xp != null ? `+${xp} XP` : null]
    .filter(Boolean)
    .join(' · ')
  return (
    <div className="dq-center">
      <div className="dq-result-emoji">{emoji}</div>
      <h3 className="dq-result-title" id="dqTitle">
        {title}
      </h3>
      <div className="dq-result-card">
        <strong className="dq-result-head">{heading}</strong>
        <div className="dq-result-stats">
          <div className="dq-result-stat">
            <b>{`${correct}/${total}`}</b>
            <span>CORRECT</span>
          </div>
          <div className="dq-result-stat">
            <b>{score}</b>
            <span>POINTS</span>
          </div>
          <div className="dq-result-stat">
            <b>{`🔥 ${streak}`}</b>
            <span>DAY STREAK</span>
          </div>
        </div>
        <div className="dq-result-meta">
          {metaLine}
        </div>
        {badges && badges.length > 0 ? (
          <div className="dq-result-badges">
            <strong>NEW BADGES</strong>
            <div className="dq-badge-row">
              {badges.map((b, i) => (
                <span key={b.badge_key} className="dq-badge" style={{ animationDelay: `${i * 90}ms` }} title={b.description ?? ''}>
                  {`${b.icon ?? '🏅'} ${b.name}`}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="dq-result-keep">Keep your streak alive tomorrow for a fresh challenge.</div>
        )}
      </div>
      {footer}
      <div className="dq-actions dq-actions-center">
        <Link className="dq-pill dq-pill-gold" to="/quiz" onClick={onClose}>
          {tr('Practice in Quiz Arena', 'प्रश्नोत्तरी मंच में अभ्यास करें')}
        </Link>
        <button type="button" className="dq-pill dq-pill-ghost" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}
