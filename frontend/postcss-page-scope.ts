/**
 * Scopes legacy page stylesheets so pages that each assumed they owned the
 * whole document (`:root`, `body`, bare element selectors) can live together
 * in one SPA.
 *
 * Any file named `*.page.css` inside `src/pages/<name>/` gets every selector
 * prefixed with `[data-page="<name>"]`, and `:root` / `html` / `body` are
 * rewritten to that wrapper itself. Render the page inside
 * <PageScope name="<name>"> (src/components/PageScope.tsx).
 */
import type { AtRule, Plugin, Rule } from 'postcss'

const FILE_RE = /[\\/]src[\\/]pages[\\/]([a-z0-9-]+)[\\/][^\\/]+\.page\.css$/

function splitSelectors(selector: string): string[] {
  const out: string[] = []
  let depth = 0
  let current = ''
  for (const ch of selector) {
    if (ch === '(' || ch === '[') depth++
    else if (ch === ')' || ch === ']') depth--
    if (ch === ',' && depth === 0) {
      out.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  if (current.trim()) out.push(current.trim())
  return out
}

export function scopeSelector(sel: string, scope: string): string {
  // Leading :root / html / body (optionally chained, e.g. `html body.x`) is the wrapper.
  const m = sel.match(/^((?::root|html|body)(?![\w-]))((?:\s+(?:html|body)(?![\w-]))*)(.*)$/s)
  if (m) {
    const rest = m[3]
    // `body.dark .x` → `[scope].dark .x`;  `body > .x` → `[scope] > .x`
    return `${scope}${rest}`
  }
  return `${scope} ${sel}`
}

function insideKeyframes(rule: Rule): boolean {
  let p = rule.parent
  while (p) {
    if (p.type === 'atrule' && /keyframes$/i.test((p as AtRule).name)) return true
    p = p.parent as typeof p
  }
  return false
}

export function pageScope(): Plugin {
  return {
    postcssPlugin: 'mirava-page-scope',
    Once(root) {
      const file = root.source?.input.file ?? ''
      const match = file.match(FILE_RE)
      if (!match) return
      const scope = `[data-page="${match[1]}"]`
      root.walkRules((rule) => {
        if (insideKeyframes(rule)) return
        rule.selector = splitSelectors(rule.selector)
          .map((s) => scopeSelector(s, scope))
          .join(',\n')
      })
    },
  }
}
