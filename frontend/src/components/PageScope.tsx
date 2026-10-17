import { useEffect, type HTMLAttributes, type ReactNode } from 'react'

interface Props extends HTMLAttributes<HTMLDivElement> {
  /** Must match the folder name under src/pages/ whose *.page.css should apply. */
  name: string
  /** Sets document.title while the page is mounted. */
  title?: string
  children: ReactNode
}

/**
 * Wrapper that legacy page styles are scoped to (see postcss-page-scope.ts).
 * Anything a page's CSS used to put on `:root`/`html`/`body` lands here, so
 * modals and overlays must be rendered inside it, not portalled to <body>.
 */
export function PageScope({ name, title, children, className, ...rest }: Props) {
  useEffect(() => {
    if (!title) return
    const prev = document.title
    document.title = title
    return () => {
      document.title = prev
    }
  }, [title])

  return (
    <div data-page={name} className={['mv-page', className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </div>
  )
}
