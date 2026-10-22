import { useState, type SyntheticEvent } from 'react'
import { setLanguageAsync, useLanguage, type Language } from '../i18n'

/**
 * EN | हिंदी switch for the global English / Hindi runtime. Rendered inside
 * AccountMenu (so every page header gets it) and on landing / auth pages.
 * `floating` is the dock used by pages without a header (see LanguageDock).
 */
export function LanguageToggle({ className, floating }: { className?: string; floating?: boolean }) {
  const lang = useLanguage()
  const [busy, setBusy] = useState(false)

  const choose = async (code: Language) => {
    if (busy || code === lang) return
    setBusy(true)
    try {
      await setLanguageAsync(code)
    } finally {
      setBusy(false)
    }
  }

  // Keep clicks/keys on the toggle from reaching game canvases underneath.
  const stop = (e: SyntheticEvent) => e.stopPropagation()

  return (
    <div
      className={['mv-lang', floating && 'mv-lang-floating', className].filter(Boolean).join(' ')}
      role="group"
      aria-label={lang === 'hi' ? 'वेबसाइट की भाषा' : 'Website language'}
      aria-busy={busy || undefined}
      translate="no"
      onPointerDown={stop}
      onMouseDown={stop}
      onTouchStart={stop}
      onKeyDown={stop}
    >
      <button
        type="button"
        lang="en"
        aria-pressed={lang === 'en'}
        aria-label="Use English"
        disabled={busy}
        onClick={() => choose('en')}
      >
        EN
      </button>
      <span className="mv-lang-sep" aria-hidden />
      <button
        type="button"
        lang="hi"
        className="mv-lang-hi"
        aria-pressed={lang === 'hi'}
        aria-label="वेबसाइट हिंदी में देखें"
        disabled={busy}
        onClick={() => choose('hi')}
      >
        हिंदी
      </button>
    </div>
  )
}

/**
 * Global floating toggle, mounted once next to <App/>. CSS hides it whenever a
 * page shows a header toggle (AccountMenu / landing / auth), so only the
 * standalone apps and games — which have no header — display it.
 */
export function LanguageDock() {
  return (
    <div className="mv-lang-dock">
      <LanguageToggle floating />
    </div>
  )
}
