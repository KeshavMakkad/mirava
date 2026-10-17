/**
 * Quiz Arena (port of legacy/quiz.html). The arena's own content — four
 * regions of story missions, rivals, lightning/survival/review modes — is
 * kept client-side (data.js + the arena.js engine); progress is stored in
 * per-user server state and every finished run is submitted to the
 * `quiz-arena` game board, which grants Mirava XP.
 */
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { AccountMenu } from '../../components/AccountMenu'
import { LeaderboardPanel } from '../../components/leaderboard/LeaderboardPanel'
import { PageScope } from '../../components/PageScope'
import { useLegacyPage, type LegacyInit } from '../../lib/legacy'
import { initArena } from './arena.js'
import './arena.page.css'

const NAV = [
  ['hub', 'Home'],
  ['campaign', 'Campaign'],
  ['rivals', 'Rivals'],
  ['stats', 'Stats'],
  ['board', 'Leaderboard'],
] as const

function Arena() {
  const { me, isGuest, refreshMe } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Latest callbacks for the engine (init runs once, so read through a ref).
  const live = useRef({ refreshMe, queryClient })
  useEffect(() => {
    live.current = { refreshMe, queryClient }
  }, [refreshMe, queryClient])

  const [init] = useState(() => {
    const fn: LegacyInit = (root, ctx) =>
      initArena(root, ctx, {
        onScore: () => {
          void live.current.refreshMe()
          void live.current.queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
        },
      })
    return fn
  })
  const ref = useLegacyPage(init, { me, isGuest, navigate })

  return (
    <div ref={ref}>
      <canvas id="bg" />
      <header className="top">
        <Link className="brand" to="/explore" title="Back to the Mirava atlas">
          mira<i>va</i>
          <small>Quiz Arena</small>
        </Link>
        <nav className="nav" id="nav">
          {NAV.map(([go, label]) => (
            <button key={go} type="button" data-go={go}>
              {label}
            </button>
          ))}
        </nav>
        <div className="top-r">
          <div className="qa-me" id="topR" />
          <AccountMenu />
        </div>
      </header>
      <main>
        <section className="screen on" id="s-loading">
          <div className="qa-loading">
            <i />
            Loading your arena…
          </div>
        </section>
        <section className="screen" id="s-hub" />
        <section className="screen" id="s-campaign" />
        <section className="screen" id="s-region" />
        <section className="screen" id="s-brief" />
        <section className="screen" id="s-play" />
        <section className="screen" id="s-result" />
        <section className="screen" id="s-rivals" />
        <section className="screen" id="s-stats" />
        <section className="screen" id="s-board">
          <div className="wrap">
            <div className="sec" style={{ marginTop: 0 }}>
              <div>
                <div className="k">Leaderboard</div>
                <h2 style={{ fontSize: 36 }}>Hall of Scholars</h2>
                <p className="qa-board-note">
                  Mirava players ranked by their best Quiz Arena run, and across every Mirava game by total XP.
                  {isGuest && (
                    <>
                      {' '}
                      Guests aren't ranked —{' '}
                      <Link to="/signup" state={{ upgrade: true }}>
                        create an account
                      </Link>{' '}
                      to join the board.
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="qa-board-grid">
              <LeaderboardPanel boards={['quiz-arena', 'global']} theme="light" limit={50} />
              <div>
                <div className="k" style={{ marginBottom: 10 }}>
                  AI rivals · benchmarks to climb past
                </div>
                <div id="boardRivals" />
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer>
        Mirava Quiz Arena <Link to="/explore">Atlas</Link> · <Link to="/apps/lost-legends">Lost Legends</Link> ·{' '}
        <Link to="/profile">Profile</Link>
      </footer>
      <div id="toasts" aria-live="polite" />
    </div>
  )
}

export default function QuizArenaPage() {
  const { me } = useAuth()
  return (
    <PageScope name="quiz-arena" title="Quiz Arena · Mirava">
      {me ? (
        <Arena />
      ) : (
        <div className="mv-spinner-page" role="status">
          <div className="mv-spinner" />
          <span>Loading Quiz Arena…</span>
        </div>
      )}
    </PageScope>
  )
}
