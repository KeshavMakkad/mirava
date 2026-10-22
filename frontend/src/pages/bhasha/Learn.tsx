import { useMemo, useState } from 'react'

/** [word, meaning, romanisation] */
type Lesson = [string, string, string]
type StudyLang = 'hi' | 'sa' | 'ta' | 'bn' | 'ks'

const LESSONS: Record<StudyLang, Lesson[]> = {
  hi: [
    ['नमस्ते', 'Hello', 'namaste'],
    ['धन्यवाद', 'Thank you', 'dhanyavaad'],
    ['पानी', 'Water', 'paani'],
    ['पुस्तक', 'Book', 'pustak'],
    ['मित्र', 'Friend', 'mitra'],
    ['घर', 'Home', 'ghar'],
  ],
  sa: [
    ['नमस्ते', 'Greetings', 'namaste'],
    ['जलम्', 'Water', 'jalam'],
    ['मित्रम्', 'Friend', 'mitram'],
    ['गृहम्', 'Home', 'griham'],
    ['पुस्तकम्', 'Book', 'pustakam'],
    ['ज्ञानम्', 'Knowledge', 'jñānam'],
  ],
  ta: [
    ['வணக்கம்', 'Hello', 'vanakkam'],
    ['நன்றி', 'Thank you', 'nandri'],
    ['நீர்', 'Water', 'neer'],
    ['நண்பர்', 'Friend', 'nanbar'],
    ['வீடு', 'Home', 'veedu'],
    ['புத்தகம்', 'Book', 'puthagam'],
  ],
  bn: [
    ['নমস্কার', 'Hello', 'nomoshkar'],
    ['ধন্যবাদ', 'Thank you', 'dhonnobad'],
    ['জল', 'Water', 'jol'],
    ['বন্ধু', 'Friend', 'bondhu'],
    ['বাড়ি', 'Home', 'bari'],
    ['বই', 'Book', 'boi'],
  ],
  ks: [
    ['آداب', 'Greetings', 'aadaab'],
    ['شکریہ', 'Thank you', 'shukriya'],
    ['آب', 'Water', 'aab'],
    ['دوست', 'Friend', 'dost'],
    ['گَر', 'Home', 'gar'],
    ['کِتاب', 'Book', 'kitaab'],
  ],
}
const VOICE: Record<StudyLang, string> = { hi: 'hi-IN', sa: 'hi-IN', ta: 'ta-IN', bn: 'bn-IN', ks: 'ur-IN' }

interface Props {
  active: boolean
  speak: (text: string, lang?: string | null) => void
}

/** Bhāṣā Academy: guided word lessons with a hear-it button and a meaning quiz (new in Bhasha.html). */
export function Learn({ active, speak }: Props) {
  const [lang, setLang] = useState<StudyLang>('hi')
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)

  const words = LESSONS[lang]
  const w = words[index % words.length]
  const options = useMemo(
    () =>
      [
        w[1],
        ...words
          .filter((x) => x !== w)
          .slice(0, 3)
          .map((x) => x[1]),
      ].sort((a, b) => a.localeCompare(b)),
    [w, words],
  )
  const ok = picked !== null && picked === w[1]

  const answer = (a: string) => {
    if (picked !== null) return
    setPicked(a)
    if (a === w[1]) setScore((s) => s + 1)
  }

  return (
    <section className={active ? 'pane on' : 'pane'} id="p-learn">
      <div className="intro">
        <div>
          <h2>
            Bhāṣā Academy — <em>learn, practise, remember.</em>
          </h2>
          <p>
            Short guided lessons in Hindi, Sanskrit, Tamil, Bengali and Kashmiri. Learn a word, hear it, then test your
            memory.
          </p>
        </div>
      </div>
      <div className="card" style={{ padding: 25, borderRadius: 20 }}>
        <label htmlFor="studyLanguage">Choose a language</label>
        <select
          className="in"
          id="studyLanguage"
          style={{ margin: '10px 0 24px' }}
          value={lang}
          onChange={(e) => {
            setLang(e.target.value as StudyLang)
            setIndex(0)
            setScore(0)
            setPicked(null)
          }}
        >
          <option value="hi">Hindi</option>
          <option value="sa">Sanskrit</option>
          <option value="ta">Tamil</option>
          <option value="bn">Bengali</option>
          <option value="ks">Kashmiri</option>
        </select>
        <div className="k" id="studyProgress">
          {picked !== null
            ? `${score} correct answers`
            : `Word ${(index % words.length) + 1} of ${words.length} · ${score} correct`}
        </div>
        <h2
          id="studyWord"
          className="ind"
          translate="no"
          dir={lang === 'ks' ? 'rtl' : undefined}
          style={{ fontSize: 46, margin: '18px 0' }}
        >
          {w[0]}
        </h2>
        <p id="studyMeaning" style={{ fontSize: 20 }}>
          {w[1]}
        </p>
        <p id="studyRoman" translate="no">
          {w[2]}
        </p>
        <button className="btn" id="studyListen" type="button" onClick={() => speak(w[0], VOICE[lang])}>
          🔊 Hear it
        </button>{' '}
        <button
          className="btn gold"
          id="studyNext"
          type="button"
          onClick={() => {
            setIndex((i) => i + 1)
            setPicked(null)
          }}
        >
          Next word →
        </button>
        <hr style={{ margin: '28px 0' }} />
        <p id="studyQuestion">
          What does{' '}
          <span translate="no" dir={lang === 'ks' ? 'rtl' : undefined}>
            {w[0]}
          </span>{' '}
          mean?
        </p>
        <div id="studyAnswers" className="chips" style={{ margin: '15px 0' }}>
          {options.map((a) => (
            <button
              key={a}
              type="button"
              className={picked !== null && a === w[1] ? 'btn sm on' : 'btn sm'}
              disabled={picked !== null}
              onClick={() => answer(a)}
            >
              {a}
            </button>
          ))}
        </div>
        <p id="studyFeedback" role="status">
          {picked === null ? '' : ok ? '✓ Correct! Well done.' : 'Try again — the answer is ' + w[1]}
        </p>
      </div>
    </section>
  )
}
