/**
 * Shivaji "Maratha Guardian" canvas mini-game, ported from the legacy
 * explore/classroom script. Pure imperative engine: React owns the modal
 * markup, this owns the canvas loop, timers and keyboard input.
 */

export interface ShivajiResult {
  won: boolean
  kills: number
  time: number
}

export interface ShivajiEngine {
  /** Reset and start a new battle after `delay` ms (legacy open/restart timing). */
  restart: (delay?: number) => void
  /** Stops all loops/timers (modal closed). */
  stop: () => void
  togglePause: () => boolean
  resize: () => void
  destroy: () => void
}

interface Els {
  canvas: HTMLCanvasElement
  kills: HTMLElement | null
  enemies: HTMLElement | null
  timer: HTMLElement | null
  /** Where confetti is appended (inside the page scope). */
  confettiHost: HTMLElement
}

interface Enemy {
  x: number
  y: number
  radius: number
  speed: number
  color: string
  wobble: number
  wobbleSpeed: number
}

const ENEMY_TYPES = [
  { name: 'Mughal Soldier', color: '#6a1b1b', radius: 14, speed: 0.7, points: 10 },
  { name: 'Adilshahi Guard', color: '#2d4a2d', radius: 16, speed: 0.5, points: 15 },
  { name: 'Nizam Cavalry', color: '#4a2d1a', radius: 13, speed: 0.9, points: 20 },
  { name: "Afzal Khan's Spy", color: '#3d1f1f', radius: 11, speed: 1.1, points: 25 },
]

export function createShivajiEngine(els: Els, onEnd: (r: ShivajiResult) => void): ShivajiEngine {
  const { canvas } = els
  const ctx = canvas.getContext('2d')!
  let running = false
  let paused = false
  let over = false
  let kills = 0
  let time = 0
  let animFrame = 0
  let gameInterval: number | undefined
  let spawnInterval: number | undefined
  const pending = new Set<number>()
  let enemies: Enemy[] = []
  const keys: Record<string, boolean> = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false }
  let active = false // keyboard only while the modal is open

  const shivaji = {
    x: 400,
    y: 225,
    radius: 18,
    speed: 4,
    draw() {
      ctx.save()
      ctx.shadowColor = 'rgba(241,180,60,0.4)'
      ctx.shadowBlur = 20
      ctx.beginPath()
      ctx.arc(this.x, this.y - 8, this.radius * 0.9, 0, Math.PI * 2)
      ctx.fillStyle = '#f3b841'
      ctx.fill()
      ctx.beginPath()
      ctx.arc(this.x, this.y + 2, this.radius * 0.7, 0, Math.PI * 2)
      ctx.fillStyle = '#d4a373'
      ctx.fill()
      ctx.beginPath()
      ctx.arc(this.x, this.y + 12, this.radius * 0.5, 0, Math.PI)
      ctx.fillStyle = '#3d2b1f'
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(this.x + this.radius * 0.6, this.y - 4)
      ctx.lineTo(this.x + this.radius * 1.5, this.y - 12)
      ctx.lineTo(this.x + this.radius * 1.6, this.y - 6)
      ctx.fillStyle = '#c0c0c0'
      ctx.fill()
      ctx.restore()
      ctx.beginPath()
      ctx.arc(this.x, this.y, this.radius * 1.8, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(241,180,60,0.06)'
      ctx.fill()
    },
  }

  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      pending.delete(id)
      fn()
    }, ms)
    pending.add(id)
  }

  function clearLoops() {
    if (animFrame) cancelAnimationFrame(animFrame)
    animFrame = 0
    window.clearInterval(spawnInterval)
    window.clearInterval(gameInterval)
  }

  function resize() {
    const wrap = canvas.parentElement
    if (!wrap) return
    const rect = wrap.getBoundingClientRect()
    if (rect.width && rect.height) {
      canvas.width = rect.width
      canvas.height = rect.height
    }
  }

  function updateUI() {
    if (els.kills) els.kills.textContent = String(kills)
    if (els.enemies) els.enemies.textContent = String(enemies.length)
  }

  function spawnEnemy() {
    if (!running || paused || over) return
    const type = ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)]
    const side = Math.floor(Math.random() * 4)
    const pad = 40
    const w = canvas.width
    const h = canvas.height
    let x: number
    let y: number
    if (side === 0) {
      x = -pad
      y = Math.random() * h
    } else if (side === 1) {
      x = w + pad
      y = Math.random() * h
    } else if (side === 2) {
      x = Math.random() * w
      y = -pad
    } else {
      x = Math.random() * w
      y = h + pad
    }
    const dx = x - shivaji.x
    const dy = y - shivaji.y
    if (Math.sqrt(dx * dx + dy * dy) < 100) {
      x = Math.random() * w
      y = Math.random() * h
    }
    enemies.push({
      x,
      y,
      radius: type.radius,
      speed: type.speed + (Math.random() * 0.4 - 0.2),
      color: type.color,
      wobble: Math.random() * 100,
      wobbleSpeed: 0.02 + Math.random() * 0.02,
    })
    updateUI()
  }

  function drawBackground() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#1f1419'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  function gameLoop() {
    if (!running || paused || over) {
      animFrame = requestAnimationFrame(gameLoop)
      return
    }
    let dx = 0
    let dy = 0
    if (keys.ArrowUp) dy = -shivaji.speed
    if (keys.ArrowDown) dy = shivaji.speed
    if (keys.ArrowLeft) dx = -shivaji.speed
    if (keys.ArrowRight) dx = shivaji.speed
    if (dx && dy) {
      dx *= 0.707
      dy *= 0.707
    }
    shivaji.x = Math.max(shivaji.radius, Math.min(canvas.width - shivaji.radius, shivaji.x + dx))
    shivaji.y = Math.max(shivaji.radius, Math.min(canvas.height - shivaji.radius, shivaji.y + dy))

    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i]
      const dx2 = shivaji.x - e.x
      const dy2 = shivaji.y - e.y
      const dist = Math.sqrt(dx2 * dx2 + dy2 * dy2)
      if (dist > 0.5) {
        e.x += (dx2 / dist) * e.speed
        e.y += (dy2 / dist) * e.speed
      }
      e.wobble += e.wobbleSpeed
      e.x += Math.sin(e.wobble) * 0.2
      e.y += Math.cos(e.wobble * 0.7) * 0.2
      if (dist < shivaji.radius + e.radius) {
        endGame(false)
        return
      }
      if (e.x < -200 || e.x > canvas.width + 200 || e.y < -200 || e.y > canvas.height + 200) enemies.splice(i, 1)
    }

    drawBackground()
    ctx.strokeStyle = 'rgba(241,180,60,0.04)'
    ctx.lineWidth = 1
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvas.height)
      ctx.stroke()
    }
    for (let y = 0; y < canvas.height; y += 40) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
      ctx.stroke()
    }

    enemies.forEach((e) => {
      ctx.save()
      ctx.shadowColor = 'rgba(255,0,0,0.3)'
      ctx.shadowBlur = 15
      ctx.beginPath()
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2)
      ctx.fillStyle = e.color
      ctx.fill()
      ctx.strokeStyle = '#f3b841'
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(e.x - 5, e.y - 3, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(e.x + 5, e.y - 3, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#000'
      ctx.beginPath()
      ctx.arc(e.x - 4, e.y - 2, 1.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(e.x + 6, e.y - 2, 1.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#c0c0c0'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(e.x + e.radius * 0.4, e.y - e.radius * 0.3)
      ctx.lineTo(e.x + e.radius * 0.9, e.y - e.radius * 0.8)
      ctx.stroke()
      ctx.restore()
    })

    shivaji.draw()
    ctx.fillStyle = 'rgba(241,180,60,0.5)'
    ctx.font = '12px "DM Mono"'
    ctx.fillText(`⚔️ ${kills}`, 14, 28)
    updateUI()
    animFrame = requestAnimationFrame(gameLoop)
  }

  function launchConfetti() {
    const container = document.createElement('div')
    container.className = 'confetti-container'
    els.confettiHost.appendChild(container)
    const colors = ['#f1b43c', '#df5934', '#8ab372', '#f8c950', '#e58667']
    for (let i = 0; i < 60; i++) {
      const el = document.createElement('div')
      el.className = 'confetti'
      el.style.left = Math.random() * 100 + '%'
      el.style.top = '-10px'
      el.style.background = colors[Math.floor(Math.random() * colors.length)]
      el.style.width = 6 + Math.random() * 8 + 'px'
      el.style.height = 6 + Math.random() * 8 + 'px'
      el.style.animationDuration = 1.5 + Math.random() * 1.5 + 's'
      el.style.animationDelay = Math.random() * 0.8 + 's'
      container.appendChild(el)
    }
    later(() => container.remove(), 3000)
  }

  function endGame(won: boolean) {
    if (over) return
    over = true
    running = false
    window.clearInterval(spawnInterval)
    window.clearInterval(gameInterval)
    if (won) launchConfetti()
    onEnd({ won, kills, time })
  }

  function startGame() {
    clearLoops()
    shivaji.x = canvas.width / 2
    shivaji.y = canvas.height / 2
    enemies = []
    kills = 0
    time = 0
    over = false
    paused = false
    running = true
    resize()
    updateUI()
    if (els.timer) els.timer.textContent = '0'
    spawnInterval = window.setInterval(() => {
      if (running && !paused && !over) {
        spawnEnemy()
        if (kills > 10 && Math.random() < 0.3) spawnEnemy()
        if (kills > 25 && Math.random() < 0.4) spawnEnemy()
      }
    }, 1200)
    gameInterval = window.setInterval(() => {
      if (running && !paused && !over) {
        time++
        if (els.timer) els.timer.textContent = String(time)
      }
    }, 1000)
    for (let i = 0; i < 3; i++) spawnEnemy()
    gameLoop()
  }

  function resetGame() {
    clearLoops()
    running = false
    over = false
    paused = false
    enemies = []
    kills = 0
    time = 0
    updateUI()
    if (els.timer) els.timer.textContent = '0'
    resize()
    drawBackground()
    shivaji.x = canvas.width / 2
    shivaji.y = canvas.height / 2
    shivaji.draw()
    ctx.fillStyle = 'rgba(241,180,60,0.3)'
    ctx.font = '16px "DM Mono"'
    ctx.fillText('Press "Fight again" to begin', canvas.width / 2 - 120, canvas.height / 2)
  }

  function onCanvasClick(e: MouseEvent) {
    if (!running || paused || over) return
    const rect = canvas.getBoundingClientRect()
    const cx = (e.clientX - rect.left) * (canvas.width / rect.width)
    const cy = (e.clientY - rect.top) * (canvas.height / rect.height)
    let closest = -1
    let closestDist = Infinity
    enemies.forEach((en, i) => {
      const dist = Math.hypot(cx - en.x, cy - en.y)
      if (dist < 60 && dist < closestDist) {
        closestDist = dist
        closest = i
      }
    })
    if (closest < 0) return
    enemies.splice(closest, 1)
    kills++
    updateUI()
    ctx.save()
    ctx.fillStyle = 'rgba(241,180,60,0.2)'
    ctx.beginPath()
    ctx.arc(cx, cy, 30, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    if (enemies.length === 0 && running) endGame(true)
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (!active || !(e.key in keys)) return
    keys[e.key] = true
    e.preventDefault()
  }
  const onKeyUp = (e: KeyboardEvent) => {
    if (!active || !(e.key in keys)) return
    keys[e.key] = false
    e.preventDefault()
  }
  const onResize = () => {
    if (active) resize()
  }

  canvas.addEventListener('click', onCanvasClick)
  document.addEventListener('keydown', onKeyDown)
  document.addEventListener('keyup', onKeyUp)
  window.addEventListener('resize', onResize)
  resetGame()

  return {
    restart(delay = 100) {
      active = true
      resetGame()
      later(startGame, delay)
    },
    stop() {
      active = false
      running = false
      Object.keys(keys).forEach((k) => (keys[k] = false))
      clearLoops()
      pending.forEach((id) => window.clearTimeout(id))
      pending.clear()
      els.confettiHost.querySelectorAll('.confetti-container').forEach((n) => n.remove())
    },
    togglePause() {
      if (!running || over) return paused
      paused = !paused
      return paused
    },
    resize,
    destroy() {
      this.stop()
      canvas.removeEventListener('click', onCanvasClick)
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('resize', onResize)
    },
  }
}
