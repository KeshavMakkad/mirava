/**
 * "Vedic Maths · Daily habit" drill from the new vedicmaths.html: 36 generated
 * questions (12 each for fast addition, squares ending in five and Nikhilam)
 * with the method shown after every answer. English copy matches the HTML so
 * the i18n dictionary keys line up.
 */
import { useState, type FormEvent } from 'react'

type Technique = 'addition' | 'squares' | 'nikhilam'
interface Question {
  q: string
  a: number
  h: string
}

const SETS: Record<Technique, Question[]> = {
  addition: Array.from({ length: 12 }, (_, i) => {
    const a = 47 + 7 * i,
      b = 38 + 9 * i,
      rounded = Math.ceil(b / 10) * 10
    return {
      q: `${a} + ${b} = ?`,
      a: a + b,
      // b = 110 is already round; the HTML said "subtract 0" there.
      h:
        rounded === b
          ? `${b} is already a round number. Calculate ${a} + ${b} directly.`
          : `Round ${b} to ${rounded}. Calculate ${a} + ${rounded} then subtract ${rounded - b}.`,
    }
  }),
  squares: Array.from({ length: 12 }, (_, i) => {
    const n = 15 + 10 * i,
      t = Math.floor(n / 10)
    return { q: `${n}² = ?`, a: n * n, h: `Multiply ${t} × ${t + 1} = ${t * (t + 1)}; append 25 → ${n * n}.` }
  }),
  nikhilam: Array.from({ length: 12 }, (_, i) => {
    const a = 99 - i,
      b = 98 - i
    return {
      q: `${a} × ${b} = ?`,
      a: a * b,
      h: `Use base 100: deficits ${100 - a} and ${100 - b}; cross-subtract ${a} − ${100 - b} = ${a + b - 100}; right part ${100 - a} × ${100 - b}. Combine as ${a * b}.`,
    }
  }),
}

export function HabitPractice() {
  const [technique, setTechnique] = useState<Technique>('addition')
  const [pos, setPos] = useState(0)
  const [answer, setAnswer] = useState('')
  const [explanation, setExplanation] = useState('')

  const list = SETS[technique]
  const idx = pos % list.length
  const x = list[idx]

  const reset = () => {
    setAnswer('')
    setExplanation('')
  }
  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (answer.trim() === '') return
    const ok = Number(answer) === x.a
    setExplanation((ok ? '✓ Correct! ' : 'Not quite. Answer: ' + x.a + '. ') + x.h)
  }

  return (
    <section
      id="miravaHabitPractice"
      style={{
        padding: '70px 6vw',
        background: '#251d27',
        color: '#ffebd3',
        maxWidth: '100%',
        font: '500 16px Manrope,sans-serif',
      }}
    >
      <div style={{ maxWidth: 1000, margin: 'auto' }}>
        <small style={{ letterSpacing: '.18em', color: '#f6c87e' }}>VEDIC MATHS · DAILY HABIT</small>
        <h2 style={{ font: '600 clamp(35px,5vw,60px) Playfair Display,serif', margin: '18px 0' }}>
          Learn the technique. <em>Then master it.</em>
        </h2>
        <p>
          36 generated practice questions across Nikhilam, squares ending in five and fast addition. Every answer
          includes the method.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', margin: '20px 0' }}>
          <label htmlFor="habitTechnique">Technique</label>
          <select
            id="habitTechnique"
            style={{ padding: 12, borderRadius: 9, color: '#26161a', background: '#fff' }}
            value={technique}
            onChange={(e) => {
              setTechnique(e.target.value as Technique)
              setPos(0)
              reset()
            }}
          >
            <option value="addition">Fast addition</option>
            <option value="squares">Squares ending in five</option>
            <option value="nikhilam">Nikhilam multiplication</option>
          </select>
          <b id="habitCount">
            {idx + 1} / {list.length}
          </b>
        </div>
        <div style={{ background: '#fff9ed', color: '#442932', padding: 25, borderRadius: 18 }}>
          <p id="habitProblem" style={{ font: '600 33px Playfair Display, serif' }}>
            {x.q}
          </p>
          <form id="habitForm" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }} onSubmit={onSubmit}>
            <input
              id="habitAnswer"
              required
              type="number"
              inputMode="numeric"
              placeholder="Your answer"
              aria-label="Your answer"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              style={{
                minWidth: 180,
                flex: 1,
                padding: 13,
                border: '1px solid #bd9883',
                borderRadius: 9,
                color: '#442932',
                background: '#fff',
              }}
            />
            <button
              type="submit"
              style={{
                padding: '13px 20px',
                border: 0,
                borderRadius: 9,
                background: '#732b3e',
                color: 'white',
                fontWeight: 700,
              }}
            >
              Check answer
            </button>
          </form>
          <p id="habitExplanation" role="status" style={{ padding: '10px 0', lineHeight: 1.8 }}>
            {explanation}
          </p>
          <button
            id="habitNext"
            type="button"
            style={{ padding: '12px 18px', background: '#ead4b2', border: 0, borderRadius: 9, color: '#442932' }}
            onClick={() => {
              setPos((p) => p + 1)
              reset()
            }}
          >
            Next question →
          </button>
        </div>
      </div>
    </section>
  )
}
