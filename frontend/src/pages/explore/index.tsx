import { useRef, useState } from 'react'
import { PageScope } from '../../components/PageScope'
import { DailyQuizModal } from '../../components/quiz/DailyQuizModal'
// Stylesheets in legacy document order (base <head> styles → Leaflet → sections → late patches).
import './base.page.css'
import 'leaflet/dist/leaflet.css'
import './time.page.css'
import './civilizations.page.css'
import './festivals.page.css'
import './languages.page.css'
import './museum.page.css'
import './pricing.page.css'
import './newsroom.page.css'
import './late.page.css'
import './additions.page.css'
import { Atlas } from './sections/Atlas'
import { Civilizations } from './sections/Civilizations'
import { Festivals } from './sections/Festivals'
import { Footer } from './sections/Footer'
import { Hero } from './sections/Hero'
import { KingChat } from './sections/KingChat'
import { Languages } from './sections/Languages'
import { Museum } from './sections/Museum'
import { Newsroom } from './sections/Newsroom'
import { Pricing } from './sections/Pricing'
import { ShivajiGame } from './sections/ShivajiGame'
import { TimeTravel } from './sections/TimeTravel'
import { useHashScroll, usePageEffects } from './usePageEffects'

/** The member atlas: map, time travel, civilizations, festivals, languages, museum, pricing and news. */
export default function ExplorePage() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [quizOpen, setQuizOpen] = useState(false)
  const [shivajiOpen, setShivajiOpen] = useState(false)
  usePageEffects(rootRef)
  useHashScroll(rootRef)

  return (
    <PageScope name="explore" title="Mirava Atlas — India, in every era">
      <div ref={rootRef} className={quizOpen ? 'explore-quiz-open' : undefined}>
        <div className="noise"></div>
        <div id="miravaScrollProgress" aria-hidden="true"></div>
        <div id="miravaCursorGlow" aria-hidden="true"></div>
        <button id="miravaBackTop" type="button" aria-label="Back to top" title="Back to top">
          ↑
        </button>

        <Hero onOpenQuiz={() => setQuizOpen(true)} onOpenShivaji={() => setShivajiOpen(true)} />
        <Atlas />
        <TimeTravel />
        <Civilizations />
        <Festivals />
        <Languages />
        <Museum />
        <Pricing />
        <Newsroom />
        <Footer />

        <KingChat />
        <ShivajiGame open={shivajiOpen} onClose={() => setShivajiOpen(false)} />
        <DailyQuizModal open={quizOpen} onClose={() => setQuizOpen(false)} />
      </div>
    </PageScope>
  )
}
