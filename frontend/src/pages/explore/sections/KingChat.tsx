import { useEffect, useRef, useState, type FormEvent } from 'react'
import { getLanguage, t } from '../../../i18n'
import { api, ApiError, type ChatMessage } from '../../../lib/api'
import { KINGS, type King } from '../data/kings'

type Screen = 'select' | 'lang' | 'chat'
type LangChoice = 'english' | 'hindi' | 'regional'
interface Msg {
  id: number
  type: 'system' | 'king' | 'user'
  text: string
  /** Placeholder shown while waiting for the reply; not sent as history. */
  pending?: boolean
}

const REGIONAL_GREETINGS: Record<string, string> = {
  shivaji: 'नमस्कार, प्रवासी. मी छत्रपती शिवाजी महाराज आहे. स्वराज्याच्या भूमीवर तुमचे स्वागत आहे. बोला — मी मराठीत उत्तर देईन.',
  sambhaji: 'नमस्कार, प्रवासी. मी संभाजी महाराज आहे. स्वराज्यासाठी माझे जीवन समर्पित आहे. बोला — मी मराठीत उत्तर देईन.',
  ashoka: 'नमस्ते, यात्री. मैं सम्राट अशोक हूँ. कलिंग के युद्ध के बाद मैंने धम्म का मार्ग अपनाया. बोलिए — मैं प्राकृत में उत्तर दूँगा.',
  prithviraj: 'नमस्कार, यात्री. मैं पृथ्वीराज चौहान हूँ. राजपूत वीरता की भूमि पर आपका स्वागत है. बोलिए — मैं ब्रज में उत्तर दूँगा.',
  krishnadevaraya:
    'నమస్కారం, ప్రయాణికుడా. నేను కృష్ణదేవరాయలు. విజయనగర సామ్రాజ్యానికి స్వాగతం. మాట్లాడండి — నేను తెలుగులో సమాధానం ఇస్తాను.',
  gurunanak:
    'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ, ਯਾਤਰੀ. ਮੈਂ ਗੁਰੂ ਨਾਨਕ ਦੇਵ ਜੀ ਹਾਂ. ਇੱਕ ਓਂਕਾਰ ਦੀ ਧਰਤੀ ਤੇ ਤੁਹਾਡਾ ਸਵਾਗਤ ਹੈ. ਬੋਲੋ — ਮੈਂ ਪੰਜਾਬੀ ਵਿੱਚ ਜਵਾਬ ਦੇਵਾਂਗਾ.',
  gobind:
    'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ, ਯਾਤਰੀ. ਮੈਂ ਗੁਰੂ ਗੋਬਿੰਦ ਸਿੰਘ ਜੀ ਹਾਂ. ਖਾਲਸਾ ਪੰਥ ਦੀ ਧਰਤੀ ਤੇ ਤੁਹਾਡਾ ਸਵਾਗਤ ਹੈ. ਬੋਲੋ — ਮੈਂ ਪੰਜਾਬੀ ਵਿੱਚ ਜਵਾਬ ਦੇਵਾਂਗਾ.',
}

function languageInstruction(choice: LangChoice, king: King) {
  if (choice === 'english') return 'Respond ONLY in English.'
  if (choice === 'hindi') return 'Respond ONLY in Hindi (Devanagari script).'
  return `Respond ONLY in ${king.language}.`
}

function errorText(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 503) return '⚠️ The royal scribe is not connected — AI is not configured on this server yet.'
    if (err.status === 429) return `⚠️ ${err.message}`
    if (err.status === 401) return '⚠️ Please sign in again to speak with the king.'
    return `I am unable to respond at this moment. (Status: ${err.status})`
  }
  return '⚠️ Connection to the royal court failed. Please check your internet.'
}

/** Floating "Talk to Indian Kings" chat (legacy chat-fab + chat-popup), backed by api.ai.chat. */
export function KingChat() {
  const [open, setOpen] = useState(false)
  const [screen, setScreen] = useState<Screen>('select')
  const [king, setKing] = useState<King | null>(null)
  const [lang, setLang] = useState<LangChoice>('english')
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const nextId = useRef(1)
  const chatScreenRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    const el = chatScreenRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, screen])

  useEffect(() => {
    if (screen !== 'chat') return
    const t = window.setTimeout(() => inputRef.current?.focus(), 200)
    return () => window.clearTimeout(t)
  }, [screen, king, lang])

  // Legacy re-focused the input once the reply arrived.
  useEffect(() => {
    if (!typing && screen === 'chat') inputRef.current?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typing])

  const toggle = () => {
    setOpen((o) => {
      if (!o) {
        setKing(null)
        setScreen('select')
      }
      return !o
    })
  }

  const pickKing = (k: King) => {
    setKing(k)
    // New explore.html: Hindi site mode defaults the conversation to Hindi.
    setLang(getLanguage() === 'hi' ? 'hindi' : 'english')
    setScreen('lang')
  }

  const startChat = (choice: LangChoice) => {
    if (!king) return
    setLang(choice)
    let label: string
    let greeting: string
    if (choice === 'english') {
      label = 'English'
      greeting = `Greetings, traveler. I am ${king.name}. ${king.desc} Speak freely — I shall answer in English.`
    } else if (choice === 'hindi') {
      label = 'हिंदी'
      greeting = `नमस्ते, यात्री। यह ${t(king.name)} का शैक्षिक संवाद है। ${t(king.desc)} आप निःसंकोच बोलिए — मैं हिंदी में उत्तर दूँगा।`
    } else {
      label = king.language
      greeting = REGIONAL_GREETINGS[king.id] || `नमस्ते, यात्री. मैं ${king.name} हूँ. बोलिए.`
    }
    setMessages([
      { id: nextId.current++, type: 'system', text: `— You are now speaking with ${king.name} in ${label} —` },
      { id: nextId.current++, type: 'king', text: greeting },
    ])
    setScreen('chat')
  }

  const langLabel = !king ? '' : lang === 'english' ? 'English' : lang === 'hindi' ? 'हिंदी' : king.language

  const send = async (e: FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || typing || !king) return
    const userMsg: Msg = { id: nextId.current++, type: 'user', text }
    const thinkingId = nextId.current++
    const before = messages
    setMessages([...before, userMsg, { id: thinkingId, type: 'king', text: '🕉️ The king is pondering...', pending: true }])
    setInput('')
    setTyping(true)

    // Conversation history (from the visitor's first message on), capped for the API.
    const convo = [...before, userMsg].filter((m) => m.type !== 'system' && !m.pending)
    const firstUser = convo.findIndex((m) => m.type === 'user')
    let history: ChatMessage[] = convo.slice(firstUser).map((m) => ({
      role: m.type === 'user' ? 'user' : 'assistant',
      content: m.text,
    }))
    history = history.slice(-12)
    while (history.length && history[0].role !== 'user') history.shift()

    let reply: string
    try {
      reply =
        (await api.ai.chat({
          persona: 'king',
          system: `${king.systemPrompt} ${languageInstruction(lang, king)} Never break character. Keep responses concise (2-4 sentences).`,
          messages: history,
          max_tokens: 300,
        })) || 'The king remains silent.'
    } catch (err) {
      reply = errorText(err)
    }
    setMessages((list) => list.map((m) => (m.id === thinkingId ? { id: m.id, type: 'king', text: reply } : m)))
    setTyping(false)
  }

  return (
    <>
      <button
        type="button"
        className={`chat-fab${open ? ' open' : ''}`}
        id="chatFab"
        aria-label="Talk to Indian Kings"
        aria-expanded={open}
        onClick={toggle}
      >
        <svg className="chat-fab-chat" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
        <svg className="chat-fab-close" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>

      <div className={`chat-popup${open ? ' open' : ''}`} id="chatPopup" role="dialog" aria-label="Talk to Indian Kings">
        <div className="chat-popup-header">
          <span className="chat-popup-orb"></span>
          <h4 id="kingChatTitle">{screen !== 'select' && king ? king.name : 'Talk to Indian Kings'}</h4>
          <span className="chat-status">✦ online</span>
        </div>

        {screen === 'select' && (
          <div className="chat-popup-messages" id="kingSelectionScreen">
            <div className="king-select-intro">
              <p>🪔 Choose a king to speak with. They will speak in their own language, or you may choose English or Hindi.</p>
            </div>
            <div className="king-list" id="kingList">
              {KINGS.map((k) => (
                <button key={k.id} className="king-card" type="button" onClick={() => pickKing(k)}>
                  <div className="king-avatar">{k.avatar}</div>
                  <div className="king-info">
                    <strong>{k.name}</strong>
                    <small>{k.desc}</small>
                  </div>
                  <span className="king-lang-tag">{k.language}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {screen === 'lang' && king && (
          <div className="chat-popup-messages" id="kingLanguageScreen">
            <div className="king-lang-header">
              <button
                type="button"
                className="king-back-btn"
                id="kingBackToSelection"
                onClick={() => {
                  setKing(null)
                  setScreen('select')
                }}
              >
                ← Back
              </button>
              <div className="king-avatar-large" id="kingAvatarLang">
                {king.avatar}
              </div>
              <h3 id="kingNameLang">{king.name}</h3>
              <p id="kingDescLang">{king.desc}</p>
              <p className="king-lang-prompt">In which language would you like to speak?</p>
            </div>
            <div className="king-lang-options" id="kingLangOptions">
              <button type="button" className="king-lang-btn" onClick={() => startChat('english')}>
                <span className="lang-flag-icon">🇬🇧</span>
                <span className="lang-text">
                  <strong>English</strong>
                  <small>Continue in English</small>
                </span>
              </button>
              <button type="button" className="king-lang-btn" onClick={() => startChat('hindi')}>
                <span className="lang-flag-icon">🇮🇳</span>
                <span className="lang-text">
                  <strong>हिंदी (Hindi)</strong>
                  <small>हिंदी में बात करें</small>
                </span>
              </button>
              <button type="button" className="king-lang-btn" onClick={() => startChat('regional')}>
                <span className="lang-flag-icon">{king.langFlag}</span>
                <span className="lang-text">
                  <strong>{king.language}</strong>
                  <small>Speak in the king's own language</small>
                </span>
              </button>
            </div>
          </div>
        )}

        {screen === 'chat' && king && (
          <div className="chat-popup-messages" id="kingChatScreen" ref={chatScreenRef}>
            <div className="king-chat-header">
              <button type="button" className="king-back-btn" id="kingBackToLang" onClick={() => setScreen('lang')}>
                ← Change language
              </button>
              <div className="king-avatar-small" id="kingAvatarChat">
                {king.avatar}
              </div>
              <div>
                <strong id="kingNameChat">{king.name}</strong>
                <small id="kingLangChat">Speaking: {langLabel}</small>
              </div>
            </div>
            <div id="kingMessages">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`king-msg ${m.type}`}
                  translate={m.type === 'user' || m.pending ? 'no' : undefined}
                >
                  {m.text}
                </div>
              ))}
            </div>
          </div>
        )}

        <form className={`chat-popup-inputrow${screen === 'chat' ? '' : ' hidden'}`} id="kingChatForm" onSubmit={send}>
          <input
            ref={inputRef}
            type="text"
            id="kingChatInput"
            className="chat-popup-input"
            placeholder="Speak to the king…"
            autoComplete="off"
            aria-label="Type a message"
            value={input}
            disabled={typing}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" className="chat-popup-send" aria-label="Send">
            <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12 L20 4 L13 20 L11 13 L4 12Z" />
            </svg>
          </button>
        </form>
      </div>
    </>
  )
}
