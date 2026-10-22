import { INFO, LIPI } from './engines'
import { copyText } from './hooks'

const LP_EX = ['नमस्ते भारत', 'सत्यमेव जयते', 'Priya Sharma', 'kṛṣṇa', 'யாதும் ஊரே', 'ভারত', 'ಕನ್ನಡ', 'dhammo']

interface Props {
  active: boolean
  text: string
  setText: (t: string) => void
  ancient: boolean
  setAncient: (v: boolean) => void
  openStudio: (sid: string) => void
  toast: (m: string) => void
  speak: (text: string, lang?: string | null) => void
  speakIndic: (text: string) => void
}

/** Lipi Lens: one text live-converted into seventeen scripts. */
export function LipiLens({ active, text, setText, ancient, setAncient, openStudio, toast, speak, speakIndic }: Props) {
  const list = LIPI.ORDER.filter((s) => !ancient || INFO[s].ancient || s === 'deva')
  return (
    <section className={active ? 'pane on' : 'pane'} id="p-lp">
      <div className="intro">
        <div>
          <h2>
            Lipi Lens: <em>one text, seventeen scripts</em>
          </h2>
          <p>
            Type in any Indian script or in Roman letters. Use IAST for exact spellings, e.g. <i translate="no">kṛṣṇa</i>; plain spellings
            like <i translate="no">Priya Sharma</i> work too. Every script updates live. Tap a card to carve it on stone, palm leaf or copper
            plate.
          </p>
        </div>
      </div>
      <input className="in" id="lpIn" value={text} onChange={(e) => setText(e.target.value)} aria-label="Text to convert" maxLength={200} />
      <div className="lp-tools">
        <div className="chips">
          {LP_EX.map((e) => (
            <button key={e} type="button" className="chip ind" translate="no" onClick={() => setText(e)}>
              {e}
            </button>
          ))}
        </div>
        <span className="sp"></span>
        <label className="chip">
          <input
            type="checkbox"
            checked={ancient}
            onChange={(e) => setAncient(e.target.checked)}
            style={{ accentColor: 'var(--gold)', marginRight: 6 }}
          />
          Ancient scripts only
        </label>
      </div>
      <div className="lp-grid">
        {list.map((s) => {
          const out = text.trim() ? LIPI.convert(text, s) : ''
          const info = INFO[s]
          return (
            <div
              key={s}
              className={info.ancient ? 'lp anc' : 'lp'}
              tabIndex={0}
              role="button"
              aria-label={`${info.n}: open in inscription studio`}
              onClick={() => openStudio(s)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target === e.currentTarget) openStudio(s)
              }}
            >
              <div className="nm">
                <span>
                  {info.n} {info.ancient && <span className="badge">ancient</span>}
                </span>
                <small>{info.era}</small>
              </div>
              <div
                className="tx"
                translate="no"
                dir={info.rtl ? 'rtl' : undefined}
                style={s === 'iast' ? { fontFamily: "'Noto Serif',Georgia,serif", fontStyle: 'italic', fontSize: 22 } : undefined}
              >
                {out || <span style={{ opacity: 0.3 }}>—</span>}
              </div>
              <div className="acts">
                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation()
                    toast((await copyText(LIPI.convert(text, s))) ? 'Copied ' + info.n : 'Copy failed')
                  }}
                >
                  Copy
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (info.lang) speak(LIPI.convert(text, s), info.lang)
                    else speakIndic(text)
                  }}
                >
                  🔊
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
