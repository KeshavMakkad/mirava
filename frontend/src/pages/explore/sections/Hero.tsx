import type { MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { AccountMenu } from '../../../components/AccountMenu'

interface Props {
  onOpenQuiz: () => void
  onOpenShivaji: () => void
}

/** Legacy page links, now routed inside the SPA. */
const APP_LINKS: [string, string][] = [
  ['/quiz', '🏆 Quiz Arena'],
  ['/apps/lost-legends', '🏆 Game Arena'],
  ['/apps/sentinel', '🏆 PDF'],
  ['/apps/bhasha', '🏆 Bhasha'],
  ['/apps/vedic-maths', '🏆 Vedic Maths '],
  ['/apps/rasoi-rescue', '🏆 Rasoi'],
  ['/apps/jal-parampara', '🏆 JalParampara'],
]

export function Hero({ onOpenQuiz, onOpenShivaji }: Props) {
  const trigger = (fn: () => void) => (e: MouseEvent) => {
    e.preventDefault()
    fn()
  }

  return (
    <header className="hero" id="top">
      <div className="top">
        <a className="brand" href="#top">
          mira<i>va</i>
        </a>
        <nav>
          <a href="#" id="quizTrigger" onClick={trigger(onOpenQuiz)}>
            Daily Quiz
          </a>
          <a href="#" id="shivajiGameTrigger" className="shivaji-link" onClick={trigger(onOpenShivaji)}>
            ⚔️ Shivaji
          </a>
          {APP_LINKS.map(([to, label]) => (
            <Link key={to} to={to}>
              {label}
            </Link>
          ))}
        </nav>
        <AccountMenu className="explore-account" />
      </div>
      <div className="hero-body">
        <div className="eyebrow">The member atlas — India, remembered</div>
        <h1>
          Walk through
          <br />
          <em>every</em> century.
        </h1>
        <p>
          Not a museum of the past — an alive, interactive map of India's makers, monuments, languages, celebrations and
          big ideas.
        </p>
        <div className="hero-actions">
          <a className="pill" href="#atlas">
            Open the atlas <b>↓</b>
          </a>
        </div>
      </div>
      <div className="scroll-note">Begin at the beginning — scroll</div>
    </header>
  )
}
