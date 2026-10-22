import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import { api, ApiError } from '../../lib/api'
import { LANGS, PHRASES } from './data'
import { INFO, LIPI } from './engines'
import { copyText } from './hooks'
import { ENGINE_LABEL, L, detectLang, route, runRoute, type TrResult } from './translateEngine'

const PREFS_KEY = 'bhashaPrefs'
const HIST_KEY = 'bhashaHistory'
const OUT_SCRIPTS = ['deva', 'brah', 'khar', 'gran', 'shrd', 'sidd', 'tirh', 'modi', 'beng', 'guru', 'gujr', 'orya', 'taml', 'telu', 'knda', 'mlym']

interface HistItem {
  s: string
  t: string
  sl: string
  dl: string
}

export interface TranslateRequest {
  id: number
  src: string
  sl: string
  dl: string
}

type OutState = { kind: 'idle' } | { kind: 'busy'; msg: string } | { kind: 'err'; msg: string } | { kind: 'res'; res: TrResult }

interface Props {
  active: boolean
  aiOn: boolean
  onAiUnavailable: () => void
  request: TranslateRequest | null
  toast: (m: string) => void
  speak: (text: string, lang?: string | null) => void
  speakIndic: (text: string) => void
  onCarve: (text: string) => void
}

function readPrefs(): { src: string; dst: string } {
  try {
    const v = JSON.parse(localStorage.getItem(PREFS_KEY) || 'null')
    if (v && typeof v.src === 'string' && typeof v.dst === 'string') return v
  } catch {
    /* ignore */
  }
  return { src: 'auto', dst: 'sa' }
}

const modern = LANGS.filter((l) => l.g === 'modern')
const classical = LANGS.filter((l) => l.g === 'classical')

function LangOptions({ withAuto }: { withAuto: boolean }) {
  return (
    <>
      {withAuto && <option value="auto">🔎 Detect language</option>}
      <optgroup label="Modern languages">
        {modern.map((l) => (
          <option key={l.c} value={l.c}>
            {l.n}
            {l.nn && l.nn !== l.n ? ' · ' + l.nn : ''}
          </option>
        ))}
      </optgroup>
      <optgroup label="Classical languages">
        {classical.map((l) => (
          <option key={l.c} value={l.c}>
            {l.n} · {l.nn}
            {l.era ? ' (' + l.era + ')' : ''}
          </option>
        ))}
      </optgroup>
    </>
  )
}

type SR = {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}
const SRCtor: (new () => SR) | undefined =
  (window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR }).SpeechRecognition ||
  (window as unknown as { webkitSpeechRecognition?: new () => SR }).webkitSpeechRecognition

export function Translate({ active, aiOn, onAiUnavailable, request, toast, speak, speakIndic, onCarve }: Props) {
  const { user } = useAuth()
  const [prefs] = useState(readPrefs)
  const validLang = (c: string, auto: boolean) => (auto && c === 'auto') || LANGS.some((l) => l.c === c && l.c !== 'auto')
  const [src, setSrcState] = useState('')
  const [sl, setSlState] = useState(validLang(prefs.src, true) ? prefs.src : 'auto')
  const [dl, setDlState] = useState(validLang(prefs.dst, false) ? prefs.dst : 'sa')
  const cur = useRef({ src, sl, dl })
  const [out, setOutState] = useState<OutState>({ kind: 'idle' })
  const [lastOut, setLastOut] = useState<TrResult | null>(null)
  const lastRef = useRef<TrResult | null>(null)
  const [outScript, setOutScript] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const [hist, setHist] = useState<HistItem[]>([])
  const [recOn, setRecOn] = useState(false)
  const recRef = useRef<SR | null>(null)
  const srcEl = useRef<HTMLTextAreaElement>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      const r = recRef.current
      if (r) {
        r.onend = null
        r.onresult = null
        r.onerror = null
        try {
          r.abort()
        } catch {
          /* ignore */
        }
      }
    }
  }, [])

  // Recent translations live in the signed-in user's Mirava state.
  useEffect(() => {
    if (!user) return
    let alive = true
    api.me
      .getState<HistItem[]>(HIST_KEY)
      .then((v) => {
        if (alive && Array.isArray(v)) setHist(v.filter((x) => x && typeof x.s === 'string').slice(0, 8))
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [user])

  const setVals = (v: Partial<{ src: string; sl: string; dl: string }>) => {
    cur.current = { ...cur.current, ...v }
    if (v.src !== undefined) setSrcState(v.src)
    if (v.sl !== undefined) setSlState(v.sl)
    if (v.dl !== undefined) setDlState(v.dl)
    if (v.sl !== undefined || v.dl !== undefined) {
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify({ src: cur.current.sl, dst: cur.current.dl }))
      } catch {
        /* ignore */
      }
    }
  }

  const srcLangOf = (v: { src: string; sl: string }) => (v.sl === 'auto' ? detectLang(v.src) || 'en' : v.sl)

  const setOut = (res: TrResult | null) => {
    lastRef.current = res
    setLastOut(res)
    setOutScript(res && res.script ? res.script : res ? (L(res.dl).s ?? null) : null)
    if (!res) setOutState({ kind: 'idle' })
    else setOutState({ kind: 'res', res })
  }

  const pushHist = (r: TrResult) => {
    setHist((h) => {
      const next = [{ s: r.src.slice(0, 200), t: r.text.slice(0, 300), sl: r.sl, dl: r.dl }, ...h].slice(0, 8)
      if (user) api.me.setState(HIST_KEY, next).catch(() => {})
      return next
    })
  }

  const translate = async (v = cur.current) => {
      const text = v.src.trim()
      if (!text || busyRef.current) {
        if (!text) srcEl.current?.focus()
        return
      }
      const sl = srcLangOf(v), dl = v.dl
      let kind = route(sl, dl, aiOn)
      busyRef.current = true
      setBusy(true)
      setOutState({ kind: 'busy', msg: `Translating ${L(sl).n} → ${L(dl).n}…` })
      try {
        let res: Omit<TrResult, 'sl' | 'dl' | 'src'>
        if (kind === 'ai') {
          try {
            res = await runRoute('ai', text, sl, dl)
          } catch (e) {
            // AI unavailable (not configured / rate limited / provider error) → non-AI path.
            if (e instanceof ApiError && (e.status === 503 || e.status === 401)) onAiUnavailable()
            kind = route(sl, dl, false)
            if ((kind === 'needs-ai' || kind === 'derive-from-classical') && e instanceof ApiError && e.status === 429)
              throw new Error(e.message)
            res = await runRoute(kind, text, sl, dl)
          }
        } else res = await runRoute(kind, text, sl, dl)
        const full: TrResult = { ...res, sl, dl, src: text }
        if (!full.roman && L(dl).s) full.roman = LIPI.convert(full.text, 'iast')
        if (!mounted.current) return
        setOut(full)
        pushHist(full)
      } catch (e) {
        if (!mounted.current) return
        setOut(null)
        setOutState({ kind: 'err', msg: (e as Error).message || 'Translation failed.' })
      } finally {
        busyRef.current = false
        if (mounted.current) setBusy(false)
      }
  }

  // External requests ("Open in translator" from the Verse Reader).
  useEffect(() => {
    if (!request) return
    setVals({ src: request.src, sl: request.sl, dl: request.dl })
    void translate({ src: request.src, sl: request.sl, dl: request.dl })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.id])

  const detected = sl === 'auto' && src.trim() ? L(detectLang(src) || 'en') : null
  const engine = ENGINE_LABEL[route(srcLangOf({ src, sl }), dl, aiOn)]

  // ---- output rendering ----
  const det = lastOut ? LIPI.detect(lastOut.text) : null
  const shown =
    lastOut && outScript && det && det !== 'latin' ? LIPI.convert(lastOut.text, outScript) : (lastOut?.text ?? '')
  const shownWord = (w: string) =>
    outScript && w ? (LIPI.isLatin(w) ? LIPI.convertIAST(w, outScript) : LIPI.convert(w, outScript)) : w

  const onLangChange = (v: Partial<{ sl: string; dl: string }>) => {
    setVals(v)
    if (lastRef.current) void translate()
  }

  const swap = () => {
    const s = srcLangOf(cur.current), d = cur.current.dl
    const next: Partial<{ src: string; sl: string; dl: string }> = { sl: d, dl: s }
    if (lastRef.current && lastRef.current.text) next.src = lastRef.current.text
    setVals(next)
    if (cur.current.src.trim()) void translate()
  }

  const say = () => {
    const r = lastRef.current
    if (!r) return
    const D = L(r.dl)
    if (D.tts && !(outScript && INFO[outScript] && INFO[outScript].ancient))
      speak(LIPI.detect(r.text) === 'latin' || !D.s ? r.text : LIPI.convert(r.text, D.s === 'brah' ? 'deva' : D.s), D.tts)
    else if (D.s || outScript) speakIndic(r.text)
    else toast('No voice is available for this language on this device.')
  }

  const copy = async () => {
    if (!lastOut) return
    toast((await copyText(shown)) ? 'Copied' : 'Copy failed: select the text manually.')
  }

  const share = async () => {
    if (!lastOut) return
    const t = `${lastOut.src}\n→ ${L(lastOut.dl).n}: ${shown}${lastOut.roman ? '\n(' + lastOut.roman + ')' : ''}\n— via Mirava Bhāṣā`
    if (navigator.share) {
      try {
        await navigator.share({ text: t })
      } catch {
        /* cancelled */
      }
    } else toast((await copyText(t)) ? 'Copied to share' : 'Sharing is not available here.')
  }

  const mic = () => {
    if (!SRCtor) return
    if (recRef.current) {
      recRef.current.stop()
      return
    }
    const s = srcLangOf(cur.current)
    const lang = (L(s) && L(s).tts) || 'hi-IN'
    let rec: SR
    try {
      rec = new SRCtor()
    } catch {
      toast('Speech input is not available.')
      return
    }
    recRef.current = rec
    rec.lang = lang
    rec.interimResults = true
    rec.continuous = false
    const base = cur.current.src ? cur.current.src + ' ' : ''
    rec.onresult = (e) => {
      let t = ''
      for (const r of Array.from(e.results)) t += r[0].transcript
      setVals({ src: base + t })
    }
    rec.onerror = (e) => toast(e.error === 'not-allowed' ? 'Microphone permission denied.' : 'Speech input stopped: ' + e.error)
    rec.onend = () => {
      recRef.current = null
      setRecOn(false)
      if (cur.current.src.trim()) void translate()
    }
    rec.start()
    setRecOn(true)
    toast(`Listening (${lang})…`)
  }

  const stoneDisabled = !lastOut || !det || det === 'latin'

  return (
    <section className={active ? 'pane on' : 'pane'} id="p-tr">
      <div className="intro">
        <div>
          <h2>
            Translate, <em>across time</em>
          </h2>
          <p>
            Modern languages use a live translation engine. Pali and Prakrit come from a Sanskrit translation run through
            real sound-change rules, or from full AI translation when you are signed in to Mirava. See any result in Brahmi,
            or hear it read aloud.
          </p>
        </div>
        <span className={'engine ' + engine[0]} id="engBadge">
          <i></i>
          {engine[1]}
        </span>
      </div>
      <div className="tr-grid">
        <div className="tr-col">
          <div className="tr-head">
            <select className="in" id="srcL" aria-label="From language" value={sl} onChange={(e) => onLangChange({ sl: e.target.value })}>
              <LangOptions withAuto />
            </select>
          </div>
          <textarea
            className="in"
            id="src"
            ref={srcEl}
            maxLength={1500}
            placeholder="Type or paste text… (or try a phrase below)"
            aria-label="Text to translate"
            value={src}
            onChange={(e) => setVals({ src: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void translate()
            }}
          ></textarea>
          <div className="bar">
            {SRCtor && (
              <button className={recOn ? 'btn sm mic rec' : 'btn sm mic'} type="button" title="Speak instead of typing" onClick={mic}>
                {recOn ? '⏹ Stop' : '🎙️ Speak'}
              </button>
            )}
            <button
              className="btn sm"
              type="button"
              onClick={() => {
                setVals({ src: '' })
                setOut(null)
                srcEl.current?.focus()
              }}
            >
              ✕ Clear
            </button>
            {detected && (
              <span className="engine">
                <i></i>Detected: {detected.n}
              </span>
            )}
            <span className="cnt">{src.length} / 1500</span>
          </div>
        </div>
        <button className="swap" type="button" title="Swap languages" aria-label="Swap languages" onClick={swap}>
          ⇄
        </button>
        <div className="tr-col">
          <div className="tr-head">
            <select className="in" id="dstL" aria-label="To language" value={dl} onChange={(e) => onLangChange({ dl: e.target.value })}>
              <LangOptions withAuto={false} />
            </select>
            <button className="btn gold" type="button" disabled={busy} onClick={() => void translate()}>
              Translate →
            </button>
          </div>
          <div className="out">
            {out.kind === 'idle' && <div className="ph">The translation appears here.</div>}
            {out.kind === 'busy' && (
              <div className="ph">
                <span className="spin"></span> {out.msg}
              </div>
            )}
            {out.kind === 'err' && <div className="notice err">⚠️ {out.msg}</div>}
            {out.kind === 'res' && lastOut && (
              <>
                <div className="txt" translate="no" dir={L(lastOut.dl).rtl ? 'rtl' : undefined}>
                  {shown}
                </div>
                {lastOut.roman && (
                  <div className="rom" translate="no">
                    {lastOut.roman}
                  </div>
                )}
                {lastOut.words && lastOut.words.length > 0 && (
                  <div className="words">
                    {lastOut.words.slice(0, 24).map((w, i) => (
                      <span key={i}>
                        <b translate="no">{shownWord(w.src)}</b>
                        <small>{w.gloss || ''}</small>
                      </span>
                    ))}
                  </div>
                )}
                {lastOut.pivot && (
                  <div className="pivot">
                    Sanskrit pivot:{' '}
                    <b className="ind" lang="sa" translate="no">
                      {lastOut.pivot}
                    </b>
                    <br />
                    ⚠️ A rule-based reconstruction: each Sanskrit word is put through Pali / Mahārāṣṭrī sound laws. Grammar
                    endings are not re-inflected. Sign in to use Mirava AI for scholarly translation.
                  </div>
                )}
                {lastOut.note && <div className="pivot">{lastOut.note}</div>}
                <div className="pivot" style={{ border: 0, padding: 0 }}>
                  Engine: {lastOut.engine}
                </div>
              </>
            )}
          </div>
          <div className="scriptrow">
            {lastOut && det && det !== 'latin' && (
              <>
                <span className="k" style={{ alignSelf: 'center', marginRight: 4 }}>
                  View in
                </span>
                {OUT_SCRIPTS.map((s) => (
                  <button key={s} type="button" className={(outScript || det) === s ? 'on' : ''} onClick={() => setOutScript(s)}>
                    {INFO[s].n.split(' ')[0]}
                  </button>
                ))}
              </>
            )}
          </div>
          <div className="bar">
            <button className="btn sm" type="button" disabled={!lastOut} onClick={say}>
              🔊 Listen
            </button>
            <button className="btn sm" type="button" disabled={!lastOut} onClick={copy}>
              ⧉ Copy
            </button>
            <button
              className="btn sm"
              type="button"
              disabled={stoneDisabled}
              onClick={() => lastOut && onCarve(lastOut.text.slice(0, 200))}
            >
              🪨 Carve in stone
            </button>
            <button className="btn sm" type="button" disabled={!lastOut} onClick={share}>
              ↗ Share
            </button>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 14 }} className="chips">
        <span className="k" style={{ alignSelf: 'center', marginRight: 6 }}>
          Try
        </span>
        {PHRASES.map((p) => (
          <button
            key={p}
            type="button"
            className="chip"
            translate="no"
            onClick={() => {
              setVals({ sl: 'en', src: p })
              void translate()
            }}
          >
            {p}
          </button>
        ))}
      </div>
      {hist.length > 0 && (
        <div className="card hist">
          <div className="k" style={{ marginBottom: 6 }}>
            Recent translations
          </div>
          <div>
            {hist.map((x, i) => (
              <div
                key={i}
                className="hi"
                role="button"
                tabIndex={0}
                onClick={() => {
                  setVals({ sl: x.sl, dl: x.dl, src: x.s })
                  void translate()
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setVals({ sl: x.sl, dl: x.dl, src: x.s })
                    void translate()
                  }
                }}
              >
                <div>
                  <small>{L(x.sl)?.n || x.sl}</small>
                  <span translate="no">{x.s}</span>
                </div>
                <div>
                  <small>{L(x.dl)?.n || x.dl}</small>
                  <span translate="no">{x.t}</span>
                </div>
                <span className="k">↺</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
