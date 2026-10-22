import { useState, type CSSProperties } from 'react'
import { FAMILIES, KIN, KIN_LANGS } from './data'
import { L } from './translateEngine'

const ROOT_COL = ['#f1b43c', '#4cc9a0', '#ff8a5c', '#7aa7ff', '#e47bd0', '#b5e35c', '#9aa0a6']

interface Props {
  active: boolean
  toast: (m: string) => void
  speak: (text: string, lang?: string | null) => void
}

/** Kin Words: cognates across India's four language families, coloured by root. */
export function KinWords({ active, toast, speak }: Props) {
  const [kinI, setKinI] = useState(0)
  const [focus, setFocus] = useState<string | null>(null)
  const K = KIN[kinI]
  const roots = Object.keys(K.roots)
  const col: Record<string, string> = {}
  roots.forEach((r, i) => (col[r] = r === 'x' ? '#6b5f63' : ROOT_COL[i % ROOT_COL.length]))

  const say = (c: string) => {
    const w = K.w[c], l = L(c)
    if (w[0] && l && l.tts) speak(w[0], l.tts)
    else if (c === 'sa' || c === 'pi') speak(w[0], 'hi-IN')
    else if (c === 'en') speak(w[1], 'en-IN')
    else toast(`${KIN_LANGS.find((x) => x[0] === c)![1]}: ${w[1]}`)
  }

  return (
    <section className={active ? 'pane on' : 'pane'} id="p-kn">
      <div className="intro">
        <div>
          <h2>
            Kin Words: <em>India's four language families</em>
          </h2>
          <p>
            Pick an idea. Each language's word is coloured by its root, so you can see which languages inherited the same
            ancient word and which took a different path. English sometimes turns up as a distant Indo-European cousin.
          </p>
        </div>
      </div>
      <div className="chips">
        {KIN.map((k, i) => (
          <button
            key={k.k}
            type="button"
            className={i === kinI ? 'chip on' : 'chip'}
            onClick={() => {
              setKinI(i)
              setFocus(null)
            }}
          >
            {k.i} {k.k}
          </button>
        ))}
      </div>
      <div className="fams">
        {Object.values(FAMILIES).map(([n, c]) => (
          <span key={n}>
            <i style={{ background: c }}></i>
            {n}
          </span>
        ))}
        <span>· the coloured dot on each tile marks its root</span>
      </div>
      <div className="legend">
        {roots.map((r) => {
          const n = KIN_LANGS.filter((l) => K.w[l[0]] && K.w[l[0]][2] === r).length
          return (
            <button key={r} type="button" className={focus === r ? 'on' : ''} onClick={() => setFocus(focus === r ? null : r)}>
              <i style={{ background: col[r] }}></i>
              <span>
                {K.roots[r]} <b style={{ color: 'var(--mute)' }}>· {n}</b>
              </span>
            </button>
          )
        })}
      </div>
      <div className="kin-grid">
        {KIN_LANGS.map(([c, n, f]) => {
          const w = K.w[c]
          if (!w) return null
          const style = { '--fc': FAMILIES[f][1], '--rc': col[w[2]] } as CSSProperties
          return (
            <div
              key={c}
              className={focus && w[2] !== focus ? 'kw dim' : 'kw'}
              style={style}
              title={FAMILIES[f][0]}
              role="button"
              tabIndex={0}
              onClick={() => say(c)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') say(c)
              }}
            >
              <div className="ln">
                <span>{n}</span>
                <span>{FAMILIES[f][0].split(' ')[0]}</span>
              </div>
              <div className="nt" translate="no">
                {w[0] || w[1]}
              </div>
              <div className="rm" translate="no">
                {w[1]}
              </div>
              <span className="rt"></span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
