import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { PageScope } from '../../components/PageScope'
import './bhasha.page.css'
import { INFO, LIPI } from './engines'
import { useNotoFonts, useSpeech, useToasts } from './hooks'
import { KinWords } from './KinWords'
import { LipiLens } from './LipiLens'
import { Studio } from './Studio'
import { TimeMachine } from './TimeMachine'
import { Translate, type TranslateRequest } from './Translate'
import { VerseReader } from './VerseReader'

type Tab = 'tr' | 'lp' | 'tm' | 'kn' | 'vs'
const TABS: Tab[] = ['tr', 'lp', 'tm', 'kn', 'vs']
const MORPH_SEQ = ['deva', 'brah', 'taml', 'beng', 'gran', 'telu', 'sidd', 'guru', 'khar', 'mlym', 'shrd', 'gujr', 'knda', 'tirh', 'orya', 'modi', 'iast']

function initialTab(): Tab {
  const h = window.location.hash.slice(1)
  return (TABS as string[]).includes(h) ? (h as Tab) : 'tr'
}

/** "namaste" morphing through the scripts in the hero. */
function Morph() {
  const [i, setI] = useState(0)
  const [out, setOut] = useState(false)
  useEffect(() => {
    let inner = 0
    const iv = window.setInterval(() => {
      setOut(true)
      inner = window.setTimeout(() => {
        setI((n) => (n + 1) % MORPH_SEQ.length)
        setOut(false)
      }, 450)
    }, 2200)
    return () => {
      clearInterval(iv)
      clearTimeout(inner)
    }
  }, [])
  const sid = MORPH_SEQ[i]
  return (
    <div className="morph" aria-hidden="true">
      <div className={out ? 'w out' : 'w'}>{i === 0 ? 'नमस्ते' : LIPI.convert('नमस्ते', sid)}</div>
      <div className="s">{i === 0 ? 'Devanagari' : INFO[sid].n + ' · ' + INFO[sid].era}</div>
      <div className="m">"namaste", one word in many scripts</div>
    </div>
  )
}

/** Mirava Bhāṣā — Living Translator of India (port of legacy Bhasha.html). */
export default function Bhasha() {
  useNotoFonts()
  const { user } = useAuth()
  const { toasts, toast } = useToasts()
  const { speak, speakIndic } = useSpeech(toast)
  const [tab, setTab] = useState<Tab>(initialTab)
  const [aiUnavailable, setAiUnavailable] = useState(false)
  const aiOn = !!user && !aiUnavailable
  const [lpText, setLpText] = useState('नमस्ते भारत')
  const [lpAncient, setLpAncient] = useState(false)
  const [studio, setStudio] = useState<{ open: boolean; script: string }>({ open: false, script: 'brah' })
  const [trRequest, setTrRequest] = useState<TranslateRequest | null>(null)

  const showTab = useCallback((t: Tab) => {
    setTab(t)
    try {
      window.history.replaceState(window.history.state, '', '#' + t)
    } catch {
      /* ignore */
    }
  }, [])

  const openStudio = useCallback((s: string) => setStudio({ open: true, script: s === 'iast' ? 'brah' : s }), [])
  const closeStudio = useCallback(() => setStudio((st) => ({ ...st, open: false })), [])

  const carve = (text: string, script = 'brah') => {
    setLpText(text)
    showTab('lp')
    openStudio(script)
  }

  return (
    <PageScope name="bhasha" title="Mirava Bhāṣā — Living Translator of India">
      <header className="top">
        <Link className="brand" to="/explore" title="Back to the Mirava atlas">
          Mirava<i>.</i>
        </Link>
        <span className="tag">🪶 Bhāṣā</span>
        <span className="sp"></span>
        <Link className="tbtn" to="/explore">
          ← <span>Atlas</span>
        </Link>
      </header>

      <section className="hero">
        <div>
          <div className="k">Translate · transliterate · time-travel</div>
          <h1>
            Every word has
            <br />
            <em>a family and a past.</em>
          </h1>
          <p>
            Translate between 27 languages, from Sanskrit, Pali and Prakrit to every modern tongue. Rewrite any text in Brahmi
            as Ashoka carved it. Watch a word travel 2,500 years from Sanskrit to Hindi, and meet its cousins in all four of
            India's language families.
          </p>
          <div className="stats">
            <div>
              <b>27</b>
              <small>languages</small>
            </div>
            <div>
              <b>17</b>
              <small>scripts, Brahmi to Malayalam</small>
            </div>
            <div>
              <b>2,500</b>
              <small>years of sound change</small>
            </div>
            <div>
              <b>4</b>
              <small>language families</small>
            </div>
          </div>
        </div>
        <Morph />
      </section>

      <div className="tabs">
        <nav role="tablist">
          {(
            [
              ['tr', '🔁 Translate', '27 languages'],
              ['lp', '🪨 Lipi Lens', '17 scripts'],
              ['tm', '⏳ Word Time Machine', ''],
              ['kn', '🌳 Kin Words', ''],
              ['vs', '📜 Verse Reader', ''],
            ] as [Tab, string, string][]
          ).map(([t, label, small]) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => showTab(t)}>
              {label} {small && <small>{small}</small>}
            </button>
          ))}
        </nav>
      </div>

      <main>
        <Translate
          active={tab === 'tr'}
          aiOn={aiOn}
          onAiUnavailable={() => setAiUnavailable(true)}
          request={trRequest}
          toast={toast}
          speak={speak}
          speakIndic={speakIndic}
          onCarve={(text) => carve(text, 'brah')}
        />
        <LipiLens
          active={tab === 'lp'}
          text={lpText}
          setText={setLpText}
          ancient={lpAncient}
          setAncient={setLpAncient}
          openStudio={openStudio}
          toast={toast}
          speak={speak}
          speakIndic={speakIndic}
        />
        <TimeMachine active={tab === 'tm'} speak={speak} />
        <KinWords active={tab === 'kn'} toast={toast} speak={speak} />
        <VerseReader
          active={tab === 'vs'}
          speak={speak}
          onCarve={carve}
          onTranslate={(text, sl) => {
            setTrRequest((r) => ({ id: (r?.id ?? 0) + 1, src: text, sl, dl: 'en' }))
            showTab('tr')
          }}
        />
      </main>

      <footer>
        <b>How Bhāṣā works.</b>
        <ul style={{ margin: '6px 0 0 18px' }}>
          <li>
            Script conversion, the time machine, kin words and the verse reader run entirely in your browser and work offline.
            The script tables come from the Unicode Character Database.
          </li>
          <li>
            Modern-language translation uses the free public MyMemory engine. Quality varies, and there's a daily allowance
            per device.
          </li>
          <li>
            Pali and Prakrit output without AI is a rule-based reconstruction from Sanskrit, not a scholar's translation.
            Treat it as a learning tool.
          </li>
          <li>
            Full AI translation for every language, including Ardhamāgadhī and Sangam Tamil, runs through the Mirava server
            when you are signed in, the same one used by "Talk to history" on the atlas. No API key ever reaches this page.
            {!aiOn && ' Mirava AI is currently unavailable, so the free engines are used.'}
          </li>
        </ul>
      </footer>

      <Studio open={studio.open} script={studio.script} text={lpText} onClose={closeStudio} />
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={t.out ? 'toast out' : 'toast'}>
            {t.msg}
          </div>
        ))}
      </div>
    </PageScope>
  )
}
