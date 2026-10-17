import { useCallback, useEffect, useRef, useState } from 'react'
import { LIPI } from './engines'

const FONT_URLS = [
  'https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,400;0,600;1,400&display=swap',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600&family=Noto+Sans+Bengali:wght@400;600&family=Noto+Sans+Gurmukhi:wght@400;600&family=Noto+Sans+Gujarati:wght@400;600&family=Noto+Sans+Oriya:wght@400;600&family=Noto+Sans+Tamil:wght@400;600&family=Noto+Sans+Telugu:wght@400;600&family=Noto+Sans+Kannada:wght@400;600&family=Noto+Sans+Malayalam:wght@400;600&family=Noto+Naskh+Arabic:wght@400;600&family=Noto+Sans+Ol+Chiki&family=Noto+Sans+Meetei+Mayek&display=swap',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+Brahmi&family=Noto+Sans+Kharoshthi&family=Noto+Sans+Grantha&family=Noto+Sans+Sharada&family=Noto+Sans+Siddham&family=Noto+Sans+Tirhuta&family=Noto+Sans+Modi&display=swap',
]

/** Adds the Noto script font stylesheets while the page is mounted. */
export function useNotoFonts() {
  useEffect(() => {
    const links = FONT_URLS.map((href) => {
      const l = document.createElement('link')
      l.rel = 'stylesheet'
      l.href = href
      l.dataset.page = 'bhasha'
      document.head.appendChild(l)
      return l
    })
    return () => links.forEach((l) => l.remove())
  }, [])
}

export interface ToastItem {
  id: number
  msg: string
  out: boolean
}

/** Stacked toasts: fade after 2.6s, removed 350ms later (as in the legacy page). */
export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef(new Set<number>())
  const seq = useRef(0)

  useEffect(() => {
    const set = timers.current
    return () => {
      set.forEach((t) => clearTimeout(t))
      set.clear()
    }
  }, [])

  const later = (fn: () => void, ms: number) => {
    const t = window.setTimeout(() => {
      timers.current.delete(t)
      fn()
    }, ms)
    timers.current.add(t)
  }

  const toast = useCallback((msg: string) => {
    const id = ++seq.current
    setToasts((ts) => [...ts, { id, msg, out: false }])
    later(() => {
      setToasts((ts) => ts.map((t) => (t.id === id ? { ...t, out: true } : t)))
      later(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 350)
    }, 2600)
  }, [])

  return { toasts, toast }
}

/** speechSynthesis wrapper with voice lookup and a Devanagari fallback for ancient scripts. */
export function useSpeech(toast: (m: string) => void) {
  const voices = useRef<SpeechSynthesisVoice[]>([])

  useEffect(() => {
    if (!('speechSynthesis' in window)) return
    const load = () => {
      try {
        voices.current = speechSynthesis.getVoices() || []
      } catch {
        voices.current = []
      }
    }
    load()
    speechSynthesis.addEventListener('voiceschanged', load)
    return () => {
      speechSynthesis.removeEventListener('voiceschanged', load)
      speechSynthesis.cancel()
    }
  }, [])

  const speak = useCallback(
    (text: string, lang?: string | null) => {
      if (!('speechSynthesis' in window)) {
        toast('Speech is not available in this browser.')
        return
      }
      speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.rate = 0.85
      const pref = lang || 'hi-IN'
      const base = pref.split('-')[0]
      const vs = voices.current
      const v = vs.find((v) => v.lang === pref) || vs.find((v) => v.lang && v.lang.startsWith(base))
      if (v) {
        u.voice = v
        u.lang = v.lang
      } else {
        u.lang = pref
        if (vs.length && base !== 'hi' && base !== 'en') toast(`No ${base.toUpperCase()} voice on this device — trying anyway.`)
      }
      speechSynthesis.speak(u)
    },
    [toast],
  )

  // Devanagari-reading fallback for scripts without a voice (Brahmi etc.)
  const speakIndic = useCallback((text: string) => speak(LIPI.convert(text, 'deva'), 'hi-IN'), [speak])

  return { speak, speakIndic }
}

export async function copyText(t: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(t)
    return true
  } catch {
    return false
  }
}
