/**
 * Helpers for hosting ported imperative page logic (the hybrid part of the
 * port). A legacy page module exports `init(root, ctx)` that wires up its DOM
 * inside `root` and returns a cleanup function; React owns the markup and
 * lifecycle, the module owns the canvas/DOM behaviour.
 */
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, type RefObject } from 'react'
import type { NavigateFunction } from 'react-router-dom'
import { api, type GameKey, type GameScoreIn, type GameScoreOut, type Me } from './api'

export interface LegacyContext {
  /** Current profile (null for signed-out visitors or while loading). */
  me: Me | null
  isGuest: boolean
  navigate: NavigateFunction
  /** Persist small progress blobs server-side (replaces localStorage). */
  loadState: <T>(key: string) => Promise<T | null>
  saveState: <T>(key: string, value: T) => Promise<void>
  submitScore: (game: GameKey, body: GameScoreIn) => Promise<GameScoreOut | null>
  aiChat: typeof api.ai.chat
  /** Register a cleanup to run on unmount (timers, listeners, RAF loops...). */
  onCleanup: (fn: () => void) => void
}

export type LegacyInit = (root: HTMLElement, ctx: LegacyContext) => void | (() => void)

/**
 * Runs `init` once after mount with a context object, and on unmount runs the
 * cleanup it returned plus anything registered via ctx.onCleanup. `me` and
 * `isGuest` on the context are live getters, so they stay current.
 */
export function useLegacyPage(
  init: LegacyInit,
  deps: Omit<LegacyContext, 'onCleanup' | 'loadState' | 'saveState' | 'submitScore' | 'aiChat'>,
): RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement | null>(null)
  const queryClient = useQueryClient()
  const depsRef = useRef(deps)
  depsRef.current = deps

  useEffect(() => {
    const root = ref.current
    if (!root) return
    const cleanups: (() => void)[] = []
    const ctx: LegacyContext = {
      get me() {
        return depsRef.current.me
      },
      get isGuest() {
        return depsRef.current.isGuest
      },
      navigate: ((...args: unknown[]) =>
        (depsRef.current.navigate as (...a: unknown[]) => void)(...args)) as NavigateFunction,
      loadState: async <T,>(key: string) => {
        // No gating on `me` (it loads async); without a session the API 401s → null.
        try {
          return (await api.me.getState<T>(key)) ?? null
        } catch {
          return null
        }
      },
      saveState: async <T,>(key: string, value: T) => {
        try {
          // null/undefined clears the key (the API stores only non-null JSON).
          if (value === null || value === undefined) await api.me.deleteState(key)
          else await api.me.setState(key, value)
        } catch (e) {
          console.warn('Could not save progress', e)
        }
      },
      submitScore: async (game, body) => {
        try {
          const res = await api.games.submit(game, body)
          // XP changed: refresh the header/profile and leaderboards.
          void queryClient.invalidateQueries({ queryKey: ['me'] })
          void queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
          return res
        } catch (e) {
          console.warn('Could not submit score', e)
          return null
        }
      },
      aiChat: api.ai.chat,
      onCleanup: (fn) => cleanups.push(fn),
    } as LegacyContext
    const ret = init(root, ctx)
    if (typeof ret === 'function') cleanups.push(ret)
    return () => {
      for (const fn of cleanups.reverse()) {
        try {
          fn()
        } catch (e) {
          console.warn('Legacy cleanup failed', e)
        }
      }
    }
    // init is a stable module function; re-running it would duplicate listeners.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return ref
}
