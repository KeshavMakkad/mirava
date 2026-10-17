import { useQueryClient } from '@tanstack/react-query'
import { useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { buildExport, errMsg, parseNewsImport, parseQuestionImport, type Toast } from './shared'

interface Report {
  news: number
  newsFailed: number
  quiz: number
  quizFailed: number
  errors: string[]
}

export function BackupPanel({ toast, onExport }: { toast: Toast; onExport: () => void }) {
  const qc = useQueryClient()
  const [json, setJson] = useState('')
  const [busy, setBusy] = useState<null | 'import' | 'reset' | 'copy'>(null)
  const [report, setReport] = useState<Report | null>(null)

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['admin'] })
    void qc.invalidateQueries({ queryKey: ['news'] })
  }

  async function copyJson() {
    setBusy('copy')
    try {
      const data = await buildExport()
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2))
      toast('Content JSON copied')
    } catch (e) {
      toast(e instanceof DOMException ? 'Clipboard unavailable — use Export content' : errMsg(e))
    }
    setBusy(null)
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      setJson(await file.text())
    } catch {
      toast('Could not read that file')
    }
  }

  async function importJson() {
    let data: { news?: unknown; quiz?: unknown }
    try {
      data = JSON.parse(json)
      if (!data || typeof data !== 'object' || (!Array.isArray(data.news) && !Array.isArray(data.quiz))) throw new Error()
    } catch {
      return toast('Invalid MIRAVA content JSON')
    }
    const news = Array.isArray(data.news) ? data.news : []
    const quiz = Array.isArray(data.quiz) ? data.quiz : []
    if (!news.length && !quiz.length) return toast('Nothing to import')
    if (!window.confirm(`Import ${news.length} news stories and ${quiz.length} quiz questions as new items?`)) return

    setBusy('import')
    const r: Report = { news: 0, newsFailed: 0, quiz: 0, quizFailed: 0, errors: [] }
    // Oldest first so the newest story ends up on top.
    for (const raw of [...news].reverse()) {
      try {
        await api.admin.createNews(parseNewsImport(raw as Record<string, unknown>))
        r.news++
      } catch (e) {
        r.newsFailed++
        r.errors.push(`News “${String((raw as { title?: unknown })?.title ?? '?')}”: ${errMsg(e)}`)
      }
    }
    for (const raw of [...quiz].reverse()) {
      try {
        await api.admin.createQuestion(parseQuestionImport(raw as Record<string, unknown>))
        r.quiz++
      } catch (e) {
        r.quizFailed++
        r.errors.push(`Question “${String((raw as { question?: unknown })?.question ?? '?').slice(0, 60)}”: ${errMsg(e)}`)
      }
    }
    setReport(r)
    setBusy(null)
    refresh()
    if (!r.newsFailed && !r.quizFailed) setJson('')
    toast(`Imported ${r.news} stories and ${r.quiz} questions${r.newsFailed + r.quizFailed ? ' (some failed)' : ''}`)
  }

  async function resetNews() {
    if (!window.confirm('Delete ALL heritage news stories (published and drafts)? Quiz questions are not affected. This cannot be undone.'))
      return
    setBusy('reset')
    try {
      const items = await api.admin.news()
      for (const n of items) await api.admin.deleteNews(n.id)
      toast(`Deleted ${items.length} news ${items.length === 1 ? 'story' : 'stories'}`)
    } catch (e) {
      toast(errMsg(e))
    }
    refresh()
    setBusy(null)
  }

  return (
    <section className="panel active">
      <div className="grid">
        <div className="card">
          <h2>Publishing tools</h2>
          <p className="hint">Open Explore after publishing to verify exactly what visitors will see.</p>
          <div className="actions">
            <Link className="btn gold" style={{ textDecoration: 'none' }} to="/explore#news">
              Open Explore newsroom ↗
            </Link>
            <button className="btn" type="button" onClick={onExport}>
              Download content JSON
            </button>
            <button className="btn" type="button" onClick={copyJson} disabled={!!busy}>
              {busy === 'copy' ? 'Copying…' : 'Copy content JSON'}
            </button>
          </div>
          <div className="field">
            <label htmlFor="importJson">Import content JSON</label>
            <textarea
              id="importJson"
              placeholder='{"news":[],"quiz":[]}'
              value={json}
              onChange={(e) => setJson(e.target.value)}
            />
            <input type="file" accept="application/json,.json" onChange={onFile} aria-label="Load JSON file" />
          </div>
          <p className="hint">
            Imported items are created as new stories and admin questions (existing content is kept). Exports from the
            old browser-only console are accepted too.
          </p>
          <button className="btn" type="button" onClick={importJson} disabled={!!busy || !json.trim()}>
            {busy === 'import' ? 'Importing…' : 'Import JSON'}
          </button>
          {report && (
            <div className="import-report">
              Imported <b>{report.news}</b> news {report.news === 1 ? 'story' : 'stories'}
              {report.newsFailed ? ` (${report.newsFailed} failed)` : ''} and <b>{report.quiz}</b> quiz{' '}
              {report.quiz === 1 ? 'question' : 'questions'}
              {report.quizFailed ? ` (${report.quizFailed} failed)` : ''}.
              {report.errors.slice(0, 5).map((e, i) => (
                <div className="err" key={i}>
                  {e}
                </div>
              ))}
              {report.errors.length > 5 && <div className="err">…and {report.errors.length - 5} more</div>}
            </div>
          )}
        </div>
        <div className="card danger">
          <h2>Reset heritage news</h2>
          <p className="hint">
            This deletes every heritage news story in the CMS. It does not touch quiz questions — deactivate those
            individually in the Quiz Manager — nor the built-in MIRAVA question bank.
          </p>
          <button className="btn red" type="button" onClick={resetNews} disabled={!!busy}>
            {busy === 'reset' ? 'Deleting…' : 'Delete all news stories'}
          </button>
        </div>
      </div>
    </section>
  )
}
