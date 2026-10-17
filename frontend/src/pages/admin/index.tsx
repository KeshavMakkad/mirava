import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { AccountMenu } from '../../components/AccountMenu'
import { PageScope } from '../../components/PageScope'
import { api } from '../../lib/api'
import { BackupPanel } from './BackupPanel'
import { NewsPanel } from './NewsPanel'
import { QuizPanel } from './QuizPanel'
import { UsersPanel } from './UsersPanel'
import { buildExport, downloadJson, errMsg, fmtDate } from './shared'
import './admin.page.css'

type Tab = 'news' | 'quiz' | 'users' | 'settings'

const TABS: [Tab, string][] = [
  ['news', 'Heritage News'],
  ['quiz', 'Quiz Manager'],
  ['users', 'Users'],
  ['settings', 'Publishing / Backup'],
]

const METRICS: [key: string, label: string][] = [
  ['news_published', 'PUBLISHED NEWS STORIES'],
  ['questions_admin', 'ADMIN QUIZ QUESTIONS'],
  ['last_news_at', 'LAST PUBLISHED'],
  ['users', 'REGISTERED USERS'],
  ['teachers', 'TEACHERS'],
  ['guests', 'GUEST SESSIONS'],
  ['questions_active', 'ACTIVE QUESTIONS IN BANK'],
  ['quiz_attempts', 'DAILY QUIZ ATTEMPTS'],
  ['game_scores', 'GAME SCORES SUBMITTED'],
]

function useToast() {
  const [msg, setMsg] = useState('')
  const [show, setShow] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const toast = useCallback((m: string) => {
    setMsg(m)
    setShow(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setShow(false), 2600)
  }, [])
  return { msg, show, toast }
}

export default function AdminPage() {
  const { me, user } = useAuth()
  const [tab, setTab] = useState<Tab>('news')
  const { msg, show, toast } = useToast()
  const [exporting, setExporting] = useState(false)

  const stats = useQuery({ queryKey: ['admin', 'stats'], queryFn: api.admin.stats, refetchInterval: 60_000 })

  const exportContent = async () => {
    setExporting(true)
    try {
      downloadJson(await buildExport(), 'mirava-admin-content.json')
      toast('Content exported')
    } catch (e) {
      toast(errMsg(e))
    }
    setExporting(false)
  }

  const metric = (key: string) => {
    const v = stats.data?.[key]
    if (key === 'last_news_at') return fmtDate(v as string | null)
    return typeof v === 'number' ? v.toLocaleString('en-IN') : '—'
  }

  return (
    <PageScope name="admin" title="MIRAVA — Administrator Console">
      <header className="top">
        <div className="brand">
          mira<i>va</i> / admin
        </div>
        <div className="top-actions">
          <Link to="/explore">View Explore ↗</Link>
          <button type="button" onClick={exportContent} disabled={exporting}>
            {exporting ? 'Exporting…' : 'Export content'}
          </button>
          <AccountMenu />
        </div>
      </header>

      <main className="shell">
        <section className="hero">
          <div>
            <div className="eyebrow">Restricted publishing console</div>
            <h1>
              Shape what MIRAVA
              <br />
              <em>shows next.</em>
            </h1>
            <p>
              Publish heritage news and curated quiz questions, and manage who can teach or administer. Changes are
              saved to the MIRAVA database and are immediately available to every visitor on <b>Explore</b>.
            </p>
          </div>
          <div className="status-card">
            <small>Current session</small>
            <b>{me?.profile.display_name || me?.profile.username || 'Administrator'}</b>
            <small>{user?.email ?? ''} · Administrator</small>
          </div>
        </section>

        <div className="notice">
          <b>Note:</b> admin access is granted by role. Anyone you promote to <code>admin</code> in the Users tab sees
          this console in their account menu after signing in normally. Deleting a quiz question only deactivates it, so
          past quizzes and homework stay intact.
        </div>

        {stats.isError && <div className="notice">Could not load metrics: {errMsg(stats.error)}</div>}
        <div className="metric-grid">
          {METRICS.map(([key, label]) => (
            <div className="metric" key={key}>
              <b className={stats.isLoading ? 'loading' : undefined}>{stats.isLoading ? '…' : metric(key)}</b>
              <small>{label}</small>
            </div>
          ))}
        </div>

        <div className="tabs" role="tablist">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={`tab${tab === id ? ' active' : ''}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'news' && <NewsPanel toast={toast} />}
        {tab === 'quiz' && <QuizPanel toast={toast} />}
        {tab === 'users' && <UsersPanel toast={toast} />}
        {tab === 'settings' && <BackupPanel toast={toast} onExport={exportContent} />}

        <p className="footer-note">MIRAVA Administrator Console · Content stored in the MIRAVA database</p>
      </main>

      <div className={`toast${show ? ' show' : ''}`} role="status" aria-live="polite">
        {msg}
      </div>
    </PageScope>
  )
}
