/**
 * Typed client for the FastAPI backend. Every request carries the current
 * Supabase access token; the backend verifies it and loads the profile.
 */
import { supabase } from './supabase'

const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (res.status === 204) return undefined as T
  const payload = await res.json().catch(() => null)
  if (!res.ok) {
    const detail = payload?.detail
    const message =
      typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map((d: { msg?: string }) => d.msg).filter(Boolean).join('; ')
          : `Request failed (${res.status})`
    throw new ApiError(res.status, message)
  }
  return payload as T
}

export const http = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body ?? {}),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body ?? {}),
  del: <T = void>(path: string) => request<T>('DELETE', path),
}

const qs = (params: Record<string, string | number | undefined | null>) => {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') p.set(k, String(v))
  const s = p.toString()
  return s ? `?${s}` : ''
}

// ---- types ----------------------------------------------------------------------

export type Role = 'tourist' | 'student' | 'teacher' | 'admin'

export interface Profile {
  id: string
  username: string
  display_name: string | null
  email: string | null
  role: Role
  is_guest: boolean
  avatar_url: string | null
  total_xp: number
  best_quiz_score: number
  daily_streak: number
  longest_streak: number
  total_questions: number
  total_correct: number
  perfect_quizzes: number
  created_at: string
}

export interface Badge {
  badge_key: string
  name: string
  icon: string | null
  description: string | null
  unlocked_at?: string
  xp_reward?: number
}

export interface Me {
  profile: Profile
  badges: Badge[]
  rank: number | null
}

export interface QuizQuestion {
  id: string
  topic: string
  question: string
  options: string[]
  difficulty: string
}

export interface AnswerRecord {
  index: number
  selected: number | null
  correct: boolean
  correct_index: number
  points: number
}

export interface QuizSession {
  session_id: string
  kind: 'daily' | 'practice'
  quiz_date: string
  total: number
  seconds_per_question: number
  index: number
  score: number
  answers: AnswerRecord[]
  question: QuizQuestion | null
  time_left: number | null
  finished: boolean
}

export interface QuizAttempt {
  quiz_date: string
  score: number
  correct_answers: number
  total_questions: number
  time_taken_seconds: number | null
  streak: number
  completed_at: string
}

export interface DailyStatus {
  quiz_date: string
  total: number
  seconds_per_question: number
  attempt: QuizAttempt | null
  in_progress_session: string | null
}

export interface QuizResult {
  kind: 'daily' | 'practice'
  score: number
  correct_answers: number
  total_questions: number
  time_taken_seconds: number
  streak: number | null
  best_score: number
  total_xp: number
  xp_earned: number
  new_badges: Badge[]
  answers: AnswerRecord[]
}

export interface LeaderboardEntry {
  rank: number
  player_id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  score: number
  detail: Record<string, number | null>
  is_me: boolean
}

export interface Leaderboard {
  board: string
  date?: string | null
  entries: LeaderboardEntry[]
  me: LeaderboardEntry | null
}

export type GameKey =
  | 'shivaji'
  | 'lost-legends'
  | 'vedic-heist'
  | 'vedic-sprint'
  | 'spot-difference'
  | 'rasoi-rescue'
  | 'jal-parampara'
  | 'quiz-arena'

export interface GameScoreIn {
  score: number
  level?: number
  time_taken_seconds?: number
  completed?: boolean
  meta?: Record<string, unknown>
}

export interface GameScoreOut {
  id: string
  game: GameKey
  score: number
  best_score: number
  xp_earned: number
  total_xp: number
  new_badges: Badge[]
  completed_at: string
}

export interface Classroom {
  id: string
  class_name: string
  class_code: string
  teacher_id: string
  teacher_name: string | null
  member_count: number
  created_at: string
}

export interface ClassroomMember {
  student_id: string
  username: string
  display_name: string | null
  total_xp: number
  joined_at: string
}

export interface ClassroomDetail extends Classroom {
  members: ClassroomMember[]
}

export interface BankQuestion extends QuizQuestion {
  answer: number
  source: 'bank' | 'admin'
}

export interface ResultSummary {
  student_id: string
  student_name: string | null
  score: number
  correct_answers: number
  total_questions: number
  submitted_at: string
}

export interface Assignment {
  id: string
  classroom_id: string
  class_name: string | null
  title: string
  description: string | null
  student_id: string | null
  question_count: number
  max_points: number
  due_at: string | null
  created_at: string
  status: 'assigned' | 'completed' | 'expired'
  my_result: ResultSummary | null
  results: ResultSummary[] | null
}

export interface ReviewItem {
  id: string
  question: string
  options: string[]
  selected: number | null
  correct_index: number
  correct: boolean
}

export interface HomeworkResult {
  score: number
  correct_answers: number
  total_questions: number
  review: ReviewItem[]
}

export interface NewsItem {
  id: string
  title: string
  category: string
  summary: string
  body: string | null
  image_url: string | null
  source_url: string | null
  published_at: string
  is_published: boolean
  updated_at: string
}

export interface NewsIn {
  title: string
  category?: string
  summary: string
  body?: string | null
  image_url?: string | null
  source_url?: string | null
  published_at?: string | null
  is_published?: boolean
}

export interface AdminQuestion extends BankQuestion {
  is_active: boolean
  created_at: string
}

export interface QuestionIn {
  topic: string
  question: string
  options: string[]
  answer: number
  difficulty: 'Explorer' | 'Scholar' | 'Master'
  is_active?: boolean
}

export interface Page<T> {
  total: number
  items: T[]
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// ---- endpoints ------------------------------------------------------------------

export const api = {
  me: {
    get: () => http.get<Me>('/api/me'),
    update: (body: Partial<Pick<Profile, 'display_name' | 'username' | 'avatar_url'>> & { role?: Exclude<Role, 'admin'> }) =>
      http.patch<Profile>('/api/me', body),
    allState: () => http.get<Record<string, unknown>>('/api/me/state'),
    getState: <T = unknown>(key: string) =>
      http.get<{ key: string; value: T | null }>(`/api/me/state/${encodeURIComponent(key)}`).then((r) => r.value),
    setState: <T = unknown>(key: string, value: T) => http.put(`/api/me/state/${encodeURIComponent(key)}`, { value }),
    deleteState: (key: string) => http.del(`/api/me/state/${encodeURIComponent(key)}`),
  },

  quiz: {
    dailyStatus: () => http.get<DailyStatus>('/api/quiz/daily/status'),
    startDaily: () => http.post<QuizSession>('/api/quiz/daily/start'),
    topics: () => http.get<{ topic: string; count: number }[]>('/api/quiz/topics'),
    startPractice: (body: { topic?: string; difficulty?: string; count?: number }) =>
      http.post<QuizSession>('/api/quiz/practice/start', body),
    session: (id: string) => http.get<QuizSession>(`/api/quiz/sessions/${id}`),
    answer: (id: string, index: number, selected: number | null) =>
      http.post<AnswerRecord>(`/api/quiz/sessions/${id}/answer`, { index, selected }),
    next: (id: string) => http.post<QuizSession>(`/api/quiz/sessions/${id}/next`),
    finish: (id: string) => http.post<QuizResult>(`/api/quiz/sessions/${id}/finish`),
  },

  leaderboard: {
    global: (limit = 50) => http.get<Leaderboard>(`/api/leaderboard/global${qs({ limit })}`),
    daily: (limit = 50) => http.get<Leaderboard>(`/api/leaderboard/daily${qs({ limit })}`),
    game: (game: GameKey, limit = 50) => http.get<Leaderboard>(`/api/leaderboard/games/${game}${qs({ limit })}`),
  },

  games: {
    submit: (game: GameKey, body: GameScoreIn) => http.post<GameScoreOut>(`/api/games/${game}/scores`, body),
    myScores: (game: GameKey) =>
      http.get<{ score: number; level: number; time_taken_seconds: number | null; completed_at: string }[]>(
        `/api/games/${game}/scores/me`,
      ),
  },

  classrooms: {
    list: () => http.get<Classroom[]>('/api/classrooms'),
    create: (class_name: string) => http.post<Classroom>('/api/classrooms', { class_name }),
    detail: (id: string) => http.get<ClassroomDetail>(`/api/classrooms/${id}`),
    remove: (id: string) => http.del(`/api/classrooms/${id}`),
    removeMember: (id: string, studentId: string) => http.del(`/api/classrooms/${id}/members/${studentId}`),
    join: (class_code: string) => http.post<Classroom>('/api/classrooms/join', { class_code }),
    leave: (id: string) => http.post(`/api/classrooms/${id}/leave`),
    assignments: (id: string) => http.get<Assignment[]>(`/api/classrooms/${id}/assignments`),
    assign: (
      id: string,
      body: { title: string; description?: string; question_ids: string[]; student_id?: string | null; due_in_hours?: number },
    ) => http.post<Assignment>(`/api/classrooms/${id}/assignments`, body),
    questions: (params: { search?: string; topic?: string; difficulty?: string; limit?: number; offset?: number }) =>
      http.get<Page<BankQuestion>>(`/api/questions${qs(params)}`),
  },

  homework: {
    list: () => http.get<Assignment[]>('/api/assignments'),
    questions: (id: string) => http.get<QuizQuestion[]>(`/api/assignments/${id}/questions`),
    submit: (id: string, answers: (number | null)[]) => http.post<HomeworkResult>(`/api/assignments/${id}/submit`, { answers }),
    review: (id: string) => http.get<HomeworkResult>(`/api/assignments/${id}/review`),
    remove: (id: string) => http.del(`/api/assignments/${id}`),
  },

  news: {
    list: (limit = 10) => http.get<NewsItem[]>(`/api/news${qs({ limit })}`),
  },

  admin: {
    stats: () => http.get<Record<string, number | string | null>>('/api/admin/stats'),
    news: () => http.get<NewsItem[]>('/api/admin/news'),
    createNews: (body: NewsIn) => http.post<NewsItem>('/api/admin/news', body),
    updateNews: (id: string, body: NewsIn) => http.put<NewsItem>(`/api/admin/news/${id}`, body),
    deleteNews: (id: string) => http.del(`/api/admin/news/${id}`),
    questions: (params: { search?: string; source?: 'bank' | 'admin'; limit?: number; offset?: number }) =>
      http.get<Page<AdminQuestion>>(`/api/admin/questions${qs(params)}`),
    createQuestion: (body: QuestionIn) => http.post<AdminQuestion>('/api/admin/questions', body),
    updateQuestion: (id: string, body: QuestionIn) => http.put<AdminQuestion>(`/api/admin/questions/${id}`, body),
    deleteQuestion: (id: string) => http.del(`/api/admin/questions/${id}`),
    users: (params: { search?: string; limit?: number; offset?: number }) =>
      http.get<Page<Profile>>(`/api/admin/users${qs(params)}`),
    setRole: (id: string, role: Role) => http.patch<Profile>(`/api/admin/users/${id}/role`, { role }),
  },

  ai: {
    /** persona: 'guide' (heritage Q&A), 'king' (historical ruler), 'translator' (Bhasha). */
    chat: (body: { messages: ChatMessage[]; persona?: 'guide' | 'king' | 'translator'; system?: string; max_tokens?: number }) =>
      http.post<{ reply: string }>('/api/ai/chat', body).then((r) => r.reply),
  },
}
