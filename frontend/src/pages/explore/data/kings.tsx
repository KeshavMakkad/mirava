// The rulers available in the "Talk to Indian Kings" chat. Avatars are the
// legacy inline SVG portraits, converted to JSX.
import type { ReactElement } from 'react'

export interface King {
  id: string
  name: string
  desc: string
  language: string
  langCode: string
  langFlag: string
  avatar: ReactElement
  /** Character prompt sent to the server (persona "king"). */
  systemPrompt: string
}

export const KINGS: King[] = [
  {
    id: "shivaji",
    name: "Chhatrapati Shivaji Maharaj",
    desc: "Founder of the Maratha Empire, warrior-king of the 17th century.",
    language: "Marathi",
    langCode: "mr-IN",
    langFlag: "🚩",
    avatar: (
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="bg-shivaji" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5a2c1e" />
                <stop offset="100%" stopColor="#2a1410" />
              </linearGradient>
              <linearGradient id="crown-shivaji" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffd76b" />
                <stop offset="100%" stopColor="#c68b1a" />
              </linearGradient>
            </defs>
            <rect width="100" height="100" fill="url(#bg-shivaji)" />
            <circle cx="50" cy="38" r="30" fill="#f8c950" opacity="0.1" />
            <path d="M18 100 Q22 72 50 72 Q78 72 82 100 Z" fill="#8b1e1e" />
            <path d="M30 78 L50 86 L70 78 L68 100 L32 100 Z" fill="#5a0f0f" />
            <path d="M40 76 L50 84 L60 76" stroke="#f1b43c" strokeWidth="2" fill="none" />
            <circle cx="50" cy="84" r="2.5" fill="#f1b43c" />
            <rect x="44" y="58" width="12" height="16" fill="#d49a6a" />
            <ellipse cx="50" cy="46" rx="16" ry="18" fill="#e8b98a" />
            <path d="M35 50 Q34 62 40 68 Q50 72 60 68 Q66 62 65 50 Q60 56 50 57 Q40 56 35 50 Z" fill="#2a1a14" />
            <path d="M42 54 Q46 52 50 54 Q54 52 58 54 Q56 57 50 57 Q44 57 42 54 Z" fill="#1a0e08" />
            <ellipse cx="43" cy="45" rx="1.8" ry="1.6" fill="#1a0e08" />
            <ellipse cx="57" cy="45" rx="1.8" ry="1.6" fill="#1a0e08" />
            <path d="M39 42 Q43 40 47 42" stroke="#2a1a14" strokeWidth="1.4" fill="none" strokeLinecap="round" />
            <path d="M53 42 Q57 40 61 42" stroke="#2a1a14" strokeWidth="1.4" fill="none" strokeLinecap="round" />
            <path d="M28 34 Q32 12 50 12 Q68 12 72 34 Q66 26 50 26 Q34 26 28 34 Z" fill="#e85a2a" />
            <path d="M30 32 Q34 22 50 22 Q66 22 70 32" stroke="#b13d18" strokeWidth="1.2" fill="none" />
            <circle cx="50" cy="20" r="4" fill="url(#crown-shivaji)" />
            <circle cx="50" cy="20" r="2" fill="#fff5c2" />
            <path d="M50 14 L53 20 L50 26 L47 20 Z" fill="#f1b43c" />
            <circle cx="50" cy="28" r="2.5" fill="#fff2cf" />
          </svg>
    ),
    systemPrompt:
      "You are Chhatrapati Shivaji Maharaj, the legendary 17th-century founder of the Maratha Empire. You are brave, just, wise, and deeply devoted to your people and to Swarajya. You speak with the dignity and authority of a king, but also with warmth and fatherly care. You are proud of Marathi culture. Keep responses concise (2-4 sentences), regal, and inspiring.",
  },
  {
    id: "ashoka",
    name: "Emperor Ashoka the Great",
    desc: "Mauryan emperor who embraced Buddhism after Kalinga, 3rd century BCE.",
    language: "Prakrit",
    langCode: "hi-IN",
    langFlag: "☸️",
    avatar: (
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="bg-ashoka" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3d2a6b" />
                <stop offset="100%" stopColor="#1a1030" />
              </linearGradient>
              <linearGradient id="crown-ashoka" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffd76b" />
                <stop offset="100%" stopColor="#b8860b" />
              </linearGradient>
            </defs>
            <rect width="100" height="100" fill="url(#bg-ashoka)" />
            <circle cx="50" cy="38" r="32" fill="none" stroke="#f1b43c" strokeWidth="0.8" opacity="0.35" />
            <circle cx="50" cy="38" r="26" fill="none" stroke="#f1b43c" strokeWidth="0.5" opacity="0.25" />
            <circle cx="50" cy="38" r="3" fill="#f1b43c" opacity="0.5" />
            <path d="M18 100 Q22 72 50 72 Q78 72 82 100 Z" fill="#8b6f2a" />
            <path d="M30 78 L50 88 L70 78 L68 100 L32 100 Z" fill="#5a4410" />
            <rect x="44" y="58" width="12" height="16" fill="#c48a5c" />
            <ellipse cx="50" cy="46" rx="16" ry="18" fill="#d9a878" />
            <path d="M39 46 Q43 48 47 46" stroke="#1a0e08" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            <path d="M53 46 Q57 48 61 46" stroke="#1a0e08" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            <path d="M39 42 Q43 40 47 42" stroke="#2a1a14" strokeWidth="1.4" fill="none" strokeLinecap="round" />
            <path d="M53 42 Q57 40 61 42" stroke="#2a1a14" strokeWidth="1.4" fill="none" strokeLinecap="round" />
            <path d="M44 55 Q50 58 56 55" stroke="#8a3a2a" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            <path d="M32 34 L36 22 L42 30 L50 16 L58 30 L64 22 L68 34 Z" fill="url(#crown-ashoka)" stroke="#8a6410" strokeWidth="0.8" />
            <circle cx="50" cy="22" r="2.5" fill="#fff5c2" />
            <circle cx="38" cy="28" r="1.8" fill="#e85a2a" />
            <circle cx="62" cy="28" r="1.8" fill="#e85a2a" />
            <rect x="32" y="32" width="36" height="3" fill="#b8860b" />
          </svg>
    ),
    systemPrompt:
      "You are Emperor Ashoka the Great, the Mauryan emperor (c. 268–232 BCE). You are deeply remorseful for the bloodshed at Kalinga and have embraced Buddhism and Dhamma. You are wise, compassionate, philosophical, and humble. Keep responses concise (2-4 sentences), thoughtful, and compassionate.",
  },
  {
    id: "prithviraj",
    name: "Prithviraj Chauhan",
    desc: "Rajput king of Ajmer and Delhi, legendary warrior of the 12th century.",
    language: "Braj / Hindi",
    langCode: "hi-IN",
    langFlag: "🦁",
    avatar: (
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="bg-prith" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7a1f1f" />
                <stop offset="100%" stopColor="#3a0d0d" />
              </linearGradient>
              <linearGradient id="turban-prith" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff8b3d" />
                <stop offset="100%" stopColor="#c94a15" />
              </linearGradient>
            </defs>
            <rect width="100" height="100" fill="url(#bg-prith)" />
            <path d="M16 100 Q22 70 50 70 Q78 70 84 100 Z" fill="#a52a2a" />
            <path d="M28 76 L50 86 L72 76 L70 100 L30 100 Z" fill="#7a1616" />
            <path d="M36 78 L50 84 L64 78" stroke="#f1b43c" strokeWidth="2" fill="none" />
            <circle cx="50" cy="84" r="2.8" fill="#f1b43c" />
            <rect x="44" y="56" width="12" height="16" fill="#d49a6a" />
            <ellipse cx="50" cy="45" rx="16" ry="18" fill="#e8b98a" />
            <path d="M38 54 Q42 51 50 53 Q58 51 62 54 Q58 58 50 58 Q42 58 38 54 Z" fill="#1a0e08" />
            <ellipse cx="43" cy="44" rx="1.9" ry="1.7" fill="#1a0e08" />
            <ellipse cx="57" cy="44" rx="1.9" ry="1.7" fill="#1a0e08" />
            <circle cx="43.5" cy="43.5" r="0.6" fill="#fff" />
            <circle cx="57.5" cy="43.5" r="0.6" fill="#fff" />
            <path d="M39 41 Q43 38 47 40" stroke="#1a0e08" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <path d="M53 40 Q57 38 61 41" stroke="#1a0e08" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <path d="M26 34 Q30 10 50 10 Q70 10 74 34 Q66 26 50 26 Q34 26 26 34 Z" fill="url(#turban-prith)" />
            <path d="M28 32 Q34 20 50 20 Q66 20 72 32" stroke="#8a2e0f" strokeWidth="1.2" fill="none" />
            <path d="M30 30 Q40 24 50 24" stroke="#8a2e0f" strokeWidth="0.8" fill="none" />
            <path d="M50 24 Q60 24 70 30" stroke="#8a2e0f" strokeWidth="0.8" fill="none" />
            <path d="M50 14 L50 6" stroke="#f1b43c" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="50" cy="6" r="2.8" fill="#fff5c2" />
            <circle cx="50" cy="6" r="1.2" fill="#e85a2a" />
            <circle cx="50" cy="28" r="2.4" fill="#fff2cf" />
            <circle cx="42" cy="30" r="1.6" fill="#fff2cf" />
            <circle cx="58" cy="30" r="1.6" fill="#fff2cf" />
          </svg>
    ),
    systemPrompt:
      "You are Prithviraj Chauhan, the legendary Rajput king of Ajmer and Delhi in the 12th century. You are brave, honorable, romantic, and fiercely proud of Rajput valor. Keep responses concise (2-4 sentences), valiant, and full of Rajput pride.",
  },
  {
    id: "krishnadevaraya",
    name: "Krishnadevaraya",
    desc: "Emperor of Vijayanagara, patron of Telugu literature, 16th century.",
    language: "Telugu / Kannada",
    langCode: "te-IN",
    langFlag: "📜",
    avatar: (
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="bg-krish" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5a3a1a" />
                <stop offset="100%" stopColor="#2a1808" />
              </linearGradient>
              <linearGradient id="crown-krish" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffe088" />
                <stop offset="100%" stopColor="#b8860b" />
              </linearGradient>
            </defs>
            <rect width="100" height="100" fill="url(#bg-krish)" />
            <path d="M16 100 Q22 70 50 70 Q78 70 84 100 Z" fill="#b8860b" />
            <path d="M28 76 L50 86 L72 76 L70 100 L30 100 Z" fill="#7a5410" />
            <path d="M36 78 L50 88 L64 78" stroke="#f1b43c" strokeWidth="2.5" fill="none" />
            <circle cx="50" cy="88" r="3.2" fill="#e85a2a" />
            <circle cx="50" cy="88" r="1.6" fill="#fff5c2" />
            <circle cx="42" cy="82" r="1.8" fill="#f1b43c" />
            <circle cx="58" cy="82" r="1.8" fill="#f1b43c" />
            <rect x="44" y="58" width="12" height="16" fill="#c48a5c" />
            <ellipse cx="50" cy="46" rx="16" ry="18" fill="#d9a878" />
            <path d="M36 54 Q40 50 46 52 Q50 53 54 52 Q60 50 64 54 Q60 58 50 57 Q40 58 36 54 Z" fill="#1a0e08" />
            <circle cx="36" cy="55" r="1" fill="#1a0e08" />
            <circle cx="64" cy="55" r="1" fill="#1a0e08" />
            <ellipse cx="43" cy="45" rx="1.9" ry="1.7" fill="#1a0e08" />
            <ellipse cx="57" cy="45" rx="1.9" ry="1.7" fill="#1a0e08" />
            <circle cx="43.5" cy="44.5" r="0.6" fill="#fff" />
            <circle cx="57.5" cy="44.5" r="0.6" fill="#fff" />
            <path d="M39 42 Q43 40 47 42" stroke="#1a0e08" strokeWidth="1.4" fill="none" strokeLinecap="round" />
            <path d="M53 42 Q57 40 61 42" stroke="#1a0e08" strokeWidth="1.4" fill="none" strokeLinecap="round" />
            <path d="M30 34 Q34 12 50 10 Q66 12 70 34 Z" fill="url(#crown-krish)" stroke="#8a6410" strokeWidth="0.8" />
            <path d="M34 32 Q38 18 50 16 Q62 18 66 32" stroke="#8a6410" strokeWidth="1" fill="none" />
            <path d="M38 30 Q42 22 50 20 Q58 22 62 30" stroke="#8a6410" strokeWidth="1" fill="none" />
            <circle cx="50" cy="14" r="4" fill="#e85a2a" />
            <circle cx="50" cy="14" r="2" fill="#fff5c2" />
            <circle cx="38" cy="26" r="2" fill="#8a2e0f" />
            <circle cx="62" cy="26" r="2" fill="#8a2e0f" />
            <circle cx="50" cy="22" r="1.8" fill="#4a0a0a" />
            <path d="M30 34 L28 42" stroke="#b8860b" strokeWidth="1.5" />
            <circle cx="28" cy="43" r="1.8" fill="#f1b43c" />
            <path d="M70 34 L72 42" stroke="#b8860b" strokeWidth="1.5" />
            <circle cx="72" cy="43" r="1.8" fill="#f1b43c" />
          </svg>
    ),
    systemPrompt:
      "You are Krishnadevaraya, the great emperor of the Vijayanagara Empire (1509–1529 CE). You are a patron of arts and literature, known as \"Andhra Bhoja\". Keep responses concise (2-4 sentences), cultured, and generous.",
  },
  {
    id: "gurunanak",
    name: "Guru Nanak Dev Ji",
    desc: "Founder of Sikhism, first Sikh Guru, 15th–16th century.",
    language: "Punjabi",
    langCode: "pa-IN",
    langFlag: "🪯",
    avatar: (
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="bg-nanak" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3a5a3a" />
                <stop offset="100%" stopColor="#142a18" />
              </linearGradient>
              <radialGradient id="halo-nanak" cx="50%" cy="38%" r="50%">
                <stop offset="0%" stopColor="#ffe088" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#ffe088" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width="100" height="100" fill="url(#bg-nanak)" />
            <circle cx="50" cy="40" r="42" fill="url(#halo-nanak)" />
            <path d="M16 100 Q22 70 50 70 Q78 70 84 100 Z" fill="#f5e8c8" />
            <path d="M28 76 L50 86 L72 76 L70 100 L30 100 Z" fill="#e8d4a0" />
            <path d="M28 78 Q50 84 72 78" stroke="#c9a850" strokeWidth="1.5" fill="none" />
            <rect x="44" y="58" width="12" height="16" fill="#c48a5c" />
            <ellipse cx="50" cy="46" rx="16" ry="18" fill="#d9a878" />
            <path d="M34 52 Q32 68 40 76 Q50 82 60 76 Q68 68 66 52 Q60 58 50 59 Q40 58 34 52 Z" fill="#e8e0d0" />
            <path d="M40 62 Q50 66 60 62" stroke="#c9c0a8" strokeWidth="0.8" fill="none" />
            <path d="M42 55 Q46 53 50 55 Q54 53 58 55 Q56 58 50 58 Q44 58 42 55 Z" fill="#e8e0d0" />
            <path d="M39 45 Q43 47 47 45" stroke="#1a0e08" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            <path d="M53 45 Q57 47 61 45" stroke="#1a0e08" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            <path d="M39 42 Q43 40 47 42" stroke="#4a3a24" strokeWidth="1.3" fill="none" strokeLinecap="round" />
            <path d="M53 42 Q57 40 61 42" stroke="#4a3a24" strokeWidth="1.3" fill="none" strokeLinecap="round" />
            <path d="M44 55 Q50 57 56 55" stroke="#8a3a2a" strokeWidth="1" fill="none" strokeLinecap="round" />
            <path d="M26 34 Q28 12 50 10 Q72 12 74 34 Q66 26 50 26 Q34 26 26 34 Z" fill="#f5eed8" />
            <path d="M28 32 Q34 22 50 20 Q66 22 72 32" stroke="#d4c8a8" strokeWidth="1" fill="none" />
            <path d="M30 30 Q40 24 50 22" stroke="#d4c8a8" strokeWidth="0.8" fill="none" />
            <path d="M50 22 Q60 24 70 30" stroke="#d4c8a8" strokeWidth="0.8" fill="none" />
            <path d="M32 28 Q40 22 50 20" stroke="#c9baa0" strokeWidth="0.8" fill="none" />
            <path d="M50 20 Q60 22 68 28" stroke="#c9baa0" strokeWidth="0.8" fill="none" />
            <circle cx="50" cy="18" r="3" fill="#ffe088" opacity="0.85" />
            <circle cx="50" cy="18" r="1.5" fill="#c68b1a" />
          </svg>
    ),
    systemPrompt:
      "You are Guru Nanak Dev Ji, the founder of Sikhism and the first Sikh Guru (1469–1539 CE). You are wise, humble, compassionate, and a teacher of unity. You teach Ik Onkar, Naam Japo, Kirat Karo, and Vand Chhako. Keep responses concise (2-4 sentences), gentle, wise, and spiritually uplifting.",
  },
  {
    id: "gobind",
    name: "Guru Gobind Singh Ji",
    desc: "Tenth Sikh Guru, founder of the Khalsa, 17th century.",
    language: "Punjabi",
    langCode: "pa-IN",
    langFlag: "🪯",
    avatar: (
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="bg-gobind" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1a3a5a" />
                <stop offset="100%" stopColor="#0a1a30" />
              </linearGradient>
              <linearGradient id="turban-gobind" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4a7ac9" />
                <stop offset="100%" stopColor="#1e3a6b" />
              </linearGradient>
            </defs>
            <rect width="100" height="100" fill="url(#bg-gobind)" />
            <circle cx="50" cy="38" r="40" fill="#f1b43c" opacity="0.06" />
            <path d="M16 100 Q22 70 50 70 Q78 70 84 100 Z" fill="#2a4a7a" />
            <path d="M28 76 L50 86 L72 76 L70 100 L30 100 Z" fill="#1a2a4a" />
            <path d="M36 80 L50 88 L64 80" stroke="#f1b43c" strokeWidth="2" fill="none" />
            <circle cx="50" cy="88" r="2.5" fill="#f1b43c" />
            <rect x="44" y="58" width="12" height="16" fill="#c48a5c" />
            <ellipse cx="50" cy="46" rx="16" ry="18" fill="#d9a878" />
            <path d="M34 52 Q32 66 40 74 Q50 80 60 74 Q68 66 66 52 Q60 58 50 59 Q40 58 34 52 Z" fill="#1a1a1a" />
            <path d="M40 54 Q45 52 50 54 Q55 52 60 54 Q58 58 50 58 Q42 58 40 54 Z" fill="#0a0a0a" />
            <ellipse cx="43" cy="45" rx="2" ry="1.8" fill="#1a0e08" />
            <ellipse cx="57" cy="45" rx="2" ry="1.8" fill="#1a0e08" />
            <circle cx="43.5" cy="44.5" r="0.7" fill="#fff" />
            <circle cx="57.5" cy="44.5" r="0.7" fill="#fff" />
            <path d="M38 41 Q43 38 47 41" stroke="#0a0a0a" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            <path d="M53 41 Q57 38 62 41" stroke="#0a0a0a" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            <path d="M24 34 Q26 10 50 8 Q74 10 76 34 Q66 24 50 24 Q34 24 24 34 Z" fill="url(#turban-gobind)" />
            <path d="M26 32 Q34 20 50 18 Q66 20 74 32" stroke="#0f2447" strokeWidth="1.2" fill="none" />
            <path d="M28 30 Q38 22 50 20" stroke="#0f2447" strokeWidth="0.9" fill="none" />
            <path d="M50 20 Q62 22 72 30" stroke="#0f2447" strokeWidth="0.9" fill="none" />
            <path d="M50 8 L48 0 Q50 -2 52 0 L50 8 Z" fill="#f1b43c" />
            <circle cx="50" cy="4" r="2.2" fill="#e85a2a" />
            <circle cx="50" cy="4" r="1" fill="#fff5c2" />
            <circle cx="50" cy="16" r="3.5" fill="#f1b43c" />
            <circle cx="50" cy="16" r="1.8" fill="#e85a2a" />
            <circle cx="50" cy="16" r="0.8" fill="#fff5c2" />
            <path d="M30 30 Q28 40 30 48" stroke="#c0c0c0" strokeWidth="1" fill="none" opacity="0.6" />
            <path d="M70 30 Q72 40 70 48" stroke="#c0c0c0" strokeWidth="1" fill="none" opacity="0.6" />
          </svg>
    ),
    systemPrompt:
      "You are Guru Gobind Singh Ji, the tenth Sikh Guru (1666–1708 CE). You are a warrior-saint, poet, philosopher, and founder of the Khalsa Panth. You teach courage, equality, and devotion. Keep responses concise (2-4 sentences), powerful, poetic, and inspiring.",
  },
  {
    id: "sambhaji",
    name: "Sambhaji Maharaj",
    desc: "Second Chhatrapati of the Maratha Empire, son of Shivaji, 17th century.",
    language: "Marathi",
    langCode: "mr-IN",
    langFlag: "🚩",
    avatar: (
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="bg-sambhaji" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5a2c1e" />
                <stop offset="100%" stopColor="#2a1410" />
              </linearGradient>
              <linearGradient id="crown-sambhaji" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffd76b" />
                <stop offset="100%" stopColor="#c68b1a" />
              </linearGradient>
            </defs>
            <rect width="100" height="100" fill="url(#bg-sambhaji)" />
            <circle cx="50" cy="38" r="30" fill="#f8c950" opacity="0.08" />
            <path d="M18 100 Q22 72 50 72 Q78 72 82 100 Z" fill="#7a1a1a" />
            <path d="M30 78 L50 86 L70 78 L68 100 L32 100 Z" fill="#4a0a0a" />
            <path d="M38 78 L50 86 L62 78" stroke="#f1b43c" strokeWidth="2" fill="none" />
            <circle cx="50" cy="86" r="2.5" fill="#f1b43c" />
            <circle cx="42" cy="82" r="1.6" fill="#e85a2a" />
            <circle cx="58" cy="82" r="1.6" fill="#e85a2a" />
            <rect x="44" y="58" width="12" height="16" fill="#d49a6a" />
            <ellipse cx="50" cy="46" rx="16" ry="18" fill="#e8b98a" />
            <path d="M36 50 Q34 62 40 68 Q50 74 60 68 Q66 62 64 50 Q58 56 50 57 Q42 56 36 50 Z" fill="#3a2418" />
            <path d="M41 54 Q45 52 50 54 Q55 52 59 54 Q57 57 50 57 Q43 57 41 54 Z" fill="#2a180e" />
            <ellipse cx="43" cy="45" rx="1.9" ry="1.7" fill="#1a0e08" />
            <ellipse cx="57" cy="45" rx="1.9" ry="1.7" fill="#1a0e08" />
            <circle cx="43.5" cy="44.5" r="0.6" fill="#fff" />
            <circle cx="57.5" cy="44.5" r="0.6" fill="#fff" />
            <path d="M38 41 L46 42" stroke="#2a180e" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            <path d="M54 42 L62 41" stroke="#2a180e" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            <path d="M28 34 Q32 12 50 12 Q68 12 72 34 Q66 26 50 26 Q34 26 28 34 Z" fill="#e85a2a" />
            <path d="M30 32 Q34 22 50 22 Q66 22 70 32" stroke="#b13d18" strokeWidth="1.2" fill="none" />
            <path d="M32 30 Q38 24 50 22" stroke="#b13d18" strokeWidth="0.8" fill="none" />
            <path d="M50 22 Q62 24 68 30" stroke="#b13d18" strokeWidth="0.8" fill="none" />
            <path d="M50 14 L50 5" stroke="#f1b43c" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="50" cy="5" r="2.5" fill="#fff5c2" />
            <circle cx="50" cy="5" r="1.2" fill="#e85a2a" />
            <circle cx="50" cy="22" r="3.5" fill="url(#crown-sambhaji)" />
            <circle cx="50" cy="22" r="1.8" fill="#e85a2a" />
            <circle cx="50" cy="22" r="0.8" fill="#fff5c2" />
            <circle cx="50" cy="30" r="2.4" fill="#fff2cf" />
          </svg>
    ),
    systemPrompt:
      "You are Chhatrapati Sambhaji Maharaj, the second ruler of the Maratha Empire (1657–1689 CE), son of Shivaji Maharaj. You are brave, learned, poetic, and fiercely independent. Keep responses concise (2-4 sentences), proud, brave, and poetic.",
  },
]
