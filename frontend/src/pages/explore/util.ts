/** Small helpers shared by the explore sections. */
import { useCallback, useEffect, useRef, useState } from 'react'

export function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el || !el.tagName) return false
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)
}

/** True when one of the page's modals/lenses is open (keyboard shortcuts pause). */
export function pageHasOpenOverlay(from: Element | null): boolean {
  const page = from?.closest('[data-page]')
  return !!page?.querySelector('.modal.open, .news-modal.open, .cms-modal:not([hidden]), #museumLensV2.open, [data-quiz-open]')
}

function bestVoice(langCode: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  return (
    voices.find((v) => v.lang === langCode) ||
    voices.find((v) => v.lang.startsWith(langCode.split('-')[0])) ||
    voices.find((v) => v.lang.endsWith('IN')) ||
    voices[0] ||
    null
  )
}

/**
 * Speaks `text` with the best available voice for `langCode` (legacy
 * `speakText`). Returns false when speech synthesis is unavailable.
 */
export function speakText(text: string, langCode = 'hi-IN', done?: (ok: boolean) => void): boolean {
  if (!('speechSynthesis' in window)) {
    done?.(false)
    return false
  }
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = langCode
  u.rate = 0.85
  u.pitch = 1
  u.volume = 1
  const voice = bestVoice(u.lang)
  if (voice) u.voice = voice
  u.onend = () => done?.(true)
  u.onerror = () => done?.(false)
  try {
    window.speechSynthesis.speak(u)
    return true
  } catch {
    done?.(false)
    return false
  }
}

export function stopSpeaking() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel()
}

/** Locks page scroll while `active` (legacy set body.style.overflow = 'hidden'). */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [active])
}

/** Calls `onEscape` on Escape while `active`. */
export function useEscape(active: boolean, onEscape: () => void) {
  const ref = useRef(onEscape)
  useEffect(() => {
    ref.current = onEscape
  })
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') ref.current()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [active])
}

/**
 * Legacy "fade out, swap text, fade in" helper: `swap(v)` hides immediately and
 * shows `v` after `delay` ms.
 */
export function useFadeSwap<T>(initial: T, delay: number) {
  const [shown, setShown] = useState(initial)
  const [hidden, setHidden] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const swap = useCallback(
    (v: T) => {
      setHidden(true)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => {
        setShown(v)
        setHidden(false)
      }, delay)
    },
    [delay],
  )
  return [shown, hidden, swap] as const
}
