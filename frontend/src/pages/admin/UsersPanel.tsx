import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import { api, type Profile, type Role } from '../../lib/api'
import { errMsg, fmtDate, useDebounced, type Toast } from './shared'

const PAGE = 20
const ROLES: Role[] = ['tourist', 'student', 'teacher', 'admin']

export function UsersPanel({ toast }: { toast: Toast }) {
  const qc = useQueryClient()
  const { me } = useAuth()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const debounced = useDebounced(search.trim())

  const params = { search: debounced || undefined, limit: PAGE, offset: page * PAGE }
  const users = useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: () => api.admin.users(params),
    placeholderData: keepPreviousData,
  })
  const total = users.data?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / PAGE))

  const setRole = useMutation({
    mutationFn: ({ user, role }: { user: Profile; role: Role }) => api.admin.setRole(user.id, role),
    onSuccess: (p) => {
      void qc.invalidateQueries({ queryKey: ['admin'] })
      toast(`${p.display_name || p.username} is now ${p.role}`)
    },
    onError: (e) => toast(errMsg(e)),
  })

  return (
    <section className="panel active">
      <div className="grid">
        <div className="card users-card">
          <h2>Users &amp; roles</h2>
          <p className="hint">
            Promote teachers so they can run classrooms, or grant administrator access to this console. Role changes
            apply on the user's next page load. You can't remove your own admin role.
          </p>
          <div className="toolbar">
            <input
              type="search"
              placeholder="Search by username, name or email…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(0)
              }}
            />
          </div>
          <div className="list">
            {users.isLoading ? (
              <div className="empty">Loading users…</div>
            ) : users.isError ? (
              <div className="empty">Could not load users: {errMsg(users.error)}</div>
            ) : !users.data?.items.length ? (
              <div className="empty">No users match your search.</div>
            ) : (
              users.data.items.map((u) => {
                const isMe = u.id === me?.profile.id
                const pending = setRole.isPending && setRole.variables?.user.id === u.id
                return (
                  <div className="item user-row" key={u.id}>
                    <div>
                      <small>@{u.username}</small>
                      {u.is_guest && <span className="badge gold">Guest</span>}
                      {u.role === 'admin' && <span className="badge dark">Admin</span>}
                      {isMe && <span className="badge green">You</span>}
                      <h4>{u.display_name || u.username}</h4>
                      <div className="user-meta">
                        {u.email || 'no email'} · {u.total_xp} XP · joined {fmtDate(u.created_at, false)}
                      </div>
                    </div>
                    <select
                      aria-label={`Role for ${u.username}`}
                      value={u.role}
                      disabled={isMe || pending}
                      onChange={(e) => {
                        const role = e.target.value as Role
                        if (role === 'admin' && !window.confirm(`Grant administrator access to @${u.username}?`)) return
                        setRole.mutate({ user: u, role })
                      }}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                )
              })
            )}
          </div>
          <div className="pager">
            <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              ← Prev
            </button>
            <span>
              {total} USERS · PAGE {Math.min(page + 1, pages)} / {pages}
            </span>
            <button type="button" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>
              Next →
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
