import { useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { LanguageToggle } from '../../components/LanguageToggle'
import { PageScope } from '../../components/PageScope'
import './auth.page.css'

function ring(n: number, rx: number, ry: number, cy: number, fill: string, opacity: number) {
  return Array.from({ length: n }, (_, i) => (
    <ellipse key={i} cy={cy} rx={rx} ry={ry} fill={fill} opacity={opacity} transform={`rotate(${(i * 360) / n})`} />
  ))
}

/** Animated rangoli / diya illustration from the legacy login & signup pages. */
function Art({ caption, eyebrow }: { caption: string; eyebrow: string }) {
  return (
    <aside className="art">
      <svg viewBox="0 0 400 640" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <radialGradient id="auth-sc" cx=".3" cy=".25">
            <stop offset="0" stopColor="#fff" />
            <stop offset=".6" stopColor="#fffaf3" />
            <stop offset="1" stopColor="#f2d9b0" />
          </radialGradient>
          <radialGradient id="auth-sw" cx=".3" cy=".25">
            <stop offset="0" stopColor="#b5586a" />
            <stop offset=".6" stopColor="#792d3c" />
            <stop offset="1" stopColor="#3d1520" />
          </radialGradient>
          <radialGradient id="auth-so" cx=".3" cy=".25">
            <stop offset="0" stopColor="#ff9a6e" />
            <stop offset=".6" stopColor="#e5562f" />
            <stop offset="1" stopColor="#a3300f" />
          </radialGradient>
          <radialGradient id="auth-fl" cx=".5" cy=".7">
            <stop offset="0" stopColor="#fff3b0" />
            <stop offset=".5" stopColor="#f7b63e" />
            <stop offset="1" stopColor="#e5562f" />
          </radialGradient>
          <filter id="auth-bl">
            <feGaussianBlur stdDeviation="14" />
          </filter>
        </defs>
        <g transform="translate(200 250)">
          <circle r="150" fill="#fffaf3" opacity=".18" />
          <g className="spin">
            {ring(16, 20, 62, -122, '#792d3c', 0.92)}
            {ring(12, 18, 48, -84, '#fffaf3', 0.96)}
            {ring(8, 17, 36, -50, '#e5562f', 1)}
            <circle r="32" fill="#f7b63e" />
            <circle r="20" fill="#792d3c" />
            <circle r="8" fill="#fffaf3" />
          </g>
        </g>
        <g className="float">
          <circle cx="72" cy="96" r="36" fill="url(#auth-sc)" />
          <ellipse cx="60" cy="82" rx="9" ry="5" fill="#fff" opacity=".8" transform="rotate(-30 60 82)" />
        </g>
        <g className="float b">
          <circle cx="338" cy="70" r="24" fill="url(#auth-sw)" />
          <circle cx="330" cy="62" r="5" fill="#fff" opacity=".6" />
        </g>
        <g className="float b">
          <circle cx="344" cy="430" r="40" fill="url(#auth-so)" />
          <ellipse cx="330" cy="414" rx="10" ry="6" fill="#fff" opacity=".6" transform="rotate(-30 330 414)" />
        </g>
        <g className="float">
          <circle cx="56" cy="440" r="26" fill="url(#auth-sw)" />
        </g>
        <g fill="none" stroke="#fffaf3" strokeWidth="3" strokeLinecap="round" opacity=".9" transform="translate(40 305) rotate(-20)">
          <path d="M0 0C30-40 70-10 50 30C40 55 10 50 15 25C18 10 35 8 38 22" />
        </g>
        <g
          fill="none"
          stroke="#792d3c"
          strokeWidth="3"
          strokeLinecap="round"
          opacity=".85"
          transform="translate(360 330) scale(-1 1) rotate(25)"
        >
          <path d="M0 0C30-40 70-10 50 30C40 55 10 50 15 25C18 10 35 8 38 22" />
        </g>
        <circle cx="200" cy="470" r="46" fill="#ffd56b" opacity=".7" filter="url(#auth-bl)" />
        <path className="flame" d="M200 424Q226 458 200 492Q174 458 200 424Z" fill="url(#auth-fl)" />
        <path d="M138 494Q200 580 262 494Z" fill="#792d3c" />
        <path d="M130 494H270" stroke="#fffaf3" strokeWidth="5" strokeLinecap="round" />
        <path d="M160 512Q200 540 240 512" stroke="#f7b63e" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".8" />
      </svg>
      <div className="art-cap">
        <small>{eyebrow}</small>
        <p>{caption}</p>
      </div>
    </aside>
  )
}

interface ShellProps {
  title: string
  caption?: string
  eyebrow?: string
  children: ReactNode
}

/** Two-column card (illustration + form panel) shared by every auth page. */
export function AuthShell({
  title,
  caption = 'Keep every story, close to your heart.',
  eyebrow = 'A return to belonging',
  children,
}: ShellProps) {
  return (
    <PageScope name="auth" title={title}>
      <Link className="back" to="/">
        ← Home
      </Link>
      <LanguageToggle className="auth-lang" />
      <main className="shell">
        <Art caption={caption} eyebrow={eyebrow} />
        <section className="panel">
          <div className="box">
            <Link className="logo" to="/">
              mira<i>va</i>
            </Link>
            {children}
          </div>
        </section>
      </main>
    </PageScope>
  )
}

/** Inline status/error banner (legacy `.msg`). */
export function Msg({ text, ok }: { text: string | null; ok?: boolean }) {
  if (!text) return null
  return (
    <p className={`msg show${ok ? ' ok' : ''}`} role={ok ? 'status' : 'alert'}>
      {text}
    </p>
  )
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string
  label: ReactNode
  hint?: ReactNode
  children?: ReactNode
}

/** Underlined input with label; password inputs get the Show/Hide toggle. */
export function Field({ id, label, hint, children, type = 'text', ...input }: FieldProps) {
  const [shown, setShown] = useState(false)
  const isPassword = type === 'password'
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} type={isPassword && shown ? 'text' : type} {...input} />
      {isPassword && (
        <button className="eye" type="button" onClick={() => setShown((s) => !s)}>
          {shown ? 'Hide' : 'Show'}
        </button>
      )}
      {children}
      {hint && <span className="hint">{hint}</span>}
    </div>
  )
}

export function Spinner({ label }: { label: string }) {
  return (
    <div className="status" role="status" aria-live="polite">
      <div className="spin-dot" />
      <span>{label}</span>
    </div>
  )
}

/** "Continue with Google" (Supabase OAuth). */
export function GoogleButton({ onClick, busy, disabled }: { onClick: () => void; busy: boolean; disabled?: boolean }) {
  return (
    <button className="btn google" type="button" onClick={onClick} disabled={disabled || busy}>
      <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
        <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
      </svg>
      {busy ? 'Opening Google…' : 'Continue with Google'}
    </button>
  )
}
