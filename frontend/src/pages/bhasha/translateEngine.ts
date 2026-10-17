/**
 * Translation routing for Bhāṣā (ported from legacy Bhasha.html):
 * - Mirava AI via the backend proxy (`api.ai.chat`, persona "translator"),
 * - the free public MyMemory engine for modern languages (no key),
 * - a Sanskrit pivot + Middle Indo-Aryan sound laws for Pali / Prakrit.
 */
import { api } from '../../lib/api'
import { LANGS, type Lang } from './data'
import { LIPI, SOUND } from './engines'

export const L = (c: string): Lang => LANGS.find((x) => x.c === c) as Lang

export interface Word {
  src: string
  gloss?: string
}

export interface TrResult {
  text: string
  roman?: string
  words?: Word[]
  note?: string
  pivot?: string
  engine: string
  rule?: boolean
  script?: string
  sl: string
  dl: string
  src: string
}

export type RouteKind = 'same' | 'ai' | 'mt' | 'derive' | 'derive-from-classical' | 'needs-ai'

const LANG_BY_SCRIPT: Record<string, string> = {
  deva: 'hi', beng: 'bn', guru: 'pa', gujr: 'gu', orya: 'or', taml: 'ta', telu: 'te', knda: 'kn', mlym: 'ml', latin: 'en',
}

export function detectLang(t: string): string | null {
  if (/[؀-ۿ]/.test(t)) return 'ur'
  if (/[᱐-᱿]/.test(t)) return 'sat'
  if (/[ꯀ-꯿]/.test(t)) return 'mni'
  const s = LIPI.detect(t)
  return (s && LANG_BY_SCRIPT[s]) || (s ? 'sa' : null)
}

export function route(sl: string, dl: string, aiOn: boolean): RouteKind {
  const S = L(sl), D = L(dl)
  if (sl === dl) return 'same'
  if (aiOn) return 'ai'
  if (S.mt && D.mt) return 'mt'
  if (D.derive && (S.mt || sl === 'sa')) return 'derive'
  if (D.derive && (sl === 'pi' || sl === 'pra')) return 'derive-from-classical'
  return 'needs-ai'
}

export const ENGINE_LABEL: Record<RouteKind, [string, string]> = {
  ai: ['ai', 'Mirava AI'],
  mt: ['', 'MyMemory public MT'],
  derive: ['rule', 'MT → Sanskrit → sound laws'],
  same: ['off', 'Script view only'],
  'needs-ai': ['off', 'Needs Mirava AI'],
  'derive-from-classical': ['off', 'Needs Mirava AI'],
}

function decodeHtml(s: string) {
  const t = document.createElement('textarea')
  t.innerHTML = s
  return t.value
}

function chunks(text: string, max: number) {
  const parts = text.match(/[^.!?।॥\n]+[.!?।॥\n]*/g) || [text]
  const out: string[] = []
  let cur = ''
  for (const p of parts) {
    if ((cur + p).length > max && cur) {
      out.push(cur)
      cur = ''
    }
    if (p.length > max) {
      for (let i = 0; i < p.length; i += max) out.push(p.slice(i, i + max))
    } else cur += p
  }
  if (cur.trim()) out.push(cur)
  return out
}

export async function mt(text: string, sl: string, dl: string): Promise<string> {
  const out: string[] = []
  for (const c of chunks(text, 450)) {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(c.trim())}&langpair=${encodeURIComponent(L(sl).mt!)}|${encodeURIComponent(L(dl).mt!)}`
    let r: Response
    try {
      r = await fetch(url)
    } catch {
      throw new Error('Could not reach the translation service. Check your internet connection. The other tabs work offline.')
    }
    let j: { responseStatus?: number | string; responseData?: { translatedText?: string }; responseDetails?: string }
    try {
      j = await r.json()
    } catch {
      throw new Error('The translation service sent an unexpected reply. Please try again.')
    }
    const st = +(j.responseStatus ?? 0)
    const tt = (j.responseData && j.responseData.translatedText) || ''
    if (st === 429 || /MYMEMORY WARNING/i.test(tt))
      throw new Error('The free translation allowance for today is used up on this device. Try again tomorrow, or enable Mirava AI.')
    if (st !== 200) throw new Error((j.responseDetails || 'Translation failed') + '')
    out.push(decodeHtml(tt))
  }
  return out.join(' ').replace(/\s+/g, ' ').trim()
}

interface AiOut {
  translation: string
  romanization?: string
  words?: Word[]
  note?: string
}

export async function ai(text: string, sl: string, dl: string): Promise<AiOut> {
  const S = L(sl), D = L(dl)
  const system = `You are Mirava Bhasha, an expert translator of Indian languages, ancient and modern, and a careful philologist. Translate the user's text from ${S.n} to ${D.n}. ${D.g === 'classical' ? `Write natural, grammatical ${D.n} as attested in classical texts; use ${D.s === 'taml' ? 'Tamil script' : 'Devanagari'}.` : `Use the standard script for ${D.n}.`} Reply with ONLY a JSON object, no markdown: {"translation": string, "romanization": string (IAST/ISO-15919), "words": [{"src": word in translation, "gloss": short English meaning}], "note": one short sentence on grammar, register or uncertainty}.`
  const reply = String((await api.ai.chat({ persona: 'translator', system, messages: [{ role: 'user', content: text }], max_tokens: 800 })) || '')
  const m = reply.match(/\{[\s\S]*\}/)
  if (m) {
    try {
      const o = JSON.parse(m[0])
      if (o.translation) return o
    } catch {
      /* fall through to plain text */
    }
  }
  return { translation: reply.trim() }
}

interface DeriveTok {
  raw?: string
  sa?: string
  form?: string
}

/** Sanskrit (any script) → word-by-word sound-law reconstruction. */
export function deriveText(saText: string, mode: string): DeriveTok[] {
  return saText.split(/(\s+|[।॥.,;!?]+)/).map((tok) => {
    if (!tok.trim() || /^[\s।॥.,;!?]+$/.test(tok)) return { raw: tok }
    const iast = LIPI.convert(tok, 'iast').replace(/[^a-zāīūṛṝḷḹṅñṭḍṇśṣṃḥ']/gi, '')
    if (!iast) return { raw: tok }
    const d = SOUND.mia(iast, mode)
    return { sa: iast, form: d.form }
  })
}

/** Runs one translation along the given route (no AI fallback handling here). */
export async function runRoute(kind: RouteKind, text: string, sl: string, dl: string): Promise<Omit<TrResult, 'sl' | 'dl' | 'src'>> {
  if (kind === 'same') {
    const det = LIPI.detect(text)
    return { text, roman: det && det !== 'latin' ? LIPI.convert(text, 'iast') : '', engine: 'Same language: view it in other scripts below' }
  }
  if (kind === 'ai') {
    const o = await ai(text, sl, dl)
    return { text: o.translation, roman: o.romanization || '', words: o.words, note: o.note, engine: 'Mirava AI' }
  }
  if (kind === 'mt') return { text: await mt(text, sl, dl), engine: 'MyMemory public MT' }
  if (kind === 'derive') {
    const D = L(dl)
    const sa = sl === 'sa' ? text : await mt(text, sl, 'sa')
    const toks = deriveText(sa, D.derive!)
    const iastOut = toks.map((t) => (t.raw != null ? t.raw.replace(/[।॥]/g, (m) => (m === '।' ? ' |' : ' ||')) : t.form)).join('')
    return {
      text: toks.map((t) => (t.raw != null ? t.raw : LIPI.convertIAST(t.form!, 'deva'))).join(''),
      roman: iastOut,
      pivot: sa,
      words: toks.filter((t) => t.form).map((t) => ({ src: t.form!, gloss: 'from Sanskrit ' + t.sa })),
      engine: 'Sanskrit pivot → Middle Indo-Aryan sound laws',
      rule: true,
      script: D.s ?? undefined,
    }
  }
  throw new Error(
    `${L(sl).g === 'classical' ? 'Reading ' + L(sl).n : 'Writing ' + L(dl).n} needs the Mirava AI engine, which isn't enabled on this site. Meanwhile, try the Verse Reader for classical texts, or translate into Sanskrit, Pali or Prakrit.`,
  )
}
