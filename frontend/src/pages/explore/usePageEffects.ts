import { useEffect, type RefObject } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Page-wide polish ported from the legacy "dynamic patch" and reveal scripts:
 * scroll progress bar, sticky top bar, back-to-top button, hero parallax,
 * cursor glow, click ripples and reveal-on-scroll.
 */
export function usePageEffects(rootRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const cleanups: (() => void)[] = []
    const listen = <T extends EventTarget>(target: T, type: string, fn: EventListener, opts?: AddEventListenerOptions) => {
      target.addEventListener(type, fn, opts)
      cleanups.push(() => target.removeEventListener(type, fn, opts))
    }

    const progress = root.querySelector<HTMLElement>('#miravaScrollProgress')
    const topbar = root.querySelector<HTMLElement>('.top')
    const heroBody = root.querySelector<HTMLElement>('.hero-body')
    const backTop = root.querySelector<HTMLElement>('#miravaBackTop')
    const glow = root.querySelector<HTMLElement>('#miravaCursorGlow')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Scroll-linked chrome.
    let ticking = false
    let raf = 0
    const paint = () => {
      const doc = document.documentElement
      const max = Math.max(1, doc.scrollHeight - window.innerHeight)
      const y = Math.max(0, window.scrollY || doc.scrollTop || 0)
      if (progress) progress.style.width = Math.min(100, (y / max) * 100) + '%'
      topbar?.classList.toggle('mirava-scrolled', y > 42)
      backTop?.classList.toggle('show', y > 650)
      if (heroBody && !reduce && y < window.innerHeight * 1.1) {
        heroBody.style.transform = `translate3d(0, ${Math.min(48, y * 0.055)}px, 0)`
      }
      ticking = false
    }
    const onScroll = () => {
      if (!ticking) {
        ticking = true
        raf = requestAnimationFrame(paint)
      }
    }
    listen(window, 'scroll', onScroll, { passive: true })
    listen(window, 'resize', onScroll, { passive: true })
    cleanups.push(() => cancelAnimationFrame(raf))
    paint()

    if (backTop) {
      listen(backTop, 'click', () => window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }))
    }

    // Cursor glow.
    if (glow && window.matchMedia('(pointer:fine)').matches && !reduce) {
      listen(
        document,
        'pointermove',
        ((e: PointerEvent) => {
          glow.style.left = e.clientX + 'px'
          glow.style.top = e.clientY + 'px'
          glow.style.opacity = '1'
        }) as EventListener,
        { passive: true },
      )
      listen(document, 'mouseleave', () => {
        glow.style.opacity = '0'
      })
    }

    // Click ripples on buttons / pills / nav links (not the shared account menu or the map).
    listen(root, 'click', ((e: MouseEvent) => {
      if (reduce) return
      const target = e.target as HTMLElement | null
      const host = target?.closest<HTMLElement>('button,.pill,.top nav a')
      if (!host || host.closest('.mv-account, .leaflet-container')) return
      const r = host.getBoundingClientRect()
      const size = Math.max(r.width, r.height) * 2.15
      const ripple = document.createElement('span')
      ripple.className = 'mirava-ripple'
      ripple.style.width = ripple.style.height = size + 'px'
      ripple.style.left = e.clientX - r.left + 'px'
      ripple.style.top = e.clientY - r.top + 'px'
      host.classList.add('mirava-ripple-host')
      host.appendChild(ripple)
      ripple.addEventListener('animationend', () => ripple.remove(), { once: true })
    }) as EventListener)

    // Reveal on scroll: legacy `.section` → .visible, and the inline fade for `.mir-section`.
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        (entries) => entries.forEach((en) => en.isIntersecting && en.target.classList.add('visible')),
        { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
      )
      root.querySelectorAll('.section, .footer-grid > div').forEach((el) => io.observe(el))
      const fade = new IntersectionObserver(
        (entries) =>
          entries.forEach((en) => {
            if (!en.isIntersecting) return
            const el = en.target as HTMLElement
            el.style.opacity = '1'
            el.style.transform = 'translateY(0)'
            fade.unobserve(el)
          }),
        { threshold: 0.08 },
      )
      root.querySelectorAll<HTMLElement>('.mir-section').forEach((el) => {
        el.style.opacity = '0'
        el.style.transform = 'translateY(25px)'
        el.style.transition = 'opacity .7s ease, transform .7s cubic-bezier(.2,.8,.2,1)'
        fade.observe(el)
      })
      cleanups.push(() => {
        io.disconnect()
        fade.disconnect()
      })
    } else {
      root.querySelectorAll('.section, .footer-grid > div').forEach((el) => el.classList.add('visible'))
    }

    return () => cleanups.forEach((fn) => fn())
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
