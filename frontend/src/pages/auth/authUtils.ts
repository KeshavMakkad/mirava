/** Helpers shared by the auth pages. */

export const errorText = (e: unknown, fallback = 'Something went wrong. Please try again.') =>
  e instanceof Error && e.message ? e.message : fallback

/** Reads `error_description` (or `error`) from the URL query or hash, as Supabase redirects use. */
export function urlAuthError(): string | null {
  const q = new URLSearchParams(window.location.search)
  const h = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const raw = q.get('error_description') || h.get('error_description') || q.get('error') || h.get('error')
  return raw ? raw.replace(/\+/g, ' ') : null
}
