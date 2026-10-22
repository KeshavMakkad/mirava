/**
 * MIRAVA • a scroll journey (ported from the new explore.html "mirava-scroll-journey").
 * Viewport-triggered chapter choreography, chapter decor and the floating
 * chapter dock. No scroll interception, no library.
 *
 * React port notes: "document-level" classes go on the page scope (see
 * `setRootClass`), the dock is appended inside the page so its scoped styles
 * apply, and the per-element "revealed" state is the `data-scroll-revealed`
 * attribute (React re-renders className, which would wipe a class).
 */
import type { ClassToggle } from './globe'
import { MOTION_EVENT } from './globe'

type Kind = 'left' | 'right' | 'heading' | 'lift' | 'pop' | 'map' | 'hinge' | 'line' | 'portal' | 'curtain' | 'book' | 'gallery'
interface State {
  kind: Kind
  index: number
  stagger: number
  animations: Set<Animation>
}
interface Chapter {
  el: HTMLElement
  title: string
  accent: string
}
interface I18nExtras {
  originalHTML?: (el: Element) => string
  translateHTML?: (html: string) => string
}

const chapterData: [string, string, string, string][] = [
  ['atlas', 'The living atlas', 'ATLAS', '#6c4834'],
  ['time', 'Travel through time', 'TIME', '#e5bd7d'],
  ['civilizations', 'Ancient civilisations', 'ROOTS', '#a7593c'],
  ['festivals', 'Living traditions', 'CELEBRATE', '#ad7149'],
  ['languages', 'Words brought to life', 'VOICES', '#e0b566'],
  ['art', 'The living museum', 'CREATE', '#e6b578'],
  ['pricing', 'Support the journey', 'PRESERVE', '#b19a67'],
  ['news', 'Stories still unfolding', 'DISCOVER', '#d19b60'],
]
const rules: [string, Kind, number][] = [
  ['#top .eyebrow', 'left', 0],
  ['#top h1', 'heading', 0],
  ['#top .hero-body > p', 'lift', 90],
  ['#top .hero-actions', 'lift', 180],
  ['#top .mirava-hero-caption', 'lift', 250],
  ['#atlas .eyebrow,#time .eyebrow,#civilizations .eyebrow,#festivals .eyebrow,#languages .eyebrow,#art .eyebrow,#pricing > .eyebrow,#news .eyebrow', 'left', 0],
  ['#atlas .atlas-head h2,#time .time-header h2,#civilizations .civil-head h2,#festivals .fest-book-head h2,#languages .revival-intro h2,#art .museum-head h2,#pricing .mir-section-head h2,#news .news-header h2,.footer > div:first-child h2', 'heading', 0],
  ['#atlas .section-intro,#time .time-intro,#civilizations .section-intro,#festivals .fest-book-intro,#languages .section-intro,#art .museum-lede,#news .news-lede', 'lift', 90],
  ['#atlas .atlas-stats > span', 'pop', 90],
  ['#atlas .atlas-map-shell', 'map', 0],
  ['#atlas .atlas-footnote', 'left', 0],
  ['#time .time-hud', 'hinge', 60],
  ['#time .time-timeline-wrap', 'line', 0],
  ['#time .stage-visual', 'portal', 0],
  ['#time .era-card', 'right', 120],
  ['#time .time-footer', 'lift', 0],
  ['#civilizations .civil-hero', 'curtain', 0],
  ['#civilizations .civil-card,#civilizations .civil-postcard', 'right', 130],
  ['#civilizations .civil-selector > button', 'pop', 70],
  ['#festivals .fest-book-wrap', 'book', 0],
  ['#festivals .fest-book-detail', 'right', 170],
  ['#festivals .fest-book-foot', 'lift', 0],
  ['#languages .revival-loop > span,#languages .revival-loop > div', 'pop', 80],
  ['#languages .revival-stage', 'portal', 90],
  ['#languages .bhasha-cta-card', 'portal', 90],
  ['#languages .bank-head', 'left', 0],
  ['#languages #duoRow > .duo-item', 'pop', 85],
  ['#art .art-cats', 'left', 0],
  ['#art .museum-piece', 'gallery', 100],
  ['#art .museum-note', 'line', 0],
  ['#pricing .mir-price-card', 'hinge', 150],
  ['#pricing .mir-price-note', 'lift', 0],
  ['#news .news-live-badge', 'pop', 0],
  ['#news .news-lead', 'curtain', 0],
  ['#news .news-item', 'right', 95],
  ['#news .news-footer', 'line', 0],
  ['.footer .footer-grid > div', 'lift', 130],
  ['.footer .footer-bottom', 'lift', 0],
]
const REVEALED = 'scrollRevealed' // dataset key → data-scroll-revealed
const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v))

/**
 * @param page   the page scope element ([data-page="explore"])
 * @param root   the explore content root (sections are its children)
 */
export function mountScrollJourney(page: HTMLElement, root: HTMLElement, setRootClass: ClassToggle): () => void {
  if (!('IntersectionObserver' in window) || !Element.prototype.animate) return () => {}
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const compact = matchMedia('(max-width: 700px)')
  const states = new Map<HTMLElement, State>()
  const animations = new Set<Animation>()
  const cleanups: (() => void)[] = []
  const on = (target: EventTarget, type: string, fn: EventListener, opts?: AddEventListenerOptions) => {
    target.addEventListener(type, fn, opts)
    cleanups.push(() => target.removeEventListener(type, fn, opts))
  }
  const hasRootClass = (name: string) => page.classList.contains(name)
  const i18n = () => window.MiravaI18n as (NonNullable<Window['MiravaI18n']> & I18nExtras) | undefined
  let chapters: Chapter[] = []
  let entryObserver: IntersectionObserver | undefined
  let resetObserver: IntersectionObserver | undefined
  let sceneObserver: IntersectionObserver | undefined
  let frame = 0,
    scanFrame = 0,
    lastChapter = -1,
    lastScroll = window.scrollY
  let paused = hasRootClass('mirava-motion-paused') || reduced.matches
  let direction = 1,
    suspended = false,
    disposed = false
  let dock: HTMLElement | undefined,
    menu: HTMLElement | undefined,
    menuButton: HTMLButtonElement | undefined,
    nextLink: HTMLAnchorElement | undefined,
    pauseButton: HTMLButtonElement | undefined,
    dockTitle: HTMLElement | undefined,
    dockCount: HTMLElement | undefined,
    dockNumber: HTMLElement | undefined
  let hero: HTMLElement | null = null,
    heroHeight = 900,
    viewport = innerHeight
  const ease = 'cubic-bezier(.16,1,.3,1)'
  const motionScale = () => (compact.matches ? 0.55 : 1)
  const added: Element[] = []

  function cancelState(state: State) {
    state.animations.forEach((animation) => {
      animation.cancel()
      animations.delete(animation)
    })
    state.animations.clear()
  }

  function play(el: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions, state?: State) {
    if (paused || suspended || disposed || !el.animate) return
    const animation = el.animate(keyframes, { duration: 920, easing: ease, fill: 'both', ...options })
    animations.add(animation)
    if (state) state.animations.add(animation)
    animation.finished
      .then(() => {
        animation.cancel()
        animations.delete(animation)
        if (state) state.animations.delete(animation)
      })
      .catch(() => {})
    return animation
  }

  const headingSources = new Map<HTMLElement, string>()
  function splitHeading(el: HTMLElement) {
    if (el.querySelector('.mirava-scroll-word')) return
    if (!headingSources.has(el)) headingSources.set(el, i18n()?.originalHTML?.(el) || el.innerHTML)
    // Translate complete phrases before animation splits them into word spans.
    const source = headingSources.get(el)!
    el.innerHTML = i18n()?.translateHTML?.(source) || source
    el.setAttribute('data-i18n-ignore', '')
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    const nodes: Text[] = []
    while (walker.nextNode()) nodes.push(walker.currentNode as Text)
    nodes.forEach((node) => {
      if (!node.textContent?.trim()) return
      const fragment = document.createDocumentFragment()
      node.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return
        if (/^\s+$/.test(part)) {
          fragment.append(document.createTextNode(part))
          return
        }
        const wrap = document.createElement('span')
        wrap.className = 'mirava-scroll-word-wrap'
        const word = document.createElement('span')
        word.className = 'mirava-scroll-word'
        word.textContent = part
        wrap.append(word)
        fragment.append(wrap)
      })
      node.replaceWith(fragment)
    })
  }
  function translateAnimatedHeadings() {
    headingSources.forEach((source, el) => {
      if (!el.isConnected) {
        headingSources.delete(el)
        return
      }
      const state = states.get(el)
      if (state) cancelState(state)
      el.innerHTML = source
      splitHeading(el)
    })
    schedule()
  }
  on(window, 'mirava:languagechange', translateAnimatedHeadings)
  on(window, 'mirava:catalogue', translateAnimatedHeadings)

  const isRevealed = (el: HTMLElement) => el.dataset[REVEALED] !== undefined

  function reveal(el: HTMLElement, instant = false, force = false) {
    const state = states.get(el)
    if (!state || (!force && isRevealed(el))) return
    cancelState(state)
    el.dataset[REVEALED] = ''
    if (paused || instant || suspended || el.classList.contains('dimmed')) return
    const m = motionScale()
    const dy = 72 * m * direction
    const delay = Math.min(state.index * state.stagger, compact.matches ? 210 : 390)
    if (state.kind === 'heading') {
      el.querySelectorAll('.mirava-scroll-word').forEach((word, i) =>
        play(
          word,
          [
            { translate: `0 ${105 * direction}%`, rotate: `${4 * direction}deg`, opacity: 0 },
            { translate: '0 0', rotate: '0deg', opacity: 1 },
          ],
          { duration: 940, delay: Math.min(i * 48, 350) },
          state,
        ),
      )
      return
    }
    let keyframes: Keyframe[] = [
      { opacity: 0, translate: `0 ${dy}px`, scale: '.98' },
      { opacity: 1, translate: '0 0', scale: '1' },
    ]
    let duration = 930
    switch (state.kind) {
      case 'left':
      case 'right': {
        const x = (state.kind === 'left' ? -1 : 1) * 90 * m
        keyframes = [
          { opacity: 0, translate: `${x}px ${dy * 0.2}px` },
          { opacity: 1, translate: '0 0' },
        ]
        break
      }
      case 'pop':
        keyframes = [
          { opacity: 0, translate: `0 ${dy * 0.8}px`, scale: '.78', offset: 0 },
          { opacity: 1, translate: '0 -5px', scale: '1.035', offset: 0.72 },
          { opacity: 1, translate: '0 0', scale: '1', offset: 1 },
        ]
        duration = 760
        break
      case 'hinge':
      case 'map':
        keyframes = [
          { opacity: 0, translate: `0 ${dy}px`, transform: `perspective(1400px) rotateX(${18 * m * direction}deg)`, scale: '.94' },
          { opacity: 1, translate: '0 0', transform: 'perspective(1400px) rotateX(0deg)', scale: '1' },
        ]
        duration = 1120
        break
      case 'portal':
        keyframes = [
          { opacity: 0, scale: '.76', translate: `0 ${dy * 0.6}px`, clipPath: 'inset(10% 10% 10% 10% round 35%)' },
          { opacity: 1, scale: '1', translate: '0 0', clipPath: 'inset(0% 0% 0% 0% round 0%)' },
        ]
        duration = 1180
        break
      case 'curtain':
        keyframes = [
          { opacity: 0.2, clipPath: `inset(${direction > 0 ? '0 0 100% 0' : '100% 0 0 0'})`, scale: '1.045' },
          { opacity: 1, clipPath: 'inset(0 0 0 0)', scale: '1' },
        ]
        duration = 1220
        break
      case 'book':
        keyframes = [
          { opacity: 0, transform: `perspective(1600px) rotateY(${-22 * m}deg) rotateX(${7 * m}deg)`, translate: `${-35 * m}px ${dy}px`, scale: '.91' },
          { opacity: 1, transform: 'perspective(1600px) rotateY(0deg) rotateX(0deg)', translate: '0 0', scale: '1' },
        ]
        duration = 1260
        break
      case 'gallery': {
        const sign = state.index % 2 ? 1 : -1
        keyframes = [
          { opacity: 0, translate: `${sign * 42 * m}px ${100 * m * direction}px`, transform: `perspective(1400px) rotateY(${sign * 14 * m}deg)`, scale: '.89' },
          { opacity: 1, translate: '0 0', transform: 'perspective(1400px) rotateY(0deg)', scale: '1' },
        ]
        duration = 1160
        break
      }
      case 'line':
        keyframes = [
          { opacity: 0, translate: `${-40 * m}px 0`, clipPath: 'inset(0 100% 0 0)' },
          { opacity: 1, translate: '0 0', clipPath: 'inset(0 0 0 0)' },
        ]
        duration = 1020
        break
    }
    play(el, keyframes, { duration, delay }, state)
    if (state.kind === 'map' && !compact.matches) {
      const scan = el.querySelector('.mirava-scroll-scan')
      if (scan)
        play(
          scan,
          [{ translate: '0 0', opacity: 0 }, { opacity: 0.8, offset: 0.12 }, { translate: '660% 0', opacity: 0 }],
          { duration: 1850, delay: 370 },
          state,
        )
    }
    if (el.closest('.atlas-stats')) animateStat(el, delay, state)
  }

  function animateStat(el: HTMLElement, delay: number, state: State) {
    const number = el.querySelector('b')
    if (!number || !/^\d[\d,]*\+?$/.test(number.textContent?.trim() || '')) return
    play(
      number,
      [
        { opacity: 0.15, translate: '0 18px', scale: '.85' },
        { opacity: 1, translate: '0 0', scale: '1' },
      ],
      { duration: 1200, delay: delay + 110 },
      state,
    )
  }

  function reset(el: HTMLElement) {
    const state = states.get(el)
    if (!state || paused || el.contains(document.activeElement)) return
    cancelState(state)
    delete el.dataset[REVEALED]
  }

  function registerAll() {
    scanFrame = 0
    if (disposed || !entryObserver || !resetObserver) return
    states.forEach((state, el) => {
      if (!el.isConnected) {
        cancelState(state)
        entryObserver!.unobserve(el)
        resetObserver!.unobserve(el)
        states.delete(el)
      }
    })
    rules.forEach(([selector, kind, stagger]) => {
      const localIndices = new Map<Element | null, number>()
      root.querySelectorAll<HTMLElement>(selector).forEach((el) => {
        if (el.closest('.modal,.lens-panel,.news-modal,.mirava-journey-dock')) return
        const parent = el.parentElement
        const index = localIndices.get(parent) || 0
        localIndices.set(parent, index + 1)
        if (states.has(el)) return
        if (kind === 'heading') splitHeading(el)
        const state: State = { kind, index, stagger, animations: new Set() }
        states.set(el, state)
        el.dataset.scrollReveal = kind
        el.classList.add('visible')
        if (paused) el.dataset[REVEALED] = ''
        entryObserver!.observe(el)
        resetObserver!.observe(el)
      })
    })
    schedule()
  }

  function queueRegister() {
    if (!scanFrame && !disposed) scanFrame = requestAnimationFrame(registerAll)
  }

  function addDecor(section: HTMLElement, word: string, index: number) {
    const art = document.createElement('div')
    art.className = 'mirava-scroll-art'
    art.setAttribute('aria-hidden', 'true')
    art.setAttribute('translate', 'no')
    art.innerHTML = `<span class="mirava-scroll-watermark">${word}</span>
      <svg class="mirava-scroll-orbit" viewBox="0 0 200 200"><circle cx="100" cy="100" r="89"/><circle cx="100" cy="100" r="76"/><ellipse cx="100" cy="100" rx="88" ry="34" transform="rotate(${25 + index * 15} 100 100)"/><path d="M100 2v20m0 156v20M2 100h20m156 0h20M36 36l13 13m102 102 13 13M36 164l13-13m102-102 13-13"/><circle cx="100" cy="11" r="3"/></svg>
      <svg class="mirava-scroll-route" viewBox="0 0 1000 90" preserveAspectRatio="none"><path pathLength="1" d="M0 70 C160 70 180 20 330 20 S570 70 720 42 S920 15 1000 15"/></svg>`
    section.prepend(art)
    added.push(art)
    if (['festivals', 'languages', 'art'].includes(section.id)) {
      const sparks = document.createElement('div')
      sparks.className = 'mirava-scroll-particles'
      sparks.setAttribute('aria-hidden', 'true')
      for (let i = 0; i < 9; i++) {
        const spark = document.createElement('i')
        spark.style.setProperty('--spark-x', `${8 + ((i * 37) % 83)}%`)
        spark.style.setProperty('--spark-y', `${8 + ((i * 13) % 32)}%`)
        spark.style.setProperty('--spark-size', `${3 + (i % 3) * 2}px`)
        sparks.append(spark)
      }
      section.append(sparks)
      added.push(sparks)
    }
  }

  function enterScene(el: Element) {
    el.classList.add('mirava-scroll-active')
    if (paused || suspended) return
    el.querySelectorAll('.mirava-scroll-particles i').forEach((spark, i) =>
      play(
        spark,
        [
          { opacity: 0, translate: '0 36px', scale: '.2' },
          { opacity: 0.65, offset: 0.28 },
          { opacity: 0, translate: `${(i % 2 ? -1 : 1) * 26}px -94px`, scale: '1.3' },
        ],
        { duration: 1850 + i * 95, delay: i * 60 },
      ),
    )
  }

  function setMenu(open: boolean, restoreFocus = false) {
    if (!menu || !menuButton) return
    menu.hidden = !open
    menuButton.setAttribute('aria-expanded', String(open))
    menuButton.setAttribute('aria-label', open ? 'Close chapter navigation' : 'Choose a chapter')
    if (open) (menu.querySelector<HTMLElement>('[aria-current="location"]') || menu.querySelector('a'))?.focus({ preventScroll: true })
    if (restoreFocus) menuButton.focus({ preventScroll: true })
  }

  function createDock() {
    dock = document.createElement('aside')
    dock.id = 'miravaJourneyDock'
    dock.className = 'mirava-journey-dock'
    dock.setAttribute('aria-label', 'Journey controls')
    dock.innerHTML = `<nav id="miravaJourneyMenu" class="mirava-journey-menu" aria-label="Jump to a chapter" hidden>
      ${chapters.map((c, i) => `<a href="#${c.el.id}"><b>${String(i + 1).padStart(2, '0')}</b><span>${c.title}</span><i aria-hidden="true">↗</i></a>`).join('')}
      </nav><div class="mirava-journey-controls">
      <button type="button" class="mirava-journey-index" aria-label="Choose a chapter" aria-controls="miravaJourneyMenu" aria-expanded="false"><svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15" pathLength="1"/></svg><b data-journey-number aria-hidden="true">01</b></button>
      <div class="mirava-journey-copy"><small data-journey-count>CHAPTER 01 / 08</small><strong data-journey-title>The living atlas</strong></div>
      <button type="button" class="mirava-journey-pause" aria-label="Pause motion" aria-pressed="false" title="Pause motion">Ⅱ</button>
      <a class="mirava-journey-next" href="#time" aria-label="Next chapter: Travel through time" title="Next chapter">↓</a></div>`
    root.append(dock)
    added.push(dock)
    menu = dock.querySelector('nav')!
    menuButton = dock.querySelector<HTMLButtonElement>('.mirava-journey-index')!
    nextLink = dock.querySelector<HTMLAnchorElement>('.mirava-journey-next')!
    pauseButton = dock.querySelector<HTMLButtonElement>('.mirava-journey-pause')!
    dockTitle = dock.querySelector<HTMLElement>('[data-journey-title]')!
    dockCount = dock.querySelector<HTMLElement>('[data-journey-count]')!
    dockNumber = dock.querySelector<HTMLElement>('[data-journey-number]')!
    on(menuButton, 'click', () => setMenu(!!menu?.hidden))
    on(menu, 'click', (event) => {
      if ((event.target as Element).closest('a')) setMenu(false, true)
    })
    on(
      document,
      'pointerdown',
      (event) => {
        if (dock && menu && !dock.contains(event.target as Node) && !menu.hidden) setMenu(false)
      },
      { passive: true },
    )
    on(document, 'keydown', (event) => {
      if ((event as KeyboardEvent).key === 'Escape' && menu && !menu.hidden) setMenu(false, true)
    })
    on(dock, 'focusout', (event) => {
      const next = (event as FocusEvent).relatedTarget as Node | null
      if (next && dock && !dock.contains(next)) setMenu(false)
    })
    on(pauseButton, 'click', () => {
      const original = page.querySelector<HTMLButtonElement>('#miravaMotionToggle')
      if (original) original.click()
      else {
        setRootClass('mirava-motion-paused', !paused)
        document.dispatchEvent(new CustomEvent(MOTION_EVENT, { detail: { paused: !paused } }))
      }
    })
    updatePauseButton()
  }

  function updatePauseButton() {
    if (!pauseButton) return
    pauseButton.textContent = paused ? '▷' : 'Ⅱ'
    pauseButton.setAttribute('aria-pressed', String(paused))
    pauseButton.setAttribute('aria-label', paused ? 'Resume motion' : 'Pause motion')
    pauseButton.title = paused ? 'Resume motion' : 'Pause motion'
  }

  function syncMotion() {
    paused = hasRootClass('mirava-motion-paused')
    animations.forEach((animation) => animation.cancel())
    animations.clear()
    states.forEach((state, el) => {
      state.animations.clear()
      if (paused) reveal(el, true)
      else {
        const rect = el.getBoundingClientRect()
        if (rect.bottom < -160 || rect.top > viewport + 160) reset(el)
        else reveal(el, true)
      }
    })
    updatePauseButton()
    schedule()
  }

  function selectChapter(index: number) {
    if (index === lastChapter || !chapters[index] || !dock || !menu || !nextLink) return
    lastChapter = index
    const c = chapters[index]
    const number = String(index + 1).padStart(2, '0')
    dockTitle!.textContent = c.title
    dockNumber!.textContent = number
    dockCount!.textContent = `CHAPTER ${number} / ${String(chapters.length).padStart(2, '0')}`
    dock.style.setProperty('--scroll-accent', '#e5bd7d')
    const next = chapters[index + 1]
    nextLink.href = next ? `#${next.el.id}` : '#top'
    nextLink.textContent = next ? '↓' : '↑'
    nextLink.setAttribute('aria-label', next ? `Next chapter: ${next.title}` : 'Back to the beginning')
    nextLink.title = next ? next.title : 'Back to the beginning'
    menu.querySelectorAll('a').forEach((link, i) => {
      if (i === index) link.setAttribute('aria-current', 'location')
      else link.removeAttribute('aria-current')
    })
    play(dockTitle!, [{ opacity: 0, translate: '0 12px' }, { opacity: 1, translate: '0 0' }], { duration: 420 })
  }

  function paint() {
    frame = 0
    if (suspended || disposed) return
    const y = window.scrollY
    if (Math.abs(y - lastScroll) > 1) direction = y >= lastScroll ? 1 : -1
    lastScroll = y
    viewport = innerHeight
    const layout = chapters.map((c) => ({ chapter: c, rect: c.el.getBoundingClientRect() }))
    const total = document.documentElement.scrollHeight - viewport
    const heroProgress = clamp(y / Math.max(1, heroHeight))
    let active = 0
    layout.forEach(({ rect }, i) => {
      if (rect.top <= viewport * 0.48) active = i
    })
    page.style.setProperty('--read-progress', String(total > 0 ? clamp(y / total) : 0))
    if (hero && !paused && y < heroHeight + viewport) {
      hero.style.setProperty('--hero-dolly', (1 + heroProgress * 0.24).toFixed(3))
      hero.style.setProperty('--hero-orbit-lift', `${heroProgress * 115}px`)
      hero.style.setProperty('--hero-copy-lift', `${heroProgress * -108}px`)
      hero.style.setProperty('--hero-grid-lift', `${heroProgress * 86}px`)
      hero.style.setProperty('--hero-grid-scale', (1 + heroProgress * 0.1).toFixed(3))
      hero.style.setProperty('--hero-card-spread', `${heroProgress * 75}px`)
      hero.style.setProperty('--hero-dolly-mobile', (1 + heroProgress * 0.1).toFixed(3))
      hero.style.setProperty('--hero-mobile-lift', `${heroProgress * 34}px`)
      hero.style.setProperty('--hero-copy-mobile', `${heroProgress * -42}px`)
    }
    layout.forEach(({ chapter: c, rect }) => {
      if (rect.top > viewport + 260 || rect.bottom < -260) return
      const p = clamp((viewport - rect.top) / (viewport + rect.height))
      c.el.style.setProperty('--scene-draw', paused ? '1' : clamp((viewport - rect.top) / (viewport * 1.12)).toFixed(3))
      if (!paused) {
        c.el.style.setProperty('--scene-travel', `${((p - 0.3) * (compact.matches ? 48 : 145)).toFixed(2)}px`)
        c.el.style.setProperty('--scene-rotate', `${(p * 110 - 25).toFixed(2)}deg`)
        c.el.style.setProperty('--media-drift', `${((p - 0.5) * (compact.matches ? 10 : 36)).toFixed(2)}px`)
      }
    })
    if (dock && menu) {
      dock.classList.toggle('is-visible', y > heroHeight * 0.65)
      if (y <= heroHeight * 0.65 && !menu.hidden) setMenu(false)
      selectChapter(active)
      const current = layout[active]?.rect
      if (current)
        dock.style.setProperty('--journey-progress', clamp((viewport * 0.48 - current.top) / Math.max(1, current.height)).toFixed(3))
    }
  }

  function schedule() {
    if (!frame && !suspended && !disposed) frame = requestAnimationFrame(paint)
  }

  function refreshShownCards(event: Event) {
    const trigger = (event.target as Element | null)?.closest?.(
      '#art .art-cats button,#news .news-filter-bar button,#civilSelector button,#nextWord,#bankShuffle',
    )
    if (!trigger) return
    requestAnimationFrame(() => {
      if (disposed) return
      const collection = trigger.closest('#art') ? '#art .museum-piece' : trigger.closest('#news') ? '#news .news-item,#news .news-lead' : null
      if (collection)
        root.querySelectorAll<HTMLElement>(collection).forEach((el) => {
          if (el.classList.contains('dimmed')) reveal(el, true, true)
          else if (getComputedStyle(el).display === 'none') reset(el)
          else {
            const rect = el.getBoundingClientRect()
            if (rect.top < viewport && rect.bottom > 0) reveal(el, paused, true)
          }
        })
      queueRegister()
    })
  }

  function teardown() {
    disposed = true
    cancelAnimationFrame(frame)
    cancelAnimationFrame(scanFrame)
    entryObserver?.disconnect()
    resetObserver?.disconnect()
    sceneObserver?.disconnect()
    animations.forEach((animation) => animation.cancel())
    animations.clear()
    cleanups.forEach((fn) => fn())
    added.forEach((el) => el.remove())
    setRootClass('mirava-scroll-ready', false)
    setRootClass('mirava-scroll-suspended', false)
  }

  function failOpen(error: unknown) {
    setRootClass('mirava-scroll-ready', false)
    entryObserver?.disconnect()
    resetObserver?.disconnect()
    sceneObserver?.disconnect()
    animations.forEach((animation) => animation.cancel())
    states.forEach((_, el) => {
      el.classList.add('visible')
      el.dataset[REVEALED] = ''
    })
    dock?.remove()
    console.warn('MIRAVA scroll enhancement unavailable; content remains visible.', error)
  }

  try {
    hero = root.querySelector<HTMLElement>('#top')
    heroHeight = hero?.offsetHeight || innerHeight
    paused = hasRootClass('mirava-motion-paused')
    chapters = chapterData
      .map(([id, title, word, accent], i): Chapter | null => {
        const el = root.querySelector<HTMLElement>(`#${id}`)
        if (!el) return null
        el.classList.add('mirava-scroll-section', 'visible')
        el.style.setProperty('--scroll-accent', accent)
        addDecor(el, word, i)
        return { el, title, accent }
      })
      .filter((c): c is Chapter => c !== null)
    const mapShell = root.querySelector('#atlas .atlas-map-shell')
    if (mapShell) {
      const scan = document.createElement('div')
      scan.className = 'mirava-scroll-scan'
      scan.setAttribute('aria-hidden', 'true')
      mapShell.append(scan)
      added.push(scan)
    }
    entryObserver = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) reveal(entry.target as HTMLElement)
        }),
      { threshold: 0, rootMargin: '0px 0px -45px 0px' },
    )
    resetObserver = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) reset(entry.target as HTMLElement)
        }),
      { threshold: 0, rootMargin: '180px 0px 180px 0px' },
    )
    sceneObserver = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          entry.target.classList.toggle('mirava-scroll-rest', !entry.isIntersecting)
          if (entry.isIntersecting) enterScene(entry.target)
          else entry.target.classList.remove('mirava-scroll-active')
        }),
      { rootMargin: '0px 0px -35px 0px', threshold: 0 },
    )
    setRootClass('mirava-scroll-ready', true)
    registerAll()
    chapters.forEach((c) => sceneObserver!.observe(c.el))
    createDock()
    const dynamic = ['stageCards', 'civilCards', 'civilSelector', 'duoRow', 'calendarPage', 'newsStream', 'newsLead', 'cmsNewsCards']
    dynamic.forEach((id) => {
      const el = root.querySelector(`#${id}`)
      if (!el) return
      const mo = new MutationObserver(queueRegister)
      mo.observe(el, { childList: true, subtree: true })
      cleanups.push(() => mo.disconnect())
    })
    on(document, MOTION_EVENT, syncMotion)
    on(document, 'click', refreshShownCards)
    on(document, 'focusin', (event) => {
      let target = event.target as HTMLElement | null
      while (target && target !== document.body) {
        if (states.has(target)) reveal(target, true, true)
        target = target.parentElement
      }
    })
    on(window, 'scroll', schedule, { passive: true })
    on(
      window,
      'resize',
      () => {
        heroHeight = hero?.offsetHeight || innerHeight
        schedule()
      },
      { passive: true },
    )
    on(window, 'hashchange', schedule)
    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(schedule)
      ro.observe(document.body)
      cleanups.push(() => ro.disconnect())
    }
    on(document, 'visibilitychange', () => {
      suspended = document.hidden
      setRootClass('mirava-scroll-suspended', suspended)
      if (suspended) {
        animations.forEach((a) => a.pause())
        cancelAnimationFrame(frame)
        frame = 0
      } else {
        if (!paused) animations.forEach((a) => a.play())
        schedule()
      }
    })
    on(window, 'pagehide', () => {
      suspended = true
      cancelAnimationFrame(frame)
      frame = 0
    })
    on(window, 'pageshow', () => {
      suspended = false
      schedule()
    })
    document.fonts?.ready.then(schedule)
    paint()
  } catch (error) {
    failOpen(error)
  }

  return teardown
}
