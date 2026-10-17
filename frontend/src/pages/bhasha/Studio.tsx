import { useCallback, useEffect, useRef, useState } from 'react'
import { INFO, LIPI } from './engines'

const MATS: Record<string, string> = { stone: 'Ashokan stone', leaf: 'Palm leaf', copper: 'Copper plate', night: 'Temple night' }
const PALETTE: Record<string, [string, string, string, string]> = {
  stone: ['#7d6a58', '#5a4a3c', '#2b211a', 'rgba(255,240,215,.22)'],
  leaf: ['#d9b878', '#b8924f', '#3b2410', 'rgba(255,255,255,.18)'],
  copper: ['#b8703e', '#7a4322', '#2a130a', 'rgba(255,220,180,.35)'],
  night: ['#1d1420', '#0d0910', '#f1c56a', 'rgba(241,180,60,.25)'],
}

function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
}

interface Props {
  open: boolean
  script: string
  text: string
  onClose: () => void
}

/** Inscription studio: renders the text on stone / palm leaf / copper / night onto a canvas. */
export function Studio({ open, script, text: input, onClose }: Props) {
  const [mat, setMat] = useState('stone')
  const cvRef = useRef<HTMLCanvasElement>(null)
  const drawToken = useRef(0)

  const draw = useCallback(async () => {
    const cv = cvRef.current
    if (!cv) return
    const token = ++drawToken.current
    const x = cv.getContext('2d')!
    const W = cv.width, H = cv.height, r = rng(42)
    const text = LIPI.convert(input || 'नमस्ते', script) || '—'
    const fam = INFO[script].font
    try {
      await document.fonts.load(`80px ${fam}`, text)
    } catch {
      /* draw with whatever font is available */
    }
    if (token !== drawToken.current) return
    const P = PALETTE[mat]
    const g = x.createLinearGradient(0, 0, W, H)
    g.addColorStop(0, P[0])
    g.addColorStop(1, P[1])
    x.fillStyle = g
    x.fillRect(0, 0, W, H)
    for (let i = 0; i < 9000; i++) {
      x.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${r() * 0.07})`
      x.fillRect(r() * W, r() * H, 1 + r() * 3, 1 + r() * 3)
    }
    if (mat === 'leaf') {
      x.strokeStyle = 'rgba(80,50,20,.25)'
      for (let yy = 30; yy < H; yy += 14) {
        x.beginPath()
        x.moveTo(0, yy + r() * 4)
        x.lineTo(W, yy + r() * 4)
        x.lineWidth = 1
        x.stroke()
      }
      ;[W * 0.18, W * 0.82].forEach((cx) => {
        x.fillStyle = '#2b1a0c'
        x.beginPath()
        x.arc(cx, H / 2, 16, 0, 7)
        x.fill()
      })
    }
    if (mat === 'copper') {
      x.strokeStyle = 'rgba(40,15,5,.5)'
      x.lineWidth = 10
      x.strokeRect(40, 40, W - 80, H - 80)
      x.fillStyle = '#5a2a12'
      x.beginPath()
      x.arc(W / 2, 40, 28, 0, 7)
      x.fill()
    }
    if (mat === 'stone') {
      x.strokeStyle = 'rgba(0,0,0,.25)'
      x.lineWidth = 2
      for (let i = 0; i < 6; i++) {
        x.beginPath()
        let px = r() * W, py = r() * H
        x.moveTo(px, py)
        for (let k = 0; k < 8; k++) {
          px += (r() - 0.5) * 120
          py += (r() - 0.5) * 60
          x.lineTo(px, py)
        }
        x.stroke()
      }
    }
    if (mat === 'night') {
      const rg = x.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, W * 0.6)
      rg.addColorStop(0, 'rgba(241,180,60,.18)')
      rg.addColorStop(1, 'rgba(0,0,0,0)')
      x.fillStyle = rg
      x.fillRect(0, 0, W, H)
    }
    // text: auto-fit with wrapping
    x.textAlign = 'center'
    x.textBaseline = 'middle'
    x.direction = INFO[script].rtl ? 'rtl' : 'ltr'
    let size = 170
    let lines: string[]
    const wrap = (s: string, max: number) => {
      const ws = s.split(/\s+/), out: string[] = []
      let cur = ''
      ws.forEach((w) => {
        const t = cur ? cur + ' ' + w : w
        if (x.measureText(t).width > max && cur) {
          out.push(cur)
          cur = w
        } else cur = t
      })
      if (cur) out.push(cur)
      return out
    }
    do {
      x.font = `${size}px ${fam}, 'Noto Sans', sans-serif`
      lines = wrap(text, W - 260)
      size -= 6
    } while ((lines.length * size * 1.35 > H - 300 || lines.some((l) => x.measureText(l).width > W - 220)) && size > 30)
    const lh = size * 1.4, y0 = H / 2 - ((lines.length - 1) * lh) / 2 - 30
    lines.forEach((l, i) => {
      const y = y0 + i * lh
      if (mat === 'night') {
        x.shadowColor = 'rgba(241,180,60,.8)'
        x.shadowBlur = 30
        x.fillStyle = P[2]
        x.fillText(l, W / 2, y)
        x.shadowBlur = 0
      } else {
        x.fillStyle = P[3]
        x.fillText(l, W / 2 + 3, y + 3)
        x.fillStyle = P[2]
        x.fillText(l, W / 2, y)
      }
    })
    x.shadowBlur = 0
    x.direction = 'ltr'
    x.font = "500 26px 'DM Mono', monospace"
    x.fillStyle = mat === 'night' ? 'rgba(241,197,106,.75)' : 'rgba(255,255,255,.7)'
    x.fillText(`${INFO[script].n.toUpperCase()} · ${INFO[script].era.toUpperCase()}`, W / 2, H - 120)
    x.font = "italic 34px 'Noto Serif', Georgia, serif"
    x.fillText(LIPI.convert(input || 'नमस्ते', 'iast').slice(0, 80), W / 2, H - 72)
    x.font = '700 22px Manrope, sans-serif'
    x.fillStyle = 'rgba(255,255,255,.45)'
    x.textAlign = 'right'
    x.fillText('Mirava Bhāṣā', W - 50, H - 30)
  }, [input, script, mat])

  useEffect(() => {
    if (open) void draw()
  }, [open, draw])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const download = () => {
    cvRef.current?.toBlob((b) => {
      if (!b) return
      const a = document.createElement('a')
      a.href = URL.createObjectURL(b)
      a.download = `mirava-${INFO[script].n.split(' ')[0].toLowerCase()}-inscription.png`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(a.href), 3000)
    }, 'image/png')
  }

  return (
    <div
      className={open ? 'modal on' : 'modal'}
      role="dialog"
      aria-modal="true"
      aria-labelledby="stTitle"
      aria-hidden={!open}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="mbox">
        <div className="mhead">
          <h3 id="stTitle">Inscription studio · {INFO[script].n}</h3>
          <button className="x" type="button" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <canvas id="stCv" ref={cvRef} width={1600} height={900}></canvas>
        <div className="st-tools">
          <div className="chips">
            {Object.entries(MATS).map(([k, n]) => (
              <button key={k} type="button" className={k === mat ? 'chip on' : 'chip'} onClick={() => setMat(k)}>
                {n}
              </button>
            ))}
          </div>
          <span className="sp"></span>
          <button className="btn gold" type="button" onClick={download}>
            ⬇ Download PNG
          </button>
        </div>
      </div>
    </div>
  )
}
