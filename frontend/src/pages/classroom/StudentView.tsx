import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import { api, type Assignment } from '../../lib/api'
import { HomeworkOverlay } from './HomeworkOverlay'
import { errorMessage, timeRemaining, useNow } from './util'

/** Join a classroom with the 6-character code the teacher shared. */
export function JoinForm({ onJoined }: { onJoined?: (name: string) => void }) {
  const qc = useQueryClient()
  const { refreshMe } = useAuth()
  const [code, setCode] = useState('')
  const join = useMutation({
    mutationFn: (c: string) => api.classrooms.join(c),
    onSuccess: async (c) => {
      setCode('')
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['classrooms'] }),
        qc.invalidateQueries({ queryKey: ['homework'] }),
        refreshMe(), // joining turns a tourist into a student server-side
      ])
      onJoined?.(c.class_name)
    },
  })
  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const c = code.trim().toUpperCase()
    if (c.length < 4) return
    join.mutate(c)
  }
  return (
    <div>
      <form className="cls-form" onSubmit={onSubmit}>
        <input
          className="code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="CLASS CODE"
          maxLength={12}
          aria-label="Classroom code"
        />
        <button className="pill" style={{ padding: '10px 24px' }} disabled={join.isPending || code.trim().length < 4}>
          {join.isPending ? 'Joining…' : '🎒 Join classroom'}
        </button>
      </form>
      {join.error && <div className="cls-error">{errorMessage(join.error)}</div>}
      {join.data && !join.isPending && <div className="cls-ok">You joined “{join.data.class_name}”.</div>}
    </div>
  )
}

function statusText(a: Assignment) {
  if (a.status === 'completed') return '✅ Submitted'
  if (a.status === 'expired') return '⏰ Expired'
  return '🟢 Active'
}

export function StudentView({ toast }: { toast: (m: string) => void }) {
  const { me } = useAuth()
  const qc = useQueryClient()
  const now = useNow(1000)
  const [open, setOpen] = useState<{ a: Assignment; mode: 'take' | 'review' } | null>(null)

  const classrooms = useQuery({ queryKey: ['classrooms'], queryFn: api.classrooms.list })
  const homework = useQuery({ queryKey: ['homework'], queryFn: api.homework.list, refetchInterval: 60_000 })
  const leave = useMutation({
    mutationFn: (id: string) => api.classrooms.leave(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classrooms'] })
      qc.invalidateQueries({ queryKey: ['homework'] })
      toast('You left the classroom.')
    },
    onError: (e) => toast(errorMessage(e)),
  })

  const joined = (classrooms.data ?? []).filter((c) => c.teacher_id !== me?.profile.id)
  const order = { assigned: 0, expired: 1, completed: 2 } as const
  const list = [...(homework.data ?? [])].sort(
    (a, b) => order[a.status] - order[b.status] || +new Date(a.created_at) - +new Date(b.created_at),
  )

  return (
    <div className="mirava-classroom-grid">
      <div className="mirava-classroom-student">
        <h3>📚 My Homework</h3>
        <p style={{ color: '#624950', fontSize: 13, marginBottom: 12 }}>Complete your assignments before they expire.</p>
        {homework.isLoading ? (
          <div className="no-homework">Loading…</div>
        ) : homework.error ? (
          <div className="no-homework">{errorMessage(homework.error)}</div>
        ) : list.length === 0 ? (
          <div className="no-homework">📭 No homework assigned yet.</div>
        ) : (
          list.map((a) => {
            const active = a.status === 'assigned'
            return (
              <div className="hw-card" key={a.id}>
                {a.class_name && <div className="hw-class">{a.class_name}</div>}
                <div className="hw-header">
                  <h4>📚 {a.title}</h4>
                  <span style={{ fontSize: 11, color: '#624950' }}>{statusText(a)}</span>
                </div>
                {a.description && <div className="hw-desc">{a.description}</div>}
                <div className="hw-meta">
                  <strong>Questions:</strong> {a.question_count} &nbsp;·&nbsp; <strong>Points:</strong> {a.max_points}
                  {a.student_id && <> &nbsp;·&nbsp; <strong>Just for you</strong></>}
                </div>
                {active && a.due_at && <div className="hw-timer">⏳ {timeRemaining(a.due_at, now)}</div>}
                {a.my_result && (
                  <div className="hw-score">
                    ⭐ Score: {a.my_result.correct_answers}/{a.my_result.total_questions}{' '}
                    <span style={{ fontSize: 13, color: '#624950', fontWeight: 600 }}>(+{a.my_result.score} XP)</span>
                  </div>
                )}
                <div className="hw-actions">
                  {active && (
                    <button className="pill" style={{ padding: '8px 24px' }} onClick={() => setOpen({ a, mode: 'take' })}>
                      📝 Start Homework
                    </button>
                  )}
                  {a.status === 'completed' && (
                    <button className="pill orange" style={{ padding: '8px 24px' }} onClick={() => setOpen({ a, mode: 'review' })}>
                      📖 Review
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="cls-col">
        <div className="cls-card">
          <h3>🎒 Join a classroom</h3>
          <p className="hint">Ask your teacher for the class code and enter it here.</p>
          <JoinForm onJoined={(name) => toast(`Welcome to ${name}!`)} />
        </div>
        <div className="cls-card">
          <h3>🏫 My classrooms</h3>
          {classrooms.isLoading ? (
            <div className="cls-muted">Loading…</div>
          ) : joined.length === 0 ? (
            <div className="cls-muted">You haven&apos;t joined a classroom yet.</div>
          ) : (
            <div className="cls-list">
              {joined.map((c) => (
                <div className="cls-item" key={c.id} style={{ cursor: 'default' }}>
                  <div>
                    <div className="name">{c.class_name}</div>
                    <div className="sub">
                      {c.teacher_name ? `Teacher: ${c.teacher_name} · ` : ''}
                      {c.member_count} student{c.member_count === 1 ? '' : 's'}
                    </div>
                  </div>
                  <button
                    className="link-btn"
                    disabled={leave.isPending}
                    onClick={() => {
                      if (window.confirm(`Leave “${c.class_name}”? You will stop receiving its homework.`)) leave.mutate(c.id)
                    }}
                  >
                    Leave
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {open && (
        <HomeworkOverlay
          key={`${open.a.id}-${open.mode}`}
          assignment={open.a}
          mode={open.mode}
          onClose={() => setOpen(null)}
          onSubmitted={() => {
            qc.invalidateQueries({ queryKey: ['homework'] })
            qc.invalidateQueries({ queryKey: ['me'] })
          }}
        />
      )}
    </div>
  )
}
