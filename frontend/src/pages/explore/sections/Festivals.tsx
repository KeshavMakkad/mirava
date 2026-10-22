import { Fragment, useEffect, useRef, useState } from 'react'
import { useLanguage } from '../../../i18n'
import { FESTIVALS, type Festival } from '../data/festivals'

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
const DAY_NAMES = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const DAY_NAMES_HI = ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि']
const YEAR = 2026

// Later entries win when two festivals share a date (as in the legacy page).
const FEST_BY_DATE: Record<string, Festival> = {}
FESTIVALS.forEach((f) => {
  FEST_BY_DATE[`${f.month}-${f.day}`] = f
})

function MonthPage({
  monthIndex,
  activeName,
  onSelect,
  now,
}: {
  monthIndex: number
  activeName: string | null
  onSelect: (name: string) => void
  now: Date
}) {
  const monthName = MONTHS[monthIndex]
  const firstDay = new Date(YEAR, monthIndex, 1).getDay()
  const daysInMonth = new Date(YEAR, monthIndex + 1, 0).getDate()
  const season = FESTIVALS.find((f) => f.month === monthName)?.season || ''
  const monthFests = FESTIVALS.filter((f) => f.month === monthName)
  const dayNames = useLanguage() === 'hi' ? DAY_NAMES_HI : DAY_NAMES
  return (
    <>
      <div className="page-head">
        <h3>{monthName}</h3>
        <span className="page-season">{season || '—'}</span>
      </div>
      <div className="day-grid">
        {dayNames.map((n, i) => (
          <div className="day-name" key={`n${i}`} data-calendar-weekday={i} data-i18n-ignore="">
            {n}
          </div>
        ))}
        {Array.from({ length: firstDay }, (_, i) => (
          <div className="day-cell empty" key={`e${i}`}></div>
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const d = i + 1
          const fest = FEST_BY_DATE[`${monthName}-${d}`]
          const isToday = YEAR === now.getFullYear() && monthIndex === now.getMonth() && d === now.getDate()
          const classes = ['day-cell', fest ? 'has-fest' : '', isToday ? 'today' : '', fest && fest.name === activeName ? 'active' : '']
            .filter(Boolean)
            .join(' ')
          return (
            <div
              key={d}
              className={classes}
              data-fest={fest?.name}
              onClick={fest ? () => onSelect(fest.name) : undefined}
            >
              <span className="day-num">{d}</span>
              {fest && <span className="fest-label">{fest.name}</span>}
              {fest && (
                <span className="fest-dot">
                  <span></span>
                </span>
              )}
            </div>
          )
        })}
      </div>
      <div className="page-legend">
        <span>
          <i></i> {monthFests.length} {monthFests.length === 1 ? 'festival' : 'festivals'} this month
        </span>
        <span>
          <i className="today-swatch"></i> Today
        </span>
      </div>
    </>
  )
}

export function Festivals() {
  const [month, setMonth] = useState(0)
  const [now] = useState(() => new Date())
  const [flipClass, setFlipClass] = useState('')
  const [activeName, setActiveName] = useState<string | null>(null)
  const flipping = useRef(false)
  const timers = useRef<number[]>([])
  const detailRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const list = timers.current
    // Pre-select the first January festival, like the legacy calendar.
    const first = FESTIVALS.find((f) => f.month === 'January')
    const t = window.setTimeout(() => first && setActiveName(first.name), 60)
    return () => {
      window.clearTimeout(t)
      list.forEach((id) => window.clearTimeout(id))
    }
  }, [])

  const goToMonth = (next: number, direction: 'next' | 'prev') => {
    if (flipping.current || next === month) return
    flipping.current = true
    const goingDown = direction === 'prev'
    setFlipClass(goingDown ? 'slide-down-out' : 'slide-up-out')
    timers.current.push(
      window.setTimeout(() => {
        setMonth(next)
        setFlipClass(goingDown ? 'slide-down-in' : 'slide-up-in')
        timers.current.push(
          window.setTimeout(() => {
            setFlipClass('')
            flipping.current = false
          }, 440),
        )
      }, 440),
    )
  }

  const selectFestival = (name: string) => {
    setActiveName(name)
    if (window.matchMedia('(max-width: 1100px)').matches) {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const fest = activeName ? FESTIVALS.find((f) => f.name === activeName) : null

  return (
    <section className="section fest-book" id="festivals">
      <div className="fest-book-head">
        <div className="fest-book-head-left">
          <div className="eyebrow">04 — The festival calendar</div>
          <h2>
            A calendar of
            <br />
            <em>living traditions.</em>
          </h2>
        </div>
        <p className="fest-book-intro">
          Turn the pages. Twelve months, forty festivals. Click any highlighted date to read the story, rituals and
          living legacy of that celebration on the right.
        </p>
      </div>

      <div className="fest-book-layout">
        {/* LEFT: the physical calendar */}
        <div className="fest-book-wrap">
          {/* Metallic wire binding */}
          <div className="calendar-spiral" aria-hidden="true">
            <div className="spiral-wire"></div>
            <div className="spiral-holes"></div>
          </div>

          <div className="calendar-book" id="calendarBook">
            {/* Month tabs */}
            <div className="month-tabs" id="monthTabs">
              {MONTHS.map((m, i) => {
                const hasFest = FESTIVALS.some((f) => f.month === m)
                return (
                  <button
                    key={m}
                    className={['month-tab', hasFest ? 'has-fest' : '', i === month ? 'active' : ''].filter(Boolean).join(' ')}
                    data-month={i}
                    type="button"
                    onClick={() => i !== month && goToMonth(i, i > month ? 'next' : 'prev')}
                  >
                    {m.slice(0, 3)}
                  </button>
                )
              })}
            </div>

            {/* The flipping page */}
            <div className="calendar-page-wrap">
              <div className={`calendar-page${flipClass ? ` ${flipClass}` : ''}`} id="calendarPage">
                <MonthPage monthIndex={month} activeName={activeName} onSelect={selectFestival} now={now} />
              </div>
            </div>

            {/* Navigation */}
            <div className="calendar-nav">
              <button
                type="button"
                className="cal-nav-btn"
                id="prevMonth"
                aria-label="Previous month"
                onClick={() => goToMonth((month + 11) % 12, 'prev')}
              >
                <span className="nav-arrow">↑</span>
                <span className="nav-text">Previous</span>
              </button>
              <span className="cal-nav-mid" id="calNavMid">
                {MONTHS[month]} {YEAR}
              </span>
              <button
                type="button"
                className="cal-nav-btn"
                id="nextMonth"
                aria-label="Next month"
                onClick={() => goToMonth((month + 1) % 12, 'next')}
              >
                <span className="nav-text">Next</span>
                <span className="nav-arrow">↓</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: festival detail panel */}
        <aside className="fest-book-detail" id="festDetail" aria-live="polite" ref={detailRef}>
          <div className="fest-book-detail-inner" id="festDetailInner">
            {fest ? (
              <Fragment key={fest.name}>
                <div className="detail-image">
                  <img src={fest.image} alt={fest.name} loading="eager" />
                  <div className="detail-image-caption">
                    <span className="img-season">
                      {fest.season} · {fest.date || 'Date varies by region'}
                    </span>
                    <h3>{fest.name}</h3>
                  </div>
                </div>
                <div className="detail-body">
                  <div className="detail-meta">
                    <div>
                      <small>Month</small>
                      <strong>{fest.month}</strong>
                    </div>
                    <div>
                      <small>Region</small>
                      <strong>{fest.region}</strong>
                    </div>
                  </div>
                  <section className="detail-section">
                    <h4 className="detail-label">The story</h4>
                    <p>{fest.story}</p>
                  </section>
                  <section className="detail-section">
                    <h4 className="detail-label">Rituals &amp; practices</h4>
                    <p>{fest.ritual}</p>
                  </section>
                  <section className="detail-section lens">
                    <h4 className="detail-label">Mirava lens</h4>
                    <p>{fest.lens}</p>
                  </section>
                </div>
              </Fragment>
            ) : (
              <div className="detail-empty">
                <div className="empty-icon">✦</div>
                <h4>Pick a festival</h4>
                <p>Click any highlighted date on the calendar to read its story, its rituals and its living legacy.</p>
              </div>
            )}
          </div>
        </aside>
      </div>

      <div className="fest-book-foot">
        <span className="foot-dot"></span>
        <span id="festBookFoot">{FESTIVALS.length} festivals · 12 months · India · a year in celebration</span>
      </div>
    </section>
  )
}
