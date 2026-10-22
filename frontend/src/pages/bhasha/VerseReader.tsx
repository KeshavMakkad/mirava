import { useState } from 'react'
import { VERSES, type Verse } from './data'
import { INFO, LIPI } from './engines'

interface Props {
  active: boolean
  speak: (text: string, lang?: string | null) => void
  onCarve: (text: string, script: string) => void
  onTranslate: (text: string, sl: string) => void
}

const verseLangCode = (v: Verse) =>
  v.lang.startsWith('Pali') ? 'pi' : v.base === 'taml' ? (v.lang.includes('Sangam') ? 'ota' : 'ta') : v.lang.startsWith('Prakrit') ? 'pra' : 'sa'

/** Verse Reader: classical verses glossed word by word, in any script. */
export function VerseReader({ active, speak, onCarve, onTranslate }: Props) {
  const [vsI, setVsI] = useState(0)
  const [vsScript, setVsScript] = useState<string | null>(null)
  const [vsWord, setVsWord] = useState(-1)
  const v = VERSES[vsI]
  const sc = vsScript || v.show || v.base
  const opts = [v.base, 'brah', ...(v.base === 'taml' ? ['gran', 'mlym', 'deva'] : ['khar', 'shrd', 'sidd', 'gran', 'beng', 'taml']), 'iast'].filter(
    (x, i, a) => a.indexOf(x) === i,
  )
  const lang = v.base === 'taml' ? 'ta-IN' : 'hi-IN'
  const rtl = INFO[sc].rtl ? 'rtl' : undefined

  return (
    <section className={active ? 'pane on' : 'pane'} id="p-vs">
      <div className="intro">
        <div>
          <h2>
            Verse Reader: <em>read the classics word by word</em>
          </h2>
          <p>
            Sanskrit, Pali, Ashokan Prakrit and Sangam Tamil, with every word glossed. Switch scripts to see the same line as
            it might have been written 2,000 years ago.
          </p>
        </div>
      </div>
      <div className="vs-wrap">
        <div className="vs-list">
          {VERSES.map((x, i) => (
            <button
              key={x.id}
              type="button"
              className={i === vsI ? 'on' : ''}
              onClick={() => {
                setVsI(i)
                setVsScript(null)
                setVsWord(-1)
              }}
            >
              <b>{x.lang}</b>
              <small>{x.src}</small>
            </button>
          ))}
        </div>
        <div className="card vs-main">
          <div className="k">
            <span>{v.lang}</span> · <span>{v.src}</span>
          </div>
          <div className="scriptrow" style={{ marginTop: 10 }}>
            {opts.map((s) => (
              <button key={s} type="button" className={s === sc ? 'on' : ''} onClick={() => setVsScript(s)}>
                {INFO[s].n.split(' ')[0]}
              </button>
            ))}
          </div>
          <div className="vtext" translate="no" dir={rtl}>
            {LIPI.convert(v.text, sc)}
          </div>
          <div className="vrom" translate="no">{v.words.map((w) => w[1]).join(' ')}</div>
          <div className="inter">
            {v.words.map((w, i) => (
              <button
                key={i}
                type="button"
                className={i === vsWord ? 'on' : ''}
                onClick={() => {
                  setVsWord(i)
                  speak(w[0], lang)
                }}
              >
                <b translate="no" dir={rtl}>{sc === 'iast' ? w[1] : LIPI.convert(w[0], sc)}</b>
                <i translate="no">{w[1]}</i>
                <small>{w[2]}</small>
              </button>
            ))}
          </div>
          <div className="vtr">“{v.tr}”</div>
          {v.note && <p className="vnote">💡 {v.note}</p>}
          <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn sm" type="button" onClick={() => speak(v.text, lang)}>
              🔊 Recite
            </button>
            <button className="btn sm" type="button" onClick={() => onCarve(v.text.slice(0, 200), sc === 'iast' ? 'brah' : sc)}>
              🪨 Carve this verse
            </button>
            <button className="btn sm" type="button" onClick={() => onTranslate(v.text, verseLangCode(v))}>
              🔁 Open in translator
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
