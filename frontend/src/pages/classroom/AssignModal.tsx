import { useMutation } from '@tanstack/react-query'
import { useEffect, useState, type FormEvent } from 'react'
import { api, type Assignment, type ClassroomMember } from '../../lib/api'
import { errorMessage } from './util'

interface Props {
  classroomId: string
  className: string
  members: ClassroomMember[]
  questionIds: string[]
  onClose: () => void
  onAssigned: (a: Assignment) => void
}

export function AssignModal({ classroomId, className, members, questionIds, onClose, onAssigned }: Props) {
  const [title, setTitle] = useState('Heritage Homework')
  const [description, setDescription] = useState('')
  const [studentId, setStudentId] = useState('')
  const [hours, setHours] = useState(24)

  const assign = useMutation({
    mutationFn: () =>
      api.classrooms.assign(classroomId, {
        title: title.trim(),
        description: description.trim() || undefined,
        question_ids: questionIds,
        student_id: studentId || null,
        due_in_hours: hours,
      }),
    onSuccess: onAssigned,
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim() || assign.isPending) return
    assign.mutate()
  }

  return (
    <div
      className="modal mirava-classroom-assign-modal open"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <form className="modal-box" onSubmit={onSubmit} role="dialog" aria-modal="true" aria-label="Assign Homework">
        <button type="button" className="close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <h2 style={{ font: "600 32px/1.05 'Playfair Display'", letterSpacing: '-.04em', margin: '6px 0 8px' }}>
          Assign Homework
        </h2>
        <p style={{ marginBottom: 16 }}>
          For <strong>{className}</strong>
        </p>
        <div className="form-group">
          <label htmlFor="assign-title">Title</label>
          <input id="assign-title" value={title} maxLength={120} required onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="assign-desc">Instructions (optional)</label>
          <textarea
            id="assign-desc"
            value={description}
            maxLength={1000}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Read the chapter on the Chola Empire first…"
          />
        </div>
        <div className="form-group">
          <label htmlFor="assign-student">Select Student</label>
          <select id="assign-student" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            <option value="">👥 Whole class ({members.length} student{members.length === 1 ? '' : 's'})</option>
            {members.map((m) => (
              <option key={m.student_id} value={m.student_id}>
                {m.display_name || m.username} (@{m.username})
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="assign-hours">Due in (hours)</label>
          <input
            id="assign-hours"
            type="number"
            min={1}
            max={720}
            value={hours}
            onChange={(e) => setHours(Math.min(720, Math.max(1, Number(e.target.value) || 1)))}
          />
        </div>
        <div className="assign-summary">
          <strong>{questionIds.length}</strong> questions selected · worth <strong>{questionIds.length * 10}</strong> XP
        </div>
        {assign.error && (
          <p className="cls-error" style={{ marginBottom: 10 }}>
            {errorMessage(assign.error)}
          </p>
        )}
        <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
          <button className="pill" type="submit" style={{ padding: '10px 28px' }} disabled={assign.isPending}>
            {assign.isPending ? 'Assigning…' : '✅ Assign Homework'}
          </button>
          <button className="pill ghost" type="button" style={{ padding: '10px 28px' }} onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
