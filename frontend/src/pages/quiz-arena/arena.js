/* =====================================================================
   MIRAVA QUIZ ARENA — v3 engine (ported from legacy/quiz.html)

   Runs inside the React page via useLegacyPage. Differences from legacy:
   - no name-based "login": the player is the signed-in Mirava account
   - progress lives in per-user server state (`quiz-arena.v3`) instead of
     localStorage (mqa_save_*, mqa_guest, miravaQuizXP, miravaProgressV3…)
   - every finished run is submitted to the server (games/quiz-arena) which
     grants Mirava XP and feeds the Quiz Arena leaderboard
   - the leaderboard screen ("Hall of Scholars") is React (LeaderboardPanel)
   ===================================================================== */
import { ACH, BANK, RIVALS, TITLES } from './data.js'

const STATE_KEY = 'quiz-arena.v3'

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
const ri = n => Math.floor(Math.random() * n)
function shuffle(a, rng) { rng = rng || Math.random; a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 } }
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }
/** Runtime translation with our own Hindi fallback for strings missing from /locales. */
const tx = (en, hi) => { const I = window.MiravaI18n; if (!I || I.language() !== 'hi') return en; const out = I.t(en); return out === en && hi ? hi : out }
const pad2 = n => String(n).padStart(2, '0')
const dstr = d => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
const today = () => dstr(new Date())
const addDays = (s, n) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return dstr(d) }
const dayDiff = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5)

/* ---------- question index ---------- */
const REGION_ICON = { north: '🏔️', east: '🌺', south: '🛕', west: '🏜️' }
const ALLQ = []
BANK.forEach(r => r.missions.forEach((m, mi) => m.q.forEach((q, qi) => ALLQ.push({ id: r.id + '-' + mi + '-' + qi, r: r.id, rl: r.label, m: mi, mn: m.name, q: q[0], o: q[1], a: q[2] }))))
const QBY = {}; ALLQ.forEach(q => QBY[q.id] = q)
const RIDX = id => BANK.findIndex(r => r.id === id)
const isBoss = m => /^The Final Trial/.test(m.name)
const missionXP = (m, mi) => isBoss(m) ? 150 : 40 + mi * 10
const TOTAL_MISSIONS = BANK.reduce((a, r) => a + r.missions.length, 0)

/* ---------- levels ---------- */
const levelOf = xp => Math.floor(Math.sqrt(xp / 60)) + 1
const xpFor = L => 60 * (L - 1) * (L - 1)
const titleOf = L => TITLES[Math.min(L - 1, TITLES.length - 1)]
const initials = n => { const p = String(n).trim().split(/\s+/); return (p.length > 1 ? p[0][0] + p[p.length - 1][0] : p[0].slice(0, 2)).toUpperCase() }

const NEW = name => ({ v: 3, name, xp: 0, stars: {}, stats: { ans: 0, cor: 0, time: 0, fast: 0, reg: {} }, best: { lightning: 0, survival: 0, combo: 0 }, daily: { last: null, streak: 0, bestStreak: 0, hist: {} }, rivals: {}, review: {}, mastered: 0, ach: [], act: {}, sound: true, runs: 0 })

const MANDALA = `<svg class="mandala" viewBox="0 0 200 200"><g fill="none" stroke="#f1b43c" stroke-width="1">${Array.from({ length: 16 }, (_, i) => `<ellipse cx="100" cy="55" rx="14" ry="45" transform="rotate(${i * 22.5} 100 100)"/>`).join('')}<circle cx="100" cy="100" r="30"/><circle cx="100" cy="100" r="90"/><circle cx="100" cy="100" r="70"/></g></svg>`
const starsHTML = n => [0, 1, 2].map(i => i < n ? '★' : '<i>★</i>').join('')
const LETTERS = ['A', 'B', 'C', 'D']
const MAPPOLY = [[.36, 0], [.52, .07], [.62, .15], [.75, .16], [.82, .29], [.75, .38], [.83, .47], [.72, .54], [.68, .70], [.59, .76], [.57, .99], [.49, .86], [.42, .79], [.36, .67], [.25, .59], [.28, .47], [.19, .40], [.25, .27], [.28, .13]].map(p => (p[0] * 100).toFixed(1) + ',' + (p[1] * 110).toFixed(1)).join(' ')
const RPOS = { north: [46, 22], east: [70, 40], west: [28, 50], south: [52, 78] }

/**
 * @param {HTMLElement} root
 * @param {import('../../lib/legacy').LegacyContext} ctx
 * @param {{ onScore?: (out: import('../../lib/api').GameScoreOut) => void }} [hooks]
 */
export function initArena(root, ctx, hooks = {}) {
  let disposed = false
  const timeouts = new Set()
  const later = (fn, ms) => { const id = setTimeout(() => { timeouts.delete(id); if (!disposed) fn() }, ms); timeouts.add(id); return id }
  const $ = id => root.querySelector('#' + id)
  const screens = () => root.querySelectorAll('.screen')
  const scrollTop = () => window.scrollTo({ top: 0 })

  let P = null
  let RUN = null
  let screen = 'loading'
  let newAch = []
  let curRegion = null

  const playerName = () => {
    const p = ctx.me && ctx.me.profile
    return (p && (p.display_name || p.username)) || (ctx.isGuest ? 'Guest' : 'Explorer')
  }

  /* ---------- persistence (server-side per-user state) ---------- */
  let saveTimer = 0
  function persist() {
    if (!P) return
    clearTimeout(saveTimer); timeouts.delete(saveTimer); saveTimer = 0
    // keep the blob well under the 64KB state limit
    const days = Object.keys(P.act).sort()
    if (days.length > 120) days.slice(0, days.length - 120).forEach(d => delete P.act[d])
    const hist = Object.keys(P.daily.hist).sort()
    if (hist.length > 120) hist.slice(0, hist.length - 120).forEach(d => delete P.daily.hist[d])
    void ctx.saveState(STATE_KEY, P)
  }
  function save() {
    if (!P) return
    clearTimeout(saveTimer); timeouts.delete(saveTimer)
    saveTimer = later(persist, 1500)
  }
  function hydrate(saved) {
    const base = NEW(playerName())
    let p = saved && typeof saved === 'object' ? saved : null
    if (!p) p = base
    else {
      for (const k in base) if (p[k] === undefined) p[k] = base[k]
      for (const k of ['stats', 'best', 'daily']) p[k] = Object.assign({}, base[k], p[k])
    }
    p.name = playerName()
    return p
  }

  /* ---------- progress helpers ---------- */
  const starsOf = (r, mi) => (P.stars[r + '-' + mi] || {}).s || 0
  function regionUnlocked(i) { if (i === 0) return true; const prev = BANK[i - 1]; return starsOf(prev.id, prev.missions.length - 1) > 0 }
  function missionUnlocked(r, mi) { const ri2 = RIDX(r); return regionUnlocked(ri2) && (mi === 0 || starsOf(r, mi - 1) > 0) }
  const regionStars = r => BANK[RIDX(r)].missions.reduce((a, m, mi) => a + starsOf(r, mi), 0)
  const totalStars = () => BANK.reduce((a, r) => a + regionStars(r.id), 0)
  const maxStars = () => BANK.reduce((a, r) => a + r.missions.length * 3, 0)
  const missionsDone = () => Object.values(P.stars).filter(s => s.s > 0).length
  const reviewDue = () => Object.entries(P.review).filter(([id, c]) => QBY[id] && c.due <= today()).map(([id]) => id)

  /* ---------- XP / achievements ---------- */
  function addXP(n) {
    if (n <= 0) return; const before = levelOf(P.xp); P.xp += n; const after = levelOf(P.xp)
    if (after > before) later(() => levelUpFx(after), 600)
    renderTop()
  }
  function unlock(id) { if (P.ach.includes(id)) return; P.ach.push(id); const a = ACH.find(x => x.id === id); newAch.push(a); P.xp += 30; toast(`<span class="ai">${a.i}</span><div><small>ACHIEVEMENT · +30 XP</small>${a.n}</div>`, 4200); Sound.fanfare() }
  function checkAch() {
    const s = P.stats
    if (s.ans > 0) unlock('first'); if (missionsDone() > 0) unlock('mission')
    if (s.cor >= 100) unlock('c100'); if (s.cor >= 500) unlock('c500'); if (s.fast >= 10) unlock('quick')
    if (P.best.combo >= 10) unlock('combo10'); if (P.best.combo >= 25) unlock('combo25')
    if (P.best.lightning >= 15) unlock('lightning'); if (P.best.survival >= 20) unlock('survivor')
    if (P.daily.last) unlock('daily1'); if (P.daily.bestStreak >= 7) unlock('daily7')
    if (Object.keys(P.rivals).length) unlock('duel'); if (P.rivals.chanakya) unlock('chanakya')
    if (P.mastered >= 10) unlock('memory')
    if (BANK.some(r => r.missions.every((m, mi) => starsOf(r.id, mi) === 3))) unlock('region')
    if (BANK.every(r => starsOf(r.id, r.missions.length - 1) > 0)) unlock('conqueror')
    if (totalStars() === maxStars()) unlock('constellation')
  }

  /* ---------- sound ---------- */
  const Sound = {
    ctx: null, m: null,
    init() { if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return } const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; try { this.ctx = new AC(); this.m = this.ctx.createGain(); this.m.gain.value = .5; this.m.connect(this.ctx.destination) } catch { this.ctx = null } },
    get ok() { return !disposed && this.ctx && P && P.sound },
    t(f, d, type, v, slide, delay) { if (!this.ok) return; const c = this.ctx, t = c.currentTime + (delay || 0), o = c.createOscillator(), g = c.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t + d); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v || .1, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g); g.connect(this.m); o.start(t); o.stop(t + d + .05) },
    click() { this.t(700, .06, 'triangle', .05) },
    ok1(streak) { const b = 523 * Math.pow(1.06, Math.min(streak, 12)); this.t(b, .18, 'triangle', .09); this.t(b * 1.5, .3, 'sine', .08, 0, .08) },
    no() { this.t(180, .35, 'sawtooth', .05, .6) },
    tick() { this.t(1100, .04, 'square', .025) },
    combo() { [784, 988, 1175, 1568].forEach((f, i) => this.t(f, .22, 'triangle', .06, 0, i * .05)) },
    fanfare() { [523, 659, 784, 1047].forEach((f, i) => this.t(f, .5, 'triangle', .08, 0, i * .11)) },
    sage() { [1200, 1500, 1800].forEach((f, i) => this.t(f, .6, 'sine', .04, 0, i * .08)) },
    rival() { this.t(330, .12, 'square', .03) },
    close() { try { if (this.ctx) this.ctx.close() } catch { /* ignore */ } this.ctx = null },
  }

  /* ---------- UI helpers (overlays live inside root, not <body>) ---------- */
  function toast(html, ms) { const b = $('toasts'); if (!b) return; const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = html; b.appendChild(t); while (b.children.length > 4) b.firstChild.remove(); later(() => { t.classList.add('out'); later(() => t.remove(), 450) }, ms || 2800) }
  function confetti(n) { const cols = ['#f1b43c', '#df5934', '#8ab372', '#f8c950', '#5a8fd8', '#b0262f']; for (let i = 0; i < (n || 80); i++) { const d = document.createElement('div'); d.className = 'confetti'; d.style.left = Math.random() * 100 + 'vw'; d.style.background = cols[ri(cols.length)]; d.style.animationDuration = (1.8 + Math.random() * 2) + 's'; d.style.animationDelay = Math.random() * .5 + 's'; d.style.borderRadius = Math.random() < .4 ? '50%' : '2px'; root.appendChild(d); later(() => d.remove(), 4600) } }
  function levelUpFx(L) { Sound.fanfare(); confetti(60); const d = document.createElement('div'); d.className = 'lvup'; d.innerHTML = `<div><small>LEVEL UP</small><b>${L}</b><small>${titleOf(L).toUpperCase()}</small></div>`; root.appendChild(d); later(() => d.remove(), 2700) }
  function floatAt(elx, txt, col) { if (!elx) return; const r = elx.getBoundingClientRect(), f = document.createElement('div'); f.className = 'float'; f.textContent = txt; if (col) f.style.color = col; f.style.left = (r.left + r.width / 2 - 30) + 'px'; f.style.top = (r.top - 6) + 'px'; root.appendChild(f); later(() => f.remove(), 1100) }
  function modal(title, body, btns) { const m = document.createElement('div'); m.className = 'modal'; m.innerHTML = `<div class="card"><h3>${title}</h3><p>${body}</p><div class="acts">${btns.map((b, i) => `<button class="btn ${b.gold ? 'gold' : ''}" data-i="${i}">${b.t}</button>`).join('')}</div></div>`; root.appendChild(m); m.querySelectorAll('[data-i]').forEach(x => x.onclick = () => { m.remove(); const f = btns[+x.dataset.i].fn; if (f) f() }) }
  const tile = (v, l) => `<div class="card tile"><b>${v}</b><small>${l}</small></div>`
  const modeCard = (id, i, t, d, a, b, c) => `<div class="card mode" data-mode="${id}" tabindex="0"><div class="glow" style="background:${c}"></div><span class="mi">${i}</span><h3>${t}</h3><p>${d}</p><div class="mb"><span>${a}</span><span>${b}</span></div></div>`
  function bindGo(el) { el.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { Sound.click(); go(b.dataset.go) }) }

  /* ---------- router ---------- */
  function go(name) {
    if (!P) return
    if (screen === 'play' && RUN && !RUN.ended && name !== 'result') { quitRun(() => go(name)); return }
    screen = name; screens().forEach(s => s.classList.toggle('on', s.id === 's-' + name))
    root.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b.dataset.go === name || (name === 'region' && b.dataset.go === 'campaign')))
    const R = { hub: renderHub, campaign: renderCampaign, rivals: renderRivals, stats: renderStats }; if (R[name]) R[name]()
    scrollTop()
  }
  function showScreen(name) { screen = name; screens().forEach(s => s.classList.toggle('on', s.id === 's-' + name)); scrollTop() }
  root.querySelectorAll('#nav button').forEach(b => b.onclick = () => { Sound.init(); Sound.click(); go(b.dataset.go) })

  function dailyStreakNow() { const d = P.daily; if (!d.last) return 0; const g = dayDiff(d.last, today()); return g <= 1 ? d.streak : 0 }
  function renderTop() {
    const el = $('topR'); if (!el) return
    if (!P) { el.innerHTML = ''; return }
    const L = levelOf(P.xp), a = xpFor(L), b = xpFor(L + 1), pct = (P.xp - a) / (b - a), C = 2 * Math.PI * 21
    const st = dailyStreakNow()
    el.innerHTML = `${st ? `<span class="streak-pill" title="Daily Darshan streak">🔥 ${st}</span>` : ''}
 <button class="ico" id="sndBtn" title="Sound">${P.sound ? '🔊' : '🔇'}</button>
 <div class="chip" id="meChip" title="Your arena stats"><div class="av"><svg viewBox="0 0 46 46"><circle cx="23" cy="23" r="21" stroke="rgba(255,255,255,.12)" stroke-width="3" fill="none"/><circle cx="23" cy="23" r="21" stroke="#f8c950" stroke-width="3" fill="none" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}"/></svg>${esc(initials(P.name))}</div><div><b translate="no">${esc(P.name)}</b><small>Lv ${L} · ${P.xp} XP</small></div></div>`
    $('sndBtn').onclick = () => { P.sound = !P.sound; save(); Sound.init(); renderTop() }
    $('meChip').onclick = () => go('stats')
  }

  /* ===================== HUB ===================== */
  function renderHub() {
    const L = levelOf(P.xp), td = today(), dd = P.daily.hist[td], due = reviewDue().length, st = dailyStreakNow()
    const cal = Array.from({ length: 14 }, (_, i) => { const d = addDays(td, i - 13); return `<i class="${P.daily.hist[d] ? 'on' : ''}" title="${d}"></i>` }).join('')
    const nextM = (() => { for (const r of BANK) { const ix = RIDX(r.id); if (!regionUnlocked(ix)) break; for (let mi = 0; mi < r.missions.length; mi++) if (!starsOf(r.id, mi)) return { r, mi } } return null })()
    const hour = new Date().getHours(), greet = hour < 12 ? 'Suprabhat' : hour < 17 ? 'Namaste' : 'Shubh sandhya'
    const guest = ctx.isGuest ? `<p class="qa-guest">${tx("You're playing as a guest — your progress is saved to this guest account, but only signed-in players publish XP to the Hall of Scholars.", 'आप अतिथि के रूप में खेल रहे हैं — आपकी प्रगति इस अतिथि खाते में सहेजी जाती है, लेकिन केवल साइन-इन खिलाड़ी ही विद्वानों की सभा में अनुभव अंक प्रकाशित करते हैं।')} <a href="/signup" data-nav="/signup">${tx('Create an account', 'खाता बनाएँ')}</a></p>` : ''
    $('s-hub').innerHTML = `<div class="wrap">${guest}
 <div class="hero"><div class="card hero-main">${MANDALA}<div class="k">${greet}, <span translate="no">${esc(P.name)}</span> · Level ${L} ${titleOf(L)}</div>
  <h1>Five thousand years.<br><em>Ten questions</em> at a time.</h1>
  <p>${nextM ? `Your journey continues with <b style="color:var(--cream)">${esc(nextM.r.missions[nextM.mi].name)}</b> in ${nextM.r.label}.` : 'Every mission is complete. Chase three stars everywhere — or take on Chanakya.'}</p>
  <div style="display:flex;gap:10px;flex-wrap:wrap">${nextM ? `<button class="btn gold" id="hCont">▶ Continue campaign</button>` : `<button class="btn gold" data-go="campaign">Open the campaign</button>`}<button class="btn" data-go="rivals">⚔️ Duel a rival</button></div></div>
  <div class="card daily"><span class="sun">☀️</span><div class="k">Daily Darshan · ${td}</div><h3>${dd ? 'Done for today' : 'Today\'s ten'}</h3>
   <p>${dd ? `You scored <b>${dd.c}/10</b> (${dd.s} pts). A new set appears at midnight.` : 'The same ten questions for every player today. One attempt. Keep your streak burning.'}</p>
   <div class="cal">${cal}</div><div class="mono" style="font-size:10.5px;color:var(--dim);margin-bottom:14px">🔥 Streak ${st} · best ${P.daily.bestStreak}</div>
   ${dd ? `<button class="btn sm" id="hShare">📋 Copy result</button>` : `<button class="btn gold" id="hDaily">Begin Daily Darshan</button>`}</div></div>
 <div class="modes">
  ${modeCard('campaign', '🗺️', 'Campaign', `Four regions, ${TOTAL_MISSIONS} story missions and four Final Trials.`, `${missionsDone()}/${TOTAL_MISSIONS} missions`, `${totalStars()}/${maxStars()} ★`, '#f1b43c')}
  ${modeCard('lightning', '⚡', 'Lightning Round', '60 seconds. No question timer. Wrong answers cost 3 seconds.', `Best: ${P.best.lightning} correct`, '60s', '#5a8fd8')}
  ${modeCard('survival', '🛡️', 'Survival', 'Three lives, endless questions, the clock gets tighter.', `Best: ${P.best.survival} correct`, '∞', '#df5934')}
  ${modeCard('rivals', '⚔️', 'Duel a Rival', 'Race Tenali Rama, Birbal, Gargi and Chanakya.', `${Object.keys(P.rivals).length}/4 defeated`, '1 v 1', '#b06fe0')}
  ${modeCard('review', '🧠', 'Review Deck', 'Missed questions return on a spaced schedule until you master them.', `${due} due · ${P.mastered} mastered`, due ? 'Due now' : '—', '#8ab372')}
 </div>
 <div class="sec"><h2>Your record</h2><button class="btn sm" data-go="stats">Full stats →</button></div>
 <div class="tiles">${tile(P.xp, 'Total XP')}${tile(P.stats.cor, 'Correct answers')}${tile(P.stats.ans ? Math.round(P.stats.cor / P.stats.ans * 100) + '%' : '—', 'Accuracy')}${tile(P.best.combo, 'Best streak')}${tile(P.ach.length + '/' + ACH.length, 'Achievements')}</div>
 </div>`
    const hub = $('s-hub')
    bindGo(hub)
    hub.querySelectorAll('[data-nav]').forEach(a => a.onclick = e => { e.preventDefault(); ctx.navigate(a.dataset.nav, { state: { upgrade: true } }) })
    if ($('hCont')) $('hCont').onclick = () => showBrief(nextM.r.id, nextM.mi)
    if ($('hDaily')) $('hDaily').onclick = startDaily
    if ($('hShare')) $('hShare').onclick = () => copyText(shareText('daily', P.daily.hist[td]))
    hub.querySelectorAll('[data-mode]').forEach(c => {
      const run = () => { Sound.init(); Sound.click(); const m = c.dataset.mode; if (m === 'campaign') go('campaign'); else if (m === 'rivals') go('rivals'); else if (m === 'lightning') startLightning(); else if (m === 'survival') startSurvival(); else if (m === 'review') startReview() }
      c.onclick = run
      c.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); run() } }
    })
  }

  /* ===================== CAMPAIGN ===================== */
  function renderCampaign() {
    const map = `<svg viewBox="0 0 100 110"><defs><radialGradient id="lg"><stop offset="0" stop-color="#f8c950" stop-opacity=".9"/><stop offset="1" stop-color="#f8c950" stop-opacity="0"/></radialGradient></defs>
  <polygon points="${MAPPOLY}" fill="#efe2cf" stroke="#c98a17" stroke-opacity=".7" stroke-width=".5"/>
  ${BANK.map((r, i) => { const [x, y] = RPOS[r.id], un = regionUnlocked(i), pct = regionStars(r.id) / (r.missions.length * 3); return `<g class="rnode" data-r="${r.id}">${un ? `<circle cx="${x}" cy="${y}" r="${8 + pct * 6}" fill="url(#lg)" opacity="${.3 + pct * .7}"/>` : ''}<circle class="halo" cx="${x}" cy="${y}" r="6" fill="${un ? '#fffaf3' : '#e9ded0'}" stroke="${un ? '#c98a17' : '#b8a89a'}" stroke-width=".8"/><text x="${x}" y="${y + 2.2}" text-anchor="middle" font-size="6">${un ? REGION_ICON[r.id] : '🔒'}</text><text x="${x}" y="${y + 12}" text-anchor="middle" font-size="3.6" fill="#24151a" font-family="Manrope" font-weight="700">${r.label}</text></g>` }).join('')}
 </svg>`
    $('s-campaign').innerHTML = `<div class="wrap"><div class="sec" style="margin-top:0"><div><div class="k">The campaign</div><h2 style="font-size:34px">Choose your region</h2></div><div class="mono" style="color:var(--gold-t)">${totalStars()}/${maxStars()} ★ · ${missionsDone()}/${TOTAL_MISSIONS} missions</div></div>
 <div class="camp"><div class="card mapcard">${map}<p style="font-size:12px;color:var(--dim);text-align:center;margin-top:8px">Pass a region's Final Trial to open the next. Regions glow brighter as you earn stars.</p></div>
 <div class="regions">${BANK.map((r, i) => {
      const un = regionUnlocked(i), s = regionStars(r.id), mx = r.missions.length * 3, dn = r.missions.filter((m, mi) => starsOf(r.id, mi)).length
      return `<div class="card region ${un ? '' : 'lock'}" data-r="${r.id}"><div class="ri">${un ? REGION_ICON[r.id] : '🔒'}</div><div><h3>${r.label}</h3><p>${esc(r.longDesc)}</p><div class="bar"><i style="width:${s / mx * 100}%"></i></div></div><div class="rstat">${s}/${mx} ★<br><span style="color:var(--dim)">${dn}/${r.missions.length}</span></div></div>`
    }).join('')}</div></div></div>`
    $('s-campaign').querySelectorAll('[data-r]').forEach(n => n.onclick = () => { const i = RIDX(n.dataset.r); if (!regionUnlocked(i)) { Sound.no(); toast(`🔒 Pass the Final Trial of ${BANK[i - 1].label} first.`); return } Sound.click(); openRegion(n.dataset.r) })
  }
  function openRegion(r) { curRegion = r; renderRegion(); go('region') }
  function renderRegion() {
    const R = BANK[RIDX(curRegion)]; let cur = -1
    for (let mi = 0; mi < R.missions.length; mi++) if (missionUnlocked(R.id, mi) && !starsOf(R.id, mi)) { cur = mi; break }
    $('s-region').innerHTML = `<div class="wrap"><button class="back" data-go="campaign">← ALL REGIONS</button>
 <div class="sec" style="margin-top:0"><div><div class="k">${REGION_ICON[R.id]} ${esc(R.desc)}</div><h2 style="font-size:38px">${R.label}</h2><p style="color:var(--dim);font-size:14px;margin-top:6px;max-width:560px">${esc(R.longDesc)}</p></div>
 <div class="tiles" style="grid-template-columns:repeat(3,110px)">${tile(regionStars(R.id) + '/' + R.missions.length * 3, 'Stars')}${tile(R.missions.filter((m, mi) => starsOf(R.id, mi)).length + '/' + R.missions.length, 'Missions')}${tile(R.missions.reduce((a, m, mi) => a + ((P.stars[R.id + '-' + mi] || {}).best || 0), 0), 'Best pts')}</div></div>
 <div class="path">${R.missions.map((m, mi) => { const un = missionUnlocked(R.id, mi), s = starsOf(R.id, mi); return `<div class="card mnode ${s ? 'done' : ''} ${un ? '' : 'lock'} ${mi === cur ? 'cur' : ''} ${isBoss(m) ? 'boss' : ''}" data-m="${mi}"><div class="mc">${un ? m.icon : '🔒'}<span class="num">${mi + 1}</span></div><div><h4>${esc(m.name)}</h4><div class="st">${starsHTML(s)}</div><div class="mono" style="font-size:10px;color:var(--dim);margin-top:2px">${isBoss(m) ? 'FINAL TRIAL · ' : ''}${missionXP(m, mi)} XP</div></div></div>` }).join('')}</div></div>`
    bindGo($('s-region'))
    $('s-region').querySelectorAll('[data-m]').forEach(n => n.onclick = () => { const mi = +n.dataset.m; if (!missionUnlocked(R.id, mi)) { Sound.no(); toast('🔒 Earn at least one star on the previous mission.'); return } Sound.click(); showBrief(R.id, mi) })
  }
  function showBrief(r, mi) {
    const R = BANK[RIDX(r)], m = R.missions[mi], boss = isBoss(m), rec = P.stars[r + '-' + mi]; curRegion = r
    $('s-brief').innerHTML = `<div class="wrap"><button class="back" id="bBack">← ${R.label.toUpperCase()}</button><div class="card brief">${MANDALA}<div class="big">${m.icon}</div><div class="k">${R.label} · Mission ${mi + 1}${boss ? ' · Final Trial' : ''}</div><h1>${esc(m.name)}</h1>
 <div class="story">${esc(m.story)}</div><div class="k" style="margin-top:20px">Objectives</div><ul>${m.obj.map(o => `<li>${esc(o)}</li>`).join('')}</ul>
 <div class="meta"><div><b>${m.q.length}</b><small>Questions</small></div><div><b>${boss ? 15 : 20}s</b><small>Per question</small></div><div><b>${boss ? '❤️❤️' : '❤️❤️❤️'}</b><small>Lives</small></div><div><b>${missionXP(m, mi)}</b><small>XP for 3★</small></div></div>
 ${rec ? `<p class="mono" style="font-size:12px;color:var(--gold-t);margin-bottom:14px">Your best: ${starsHTML(rec.s)} · ${rec.best} pts</p>` : ''}
 <p style="font-size:12.5px;color:var(--dim);margin-bottom:18px">★ 50% · ★★ 70% · ★★★ 90%. Fast answers and streaks multiply your points.</p>
 <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn gold" id="bGo">▶ Begin mission</button><button class="btn" id="bBack2">Not yet</button></div></div></div>`
    $('bBack').onclick = $('bBack2').onclick = () => openRegion(r)
    $('bGo').onclick = () => startMission(r, mi)
    go('brief')
  }

  /* ===================== RUN ENGINE ===================== */
  function startRun(cfg) {
    Sound.init()
    RUN = {
      cfg, i: 0, score: 0, correct: 0, wrong: 0, streak: 0, maxStreak: 0, lives: cfg.lives || 0, maxLives: cfg.lives || 0, log: [], life: { fifty: !!cfg.lifelines, time: !!cfg.lifelines, skip: !!cfg.lifelines, sage: !!cfg.lifelines }, usedLife: false,
      gLeft: cfg.total || 0, penalty: 0, ended: false, answered: false, timer: 0, gTimer: 0, rScore: 0, rCorrect: 0, rTO: 0, fastNow: 0, xpBefore: P.xp, t0: performance.now(),
    }
    newAch = []
    const life = cfg.lifelines ? `<div class="lifes">
  <button class="life" id="lf-fifty" title="Remove two wrong answers">✂️ 50:50 <kbd>F</kbd></button>
  <button class="life" id="lf-time" title="Add 10 seconds">⏳ +10s <kbd>T</kbd></button>
  <button class="life" id="lf-sage" title="Ask the sage for a hint">🪷 Ask the Sage <kbd>H</kbd></button>
  <button class="life" id="lf-skip" title="Skip this question">⏭️ Skip <kbd>S</kbd></button></div>` : ''
    const rv = cfg.rival ? `<div class="card rival"><div class="rv"><div class="ra">${esc(initials(P.name))}</div><div><b translate="no">${esc(P.name)}</b><small id="rMe">0</small></div></div><div class="vs">VS</div><div class="rv r"><div><b>${cfg.rival.name}</b><small id="rThem">0</small><div class="rstate" id="rState">waiting…</div></div><div class="ra">${cfg.rival.av}</div></div></div>` : ''
    $('s-play').innerHTML = `<div class="play"><div class="ptop"><div><div class="k">${esc(cfg.kicker)}</div><h2>${esc(cfg.title)}</h2></div><button class="btn sm" id="pQuit">✕ Quit</button></div>
 <div class="hud">${cfg.lives ? `<div class="hpill hearts" id="hearts">${'<span>❤️</span>'.repeat(cfg.lives)}</div>` : ''}<div class="hpill">⭐ <span id="pScore">0</span></div><div class="hpill combo" id="pCombo">🔥 ×1</div><div class="hpill" id="pCount"></div></div>
 ${cfg.total ? '<div class="gtimer"><i id="gBar" style="width:100%"></i></div>' : ''}${cfg.fixed ? `<div class="pips" id="pips">${'<i></i>'.repeat(cfg.questions.length)}</div>` : ''}${rv}
 <div class="card qcard" id="qcard"><div class="ring" id="ring"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" stroke="rgba(255,255,255,.1)" stroke-width="5" fill="none"/><circle id="ringC" cx="32" cy="32" r="28" stroke="#f1b43c" stroke-width="5" fill="none" stroke-linecap="round" stroke-dasharray="176" stroke-dashoffset="0"/></svg><b id="ringT"></b></div>
  <div class="qtag" id="qtag"></div><div class="qtext" id="qtext" aria-live="polite"></div><div class="opts" id="opts"></div></div>
 ${life}<div id="fb"></div></div>`
    $('pQuit').onclick = () => quitRun(() => go(cfg.home || 'hub'))
    if (cfg.lifelines) { $('lf-fifty').onclick = lifeFifty; $('lf-time').onclick = lifeTime; $('lf-sage').onclick = lifeSage; $('lf-skip').onclick = lifeSkip }
    if (!cfg.timePer && !cfg.timeFn) $('ring').classList.add('hidden')
    showScreen('play')
    if (cfg.total) { RUN.gStart = performance.now(); RUN.gTimer = setInterval(gTick, 100) }
    showQ()
  }
  function qAt(i) { const c = RUN.cfg; if (i >= c.questions.length && c.more) c.questions.push(...c.more(i)); return c.questions[i] }
  function showQ() {
    const c = RUN.cfg
    if (c.fixed && RUN.i >= c.questions.length) return endRun()
    if (c.lives && RUN.lives <= 0) return endRun()
    if (c.total && RUN.gLeft <= 0) return endRun()
    const q = qAt(RUN.i); RUN.q = q; RUN.answered = false
    RUN.perm = c.rng ? shuffle([0, 1, 2, 3], c.rng) : shuffle([0, 1, 2, 3])
    $('qtag').innerHTML = `<span>${REGION_ICON[q.r]} ${esc(q.rl)}</span><span style="background:rgba(60,32,24,0.038);color:var(--dim)">${esc(q.mn)}</span>`
    $('qtext').textContent = q.q
    $('opts').innerHTML = RUN.perm.map((p, k) => `<button class="opt" data-k="${k}"><kbd>${LETTERS[k]}</kbd><span>${esc(q.o[p])}</span></button>`).join('')
    $('opts').querySelectorAll('.opt').forEach(b => b.onclick = () => answer(+b.dataset.k))
    $('fb').innerHTML = ''; $('qcard').classList.remove('shake', 'glow')
    $('pCount').textContent = c.fixed ? `Q ${RUN.i + 1}/${c.questions.length}` : `#${RUN.i + 1} · ✓ ${RUN.correct}`
    if (c.fixed) { const ps = $('pips').children; for (let k = 0; k < ps.length; k++) ps[k].classList.toggle('cur', k === RUN.i) }
    RUN.tLimit = c.timeFn ? c.timeFn(RUN.i) : (c.timePer || 0); RUN.left = RUN.tLimit; RUN.qStart = performance.now(); RUN.lastTick = Math.ceil(RUN.left)
    clearInterval(RUN.timer); if (RUN.tLimit) { updRing(); RUN.timer = setInterval(qTick, 100) }
    if (c.rival) scheduleRival();
    ['fifty', 'time', 'sage', 'skip'].forEach(l => { const b = $('lf-' + l); if (b) b.disabled = !RUN.life[l] })
  }
  function updRing() { const p = clamp(RUN.left / RUN.tLimit, 0, 1); $('ringC').style.strokeDashoffset = 176 * (1 - p); $('ringC').style.stroke = p < .3 ? '#e58667' : p < .6 ? '#f8c950' : '#8ab372'; $('ringT').textContent = Math.ceil(Math.max(0, RUN.left)); $('ring').classList.toggle('low', RUN.left <= 5) }
  function qTick() { if (!RUN || RUN.answered) return; RUN.left -= .1; updRing(); const s = Math.ceil(RUN.left); if (s < RUN.lastTick) { RUN.lastTick = s; if (s <= 5 && s > 0) Sound.tick() } if (RUN.left <= 0) answer(null) }
  function gTick() {
    if (!RUN || RUN.ended) return; const el = (performance.now() - RUN.gStart) / 1000; const left = RUN.cfg.total - el - RUN.penalty; RUN.gLeft = left; $('gBar').style.width = clamp(left / RUN.cfg.total, 0, 1) * 100 + '%'
    $('pCount').textContent = `⏱ ${Math.max(0, Math.ceil(left))}s · ✓ ${RUN.correct}`; if (left <= 0) { clearInterval(RUN.gTimer); endRun() }
  }
  function answer(k) {
    if (!RUN || RUN.answered || RUN.ended) return; RUN.answered = true; clearInterval(RUN.timer)
    const q = RUN.q, c = RUN.cfg, dt = (performance.now() - RUN.qStart) / 1000, ok = k !== null && RUN.perm[k] === q.a
    const btns = $('opts').querySelectorAll('.opt'); btns.forEach(b => b.disabled = true)
    const correctK = RUN.perm.indexOf(q.a); btns[correctK].classList.add('ok'); if (k !== null && !ok) btns[k].classList.add('no')
    const s = P.stats; s.ans++; s.time += dt; s.reg[q.r] = s.reg[q.r] || { a: 0, c: 0 }; s.reg[q.r].a++; P.act[today()] = (P.act[today()] || 0) + 1
    let pts = 0
    if (ok) {
      RUN.streak++; RUN.correct++; s.cor++; s.reg[q.r].c++; if (dt < 2) { s.fast++ }
      const mult = Math.min(4, 1 + Math.floor((RUN.streak - 1) / 3))
      pts = Math.round((100 + (RUN.tLimit ? clamp(RUN.left / RUN.tLimit, 0, 1) * 100 : clamp(1 - dt / 8, 0, 1) * 100)) * mult)
      RUN.score += pts; Sound.ok1(RUN.streak); $('qcard').classList.add('glow'); floatAt(btns[correctK], '+' + pts)
      if (mult > 1 && (RUN.streak - 1) % 3 === 0) { Sound.combo(); toast(`🔥 Streak ${RUN.streak}! Points ×${mult}`, 1600) }
      if (P.review[q.id] && c.mode === 'review') { const card = P.review[q.id]; card.box++; if (card.box >= 5) { delete P.review[q.id]; P.mastered++ } else card.due = addDays(today(), [0, 1, 3, 7, 14][card.box]) }
    } else {
      RUN.streak = 0; RUN.wrong++; Sound.no(); $('qcard').classList.add('shake'); if (navigator.vibrate) navigator.vibrate(120)
      if (c.lives) { RUN.lives--; const hs = $('hearts').children; if (hs[RUN.lives]) hs[RUN.lives].classList.add('lost') }
      if (c.total) { RUN.penalty = (RUN.penalty || 0) + 3; floatAt($('qcard'), '−3s', '#c4553a') }
      P.review[q.id] = { box: 0, due: today() }
    }
    RUN.maxStreak = Math.max(RUN.maxStreak, RUN.streak); P.best.combo = Math.max(P.best.combo, RUN.streak)
    RUN.log.push({ id: q.id, ok, skip: false, dt, pick: k === null ? null : q.o[RUN.perm[k]] })
    $('pScore').textContent = RUN.score; const cm = Math.min(4, 1 + Math.floor(Math.max(0, RUN.streak - 1) / 3)); $('pCombo').textContent = `🔥 ×${RUN.streak ? cm : 1} · ${RUN.streak}`; $('pCombo').classList.toggle('hot', RUN.streak >= 3)
    if (c.fixed) { $('pips').children[RUN.i].className = ok ? 'ok' : 'no' }
    if (c.rival) resolveRival(dt, ok)
    checkAch(); save()
    if (c.auto) { later(next, ok ? 380 : 900); return }
    const learn = 'https://en.wikipedia.org/w/index.php?search=' + encodeURIComponent(q.o[q.a] + ' ' + (q.q.length < 60 ? q.q : ''))
    const out = c.lives && RUN.lives <= 0
    $('fb').innerHTML = `<div class="card fb"><div class="v ${ok ? 'ok' : 'no'}">${ok ? ['Shabash!', 'Correct!', 'Well read!', 'Exactly!'][ri(4)] : k === null ? 'Time\'s up' : 'Not quite'}</div>
  <p>${ok ? `+${pts} points${RUN.streak >= 3 ? ` · streak ${RUN.streak}` : ''}` : `The answer is <b>${esc(q.o[q.a])}</b>. It's been added to your Review Deck.`} <a href="${learn}" target="_blank" rel="noopener">Learn more ↗</a></p>
  <button class="btn gold" id="nextBtn">${out ? 'See results' : c.fixed && RUN.i >= c.questions.length - 1 ? 'Finish' : 'Next'} <span class="mono" style="font-size:10px;opacity:.7">↵</span></button></div>`
    $('nextBtn').onclick = next; $('nextBtn').focus({ preventScroll: true })
  }
  function next() { if (!RUN || RUN.ended) return; RUN.i++; showQ() }
  function lifeFifty() { if (!RUN.life.fifty || RUN.answered) return; RUN.life.fifty = false; RUN.usedLife = true; $('lf-fifty').disabled = true; Sound.click(); const btns = $('opts').querySelectorAll('.opt'); const wrong = [0, 1, 2, 3].filter(k => RUN.perm[k] !== RUN.q.a); shuffle(wrong).slice(0, 2).forEach(k => { btns[k].classList.add('gone'); btns[k].disabled = true }) }
  function lifeTime() { if (!RUN.life.time || RUN.answered || !RUN.tLimit) return; RUN.life.time = false; RUN.usedLife = true; $('lf-time').disabled = true; RUN.left += 10; RUN.tLimit = Math.max(RUN.tLimit, RUN.left); RUN.lastTick = Math.ceil(RUN.left); updRing(); Sound.click(); floatAt($('ring'), '+10s', '#3f7a2a') }
  function lifeSage() { if (!RUN.life.sage || RUN.answered) return; RUN.life.sage = false; RUN.usedLife = true; $('lf-sage').disabled = true; Sound.sage(); const btns = $('opts').querySelectorAll('.opt'); let k = RUN.perm.indexOf(RUN.q.a); if (Math.random() > .85) { const w = [0, 1, 2, 3].filter(x => x !== k && !btns[x].disabled); if (w.length) k = w[ri(w.length)] } btns[k].classList.add('sage'); toast('🪷 The Sage leans towards <b>' + esc(btns[k].querySelector('span').textContent) + '</b>… usually she\'s right.', 2600) }
  function lifeSkip() { if (!RUN.life.skip || RUN.answered) return; RUN.life.skip = false; RUN.usedLife = true; RUN.answered = true; clearInterval(RUN.timer); Sound.click(); RUN.log.push({ id: RUN.q.id, ok: false, skip: true, dt: 0 }); if (RUN.cfg.fixed) $('pips').children[RUN.i].className = 'sk'; if (RUN.cfg.rival) resolveRival(RUN.tLimit, false); next() }
  function scheduleRival() {
    const rv = RUN.cfg.rival; clearTimeout(RUN.rTO); RUN.rT = rv.spd[0] + Math.random() * (rv.spd[1] - rv.spd[0]); RUN.rOk = Math.random() < rv.acc
    $('rState').textContent = 'thinking…'; $('rState').style.color = ''
    RUN.rTO = setTimeout(() => { if (!disposed && RUN && !RUN.answered) { $('rState').textContent = '🔒 locked in'; $('rState').style.color = '#94620a'; Sound.rival() } }, RUN.rT * 1000)
  }
  function resolveRival(dt, meOk) {
    void dt; void meOk
    clearTimeout(RUN.rTO); const t = Math.min(RUN.rT, RUN.tLimit), inTime = RUN.rT <= RUN.tLimit
    let pts = 0; if (inTime && RUN.rOk) { pts = Math.round(100 + clamp(1 - t / RUN.tLimit, 0, 1) * 100); RUN.rScore += pts; RUN.rCorrect++ }
    $('rThem').textContent = RUN.rScore; $('rMe').textContent = RUN.score
    $('rState').textContent = !inTime ? '⌛ ran out of time' : RUN.rOk ? `✓ correct in ${t.toFixed(1)}s (+${pts})` : `✗ wrong in ${t.toFixed(1)}s`; $('rState').style.color = RUN.rOk && inTime ? '#3f7a2a' : '#c4553a'
  }
  function quitRun(after) {
    if (!RUN || RUN.ended) { if (after) after(); return }
    modal('Leave this run?', 'Your answers so far still count towards your stats, but this run won\'t be scored.', [{ t: 'Keep playing', gold: true }, { t: 'Leave', fn: () => { abortRun(); if (after) after() } }])
  }
  function stopRunTimers() { if (!RUN) return; clearInterval(RUN.timer); clearInterval(RUN.gTimer); clearTimeout(RUN.rTO) }
  function abortRun() { if (!RUN) return; RUN.ended = true; stopRunTimers(); save(); RUN = null; screen = 'hub' }
  function endRun() {
    if (!RUN || RUN.ended) return; RUN.ended = true; stopRunTimers()
    P.runs++; const res = RUN.cfg.onEnd(RUN) || {}; checkAch(); persist(); renderTop(); submitRun(RUN, res); renderResult(RUN, res)
  }
  /** Report the finished run to the server: grants Mirava XP + feeds the leaderboard. */
  function submitRun(run, res) {
    if (!run.log.length) return
    const body = {
      score: clamp(Math.round(run.score), 0, 100000),
      level: levelOf(P.xp),
      time_taken_seconds: Math.max(1, Math.round((performance.now() - run.t0) / 1000)),
      completed: true,
      meta: { mode: run.cfg.mode, title: run.cfg.title, correct: run.correct, answered: run.log.length, stars: res.stars ?? null, win: res.win ?? null },
    }
    ctx.submitScore('quiz-arena', body).then(out => {
      if (disposed || !out) return
      if (hooks.onScore) hooks.onScore(out)
      if (out.xp_earned > 0) toast(`<span class="ai">✦</span><div><small>MIRAVA PROFILE · +${out.xp_earned} XP</small>Score saved · best ${out.best_score}</div>`, 3600)
    })
  }

  /* ===================== MODES ===================== */
  function startMission(r, mi) {
    const R = BANK[RIDX(r)], m = R.missions[mi], boss = isBoss(m)
    const qs = shuffle(m.q.map((q, qi) => QBY[r + '-' + mi + '-' + qi]))
    startRun({
      mode: 'mission', kicker: `${R.label} · Mission ${mi + 1}`, title: m.name, questions: qs, fixed: true, timePer: boss ? 15 : 20, lives: boss ? 2 : 3, lifelines: true, home: 'region',
      onEnd(run) {
        const wasLocked = RIDX(r) < BANK.length - 1 && !regionUnlocked(RIDX(r) + 1)
        const total = qs.length, pct = run.correct / total, failed = run.lives <= 0
        let stars = failed ? 0 : pct >= .9 ? 3 : pct >= .7 ? 2 : pct >= .5 ? 1 : 0
        const key = r + '-' + mi, prev = P.stars[key] || { s: 0, best: 0 }, full = missionXP(m, mi)
        const gain = Math.max(0, Math.round(full * stars / 3) - Math.round(full * prev.s / 3)) + (pct === 1 && !prev.perfect ? Math.round(full / 2) : 0) + run.correct * 2
        if (stars > 0 || prev.s) P.stars[key] = { s: Math.max(prev.s, stars), best: Math.max(prev.best, run.score), perfect: prev.perfect || pct === 1 }
        if (pct === 1) unlock('flawless'); if (stars === 3 && !run.usedLife) unlock('purist')
        addXP(gain)
        const opened = wasLocked && regionUnlocked(RIDX(r) + 1) ? BANK[RIDX(r) + 1] : null
        return { stars, failed, gain, pct, newBest: run.score > prev.best, opened, nextMi: mi + 1 < R.missions.length && stars > 0 ? mi + 1 : null, r, mi }
      },
    })
  }
  function startDaily() {
    const td = today(); if (P.daily.hist[td]) { toast('☀️ You have already completed today\'s Daily Darshan.'); return }
    const rng = mulberry32(hashStr('mirava-daily-' + td)), qs = []
    const byR = {}; ALLQ.forEach(q => (byR[q.r] = byR[q.r] || []).push(q))
    const order = shuffle(['north', 'east', 'south', 'west', 'north', 'east', 'south', 'west', 'north', 'south'], rng)
    order.forEach(r => { let q; do { q = byR[r][Math.floor(rng() * byR[r].length)] } while (qs.includes(q)); qs.push(q) })
    startRun({
      mode: 'daily', kicker: 'Daily Darshan · ' + td, title: 'Today\'s ten', questions: qs, fixed: true, timePer: 20, lifelines: false, rng,
      onEnd(run) {
        const d = P.daily, prevLast = d.last
        d.streak = prevLast && dayDiff(prevLast, td) === 1 ? d.streak + 1 : 1; d.last = td; d.bestStreak = Math.max(d.bestStreak, d.streak)
        const grid = run.log.map(l => l.ok ? 'g' : 'r').join(''); d.hist[td] = { c: run.correct, s: run.score, g: grid }
        const gain = 30 + run.correct * 4 + Math.min(d.streak, 7) * 5; addXP(gain)
        return { gain, daily: d.hist[td], streak: d.streak }
      },
    })
  }
  function startLightning() {
    startRun({
      mode: 'lightning', kicker: 'Lightning Round', title: 'Sixty seconds', questions: shuffle(ALLQ).slice(0, 40), more: () => shuffle(ALLQ).slice(0, 30), total: 60, lifelines: false, auto: true,
      onEnd(run) { const rec = run.correct > P.best.lightning; if (rec) P.best.lightning = run.correct; const gain = run.correct * 3 + (rec ? 25 : 0); addXP(gain); return { gain, rec, bestLabel: 'Best: ' + P.best.lightning + ' correct' } },
    })
  }
  function survivalPool(i) { const cap = Math.min(9, 2 + Math.floor(i / 4)); return ALLQ.filter(q => q.m <= cap) }
  function startSurvival() {
    startRun({
      mode: 'survival', kicker: 'Survival', title: 'How long can you last?', questions: [], more: i => shuffle(survivalPool(i)).slice(0, 4), lives: 3, timeFn: i => Math.max(7, 15 - Math.floor(i / 3) * .5), lifelines: true,
      onEnd(run) { const rec = run.correct > P.best.survival; if (rec) P.best.survival = run.correct; const gain = run.correct * 3 + (rec ? 25 : 0); addXP(gain); return { gain, rec, bestLabel: 'Best: ' + P.best.survival + ' correct' } },
    })
  }
  function startReview() {
    const due = reviewDue(); if (!due.length) { toast(Object.keys(P.review).length ? '🧠 Nothing is due right now — come back tomorrow.' : '🧠 Your deck is empty. Questions you miss will appear here.'); return }
    const qs = shuffle(due).slice(0, 15).map(id => QBY[id])
    startRun({
      mode: 'review', kicker: 'Review Deck', title: qs.length + ' cards due', questions: qs, fixed: true, timePer: 30, lifelines: false,
      onEnd(run) { const gain = run.correct * 4; addXP(gain); return { gain, left: reviewDue().length } },
    })
  }
  function startDuel(rv) {
    startRun({
      mode: 'duel', kicker: 'Duel · ' + rv.title, title: 'You vs ' + rv.name, questions: shuffle(ALLQ.filter(q => q.m >= Math.max(0, rv.lvl * 2 - 2))).slice(0, 10), fixed: true, timePer: 15, lifelines: false, rival: rv, home: 'rivals',
      onEnd(run) { const win = run.score > run.rScore, first = win && !P.rivals[rv.id]; if (win) P.rivals[rv.id] = true; const gain = run.correct * 3 + (win ? (first ? 40 + rv.lvl * 25 : 20) : 0); addXP(gain); return { gain, win, first, rv, them: run.rScore } },
    })
  }

  /* ===================== RESULT ===================== */
  function renderResult(run, res) {
    const c = run.cfg, total = run.log.length, acc = total ? Math.round(run.correct / Math.max(1, run.log.filter(l => !l.skip).length) * 100) : 0
    const avg = run.log.filter(l => !l.skip).reduce((a, l) => a + l.dt, 0) / Math.max(1, run.log.filter(l => !l.skip).length)
    let em = '🎉', h = 'Run complete', sub = '', top = ''
    if (c.mode === 'mission') {
      if (res.failed) { em = '💔'; h = 'Out of lives'; sub = 'The mission slipped away — every wrong answer is now in your Review Deck. Try again!' }
      else if (res.stars === 0) { em = '📖'; h = 'Not quite enough'; sub = 'You need 50% to earn a star. Review and return.' }
      else { em = res.stars === 3 ? '🏆' : '🌟'; h = res.stars === 3 ? 'Mission mastered!' : 'Mission complete'; sub = res.opened ? `A new region opens: <b>${res.opened.label}</b> ${REGION_ICON[res.opened.id]}` : (res.newBest ? 'A new personal best!' : '') }
      top = `<div class="bigstars">${[0, 1, 2].map(i => `<span class="${i < res.stars ? '' : 'off'}" style="animation-delay:${.2 + i * .2}s">⭐</span>`).join('')}</div>`
    } else if (c.mode === 'daily') { em = '☀️'; h = `${run.correct}/10 today`; sub = `🔥 Daily streak: <b>${res.streak}</b> day${res.streak === 1 ? '' : 's'}. Come back tomorrow for a new set.`; top = `<div style="font-size:30px;letter-spacing:4px;margin:14px 0">${run.log.map(l => l.ok ? '🟩' : '🟥').join('')}</div>` }
    else if (c.mode === 'lightning' || c.mode === 'survival') { em = c.mode === 'lightning' ? '⚡' : '🛡️'; h = `${run.correct} correct`; sub = res.rec ? '🎊 New personal record!' : res.bestLabel }
    else if (c.mode === 'review') { em = '🧠'; h = `${run.correct}/${total} remembered`; sub = `Correct cards move to a later review. ${res.left} still due · ${P.mastered} mastered so far.` }
    else if (c.mode === 'duel') { em = res.win ? '⚔️' : '🙏'; h = res.win ? `You defeated ${res.rv.name}!` : `${res.rv.name} wins this time`; sub = `${run.score} – ${res.them}${res.first ? ` · <b>${res.rv.name}</b> joins your hall of defeated rivals` : ''}` }
    const recap = run.log.map(l => { const q = QBY[l.id]; return `<div><b>${l.skip ? '⏭️' : l.ok ? '✅' : '❌'}</b><span>${esc(q.q)}<small>${l.ok ? '' : (l.pick ? `You: ${esc(l.pick)} · ` : '')}Answer: ${esc(q.o[q.a])}</small></span></div>` }).join('')
    const nextBtn = c.mode === 'mission' && res.nextMi != null ? `<button class="btn gold" id="rNext">Next mission →</button>` : ''
    $('s-result').innerHTML = `<div class="wrap"><div class="card res">${MANDALA}<div class="em">${em}</div><div class="k">${esc(c.kicker)}</div><h1>${h}</h1><p class="sub">${sub}</p>${top}
 <div class="tiles">${tile(run.score, 'Points')}${tile(acc + '%', 'Accuracy')}${tile(run.maxStreak, 'Best streak')}${tile(avg.toFixed(1) + 's', 'Avg answer')}${tile('+' + (P.xp - run.xpBefore), 'XP earned')}</div>
 ${newAch.length ? `<div class="newach">${newAch.map(a => `<span>${a.i} ${a.n}</span>`).join('')}</div>` : ''}
 <div class="acts">${nextBtn}<button class="btn ${nextBtn ? '' : 'gold'}" id="rAgain">↻ ${c.mode === 'daily' ? 'Home' : 'Play again'}</button><button class="btn" id="rShare">📋 Share</button><button class="btn" id="rCard">🖼️ Save card</button><button class="btn" id="rHome">${c.mode === 'mission' ? 'Region map' : c.mode === 'duel' ? 'Rivals' : 'Home'}</button></div>
 <details style="margin-top:20px;text-align:left"><summary class="k" style="cursor:pointer">Review your answers (${total})</summary><div class="recap">${recap || '<div>No questions answered.</div>'}</div></details></div></div>`
    showScreen('result')
    if ((c.mode === 'mission' && res.stars === 3) || (c.mode === 'duel' && res.win) || res.rec || (c.mode === 'daily' && run.correct >= 8)) { confetti(); Sound.fanfare() }
    const again = { mission: () => startMission(res.r, res.mi), daily: () => go('hub'), lightning: startLightning, survival: startSurvival, review: () => { if (reviewDue().length) startReview(); else go('hub') }, duel: () => startDuel(res.rv) }[c.mode]
    $('rAgain').onclick = again
    $('rHome').onclick = () => { RUN = null; if (c.mode === 'mission') openRegion(res.r); else go(c.mode === 'duel' ? 'rivals' : 'hub') }
    if ($('rNext')) $('rNext').onclick = () => showBrief(res.r, res.nextMi)
    const sh = { mode: c.mode, title: c.title, c: run.correct, t: total, s: run.score, g: run.log.map(l => l.skip ? 's' : l.ok ? 'g' : 'r').join(''), stars: res.stars, win: res.win, rv: res.rv }
    $('rShare').onclick = () => copyText(shareText(c.mode, sh))
    $('rCard').onclick = () => saveCard(sh)
    RUN = null
  }
  function shareText(mode, d) {
    const grid = (d.g || '').split('').map(x => x === 'g' ? '🟩' : x === 'r' ? '🟥' : '⬛').join('')
    const I = window.MiravaI18n
    if (I && I.language() === 'hi') {
      const heading = mode === 'daily' ? `मिरावा प्रश्नोत्तरी · दैनिक दर्शन ${today()}` : mode === 'duel' ? `मिरावा प्रश्नोत्तरी · ${I.t(d.rv.name)} ${d.win ? 'को मैंने हराया' : 'से मेरा मुकाबला हुआ'}` : `मिरावा प्रश्नोत्तरी · ${I.t(d.title)}`
      return `${heading}\n${grid} ${d.c}/${d.t || 10}${d.stars ? '  ' + '⭐'.repeat(d.stars) : ''}\n⚡ ${d.s} अंक${dailyStreakNow() ? ` · 🔥 लगातार ${dailyStreakNow()} दिन` : ''}\nक्या आप मुझसे आगे निकल सकते हैं? मिरावा पर खेलें`
    }
    const head = mode === 'daily' ? `Mirava Quiz Arena · Daily Darshan ${today()}` : mode === 'duel' ? `Mirava Quiz Arena · ${d.win ? 'I defeated' : 'I duelled'} ${d.rv.name}` : `Mirava Quiz Arena · ${d.title}`
    return `${head}\n${grid} ${d.c}/${d.t || 10}${d.stars ? '  ' + '⭐'.repeat(d.stars) : ''}\n⚡ ${d.s} pts${dailyStreakNow() ? ` · 🔥 ${dailyStreakNow()}-day streak` : ''}\nCan you beat me? Play at Mirava`
  }
  function copyText(t) {
    const done = () => toast('📋 Result copied — paste it anywhere to share.')
    const fallback = () => { const ta = document.createElement('textarea'); ta.value = t; root.appendChild(ta); ta.select(); try { document.execCommand('copy'); done() } catch { window.prompt('Copy your result:', t) } ta.remove() }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(done, fallback); else fallback()
  }
  async function saveCard(d) {
    const I = window.MiravaI18n, tr = v => (I ? I.t(v) : v)
    if (I) { try { await I.fontReady() } catch { /* draw with fallback fonts */ } }
    if (disposed) return
    const cv = document.createElement('canvas'); cv.width = 1080; cv.height = 1080; const g = cv.getContext('2d')
    const bg = g.createLinearGradient(0, 0, 1080, 1080); bg.addColorStop(0, '#55232f'); bg.addColorStop(1, '#150c10'); g.fillStyle = bg; g.fillRect(0, 0, 1080, 1080)
    g.strokeStyle = 'rgba(241,180,60,.18)'; g.lineWidth = 2; for (let i = 0; i < 16; i++) { g.save(); g.translate(900, 180); g.rotate(i * Math.PI / 8); g.beginPath(); g.ellipse(0, -120, 30, 110, 0, 0, Math.PI * 2); g.stroke(); g.restore() }
    g.strokeStyle = '#f1b43c'; g.lineWidth = 6; g.strokeRect(40, 40, 1000, 1000)
    g.fillStyle = '#f1b43c'; g.font = '500 28px "DM Mono"'; g.fillText(tr('MIRAVA · QUIZ ARENA'), 100, 140)
    g.fillStyle = '#f5e6c8'; g.font = '700 76px "Playfair Display"'; wrap(g, d.mode === 'daily' ? 'Daily Darshan' : d.title, 100, 250, 880, 86)
    g.fillStyle = '#f8c950'; g.font = '800 200px "Playfair Display"'; g.fillText(`${d.c}/${d.t || 10}`, 100, 560)
    const cells = (d.g || '').split(''); const sz = Math.min(78, 880 / Math.max(cells.length, 1) - 8); cells.forEach((x, i) => { g.fillStyle = x === 'g' ? '#8ab372' : x === 'r' ? '#e58667' : '#6a5a56'; g.beginPath(); if (g.roundRect) g.roundRect(100 + i * (sz + 8), 620, sz, sz, 12); else g.rect(100 + i * (sz + 8), 620, sz, sz); g.fill() })
    g.fillStyle = '#f5e6c8'; g.font = '600 40px Manrope'; g.fillText(`${d.s} ${tr('points')}${d.stars ? '   ' + '★'.repeat(d.stars) : ''}`, 100, 800)
    g.fillStyle = '#b8a89a'; g.font = '500 30px "DM Mono"'; const who = `${P.name.toUpperCase()} · ${tr('LEVEL')} ${levelOf(P.xp)} ${tr(titleOf(levelOf(P.xp))).toUpperCase()}`; if (I) I.drawLiteral(g, who, 100, 960); else g.fillText(who, 100, 960); g.fillText(today(), 100, 1000)
    const a = document.createElement('a'); a.download = 'mirava-quiz-result.png'; a.href = cv.toDataURL('image/png'); a.click(); toast('🖼️ Result card saved to your downloads.')
    function wrap(c, t, x, y, w, lh) { const ws = tr(t).split(' '); let line = ''; for (const wd of ws) { const tt = line + wd + ' '; if (c.measureText(tt).width > w && line) { c.fillText(line, x, y); line = wd + ' '; y += lh } else line = tt } c.fillText(line, x, y) }
  }

  /* ===================== RIVALS ===================== */
  function renderRivals() {
    $('s-rivals').innerHTML = `<div class="wrap"><div class="sec" style="margin-top:0"><div><div class="k">Duels</div><h2 style="font-size:36px">Challenge a legend</h2><p style="color:var(--dim);font-size:14px;margin-top:6px;max-width:600px">Ten questions, fifteen seconds each, no lifelines. Your rival answers the same questions in real time — speed and accuracy both score.</p></div></div>
 <div class="rivals">${RIVALS.map(r => `<div class="card rcard" data-rv="${r.id}"><div class="ra">${r.av}</div><h3>${r.name}</h3><div class="tt">${r.title}</div><div class="meter">${[1, 2, 3, 4].map(i => `<i class="${i <= r.lvl ? 'on' : ''}"></i>`).join('')}</div><p>${esc(r.blurb)}</p><div class="mono" style="font-size:11px;color:var(--dim)">~${Math.round(r.acc * 100)}% accuracy · answers in ${r.spd[0]}–${r.spd[1]}s</div>${P.rivals[r.id] ? '<div class="beaten">✓ DEFEATED</div>' : ''}<div style="margin-top:14px"><button class="btn ${P.rivals[r.id] ? '' : 'gold'} sm">${P.rivals[r.id] ? 'Rematch' : 'Challenge'}</button></div></div>`).join('')}</div></div>`
    $('s-rivals').querySelectorAll('[data-rv]').forEach(c => c.onclick = () => { Sound.init(); startDuel(RIVALS.find(r => r.id === c.dataset.rv)) })
  }

  /* ===================== STATS ===================== */
  function renderStats() {
    const s = P.stats, L = levelOf(P.xp), a = xpFor(L), b = xpFor(L + 1)
    const heat = Array.from({ length: 84 }, (_, i) => { const d = addDays(today(), i - 83), n = P.act[d] || 0; return `<i class="${n ? n < 10 ? 'h1' : n < 25 ? 'h2' : n < 50 ? 'h3' : 'h4' : ''}" title="${d}: ${n} answers"></i>` }).join('')
    $('s-stats').innerHTML = `<div class="wrap"><div class="sec" style="margin-top:0"><div><div class="k">Profile</div><h2 style="font-size:36px" translate="no">${esc(P.name)}</h2><p class="mono" style="color:var(--gold-t);font-size:12px;margin-top:4px">LEVEL ${L} · ${titleOf(L).toUpperCase()} · ${P.xp - a}/${b - a} XP TO NEXT</p></div><button class="btn sm" id="swUser">Mirava profile →</button></div>
 <div class="tiles">${tile(P.xp, 'Total XP')}${tile(s.ans, 'Answered')}${tile(s.ans ? Math.round(s.cor / s.ans * 100) + '%' : '—', 'Accuracy')}${tile(s.ans ? (s.time / s.ans).toFixed(1) + 's' : '—', 'Avg answer')}${tile(P.best.combo, 'Best streak')}${tile(P.best.lightning, 'Lightning best')}${tile(P.best.survival, 'Survival best')}${tile(P.daily.bestStreak, 'Best daily streak')}</div>
 <div class="grid2" style="margin-top:16px"><div class="card pad"><div class="k">Accuracy by region</div>${BANK.map(r => { const x = s.reg[r.id] || { a: 0, c: 0 }, p = x.a ? x.c / x.a : 0; return `<div class="rbar"><div>${REGION_ICON[r.id]} ${r.label}<span>${x.a ? Math.round(p * 100) + '% · ' + x.c + '/' + x.a : 'not played'}</span></div><div class="bar"><i style="width:${p * 100}%"></i></div></div>` }).join('')}
  <div class="k" style="margin-top:22px">Activity · last 12 weeks</div><div class="heat" style="margin-top:10px">${heat}</div></div>
  <div class="card pad"><div class="k">Campaign stars</div><div style="margin-top:12px">${BANK.map(r => `<div class="mrow"><span>${r.label.split(' ')[0].toUpperCase()}</span><div class="mgrid">${r.missions.map((m, mi) => `<i class="s${starsOf(r.id, mi)}" title="${esc(m.name)}: ${starsOf(r.id, mi)}★"></i>`).join('')}</div></div>`).join('')}</div>
  <div class="k" style="margin-top:22px">Review deck</div><p style="font-size:13px;color:var(--dim);margin-top:8px;line-height:1.6">${Object.keys(P.review).length} cards in rotation · ${reviewDue().length} due today · ${P.mastered} mastered. Cards return after 1, 3, 7 and 14 days, then retire.</p>
  <div class="k" style="margin-top:22px">Rivals defeated</div><p style="font-size:26px;margin-top:8px">${RIVALS.map(r => `<span style="${P.rivals[r.id] ? '' : 'filter:grayscale(1);opacity:.3'}" title="${r.name}">${r.av}</span>`).join(' ')}</p></div></div>
 <div class="sec"><h2>Achievements · ${P.ach.length}/${ACH.length}</h2></div><div class="ach-grid">${ACH.map(x => `<div class="card ach ${P.ach.includes(x.id) ? '' : 'off'}"><div class="ai">${x.i}</div><div><b>${x.n}</b><small>${x.d}</small></div></div>`).join('')}</div>
 <div style="margin-top:30px;text-align:right"><button class="btn sm" id="rst" style="border-color:rgba(218,82,37,0.64);color:var(--red)">Reset my arena progress</button></div></div>`
    $('swUser').onclick = () => ctx.navigate('/profile')
    $('rst').onclick = () => modal('Reset all progress?', `This erases every star, record and achievement in the Quiz Arena for <b translate="no">${esc(P.name)}</b>. Your Mirava XP and leaderboard scores are kept.`, [{ t: 'Cancel', gold: true }, { t: 'Erase', fn: () => { P = NEW(playerName()); persist(); renderTop(); go('hub') } }])
  }

  /* ===================== KEYBOARD ===================== */
  const onKey = e => {
    if (screen !== 'play' || !RUN || RUN.ended || root.querySelector('.modal')) return
    const t = e.target
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
    const k = e.key.toLowerCase(), map = { a: 0, b: 1, c: 2, d: 3, '1': 0, '2': 1, '3': 2, '4': 3 }
    if (!RUN.answered && k in map) { e.preventDefault(); const b = $('opts').children[map[k]]; if (b && !b.disabled) answer(map[k]); return }
    if (RUN.answered && (k === 'enter' || k === ' ') && $('nextBtn')) { e.preventDefault(); $('nextBtn').click(); return }
    if (!RUN.answered && RUN.cfg.lifelines) { if (k === 'f') lifeFifty(); else if (k === 't') lifeTime(); else if (k === 'h') lifeSage(); else if (k === 's') lifeSkip() }
    if (k === 'escape') quitRun(() => go(RUN ? RUN.cfg.home || 'hub' : 'hub'))
  }
  window.addEventListener('keydown', onKey)
  // Static screens are rebuilt so code-built strings (tx()) follow the language toggle.
  const onLang = () => { if (!P || disposed) return; renderTop(); const R = { hub: renderHub, campaign: renderCampaign, rivals: renderRivals, stats: renderStats }; if (R[screen]) R[screen]() }
  window.addEventListener('mirava:languagechange', onLang)
  const onVis = () => { if (document.hidden && P) persist() }
  document.addEventListener('visibilitychange', onVis)

  /* ===================== BACKGROUND MOTES ===================== */
  let raf = 0, onResize = null
  if (!matchMedia('(prefers-reduced-motion:reduce)').matches) {
    const cv = $('bg'), g = cv && cv.getContext('2d')
    if (g) {
      let W2, H2; const ps = Array.from({ length: 46 }, () => ({ x: Math.random(), y: Math.random(), r: .6 + Math.random() * 1.8, v: .00006 + Math.random() * .00014, p: Math.random() * 6 }))
      onResize = () => { W2 = cv.width = innerWidth; H2 = cv.height = innerHeight }; onResize(); window.addEventListener('resize', onResize)
      const f = t => { if (disposed) return; if (!document.hidden) { g.clearRect(0, 0, W2, H2); for (const p of ps) { p.y -= p.v * 16; if (p.y < -.02) { p.y = 1.02; p.x = Math.random() } const a = .25 + .35 * Math.sin(t / 900 + p.p); g.fillStyle = `rgba(248,201,80,${a})`; g.beginPath(); g.arc(p.x * W2 + Math.sin(t / 2000 + p.p) * 20, p.y * H2, p.r, 0, Math.PI * 2); g.fill() } } raf = requestAnimationFrame(f) }
      raf = requestAnimationFrame(f)
    }
  }

  /* ===================== BOOT ===================== */
  screens().forEach(s => s.classList.toggle('on', s.id === 's-loading'))
  ctx.loadState(STATE_KEY).then(saved => {
    if (disposed) return
    P = hydrate(saved)
    renderTop()
    go('hub')
  })

  return () => {
    disposed = true
    if (P && saveTimer) persist()
    if (RUN) { RUN.ended = true; stopRunTimers() }
    timeouts.forEach(id => clearTimeout(id)); timeouts.clear()
    cancelAnimationFrame(raf)
    if (onResize) window.removeEventListener('resize', onResize)
    window.removeEventListener('keydown', onKey)
    window.removeEventListener('mirava:languagechange', onLang)
    document.removeEventListener('visibilitychange', onVis)
    Sound.close()
    root.querySelectorAll('.toast, .confetti, .lvup, .float, .modal').forEach(n => n.remove())
    const ids = ['s-hub', 's-campaign', 's-region', 's-brief', 's-play', 's-result', 's-rivals', 's-stats', 'topR', 'toasts']
    ids.forEach(id => { const n = $(id); if (n) n.innerHTML = '' })
    P = null; RUN = null
  }
}
