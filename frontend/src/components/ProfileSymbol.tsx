import type { ProfileSymbol } from '../lib/api'

/** The six profile symbols from the 2026 profile page (line art, 64×64). */
// eslint-disable-next-line react-refresh/only-export-components
export const PROFILE_SYMBOLS: { id: ProfileSymbol; label: string }[] = [
  { id: 'lotus', label: 'Lotus' },
  { id: 'fort', label: 'Fort' },
  { id: 'peacock', label: 'Peacock' },
  { id: 'chakra', label: 'Chakra' },
  { id: 'leaf', label: 'Leaf' },
  { id: 'sun', label: 'Sun' },
]

const ART: Record<ProfileSymbol, string> = {
  lotus:
    '<path d="M32 47c-10-1-19-6-21-19 12-1 18 5 21 19Zm0 0c10-1 19-6 21-19-12-1-18 5-21 19Z"/><path d="M32 45c-9-11-10-18 0-31 10 13 9 20 0 31ZM17 48c10 5 20 5 30 0"/>',
  fort: '<path d="M12 49h40M15 47V21h8v7h5V17h8v11h5v-7h8v26M28 47V36a4 4 0 0 1 8 0v11M19 33v5m26-5v5M30 13h10l-5-4 5-4H30v12"/>',
  peacock:
    '<path d="M30 42C14 48 6 34 16 20c6-8 14-12 18-10 11 3 18 12 18 22 0 9-6 14-14 12M26 40l-8-14m11 11L27 20m5 16 7-16m-3 20 9-10"/><path d="M31 47c12 3 15-3 9-8-4-3-5-7-4-11s6-4 7 0c1 4-4 4-4 6m3-10 2-3m-5 2v-4M25 49h18"/><circle cx="41" cy="27" r=".7" fill="currentColor"/>',
  chakra:
    '<circle cx="32" cy="32" r="20"/><circle cx="32" cy="32" r="4"/><path d="M32 12v16m0 8v16M12 32h16m8 0h16M18 18l11 11m6 6 11 11M18 46l11-11m6-6 11-11M24 14l6 14m4 8 6 14M14 24l14 6m8 4 14 6M14 40l14-6m8-4 14-6M24 50l6-14m4-8 6-14"/>',
  leaf: '<path d="M16 44C4 16 36 20 49 10c5 26-3 47-26 38M14 53l27-29M24 43v-9m6 3h9M33 32v-8"/>',
  sun: '<circle cx="32" cy="32" r="12"/><path d="M32 9v6m0 34v6M9 32h6m34 0h6M16 16l4 4m24 24 4 4M16 48l4-4m24-24 4-4M23 11l2 5m14 32 2 5M11 23l5 2m32 14 5 2M11 41l5-2m32-14 5-2M23 53l2-5m14-32 2-5"/>',
}

// eslint-disable-next-line react-refresh/only-export-components
export const isProfileSymbol = (v: unknown): v is ProfileSymbol => typeof v === 'string' && v in ART

/** Inline SVG for a profile symbol (unknown values fall back to the lotus). */
export function ProfileSymbolIcon({ symbol, className, strokeWidth = 1.65 }: { symbol?: string | null; className?: string; strokeWidth?: number }) {
  const id = isProfileSymbol(symbol) ? symbol : 'lotus'
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      // Static, trusted artwork copied from the profile page.
      dangerouslySetInnerHTML={{ __html: ART[id] }}
    />
  )
}
