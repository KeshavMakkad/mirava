import { useEffect, type RefObject } from 'react'
import { useLocation } from 'react-router-dom'
import { MOTION_EVENT, mountGlobe, type ClassToggle } from './globe'
import { mountScrollJourney } from './scrollJourney'

const DEPTH_SELECTOR = '.time-hud, .stage-visual, .era-card, .civil-hero, .civil-postcard, .museum-piece, .mir-price-card'

/**
 * Page-wide effects ported from the new explore.html:
 *  - "mirava-spatial-script": motion-ready/paused state, pointer depth tilt on
 *    cards, reading-progress line and hero parallax (until the scroll journey
 *    takes over);
 *  - "mirava-globe-script": the WebGL heritage globe in the hero (./globe.ts);
 *  - "mirava-scroll-journey": chapter reveals and the chapter dock (./scrollJourney.ts).
 * Classes the original put on <html> go on both the page scope and the
 * explore root, so the scoped stylesheets match either form of selector.
 */
export function usePageEffects(rootRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const root = rootRef.current
    const page = root?.closest<HTMLElement>('[data-page]')
    if (!root || !page) return
    const cleanups: (() => void)[] = []
    const listen = (target: EventTarget, type: string, fn: EventListener, opts?: AddEventListenerOptions) => {
      target.addEventListener(type, fn, opts)
      cleanups.push(() => target.removeEventListener(type, fn, opts))
    }
    const setRootClass: ClassToggle = (name, on) => {
      page.classList.toggle(name, on)
      root.classList.toggle(name, on)
    }
    const hasRootClass = (name: string) => page.classList.contains(name)

    const hero = root.querySelector<HTMLElement>('#top')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)')
    setRootClass('mirava-motion-ready', true)
    setRootClass('mirava-motion-paused', reduced.matches)

    // Depth: cards tilt toward the pointer.
    const registerDepth = (scope: ParentNode) =>
      scope.querySelectorAll(DEPTH_SELECTOR).forEach((el) => el.classList.add('mirava-depth'))
    registerDepth(root)
    if ('IntersectionObserver' in window) {
      const scenes = new IntersectionObserver(
        (entries) => entries.forEach((entry) => entry.target.classList.toggle('mirava-scene-offscreen', !entry.isIntersecting)),
        { threshold: 0 },
      )
      ;[hero, root.querySelector('#time')].forEach((el) => el && scenes.observe(el))
      cleanups.push(() => scenes.disconnect())
    }
    ;['stageCards', 'civilCards'].forEach((id) => {
      const el = root.querySelector(`#${id}`)
      if (!el) return
      const mo = new MutationObserver(() => registerDepth(el))
      mo.observe(el, { childList: true })
      cleanups.push(() => mo.disconnect())
    })

    let activeCard: HTMLElement | null = null
    let cardRect: DOMRect | null = null
    let pointerFrame = 0
    let px = 0,
      py = 0
    const clearDepth = () => {
      if (pointerFrame) cancelAnimationFrame(pointerFrame)
      pointerFrame = 0
      if (activeCard) {
        activeCard.style.setProperty('--mirava-angle', '0deg')
        activeCard.classList.remove('mirava-depth-active')
      }
      activeCard = null
      cardRect = null
    }
    const paintDepth = () => {
      pointerFrame = 0
      if (!activeCard || !cardRect) return
      const x = Math.max(-1, Math.min(1, ((px - cardRect.left) / cardRect.width) * 2 - 1))
      const y = Math.max(-1, Math.min(1, ((py - cardRect.top) / cardRect.height) * 2 - 1))
      const length = Math.hypot(x, y)
      if (length < 0.002) {
        activeCard.style.setProperty('--mirava-angle', '0deg')
        return
      }
      activeCard.style.setProperty('--mirava-axis', `${(-y / length).toFixed(4)} ${(x / length).toFixed(4)} 0`)
      activeCard.style.setProperty('--mirava-angle', `${Math.min(length * 4, 5.5).toFixed(3)}deg`)
    }
    listen(
      document,
      'pointermove',
      ((event: PointerEvent) => {
        if (!finePointer.matches || hasRootClass('mirava-motion-paused') || event.pointerType !== 'mouse') return
        // React may rewrite className (e.g. museum filters), so re-tag on the fly.
        const card = (event.target as Element | null)?.closest?.<HTMLElement>(DEPTH_SELECTOR) ?? null
        if (card && !root.contains(card)) return
        card?.classList.add('mirava-depth')
        if (card !== activeCard) {
          clearDepth()
          if (card) {
            activeCard = card
            cardRect = card.getBoundingClientRect()
            card.classList.add('mirava-depth-active')
          }
        }
        if (!activeCard) return
        px = event.clientX
        py = event.clientY
        if (!pointerFrame) pointerFrame = requestAnimationFrame(paintDepth)
      }) as EventListener,
      { passive: true },
    )
    listen(document.documentElement, 'pointerleave', clearDepth)
    listen(document, MOTION_EVENT, clearDepth)
    listen(window, 'blur', clearDepth)
    cleanups.push(clearDepth)

    // A single scheduled update handles the reading line and hero parallax.
    let scrollFrame = 0
    const paintScroll = () => {
      scrollFrame = 0
      if (hasRootClass('mirava-scroll-ready')) {
        clearDepth()
        return
      }
      const distance = document.documentElement.scrollHeight - window.innerHeight
      page.style.setProperty('--read-progress', String(distance > 0 ? Math.min(1, Math.max(0, window.scrollY / distance)) : 0))
      if (hero && !hasRootClass('mirava-motion-paused')) {
        hero.style.setProperty('--hero-travel', Math.min(1, Math.max(0, window.scrollY / hero.offsetHeight)).toFixed(3))
      }
      clearDepth()
    }
    const scheduleScroll = () => {
      if (!scrollFrame) scrollFrame = requestAnimationFrame(paintScroll)
    }
    listen(window, 'scroll', scheduleScroll, { passive: true })
    listen(window, 'resize', scheduleScroll, { passive: true })
    cleanups.push(() => cancelAnimationFrame(scrollFrame))
    paintScroll()

    cleanups.push(mountGlobe(page, setRootClass))
    cleanups.push(mountScrollJourney(page, root, setRootClass))

    return () => {
      cleanups.reverse().forEach((fn) => fn())
      ;['mirava-motion-ready', 'mirava-motion-paused', 'mirava-scroll-ready'].forEach((c) => setRootClass(c, false))
      page.style.removeProperty('--read-progress')
    }
  }, [rootRef])
}

/** Scrolls to `#hash` targets on arrival (e.g. /explore#news) and on hash changes. */
export function useHashScroll(rootRef: RefObject<HTMLDivElement | null>) {
  const { hash } = useLocation()
  useEffect(() => {
    if (!hash || hash.length < 2) return
    let id: string
    try {
      id = decodeURIComponent(hash.slice(1))
    } catch {
      return
    }
    const t = window.setTimeout(() => {
      const target = rootRef.current?.querySelector<HTMLElement>(`[id="${CSS.escape(id)}"]`)
      target?.scrollIntoView({ block: 'start' })
    }, 60)
    return () => window.clearTimeout(t)
  }, [hash, rootRef])
}
