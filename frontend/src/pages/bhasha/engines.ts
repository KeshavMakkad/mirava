/**
 * Typed facade over the ported LIPI (script conversion) and SOUND (sound-law)
 * engines, which are kept verbatim as plain JS modules.
 */
import LIPI_JS from './lipi.js'
import SOUND_JS from './sound.js'

export interface ScriptInfo {
  n: string
  era: string
  font: string
  lang?: string
  ancient?: boolean
  rtl?: boolean
}

export interface LipiEngine {
  INFO: Record<string, ScriptInfo>
  ORDER: string[]
  convert(text: string, sid: string): string
  detect(text: string): string | null
  isLatin(text: string): boolean
  convertIAST(iast: string, sid: string): string
  toDevaHindi(iast: string): string
}

export interface SoundResult {
  form: string
  notes: string[]
}

export interface SoundEngine {
  derive(word: string): { pali: SoundResult; pk: SoundResult; hi: SoundResult }
  mia(word: string, mode: string): SoundResult
}

export const LIPI = LIPI_JS as unknown as LipiEngine
export const SOUND = SOUND_JS as unknown as SoundEngine
export const INFO = LIPI.INFO
