import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import { api, type Assignment, type BankQuestion, type Classroom } from '../../lib/api'
import { locale, useLanguage } from '../../i18n'
import { AssignModal } from './AssignModal'
import { QuestionBank } from './QuestionBank'
import { copyText, DAILY_LIMIT, errorMessage, MAX_QUESTIONS, medal, timeRemaining, useNow } from './util'

const DAY_MS = 24 * 60 * 60 * 1000

function CodeChip({ code, toast }: { code: string; toast: (m: string) => void }) {
  return (
    <span className="cls-code">
      {code}
      <button
        type="button"
        onClick={async () => toast((await copyText(code)) ? `Copied ${code}` : `Class code: ${code}`)}
        aria-label="Copy class code"
      >
        Copy
      </button>
    </span>
  )
}

function AssignmentCard({
  a,
  memberName,
  now,
  onDelete,
  deleting,
}: {
  a: Assignment
  memberName: (id: string) => string
  now: number
  onDelete: () => void
  deleting: boolean
}) {
  const results = [...(a.results ?? [])].sort((x, y) => y.score - x.score || +new Date(x.submitted_at) - +new Date(y.submitted_at))
  const statusLabel = a.status === 'completed' ? '✅ Submitted' : a.status === 'expired' ? '⏰ Expired' : '⏳ Active'
  const statusClass = a.status === 'completed' ? 'submitted' : a.status === 'expired' ? 'expired' : 'active'
  return (
    <div className="assign-card">
      <div className="assign-top">
        <span className="student">
          📚 {a.title}{' '}
          <span style={{ fontWeight: 500, fontSize: 12, color: '#8a7a7d' }}>
            → {a.student_id ? memberName(a.student_id) : 'Whole class'}
          </span>
        </span>
        <span className={`status ${statusClass}`}>{statusLabel}</span>
      </div>
      {a.description && <div className="assign-desc">{a.description}</div>}
      <div className="assign-detail">
        <strong>Questions:</strong> {a.question_count} &nbsp;·&nbsp; <strong>Points:</strong> {a.max_points}
        &nbsp;·&nbsp; <strong>Assigned:</strong> {new Date(a.created_at).toLocaleString(locale())}
        {a.status === 'assigned' && a.due_at && (
          <>
            {' '}
            &nbsp;·&nbsp; <strong>⏳</strong> {timeRemaining(a.due_at, now)}
          </>
        )}
      </div>
      {results.length > 0 ? (
        <div className="assign-ranking">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontWeight: 600 }}>🏆 Ranking</span>
            <span style={{ color: 'var(--gold)', fontWeight: 700 }}>
              {results.length} submitted
            </span>
          </div>
          {results.slice(0, 5).map((r, i) => (
            <div className="rank-item" key={r.student_id}>
              <span>
                <span className="rank-pos">{medal(i)}</span> {r.student_name || memberName(r.student_id)}
              </span>
              <span className="rank-score">
                {r.correct_answers}/{r.total_questions}
              </span>
            </div>
          ))}
          {results.length > 5 && (
            <div style={{ fontSize: 11, color: '#8a7a7d', textAlign: 'center', marginTop: 4 }}>
              + {results.length - 5} more students
            </div>
          )}
        </div>
      ) : (
        <div className="assign-ranking" style={{ fontSize: 12, color: '#624950' }}>
          📊 0 students have submitted this assignment
        </div>
      )}
      <div className="assign-foot">
        <button
          className="link-btn"
          disabled={deleting}
          onClick={() => {
            if (window.confirm(`Delete “${a.title}”? Students' results for it will be removed too.`)) onDelete()
          }}
        >
          Delete assignment
        </button>
      </div>
    </div>
  )
}

export function TeacherView({ toast }: { toast: (m: string) => void }) {
  useLanguage() // re-render dates on language change
  const { me } = useAuth()
  const qc = useQueryClient()
  const now = useNow(1000)
  const myId = me?.profile.id
  const name = me?.profile.display_name || me?.profile.username || 'Teacher'

  const [pickedId, setSelectedId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [justCreated, setJustCreated] = useState<Classroom | null>(null)
  const [selected, setSelected] = useState<Map<string, BankQuestion>>(new Map())
  const [assignOpen, setAssignOpen] = useState(false)

  const classroomsQ = useQuery({ queryKey: ['classrooms'], queryFn: api.classrooms.list })
  const owned = useMemo(() => (classroomsQ.data ?? []).filter((c) => c.teacher_id === myId), [classroomsQ.data, myId])
  const selectedId = owned.some((c) => c.id === pickedId) ? pickedId : (owned[0]?.id ?? null)
  const current = owned.find((c) => c.id === selectedId) ?? null

  const detailQ = useQuery({
    queryKey: ['classroom', selectedId],
    queryFn: () => api.classrooms.detail(selectedId!),
    enabled: !!selectedId,
  })
  const assignmentQs = useQueries({
    queries: owned.map((c) => ({
      queryKey: ['classroom-assignments', c.id],
      queryFn: () => api.classrooms.assignments(c.id),
      refetchInterval: 60_000,
    })),
  })
  const allAssignments = assignmentQs.flatMap((q) => q.data ?? [])
  const currentAssignments = selectedId ? (assignmentQs[owned.findIndex((c) => c.id === selectedId)]?.data ?? []) : []
  const assignmentsLoading = selectedId ? !!assignmentQs[owned.findIndex((c) => c.id === selectedId)]?.isLoading : false

  const bankTotalQ = useQuery({
    queryKey: ['bank-total'],
    queryFn: () => api.classrooms.questions({ limit: 1 }),
    staleTime: 5 * 60_000,
  })

  const todayCount = allAssignments.filter((a) => now - new Date(a.created_at).getTime() < DAY_MS).length
  const active = allAssignments.filter((a) => a.status === 'assigned').length
  const completed = allAssignments.reduce((n, a) => n + (a.results?.length ?? 0), 0)
  const limitReached = todayCount >= DAILY_LIMIT

  const members = detailQ.data?.members ?? []
  const memberName = (id: string) => {
    const m = members.find((x) => x.student_id === id)
    return m ? m.display_name || m.username : 'Student'
  }

  const create = useMutation({
    mutationFn: (n: string) => api.classrooms.create(n),
    onSuccess: (c) => {
      setNewName('')
      setJustCreated(c)
      setSelectedId(c.id)
      qc.invalidateQueries({ queryKey: ['classrooms'] })
    },
  })
  const removeClass = useMutation({
    mutationFn: (id: string) => api.classrooms.remove(id),
    onSuccess: () => {
      setJustCreated(null)
      qc.invalidateQueries({ queryKey: ['classrooms'] })
      toast('Classroom deleted.')
    },
    onError: (e) => toast(errorMessage(e)),
  })
  const removeMember = useMutation({
    mutationFn: ({ cid, sid }: { cid: string; sid: string }) => api.classrooms.removeMember(cid, sid),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['classroom', v.cid] })
      qc.invalidateQueries({ queryKey: ['classrooms'] })
    },
    onError: (e) => toast(errorMessage(e)),
  })
  const deleteAssignment = useMutation({
    mutationFn: (a: Assignment) => api.homework.remove(a.id),
    onSuccess: (_d, a) => {
      qc.invalidateQueries({ queryKey: ['classroom-assignments', a.classroom_id] })
      toast('Assignment deleted.')
    },
    onError: (e) => toast(errorMessage(e)),
  })

  const toggle = (q: BankQuestion) => {
    if (!selected.has(q.id) && selected.size >= MAX_QUESTIONS) return false
    setSelected((prev) => {
      const next = new Map(prev)
      if (next.has(q.id)) next.delete(q.id)
      else if (next.size < MAX_QUESTIONS) next.set(q.id, q)
      return next
    })
    return true
  }

  const onCreate = (e: FormEvent) => {
    e.preventDefault()
    if (newName.trim()) create.mutate(newName.trim())
  }

  return (
    <div className="mirava-classroom-grid">
      {/* Left: dashboard, bank, assignments */}
      <div>
        <div className="mirava-classroom-dashboard">
          <div className="welcome">
            Welcome, <span>{name}</span> 👋
          </div>
          <p style={{ color: '#624950', fontSize: 13, marginTop: 2 }}>Manage your heritage classroom and create assignments.</p>
          <div className="dashboard-stats">
            <div className="stat-card">
              <span className="num">{bankTotalQ.data?.total ?? '—'}</span>
              <span className="label">Questions</span>
            </div>
            <div className="stat-card">
              <span className="num">
                {todayCount} / {DAILY_LIMIT}
              </span>
              <span className="label">Assignments Today</span>
            </div>
            <div className="stat-card">
              <span className="num">{active}</span>
              <span className="label">Active</span>
            </div>
            <div className="stat-card">
              <span className="num">{completed}</span>
              <span className="label">Completed</span>
            </div>
          </div>
        </div>

        <QuestionBank
          selected={selected}
          onToggle={toggle}
          onClear={() => setSelected(new Map())}
          total={bankTotalQ.data?.total}
        >
          <div className="assign-actions">
            <button
              className="pill"
              style={{ padding: '10px 28px' }}
              disabled={limitReached || selected.size === 0 || !current}
              onClick={() => setAssignOpen(true)}
              title={!current ? 'Create a classroom first' : selected.size === 0 ? 'Select at least 1 question' : undefined}
            >
              📤 Assign Homework{current ? ` to ${current.class_name}` : ''}
            </button>
            {limitReached && (
              <span style={{ fontSize: 12, color: '#e58667', alignSelf: 'center' }}>
                Daily limit reached. You can assign up to 10 homework assignments per day.
              </span>
            )}
            {!current && !classroomsQ.isLoading && (
              <span style={{ fontSize: 12, color: '#624950', alignSelf: 'center' }}>Create a classroom to start assigning.</span>
            )}
          </div>
        </QuestionBank>

        <div className="mirava-classroom-assignments">
          <h3>📋 Assignments{current ? ` · ${current.class_name}` : ''}</h3>
          <div className="assign-grid">
            {!current ? (
              <p className="cls-muted">No classroom selected.</p>
            ) : assignmentsLoading ? (
              <p className="cls-muted">Loading…</p>
            ) : currentAssignments.length === 0 ? (
              <p className="cls-muted">No assignments created yet.</p>
            ) : (
              currentAssignments.map((a) => (
                <AssignmentCard
                  key={a.id}
                  a={a}
                  now={now}
                  memberName={memberName}
                  onDelete={() => deleteAssignment.mutate(a)}
                  deleting={deleteAssignment.isPending}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right: classrooms + members */}
      <div className="cls-col">
        <div className="cls-card">
          <h3>🏫 My classrooms</h3>
          <p className="hint">Create a classroom and share its join code with your students.</p>
          <form className="cls-form" onSubmit={onCreate}>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Class 8B — History"
              maxLength={80}
              aria-label="New classroom name"
            />
            <button className="pill" style={{ padding: '10px 20px' }} disabled={!newName.trim() || create.isPending}>
              {create.isPending ? 'Creating…' : '＋ Create'}
            </button>
          </form>
          {create.error && <div className="cls-error">{errorMessage(create.error)}</div>}
          {justCreated && (
            <div className="assign-summary" style={{ background: 'rgba(241,180,60,0.08)', borderRadius: 12, padding: '14px 18px', marginTop: 12 }}>
              <div style={{ fontSize: 13 }}>
                “{justCreated.class_name}” is ready. Share this code with your students:
              </div>
              <div className="cls-code-big">{justCreated.class_code}</div>
              <CodeChip code={justCreated.class_code} toast={toast} />
            </div>
          )}
          <div className="cls-list" style={{ marginTop: 14 }}>
            {classroomsQ.isLoading ? (
              <div className="cls-muted">Loading…</div>
            ) : classroomsQ.error ? (
              <div className="cls-muted">{errorMessage(classroomsQ.error)}</div>
            ) : owned.length === 0 ? (
              <div className="cls-muted">No classrooms yet.</div>
            ) : (
              owned.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  className={`cls-item${c.id === selectedId ? ' selected' : ''}`}
                  onClick={() => setSelectedId(c.id)}
                >
                  <span>
                    <span className="name">{c.class_name}</span>
                    <br />
                    <span className="sub">
                      {c.member_count} student{c.member_count === 1 ? '' : 's'} · code {c.class_code}
                    </span>
                  </span>
                  {c.id === selectedId && <span style={{ color: 'var(--gold)' }}>●</span>}
                </button>
              ))
            )}
          </div>
        </div>

        {current && (
          <div className="cls-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0 }}>👥 {current.class_name}</h3>
              <CodeChip code={current.class_code} toast={toast} />
            </div>
            <p className="hint" style={{ marginTop: 8 }}>
              Students join from their Classroom page using the code above.
            </p>
            {detailQ.isLoading ? (
              <div className="cls-muted">Loading members…</div>
            ) : detailQ.error ? (
              <div className="cls-muted">{errorMessage(detailQ.error)}</div>
            ) : members.length === 0 ? (
              <div className="cls-muted">No students yet — share the code!</div>
            ) : (
              <div>
                {members.map((m) => (
                  <div className="cls-member" key={m.student_id}>
                    <span className="who">
                      <strong>{m.display_name || m.username}</strong>
                      <small>
                        @{m.username} · joined {new Date(m.joined_at).toLocaleDateString(locale())}
                      </small>
                    </span>
                    <span className="xp">✦ {m.total_xp} XP</span>
                    <button
                      className="link-btn"
                      disabled={removeMember.isPending}
                      onClick={() => {
                        if (window.confirm(`Remove ${m.display_name || m.username} from ${current.class_name}?`))
                          removeMember.mutate({ cid: current.id, sid: m.student_id })
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: 14, textAlign: 'right' }}>
              <button
                className="link-btn"
                disabled={removeClass.isPending}
                onClick={() => {
                  if (window.confirm(`Delete “${current.class_name}” with all its assignments? This cannot be undone.`))
                    removeClass.mutate(current.id)
                }}
              >
                Delete classroom
              </button>
            </div>
          </div>
        )}
      </div>

      {assignOpen && current && (
        <AssignModal
          classroomId={current.id}
          className={current.class_name}
          members={members}
          questionIds={[...selected.keys()]}
          onClose={() => setAssignOpen(false)}
          onAssigned={() => {
            setAssignOpen(false)
            setSelected(new Map())
            qc.invalidateQueries({ queryKey: ['classroom-assignments', current.id] })
            toast('Homework assigned successfully!')
          }}
        />
      )}
    </div>
  )
}
