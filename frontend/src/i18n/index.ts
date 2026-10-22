/**
 * English / Hindi for React code. The translation engine itself is the DOM
 * runtime in ./runtime.js (ported from the hackathon's mirava-i18n.js): it
 * watches the page and swaps English text for Hindi from /locales/*.json,
 * so most components need nothing — just keep English copy identical to the
 * source HTML so dictionary keys match.
 *
 * Use these helpers only for strings built in code (alerts, canvas text,
 * aria labels set imperatively, formatted numbers/dates).
 */
import { useSyncExternalStore } from 'react'

export type Language = 'en' | 'hi'

export interface MiravaI18nRuntime {
  language: () => Language
  locale: () => string
  t: (value: string, params?: Record<string, string | number>) => string
  languageRevision: () => number
  setLanguage: (
    code: Language,
    options?: { persist?: boolean; syncProfile?: boolean; source?: string },
  ) => Promise<boolean>
  translate: (root?: Node) => void
  translateHTML: (html: string) => string
  originalText: (el: Element) => string
  originalHTML: (el: Element) => string
  url: (href: string) => string
  announce: (message: string) => void
  /** Profile write with the original camelCase fields (displayName, bio, location, preferredLanguage, avatar). */
  updateProfile: (fields: Record<string, string>) => Promise<unknown>
  /** Wired by AuthProvider: current account (or null) and the profile writer. */
  connectAccount: (
    user: { id: string; preferredLanguage?: string | null } | null,
    writer?: ((fields: Record<string, string>) => Promise<unknown>) | null,
  ) => void
  coverage: () => { language: Language; dictionaryLoaded: boolean; entries: number; templates: number; missing: string[] }
  fontReady: () => Promise<void>
  drawLiteral: (ctx: CanvasRenderingContext2D, value: string, ...args: number[]) => void
  matches: (value: unknown, query: string) => boolean
  number: (value: number, options?: Intl.NumberFormatOptions) => string
  date: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) => string
  ready?: Promise<boolean>
}

declare global {
  interface Window {
    MiravaI18n?: MiravaI18nRuntime
  }
}

/** Fired on window whenever the language changes. */
export const LANGUAGE_EVENT = 'mirava:languagechange'

const runtime = () => (typeof window !== 'undefined' ? window.MiravaI18n : undefined)

export function getLanguage(): Language {
  const fromRuntime = runtime()?.language()
  if (fromRuntime) return fromRuntime
  const attr = typeof document !== 'undefined' ? document.documentElement.dataset.miravaLanguage : undefined
  return attr === 'hi' ? 'hi' : 'en'
}

/** Translate an English source string (returns it unchanged in English mode). */
export function t(value: string, params?: Record<string, string | number>): string {
  const rt = runtime()
  if (rt) return rt.t(value, params)
  if (!params) return value
  return value.replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m))
}

export function setLanguage(code: Language): void {
  void runtime()?.setLanguage(code)
}

/** Like setLanguage, but resolves once the Hindi catalogue/font are loaded and applied. */
export async function setLanguageAsync(
  code: Language,
  options?: { persist?: boolean; syncProfile?: boolean; source?: string },
): Promise<boolean> {
  return (await runtime()?.setLanguage(code, options)) ?? false
}

export function locale(): string {
  return getLanguage() === 'hi' ? 'hi-IN' : 'en-IN'
}

function subscribe(cb: () => void): () => void {
  window.addEventListener(LANGUAGE_EVENT, cb)
  return () => window.removeEventListener(LANGUAGE_EVENT, cb)
}

/** Re-renders the component when the site language changes. */
export function useLanguage(): Language {
  return useSyncExternalStore(subscribe, getLanguage, () => 'en')
}
