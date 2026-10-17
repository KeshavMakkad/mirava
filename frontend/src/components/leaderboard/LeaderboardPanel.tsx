/**
 * Tabbed leaderboards (port of legacy leaderboard.js render* functions).
 * Data comes from the API; guests are never ranked server-side.
 */
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { api, type GameKey, type Leaderboard, type LeaderboardEntry } from '../../lib/api'
import './leaderboard.css'

export type BoardKind = 'global' | 'daily' | GameKey

export interface LeaderboardPanelProps {
  /** Tabs to show, in order. Defaults to ['global', 'daily']. */
  boards?: BoardKind[]
  limit?: number
  /** 'light' for cream pages, 'dark' for night-themed pages. */
  theme?: 'light' | 'dark'
  className?: string
}

interface Column {
  label: string
  value: (e: LeaderboardEntry) => string | number
  tone?: 'gold' | 'green' | 'red' | 'muted'
}

interface BoardMeta {
  tab: string
  title: string
  icon: string
  scoreLabel: string
  columns: Column[]
  empty: [string, string, string]
}

const num = (v: number | null | undefined) => (v == null ? 0 : v)
const secs = (v: number | null | undefined) => (v == null ? '—' : `${v}s`)

const GAME_NAMES: Record<GameKey, [string, string]> = {
  shivaji: ['Shivaji Challenge', '⚔️'],
  'lost-legends': ['Lost Legends', '🪔'],
  'vedic-heist': ['Ancient Heist', '🗝️'],
  'vedic-sprint': ['Vedic Sprint', '🧮'],
  'spot-difference': ['Spot the Difference', '🔍'],
  'rasoi-rescue': ['Rasoi Rescue', '🍲'],
  'jal-parampara': ['JalParampara', '💧'],
  'quiz-arena': ['Quiz Arena', '🧠'],
}

function metaFor(board: BoardKind): BoardMeta {
  if (board === 'global') {
    return {
      tab: 'Global XP',
      title: 'Global Heritage Leaderboard',
      icon: '🏆',
      scoreLabel: 'XP',
      columns: [
        { label: 'Best', value: (e) => num(e.detail.best_quiz_score), tone: 'muted' },
        { label: '🔥', value: (e) => num(e.detail.daily_streak), tone: 'red' },
      ],
      empty: ['🌱', 'No players on the leaderboard yet.', 'Be the first to complete a daily quiz!'],
    }
  }
  if (board === 'daily') {
    return {
      tab: 'Today',
      title: "Today's Heritage Challenge",
      icon: '🌅',
      scoreLabel: 'Score',
      columns: [
        { label: '✓', value: (e) => num(e.detail.correct_answers), tone: 'green' },
        { label: 'Time', value: (e) => secs(e.detail.time_taken_seconds), tone: 'muted' },
      ],
      empty: ['🌅', "No one has completed today's challenge yet.", 'Be the first!'],
    }
  }
  const [name, icon] = GAME_NAMES[board] ?? [board, '🎮']
  return {
    tab: name,
    title: name,
    icon,
    scoreLabel: 'Score',
    columns: [
      { label: 'Lvl', value: (e) => num(e.detail.level) || 1, tone: 'green' },
      { label: 'Time', value: (e) => secs(e.detail.time_taken_seconds), tone: 'muted' },
    ],
    empty: [icon, `No ${name} scores yet.`, `Play ${name} to appear on this leaderboard!`],
  }
}

function fetchBoard(board: BoardKind, limit: number): Promise<Leaderboard> {
  if (board === 'global') return api.leaderboard.global(limit)
  if (board === 'daily') return api.leaderboard.daily(limit)
  return api.leaderboard.game(board, limit)
}

const MEDALS = ['🥇', '🥈', '🥉']

function Row({ e, meta }: { e: LeaderboardEntry; meta: BoardMeta }) {
  const name = e.display_name || e.username || 'Anonymous'
  return (
    <div className={`lb-row${e.is_me ? ' lb-me' : ''}`}>
      <span className={`lb-rank${e.rank <= 3 ? ' lb-top' : ''}`}>{e.rank <= 3 ? MEDALS[e.rank - 1] : `#${e.rank}`}</span>
      <span className="lb-name" title={`@${e.username}`}>
        {name}
        {e.is_me && ' ✦'}
      </span>
      <span className="lb-num lb-gold lb-strong">{e.score}</span>
      {meta.columns.map((c) => (
        <span key={c.label} className={`lb-num lb-${c.tone ?? 'muted'}`}>
          {c.value(e)}
        </span>
      ))}
    </div>
  )
}

function Board({ board, limit }: { board: BoardKind; limit: number }) {
  const meta = metaFor(board)
  const q = useQuery({
    queryKey: ['leaderboard', board, limit],
    queryFn: () => fetchBoard(board, limit),
    staleTime: 30_000,
  })

  if (q.isPending) return <div className="lb-state">Loading leaderboard…</div>
  if (q.isError)
    return (
      <div className="lb-state lb-error">
        Could not load leaderboard.{' '}
        <button type="button" className="lb-retry" onClick={() => void q.refetch()}>
          Retry
        </button>
      </div>
    )

  const data = q.data
  const { entries, me } = data
  const showMe = me && !entries.some((e) => e.is_me)

  return (
    <div className="lb-card">
      <div className="lb-head">
        <h3 className="lb-title">
          {meta.icon} {meta.title}
        </h3>
        <span className="lb-sub">
          {board === 'daily' && data.date
            ? new Date(`${data.date}T12:00:00`).toLocaleDateString()
            : entries.length
              ? `Top ${entries.length} players`
              : ''}
        </span>
      </div>
      {entries.length === 0 ? (
        <div className="lb-empty">
          <p className="lb-empty-icon">{meta.empty[0]}</p>
          <p>{meta.empty[1]}</p>
          <p className="lb-small">{meta.empty[2]}</p>
        </div>
      ) : (
        <div className="lb-table" role="table">
          <div className="lb-row lb-header" role="row">
            <span>#</span>
            <span>Player</span>
            <span className="lb-num">{meta.scoreLabel}</span>
            {meta.columns.map((c) => (
              <span key={c.label} className="lb-num">
                {c.label}
              </span>
            ))}
          </div>
          {entries.map((e) => (
            <Row key={e.player_id} e={e} meta={meta} />
          ))}
          {showMe && (
            <>
              <div className="lb-gap">Your rank</div>
              <Row e={me} meta={meta} />
            </>
          )}
        </div>
      )}
    </div>
  )
}

export function LeaderboardPanel({ boards = ['global', 'daily'], limit = 50, theme = 'dark', className }: LeaderboardPanelProps) {
  const [active, setActive] = useState<BoardKind>(boards[0] ?? 'global')
  const current = boards.includes(active) ? active : (boards[0] ?? 'global')

  return (
    <div className={['lb-root', theme === 'light' ? 'lb-light' : 'lb-dark', className].filter(Boolean).join(' ')}>
      {boards.length > 1 && (
        <div className="lb-tabs" role="tablist">
          {boards.map((b) => {
            const m = metaFor(b)
            return (
              <button
                key={b}
                type="button"
                role="tab"
                aria-selected={b === current}
                className={`lb-tab${b === current ? ' lb-on' : ''}`}
                onClick={() => setActive(b)}
              >
                {m.icon} {m.tab}
              </button>
            )
          })}
        </div>
      )}
      <Board key={current} board={current} limit={limit} />
    </div>
  )
}
