import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../auth/AuthProvider'
import { LeaderboardPanel } from '../../../components/leaderboard/LeaderboardPanel'
import { api, ApiError, type GameScoreOut } from '../../../lib/api'
import { createShivajiEngine, type ShivajiEngine, type ShivajiResult } from '../shivajiEngine'
import { useScrollLock } from '../util'

type SubmitState = { status: 'idle' } | { status: 'saving' } | { status: 'saved'; out: GameScoreOut } | { status: 'error'; message: string }

/** "The Maratha Guardian" mini-game modal. Scores go to the server for signed-in players. */
export function ShivajiGame({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, refreshMe } = useAuth()
  const queryClient = useQueryClient()
  const modalRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const killsRef = useRef<HTMLSpanElement>(null)
  const enemiesRef = useRef<HTMLSpanElement>(null)
  const timerRef = useRef<HTMLSpanElement>(null)
  const engineRef = useRef<ShivajiEngine | null>(null)
  const onEndRef = useRef<(r: ShivajiResult) => void>(() => {})
  const [result, setResult] = useState<ShivajiResult | null>(null)
  const [paused, setPaused] = useState(false)
  const [submit, setSubmit] = useState<SubmitState>({ status: 'idle' })
  const [boardKey, setBoardKey] = useState(0)
  useScrollLock(open)

  const handleEnd = (r: ShivajiResult) => {
    setResult(r)
    setPaused(false)
    if (!user) return
    setSubmit({ status: 'saving' })
    api.games
      .submit('shivaji', {
        score: r.kills,
        level: Math.floor(r.kills / 5) + 1,
        time_taken_seconds: r.time,
        completed: r.won,
      })
      .then((out) => {
        setSubmit({ status: 'saved', out })
        void refreshMe()
        void queryClient.invalidateQueries({ predicate: (q) => JSON.stringify(q.queryKey).includes('leaderboard') })
        setBoardKey((k) => k + 1)
      })
      .catch((err: unknown) =>
        setSubmit({ status: 'error', message: err instanceof ApiError ? err.message : 'Could not save your score.' }),
      )
  }

  useEffect(() => {
    onEndRef.current = handleEnd
  })

  useEffect(() => {
    const canvas = canvasRef.current
    const host = modalRef.current
    if (!canvas || !host) return
    const engine = createShivajiEngine(
      { canvas, kills: killsRef.current, enemies: enemiesRef.current, timer: timerRef.current, confettiHost: host },
      (r) => onEndRef.current(r),
    )
    engineRef.current = engine
    return () => {
      engine.destroy()
      engineRef.current = null
    }
  }, [])

  const restart = (delay: number) => {
    setResult(null)
    setPaused(false)
    setSubmit({ status: 'idle' })
    engineRef.current?.restart(delay)
  }

  // Fresh battle state each time the modal opens (adjusting state during render).
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setResult(null)
      setPaused(false)
      setSubmit({ status: 'idle' })
    }
  }

  useEffect(() => {
    if (open) engineRef.current?.restart(300)
    else engineRef.current?.stop()
  }, [open])

  const xp = submit.status === 'saved' ? submit.out : null

  return (
    <div
      className={`modal${open ? ' open' : ''}`}
      id="shivajiGameModal"
      ref={modalRef}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal-box" style={{ padding: '30px 36px', maxWidth: 960, background: '#1f1419', color: '#eadfd7' }}>
        <button
          type="button"
          className="close"
          id="shivajiGameClose"
          aria-label="Close"
          style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}
          onClick={onClose}
        >
          ×
        </button>
        <div className="eyebrow" style={{ color: '#f3b841' }}>
          ⚔️ The Maratha Guardian
        </div>
        <h2 style={{ font: "600 38px/1.05 'Playfair Display'", color: '#f3b841', letterSpacing: '-.04em', margin: '6px 0 4px' }}>
          Shivaji Maharaj
        </h2>
        <p style={{ color: '#d8c0c2', fontSize: 13, marginBottom: 12 }}>
          Defend the empire! Click enemies to strike them down. If an enemy touches Shivaji, the battle is lost.
        </p>
        <div className="game-container">
          <div className="game-canvas-wrap">
            <canvas id="gameCanvas" width={800} height={450} ref={canvasRef}></canvas>
            <div className={`game-overlay${result ? ' show' : ''}`} id="gameOverlay">
              <h2 id="gameResultTitle">{result?.won === false ? '💔 The empire falls…' : '⚔️ Victory!'}</h2>
              <p id="gameResultDesc">
                {!result
                  ? 'You defeated all enemies!'
                  : result.won
                    ? `You defeated all ${result.kills} enemies! The empire is safe.`
                    : `An enemy touched Shivaji! Kills: ${result.kills}. Fight again!`}
              </p>
              {result && (
                <div className="shivaji-score">
                  {submit.status === 'saving' && <span>Recording your battle…</span>}
                  {xp && (
                    <>
                      <span>
                        <b>+{xp.xp_earned} XP</b> earned · best {xp.best_score} kills · {xp.total_xp} XP total
                      </span>
                      {xp.new_badges.length > 0 && (
                        <span className="shivaji-badges">
                          {xp.new_badges.map((b) => (
                            <i key={b.badge_key} title={b.description ?? undefined}>
                              {b.icon ?? '🏅'} {b.name}
                            </i>
                          ))}
                        </span>
                      )}
                    </>
                  )}
                  {submit.status === 'error' && <span className="shivaji-score-error">{submit.message}</span>}
                  {!user && (
                    <span className="shivaji-guest">
                      <Link to="/login">Sign in</Link> to save your score.
                    </span>
                  )}
                </div>
              )}
              <button
                type="button"
                className="pill"
                id="gameRestartBtn"
                style={{ background: 'var(--gold)', color: 'var(--ink)', fontSize: 16, padding: '14px 40px' }}
                onClick={() => restart(100)}
              >
                ↺ Fight again
              </button>
            </div>
          </div>
          <div className="game-ui">
            <div className="stat">
              ⚔️ Kills{' '}
              <span className="kills" id="killCount" ref={killsRef}>
                0
              </span>
            </div>
            <div className="stat">
              👥 Enemies{' '}
              <span className="enemy-count" id="enemyCount" ref={enemiesRef}>
                0
              </span>
            </div>
            <div className="stat">
              ⏱{' '}
              <span id="gameTimer" ref={timerRef}>
                0
              </span>
              s
            </div>
            <div className="game-controls">
              <button type="button" id="gamePauseBtn" onClick={() => setPaused(engineRef.current?.togglePause() ?? false)}>
                {paused ? '▶️ Play' : '⏸ Pause'}
              </button>
              <button type="button" id="gameResetBtn" onClick={() => restart(100)}>
                ↺ Reset
              </button>
            </div>
          </div>
        </div>
        {result && (
          <div className="shivaji-boards">
            <LeaderboardPanel key={boardKey} boards={['shivaji', 'global', 'daily']} limit={10} theme="dark" />
          </div>
        )}
      </div>
    </div>
  )
}
