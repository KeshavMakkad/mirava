import { useEffect, useRef, useState } from 'react'
import { CHAINS, type Chain } from './data'
import { LIPI, SOUND, type SoundResult } from './engines'

const STOPS = [
  { k: 'sa', t: 'Sanskrit', era: 'c. 1500–500 BCE · Vedic & Classical', c: '#f1b43c', sc: 'deva' },
  { k: 'pi', t: 'Pali', era: "c. 5th–3rd c. BCE · the Buddha's word", c: '#4cc9a0', sc: 'brah' },
  { k: 'pk', t: 'Mahārāṣṭrī Prakrit', era: 'c. 1st–9th c. CE · songs & drama', c: '#b98cff', sc: 'brah' },
  { k: 'hi', t: 'Hindi (and kin)', era: 'Today', c: '#ff8a5c', sc: 'deva' },
] as const

const norm = (w: string) => w.toLowerCase().replace(/[ḥṃ]$/, '').replace(/m$/, '')
function findChain(iast: string): Chain | undefined {
  const n = norm(iast)
  return CHAINS.find((c) => norm(c[0]) === n || norm(c[0]) === n.replace(/a$/, ''))
}

interface StopView {
  k: string
  t: string
  era: string
  c: string
  big: string
  alt: string
  ro: string
  sayText: string
  rule: { title?: string; quote?: string; predicted?: string; same?: boolean; hiNote?: boolean; laws: string[] }
}

type Result = { error: string } | { stops: StopView[]; chain: Chain | undefined }

function travel(input: string): Result {
  const raw = input.trim().split(/\s+/)[0] || 'hasta'
  const iast = LIPI.isLatin(raw) ? raw.toLowerCase().normalize('NFC') : LIPI.convert(raw, 'iast')
  if (!/[aāiīuūṛeo]/.test(iast)) return { error: 'Please enter a Sanskrit word, e.g. hasta or हस्त.' }
  const d = SOUND.derive(iast), ch = findChain(iast)
  const vals: Record<string, { rule: SoundResult; att?: string; deva?: string }> = {
    pi: { rule: d.pali, att: ch && ch[2] },
    pk: { rule: d.pk, att: ch && ch[3] },
    hi: { rule: d.hi, att: ch && ch[4], deva: ch && ch[5] },
  }
  const stops = STOPS.map((s): StopView => {
    if (s.k === 'sa') {
      const big = LIPI.convertIAST(iast, 'deva')
      return {
        ...s, big, ro: iast, alt: LIPI.convertIAST(iast, 'brah'), sayText: LIPI.convertIAST(iast, 'deva'),
        rule: { quote: ch ? ch[1] : undefined, laws: [] },
      }
    }
    const v = vals[s.k], form = v.att || v.rule.form
    const big = s.k === 'hi' ? v.deva || LIPI.toDevaHindi(form) : LIPI.convertIAST(form, s.sc)
    return {
      ...s,
      big,
      ro: form,
      alt: s.k === 'hi' ? '' : LIPI.convertIAST(form, 'deva'),
      sayText: s.k === 'hi' ? big : LIPI.convertIAST(form, 'deva'),
      rule: {
        title: v.att ? 'Attested.' : 'Reconstructed by rule.',
        predicted: v.att ? v.rule.form : undefined,
        same: v.att ? v.rule.form === v.att : undefined,
        hiNote: !v.att && s.k === 'hi',
        laws: (v.rule.notes || []).slice(0, 4),
      },
    }
  })
  return { stops, chain: ch }
}

interface Props {
  active: boolean
  speak: (text: string, lang?: string | null) => void
}

/** Word Time Machine: Sanskrit → Pali → Prakrit → Hindi via sound laws. */
export function TimeMachine({ active, speak }: Props) {
  const [input, setInput] = useState('hasta')
  const [result, setResult] = useState<Result | null>(null)
  const [shown, setShown] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)
  const rafs = useRef<number[]>([])

  const run = (word = input) => {
    rafs.current.forEach(cancelAnimationFrame)
    setShown(false)
    setResult(travel(word))
    // Two frames so the cards transition in (legacy double-rAF).
    const a = requestAnimationFrame(() => {
      const b = requestAnimationFrame(() => setShown(true))
      rafs.current.push(b)
    })
    rafs.current = [a]
  }

  useEffect(() => () => rafs.current.forEach(cancelAnimationFrame), [])

  // Like the legacy page, the first journey runs when the tab is first opened.
  useEffect(() => {
    if (active && !result) run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  const pick = (w: string, scroll = false) => {
    setInput(w)
    run(w)
    if (scroll) trackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const ch = result && 'stops' in result ? result.chain : undefined

  return (
    <section className={active ? 'pane on' : 'pane'} id="p-tm">
      <div className="intro">
        <div>
          <h2>
            Word Time Machine: <em>2,500 years in four stops</em>
          </h2>
          <p>
            Enter a Sanskrit word in Devanagari or IAST. The engine applies the real sound laws of Middle Indo-Aryan:
            assimilation, shortening, the softening of consonants between vowels. Where history is recorded, you'll see the
            attested forms and where the rules were broken.
          </p>
        </div>
      </div>
      <div className="tm-in">
        <input
          className="in"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') run()
          }}
          placeholder="e.g. hasta, agni, कर्म, candra"
          aria-label="Sanskrit word"
        />
        <button className="btn gold" type="button" onClick={() => run()}>
          Travel →
        </button>
        <button className="btn" type="button" onClick={() => pick(CHAINS[Math.floor(Math.random() * CHAINS.length)][0])}>
          🎲 Surprise me
        </button>
      </div>
      <div className="track" ref={trackRef}>
        {result && 'error' in result && <div className="notice err">{result.error}</div>}
        {result &&
          'stops' in result &&
          result.stops.map((s, i) => (
            <div
              key={s.k}
              className={shown ? 'st in' : 'st'}
              style={{ ['--c' as string]: s.c, transitionDelay: `${i * 0.18}s` }}
            >
              <div className="dot"></div>
              <div className="era">{s.era}</div>
              <h4>{s.t}</h4>
              <div className="big">{s.big}</div>
              {s.alt && <div className="alt">{s.alt}</div>}
              <div className="ro">{s.ro}</div>
              <div className="rule">
                {s.k === 'sa' ? (
                  s.rule.quote ? `“${s.rule.quote}”` : 'Your word'
                ) : (
                  <>
                    <b>{s.rule.title}</b>{' '}
                    {s.rule.predicted !== undefined ? (
                      <>
                        Sound laws predict <i>{s.rule.predicted}</i>{' '}
                        <span className={s.rule.same ? 'ok' : 'no'}>
                          {s.rule.same ? '✓ match' : '✗ history took another path'}
                        </span>
                      </>
                    ) : s.rule.hiNote ? (
                      'Modern outcomes are irregular; treat this as a likely shape, not a fact.'
                    ) : null}
                    {s.rule.laws.length > 0 && (
                      <div className="laws">
                        {s.rule.laws.map((n) => (
                          <span key={n}>{n}</span>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
              <button className="btn sm" type="button" style={{ marginTop: 10 }} onClick={() => speak(s.sayText, 'hi-IN')}>
                🔊 Hear
              </button>
            </div>
          ))}
      </div>
      <div>
        {result && 'stops' in result &&
          (ch ? (
            <div className="card tm-note">
              {ch[6].length > 0 && (
                <>
                  <div className="k">Cousins in other languages today</div>
                  <div className="cousins">
                    {ch[6].map((c) => (
                      <div key={c[0]}>
                        <small>{c[0]}</small>
                        <b>{c[1]}</b>
                        <small>
                          <i>{c[2]}</i>
                        </small>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {ch[7] && (
                <p className="vnote" style={{ marginTop: ch[6].length ? 12 : 0 }}>
                  💡 {ch[7]}
                </p>
              )}
              {!ch[6].length && !ch[7] && <p className="vnote">A well-recorded journey: every stop above is attested in texts.</p>}
            </div>
          ) : (
            <div className="notice tm-note">
              This word isn't in Mirava's attested list, so the Pali, Prakrit and Hindi stops are rule-based predictions. Real
              words sometimes break the rules, borrow, or change meaning. Try one of the famous journeys below to compare
              prediction with history.
            </div>
          ))}
      </div>
      <div className="tm-words">
        <div className="k" style={{ marginBottom: 8 }}>
          Famous journeys: tap a modern word to see where it came from
        </div>
        <div className="chips">
          {CHAINS.map((c) => (
            <button key={c[0]} type="button" className="chip ind" onClick={() => pick(c[0], true)}>
              {c[5]} <span style={{ opacity: 0.6 }}>· {c[1]}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
