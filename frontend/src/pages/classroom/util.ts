import { useEffect, useState } from 'react'
import { ApiError } from '../../lib/api'

export const DAILY_LIMIT = 10
export const MAX_QUESTIONS = 10
export const DIFFICULTIES = ['Explorer', 'Scholar', 'Master'] as const

/** Legacy getTimeRemaining(): "5h 3m 12s" or "Expired". */
export function timeRemaining(dueAt: string | null, now: number): string {
  if (!dueAt) return 'No deadline'
  const diff = new Date(dueAt).getTime() - now
  if (diff <= 0) return 'Expired'
  const hours = Math.floor(diff / 3_600_000)
  const mins = Math.floor((diff % 3_600_000) / 60_000)
  const secs = Math.floor((diff % 60_000) / 1000)
  return `${hours}h ${mins}m ${secs}s`
}

/** Ticks every `ms` so countdowns re-render. */
export function useNow(ms = 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), ms)
    return () => window.clearInterval(id)
  }, [ms])
  return now
}

export function errorMessage(e: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (e instanceof ApiError) {
    if (e.status === 429) return e.message || 'Daily limit reached. You can assign up to 10 homework assignments per day.'
    return e.message || fallback
  }
  if (e instanceof Error && e.message) return e.message
  return fallback
}

export const medal = (i: number) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`)

export function useToast(): [string | null, (msg: string) => void] {
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => {
    if (!msg) return
    const id = window.setTimeout(() => setMsg(null), 2800)
    return () => window.clearTimeout(id)
  }, [msg])
  return [msg, setMsg]
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
