import { useState } from 'react'
import { useLanguage, type Language } from '../../../i18n'
import { COMPARE_ROWS, COMPARE_ROWS_HI, type CompareRow } from '../data/compare'

/*
 * Chronoscope "Then & Now" (new explore.html #miravaCompare). The block is
 * self-localised like the original script: in Hindi mode it renders its own
 * Hindi copy and year narratives (data-mirava-localized keeps the DOM
 * translator away from it).
 */
const FIELDS = ['Governance', 'Everyday life', 'Technology & connectivity', 'Culture & heritage']
const FIELDS_HI = ['शासन', 'दैनिक जीवन', 'प्रौद्योगिकी और संपर्क', 'संस्कृति और विरासत']

const label = (y: number, hi: boolean) => (y < 0 ? `${Math.abs(y)} ${hi ? 'ईसा पूर्व' : 'BCE'}` : String(y))
const localized = (r: CompareRow, hi: boolean): CompareRow =>
  hi && COMPARE_ROWS_HI[r[0]] ? ([r[0], ...COMPARE_ROWS_HI[r[0]]] as CompareRow) : r

function Panel({ row, index, lang }: { row: CompareRow; index: number; lang: Language }) {
  const hi = lang === 'hi'
  const r = localized(row, hi)
  return (
    <article className="cmp-panel">
      <div className="cmp-panel-top">
        <span className="cmp-era-label">
          {index === 0 ? (hi ? 'पहला समय' : 'THE FIRST MOMENT') : hi ? 'दूसरा समय' : 'THE SECOND MOMENT'}
        </span>
        <strong>{label(r[0], hi)}</strong>
        <p>{r[1]}</p>
      </div>
      <div className="cmp-panel-body">
        <p>{r[2]}</p>
        {FIELDS.map((f, i) => (
          <div className="cmp-detail" key={f}>
            <span>{hi ? FIELDS_HI[i] : f.toUpperCase()}</span>
            <p>{r[i + 3]}</p>
          </div>
        ))}
      </div>
    </article>
  )
}

export function TimeCompare() {
  const lang = useLanguage()
  const hi = lang === 'hi'
  const [yearA, setYearA] = useState('1947')
  const [yearB, setYearB] = useState('2025')
  const a = COMPARE_ROWS.find((x) => String(x[0]) === yearA)
  const b = COMPARE_ROWS.find((x) => String(x[0]) === yearB)
  const options = COMPARE_ROWS.map((r) => (
    <option key={r[0]} value={r[0]}>
      {label(r[0], hi)} — {localized(r, hi)[1]}
    </option>
  ))
  const gap = a && b ? Math.abs(a[0] - b[0]) : 0

  return (
    <div id="miravaCompare" aria-labelledby="cmpTitle" data-mirava-localized="true" lang={hi ? 'hi' : undefined}>
      <div className="cmp-kicker">{hi ? 'क्रोनोस्कोप / तब और अब' : 'CHRONOSCOPE / THEN & NOW'}</div>
      <div className="cmp-head">
        <div>
          <h3 id="cmpTitle">
            {hi ? (
              'दो साल, कितना बदलाव'
            ) : (
              <>
                Two years. <em>A world of change.</em>
              </>
            )}
          </h3>
          <p className="cmp-sub">
            {hi
              ? 'भारत के किन्हीं दो ऐतिहासिक वर्षों में शासन, जीवन, तकनीक और संस्कृति की तुलना करें।'
              : 'What changed in India between 1947 and 2025 — or between any two moments you choose? Explore the shifts in government, daily life, technology and cultural heritage, side by side.'}
          </p>
        </div>
        <div className="cmp-signet" aria-hidden="true">
          ⌛
        </div>
      </div>
      <div className="cmp-controls">
        <div className="cmp-field">
          <label htmlFor="compareEraA">{hi ? 'पहला वर्ष चुनें' : '01 / FROM THIS YEAR'}</label>
          <select
            id="compareEraA"
            aria-label={hi ? 'पहला ऐतिहासिक वर्ष चुनें' : 'Choose the first historical year'}
            value={yearA}
            onChange={(e) => setYearA(e.target.value)}
          >
            {options}
          </select>
        </div>
        <button
          type="button"
          id="compareSwap"
          className="cmp-swap"
          aria-label={hi ? 'चुने हुए वर्ष बदलें' : 'Swap comparison years'}
          title={hi ? 'चुने हुए वर्ष बदलें' : 'Swap years'}
          onClick={() => {
            setYearA(yearB)
            setYearB(yearA)
          }}
        >
          ⇄
        </button>
        <div className="cmp-field">
          <label htmlFor="compareEraB">{hi ? 'दूसरा वर्ष चुनें' : '02 / TO THIS YEAR'}</label>
          <select
            id="compareEraB"
            aria-label={hi ? 'दूसरा ऐतिहासिक वर्ष चुनें' : 'Choose the second historical year'}
            value={yearB}
            onChange={(e) => setYearB(e.target.value)}
          >
            {options}
          </select>
        </div>
      </div>
      <div id="compareCards" className="cmp-result" aria-live="polite">
        {a && b && (
          <>
            <div className="cmp-metric">
              <span>{`${label(a[0], hi)}  →  ${label(b[0], hi)}`}</span>
              <span className="cmp-interval">
                {gap === 0
                  ? hi
                    ? 'एक ही समय'
                    : 'SAME MOMENT'
                  : hi
                    ? `लगभग ${gap.toLocaleString('hi-IN')} वर्ष का अंतर`
                    : `ABOUT ${gap.toLocaleString('en-IN')} YEARS APART`}
              </span>
            </div>
            <div className="cmp-panels">
              <Panel row={a} index={0} lang={lang} />
              <Panel row={b} index={1} lang={lang} />
            </div>
            <section className="cmp-change">
              <div className="cmp-change-head">{hi ? 'इन दो समयों में क्या बदला?' : 'WHAT CHANGED BETWEEN THESE MOMENTS'}</div>
              <h4>
                {gap === 0
                  ? hi
                    ? 'एक समय, चार दृष्टिकोण।'
                    : 'One moment, four perspectives.'
                  : hi
                    ? `${label(a[0], hi)} से ${label(b[0], hi)} तक`
                    : `From ${label(a[0], hi)} to ${label(b[0], hi)}`}
              </h4>
              <div className="cmp-change-grid">
                {FIELDS.map((f, i) => {
                  const ar = localized(a, hi)
                  const br = localized(b, hi)
                  return (
                    <div className="cmp-change-item" key={f}>
                      <b>{hi ? FIELDS_HI[i] : f.toUpperCase()}</b>
                      <p>{`${label(a[0], hi)}: ${ar[i + 3]}`}</p>
                      <small>{hi ? '↓  तुलना करें  ↓' : '↓  COMPARE  ↓'}</small>
                      <p>{`${label(b[0], hi)}: ${br[i + 3]}`}</p>
                    </div>
                  )
                })}
              </div>
            </section>
          </>
        )}
      </div>
      <p className="cmp-footnote">
        {hi
          ? 'ये ऐतिहासिक चित्रण व्यापक बदलावों का संक्षिप्त परिचय हैं। शुरुआती तिथियाँ अनुमानित हैं और अलग-अलग क्षेत्रों के अनुभव अलग हो सकते हैं।'
          : "Historical snapshots simplify complex, regionally diverse histories. Early dates are approximate; descriptions reflect broad developments around each selected moment, not every person's experience."}
      </p>
    </div>
  )
}
