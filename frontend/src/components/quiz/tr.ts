/**
 * `t()` with a built-in Hindi fallback, for strings our React port builds in
 * code that the shared /locales dictionary does not (yet) contain. Prefers the
 * dictionary's translation so wording stays consistent with the rest of the
 * site. Pair with `useLanguage()` so the component re-renders on toggle.
 */
import { getLanguage, t } from '../../i18n'

type Params = Record<string, string | number>

const fill = (s: string, params?: Params) =>
  params ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m)) : s

export function tr(en: string, hi?: string, params?: Params): string {
  const out = t(en, params)
  if (!hi || getLanguage() !== 'hi') return out
  return out === fill(en, params) ? fill(hi, params) : out
}
