/* eslint-disable */
// Mirava Gaṇita page logic (Sutra Lab, sutra cards, 60-second challenge, Spot the Sutra,
// Passport and The Ancient Heist), ported from legacy/vedicmaths.html. The three legacy
// scripts talked through window globals/events; here they share a local event bus.
// Runs inside `root` via useLegacyPage; the returned cleanup stops every timer,
// listener, observer and speech utterance it started.
import { VM } from './vm.js';
import { METHODS, ORDER, SUTRAS, TIMELINE, STAGES, BADGES } from './data.js';

/** Per-user state keys (replace the legacy localStorage entries of the same purpose). */
const STATE_KEYS = ['vedicBest', 'spotBest', 'vedicHeist'];

export function init(root, ctx) {
  'use strict';
  let alive = true;
  const cleanups = [];
  const onCleanup = fn => cleanups.push(fn);
  /* ---- tracked timers / listeners ---- */
  const timers = new Set(), intervals = new Set(), rafs = new Set();
  const setTimeout = (fn, ms) => { const id = window.setTimeout(() => { timers.delete(id); if (alive) fn(); }, ms); timers.add(id); return id; };
  const clearTimeout = id => { window.clearTimeout(id); timers.delete(id); };
  const setInterval = (fn, ms) => { const id = window.setInterval(() => { if (alive) fn(); }, ms); intervals.add(id); return id; };
  const clearInterval = id => { window.clearInterval(id); intervals.delete(id); };
  const requestAnimationFrame = fn => { const id = window.requestAnimationFrame(t => { rafs.delete(id); if (alive) fn(t); }); rafs.add(id); return id; };
  const cancelAnimationFrame = id => { window.cancelAnimationFrame(id); rafs.delete(id); };
  const listen = (target, type, fn, opts) => { target.addEventListener(type, fn, opts); onCleanup(() => target.removeEventListener(type, fn, opts)); };
  const bus = new EventTarget();

  const $ = s => root.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const I18N = () => window.MiravaI18n;
  const tr = v => (I18N() ? I18N().t(v) : v);
  const loc = () => (I18N() ? I18N().locale() : 'en-IN');
  const origText = el => (I18N()?.originalText ? I18N().originalText(el) : el.textContent);
  /* Sutra names are Sanskrit transliterations: keep them out of the translator. */
  function renderSutraName(element, value) {
    const parts = value.split(' · '), name = document.createElement('span');
    name.lang = 'sa-Latn'; name.translate = false; name.textContent = parts.shift();
    element.replaceChildren(name);
    if (parts.length) { const detail = document.createElement('span'); detail.textContent = ' · ' + parts.join(' · '); element.append(detail); }
  }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const toast = msg => { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; $('#toasts').appendChild(t); setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, 2600); };
  // In-page anchors: scroll with the sticky-header offset the legacy page got from scroll-padding-top.
  const go = id => { const el = root.querySelector('#' + id); if (!el) return; const y = el.getBoundingClientRect().top + window.scrollY - 72; window.scrollTo({ top: Math.max(0, y), behavior: reduced ? 'auto' : 'smooth' }); };
  listen(root, 'click', e => {
    const a = e.target.closest && e.target.closest('a[href]'); if (!a || !root.contains(a)) return;
    if (a.dataset.nav) { e.preventDefault(); ctx.navigate(a.dataset.nav); return; }
    const href = a.getAttribute('href'); if (!href || href[0] !== '#' || href.length < 2) return;
    e.preventDefault(); go(href.slice(1));
  });

  /* ---- storage: per-user state API, cached in memory ---- */
  const mem = {}, saveT = {};
  const store = {
    get(k, d) { return mem[k] == null ? d : JSON.parse(JSON.stringify(mem[k])); },
    set(k, v) { mem[k] = v == null ? null : JSON.parse(JSON.stringify(v)); clearTimeout(saveT[k]); saveT[k] = setTimeout(() => { delete saveT[k]; ctx.saveState(k, mem[k]); }, 300); }
  };
  /* ---- scores → leaderboard / XP ---- */
  const submit = (game, body) => { ctx.submitScore(game, body); };

  const GANITA = (() => {


  /* ---------------- visuals ---------------- */
  const C = { ink: '#24151a', mute: '#8a7a74', gold: '#94620a', or: '#df5934', line: '#e3d6c8', soft: '#fdf1d8' };
  function urdhvaVis(r, s) {
    const A = r.A, Bd = r.B, cols = r.cols, ans = r.answer, P = Math.max(ans.length, A.length, Bd.length, cols.length);
    const gap = P > 10 ? 34 : 46, m = 30, W = P * gap + 2 * m + 20, H = 214, x = p => W - m - gap / 2 - p * gap, yA = 50, yB = 118, yR = 190;
    const colShown = Math.min(s - 1, cols.length - 1), cur = s >= 1 && s - 1 < cols.length ? s - 1 : -1, done = s >= cols.length + 1;
    let g = `<svg viewBox="0 0 ${W} ${H}" width="${W}" role="img" aria-label="Vertically and crosswise diagram">`;
    if (cur >= 0) {
      g += `<rect x="${x(cur) - gap / 2 + 3}" y="16" width="${gap - 6}" height="${H - 30}" rx="10" fill="${C.soft}"/>`;
      cols[cur].pairs.forEach(p => { const v = p[2] === p[3]; g += `<line class="lnk" x1="${x(p[2])}" y1="${yA + 8}" x2="${x(p[3])}" y2="${yB - 24}" stroke="${v ? C.gold : C.or}" stroke-width="3" stroke-linecap="round" opacity=".9"/>`; });
      g += `<text x="${x(cur)}" y="12" text-anchor="middle" font-family="DM Mono" font-size="11" fill="${C.gold}">Σ ${cols[cur].sum}${cols[cur].carryIn ? '+' + cols[cur].carryIn : ''}</text>`;
    }
    const inPair = (row, i) => cur >= 0 && cols[cur].pairs.some(p => p[row] === i);
    A.forEach((d, i) => { g += `<text x="${x(i)}" y="${yA}" text-anchor="middle" font-family="Playfair Display,Georgia,serif" font-weight="700" font-size="30" fill="${inPair(2, i) ? C.or : C.ink}">${d}</text>`; });
    Bd.forEach((d, i) => { g += `<text x="${x(i)}" y="${yB}" text-anchor="middle" font-family="Playfair Display,Georgia,serif" font-weight="700" font-size="30" fill="${inPair(3, i) ? C.or : C.ink}">${d}</text>`; });
    g += `<text x="${m + 6}" y="${yB}" text-anchor="middle" font-family="Manrope" font-weight="700" font-size="24" fill="${C.mute}">×</text>`;
    g += `<line x1="${x(P - 1) - gap / 2 + 4}" y1="${yB + 18}" x2="${x(0) + gap / 2 - 4}" y2="${yB + 18}" stroke="${C.ink}" stroke-width="2"/>`;
    for (let k = 0; k <= colShown; k++) {
      const c = cols[k]; g += `<text x="${x(k)}" y="${yR}" text-anchor="middle" font-family="Playfair Display,Georgia,serif" font-weight="700" font-size="30" fill="${k === cur ? C.or : C.ink}">${c.digit}</text>`;
      if (c.carryOut && !(k === cols.length - 1 && done)) g += `<text x="${x(k + 1)}" y="${yR - 30}" text-anchor="middle" font-family="DM Mono" font-size="12" fill="${C.gold}">+${c.carryOut}</text>`;
    }
    if (done && cols[cols.length - 1].carryOut) g += `<text x="${x(cols.length)}" y="${yR}" text-anchor="middle" font-family="Playfair Display,Georgia,serif" font-weight="700" font-size="30" fill="${C.ink}">${cols[cols.length - 1].carryOut}</text>`;
    return g + '</svg>';
  }
  function devVis(r, s) {
    // Nikhilam & Yāvadūnam: two rows of number | deviation, then left | right
    const a = r.method === 'yavadunam' ? r.n : r.a, b = r.method === 'yavadunam' ? r.n : r.b, da = r.method === 'yavadunam' ? r.d : r.da, db = r.method === 'yavadunam' ? r.d : r.db;
    const sg = v => (v < 0n ? '−' + (-v) : '+' + v), base = r.base, p = r.p, last = r.steps.length - 1, adj = r.steps.length === 6;
    const rawL = a + db, rawR = da * db, ans = BigInt(r.answer), finL = ans / base, finR = ans % base;
    const W = 400, H = 232, xn = 190, xd = 236, yr1 = 76, yr2 = 128, yres = 186;
    const T = (x, y, t, o) => `<text x="${x}" y="${y}" text-anchor="${o && o.a || 'end'}" font-family="${o && o.f || 'Playfair Display,Georgia,serif'}" font-weight="${o && o.w || 700}" font-size="${o && o.s || 30}" fill="${o && o.c || C.ink}">${t}</text>`;
    let g = `<svg viewBox="0 0 ${W} ${H}" width="${W}" role="img" aria-label="Base and deviation diagram">`;
    g += T(W / 2, 22, `base ${base}`, { a: 'middle', f: 'DM Mono', w: 500, s: 13, c: C.gold });
    g += `<line x1="${xn + 22}" y1="40" x2="${xn + 22}" y2="${H - 16}" stroke="${C.line}" stroke-width="2"/>`;
    g += T(xn, yr1, a) + T(xn, yr2, b);
    if (s >= 1) { g += T(xd, yr1, sg(da), { a: 'start', c: C.gold }); g += T(xd, yr2, sg(db), { a: 'start', c: C.gold }); }
    if (s === 2) g += `<line x1="${xn - 10}" y1="${yr1 - 10}" x2="${xd + 6}" y2="${yr2 - 22}" stroke="${C.or}" stroke-width="3" stroke-linecap="round"/><circle cx="${xn - 10}" cy="${yr1 - 10}" r="4" fill="${C.or}"/>`;
    if (s === 3) g += `<line x1="${xd + 44}" y1="${yr1 + 6}" x2="${xd + 44}" y2="${yr2 - 26}" stroke="${C.or}" stroke-width="3" stroke-linecap="round"/>`;
    g += `<line x1="40" y1="${yr2 + 18}" x2="${W - 40}" y2="${yr2 + 18}" stroke="${C.ink}" stroke-width="2"/>`;
    const showFin = adj ? s >= 4 : s >= last;
    if (s >= 2) g += T(xn, yres, showFin ? finL : rawL, { c: s === 2 ? C.or : C.ink });
    if (s >= 3) g += T(xd, yres, showFin ? finR.toString().padStart(p, '0') : (rawR < 0n ? '−' + (-rawR) : rawR), { a: 'start', c: s === 3 ? C.or : C.ink });
    if (adj && s >= 4) g += T(40, H - 12, r.steps[4].k === 'Borrow' ? '↺ borrowed 1 from the left' : '↺ carried to the left', { a: 'start', f: 'DM Mono', w: 500, s: 12, c: C.gold });
    if (s >= last) g += T(W - 40, H - 12, `= ${r.answer}`, { a: 'end', f: 'DM Mono', w: 500, s: 15, c: C.ink });
    return g + '</svg>';
  }
  function boardVis(r, s) {
    const rows = [], last = r.steps.length - 1;
    const cell = (L, R, cls) => `<div class="br ${cls || ''}"><span class="L">${L}</span><span class="bar">|</span><span class="R">${R}</span></div>`;
    if (r.method === 'ekadhika') {
      const n = r.a / 10n, x = r.a % 10n, y = r.b % 10n;
      rows.push(cell(n, x, s === 0 ? 'hi' : ''), cell(n, y, s === 0 ? 'hi' : ''), '<hr>');
      rows.push(cell(s >= 1 ? `${n} × ${n + 1n} = ${n * (n + 1n)}` : '·', s >= 2 ? `${x} × ${y} = ${String(x * y).padStart(2, '0')}` : '·', s >= 1 && s < 3 ? 'hi' : ''));
      if (s >= 1) rows.splice(1, 0, `<div class="note">↑ one more than ${n} is ${n + 1n}</div>`);
    } else if (r.method === 'ekanyunena') {
      const a = r.a, k = r.b.toString().length, direct = a.toString().length <= k;
      rows.push(`<div class="br"><span class="L"></span><span class="bar"></span><span class="R">${a}</span></div>`, `<div class="br"><span class="L">×</span><span class="bar"></span><span class="R">${r.b}</span></div>`, '<hr>');
      if (direct) { rows.push(cell(s >= 1 ? a - 1n : '·', s >= 2 ? (10n ** BigInt(k) - a).toString().padStart(k, '0') : '·', s === 1 || s === 2 ? 'hi' : '')); if (s >= 2) rows.push(`<div class="note">${(a - 1n).toString().padStart(k, '0').split('').map(d => `9−${d}`).join(' · ')}</div>`); }
      else rows.push(`<div class="br"><span class="L"></span><span class="bar"></span><span class="R">${s >= 1 ? r.answer : '·'}</span></div>`);
    } else {
      const N = r.N.toString(), cut = r.method === 'cuberoot' ? 3 : 2, head = N.length > cut ? N.slice(0, -cut) : '', tail = N.slice(-cut);
      rows.push(`<div class="br big"><span class="L ${s === 1 || s === 2 ? 'hl' : ''}">${head || '·'}</span><span class="bar">|</span><span class="R">${tail.slice(0, -1)}<b class="${s === 0 ? 'hl' : ''}">${tail.slice(-1)}</b></span></div>`, '<hr>');
      const q = r.answer.slice(0, -1), u = r.answer.slice(-1);
      const cube = r.method === 'cuberoot', qAt = cube ? 2 : 1, uAt = cube ? 0 : (r.steps.length > 3 ? 2 : 0);
      rows.push(cell(s >= qAt ? (q || '0') : '·', s >= uAt ? u : (cube ? '·' : r.steps[0].v.match(/ends in ([\d or]+)\.$/) ? r.steps[0].v.match(/ends in ([\d or]+)\.$/)[1].replace(' or ', '/') : '·'), s === qAt || s === uAt ? 'hi' : ''));
      rows.push(`<div class="note">${r.method === 'cuberoot' ? '∛' : '√'} ${N} = ${s >= last ? r.answer : '…'}</div>`);
    }
    return `<div class="board">${rows.join('')}</div>`;
  }
  function visualFor(r, s) { return r.method === 'urdhva' ? urdhvaVis(r, s) : (r.method === 'nikhilam' || r.method === 'yavadunam') ? devVis(r, s) : boardVis(r, s); }

  /* ---------------- conventional comparison for roots ---------------- */
  function factorText(r, N, pw) {
    let n = BigInt(r), f = [], d = 2n; while (d * d <= n) { let e = 0; while (n % d === 0n) { n /= d; e++; } if (e) f.push([d, e]); d++; } if (n > 1n) f.push([n, 1]);
    const sup = e => String(e).split('').map(c => '⁰¹²³⁴⁵⁶⁷⁸⁹'[c]).join(''), divs = f.reduce((t, x) => t + x[1] * pw, 0);
    return { text: `${N}\n= ${f.map(([p, e]) => p + sup(e * pw)).join(' × ')}\n${pw === 3 ? '∛' : '√'} = ${f.map(([p, e]) => p + (e > 1 ? sup(e) : '')).join(' × ')} = ${r}`, divs };
  }

  /* ---------------- LAB ---------------- */
  const L = { key: 'urdhva', res: null, s: 0, timer: 0 };
  $('#mlist').innerHTML = ORDER.map(k => { const m = METHODS[k]; return `<button class="mbtn" role="tab" data-k="${k}" aria-selected="false"><span class="no">${m.no}</span><span><b>${esc(m.short)}</b><small>${esc(m.use)}</small></span></button>`; }).join('');
  $('#mlist').querySelectorAll('.mbtn').forEach(b => b.onclick = () => setMethod(b.dataset.k, null, true));
  function setMethod(k, vals, play) {
    L.key = k; const m = METHODS[k]; bus.dispatchEvent(new CustomEvent('ganita-method', { detail: k }));
    $('#mlist').querySelectorAll('.mbtn').forEach(b => { b.classList.toggle('on', b.dataset.k === k); b.setAttribute('aria-selected', b.dataset.k === k); });
    renderSutraName($('#mName'), m.name); $('#mDev').textContent = m.dev; $('#mDesc').textContent = m.desc;
    const v = vals || m.fields.map(f => f[1]);
    $('#inrow').innerHTML = m.fields.map((f, i) => `${i ? `<span class="opsym">${m.op}</span>` : (m.fields.length === 1 && m.op !== '²' ? `<span class="opsym">${m.op}</span>` : '')}<div class="fld"><label for="in${i}">${esc(f[0])}</label><input class="in" id="in${i}" inputmode="numeric" autocomplete="off" value="${esc(v[i] || '')}" maxlength="13"></div>`).join('') + (m.op === '²' ? '<span class="opsym">²</span>' : '') + '<button class="btn gold" id="solveBtn" type="button">Solve ↵</button>';
    $('#exs').innerHTML = '<span class="k">Try:</span>' + m.ex.map((e, i) => `<button class="chip" data-e="${i}" type="button">${e.length === 2 ? `${e[0]} ${m.op} ${e[1]}` : m.op === '²' ? `${e[0]}²` : `${m.op}${e[0]}`}</button>`).join('');
    $('#exs').querySelectorAll('[data-e]').forEach(b => b.onclick = () => { m.ex[+b.dataset.e].forEach((x, i) => { $('#in' + i).value = x; }); solve(true); });
    let t = 0;
    $('#inrow').querySelectorAll('input').forEach(inp => { inp.addEventListener('input', () => { inp.value = inp.value.replace(/[^\d]/g, ''); clearTimeout(t); t = setTimeout(() => solve(false), 350); }); inp.addEventListener('keydown', e => { if (e.key === 'Enter') solve(true); }); });
    $('#solveBtn').onclick = () => solve(true);
    solve(!!play);
  }
  function solve(play) {
    stopPlay(); const m = METHODS[L.key], vals = m.fields.map((_, i) => $('#in' + i).value.trim());
    let r; try { r = VM.SOLVE[L.key](...vals); } catch (e) { r = { ok: false, error: 'Something went wrong with these numbers. Try smaller ones.' }; }
    if (!r.ok) { $('#err').textContent = r.error; $('#err').classList.add('on'); $('#result').innerHTML = ''; L.res = null; return; }
    $('#err').classList.remove('on'); L.res = r;
    const q = vals.length === 2 ? `${vals[0]} ${m.op} ${vals[1]}` : m.op === '²' ? `${vals[0]}²` : `${m.op}${vals[0]}`;
    let cmp = '';
    if (r.compare) {
      cmp = `<div class="cmp"><div class="cmpc"><h4>Conventional long multiplication</h4><pre>${esc(r.compare.conv.text)}</pre><div class="m"><div><small>Lines written</small><b>${r.compare.conv.lines}</b></div><div><small>Digit products</small><b>${r.compare.conv.mults}</b></div></div></div>
        <div class="cmpc v"><h4>${esc(m.short)} <span>✨</span></h4><pre>${esc(r.line)}</pre><div class="m"><div><small>Lines written</small><b>${r.compare.vedic.lines}</b></div><div><small>Digit products</small><b>${r.compare.vedic.mults}</b></div></div><p>${esc(r.compare.vedic.note)}</p></div></div>`;
    } else {
      const f = factorText(r.answer, r.N, r.method === 'cuberoot' ? 3 : 2);
      cmp = `<div class="cmp"><div class="cmpc"><h4>Prime factorisation</h4><pre>${esc(f.text)}</pre><div class="m"><div><small>Divisions needed</small><b>${f.divs}</b></div></div></div><div class="cmpc v"><h4>Vilokanam <span>✨</span></h4><pre>${esc(r.line)}</pre><div class="m"><div><small>Lookups</small><b>2</b></div></div><p>One glance at the last digit and one small ${r.method === 'cuberoot' ? 'cube' : 'square'} that fits the leading part.</p></div></div>`;
    }
    $('#result').innerHTML = `${r.warn ? `<div class="warn">⚠️ ${esc(r.warn)}</div>` : ''}
      <div class="out"><div class="ans"><small>${esc(q)}</small><div class="big">${esc(r.answer)}</div><div class="ln">${esc(r.line)}</div>
        <div class="chk ${r.check.ok ? '' : 'no'}"><i>${r.check.ok ? '✓' : '✗'}</i><span><b>Navasesh check ${r.check.ok ? 'passes' : 'fails'}.</b> ${esc(r.check.text)}</span></div></div>
        <div class="vis" id="vis"></div></div>
      <div class="steps"><div class="stbar"><b>Step by step</b><button class="btn sm" id="stPlay" type="button">▶ Play</button><button class="btn sm" id="stPrev" type="button" aria-label="Previous step">←</button><button class="btn sm" id="stNext" type="button" aria-label="Next step">→</button><button class="btn sm" id="stAll" type="button">Show all</button><button class="btn sm" id="stSay" type="button">🔊 Read aloud</button></div>
        <ol class="stl" id="stl">${r.steps.map(st => `<li class="${st.final ? 'fin' : ''}"><span><b>${esc(st.k)}</b><span>${esc(st.v)}</span></span></li>`).join('')}</ol></div>${cmp}`;
    $('#stPlay').onclick = () => play_(); $('#stAll').onclick = () => { stopPlay(); show(r.steps.length - 1); };
    $('#stNext').onclick = () => { stopPlay(); show(Math.min(r.steps.length - 1, L.s + 1)); }; $('#stPrev').onclick = () => { stopPlay(); show(Math.max(0, L.s - 1)); };
    $('#stSay').onclick = () => say(r);
    if ('speechSynthesis' in window === false) $('#stSay').hidden = true;
    if (play && !reduced) play_(); else show(r.steps.length - 1);
  }
  function show(s) {
    const r = L.res; if (!r) return; L.s = s;
    $('#stl').querySelectorAll('li').forEach((li, i) => { li.classList.toggle('hid', i > s); li.classList.toggle('cur', i === s && !r.steps[i].final); });
    $('#vis').innerHTML = visualFor(r, s);
  }
  function stopPlay() { clearTimeout(L.timer); L.timer = 0; const b = $('#stPlay'); if (b) b.textContent = '▶ Play'; }
  function play_() {
    if (L.timer) { stopPlay(); return; }
    const r = L.res; let s = 0; show(0); $('#stPlay').textContent = '⏸ Pause';
    const nxt = () => { if (L.res !== r) return; s++; if (s >= r.steps.length) { stopPlay(); return; } show(s); L.timer = setTimeout(nxt, 1300); };
    L.timer = setTimeout(nxt, 1300);
  }
  function speakable(t) { const hi = I18N()?.language() === 'hi'; return t.replace(/×/g, hi ? ' गुणा ' : ' times ').replace(/−/g, hi ? ' घटा ' : ' minus ').replace(/²/g, hi ? ' का वर्ग' : ' squared').replace(/³/g, hi ? ' का घन' : ' cubed').replace(/∛/g, hi ? 'घनमूल ' : 'cube root of ').replace(/√/g, hi ? 'वर्गमूल ' : 'square root of ').replace(/\|/g, hi ? ', फिर ' : ', then ').replace(/→/g, hi ? ', जिससे मिलता है ' : ', giving ').replace(/Σ/g, hi ? 'योग' : 'sum'); }
  function say(r) {
    if (!('speechSynthesis' in window)) { toast('Read-aloud is not supported in this browser.'); return; }
    speechSynthesis.cancel();
    r.steps.forEach(st => { const u = new SpeechSynthesisUtterance(speakable(tr(st.k) + '. ' + tr(st.v))); u.lang = loc(); u.rate = 0.95; speechSynthesis.speak(u); });
  }

  /* ---------------- hero demo ---------------- */
  const DEMOS = [['urdhva', ['23', '41'], '23 × 41'], ['nikhilam', ['97', '96'], '97 × 96'], ['ekadhika', ['65', '65'], '65²'], ['urdhva', ['312', '24'], '312 × 24'], ['cuberoot', ['175616'], '∛175616']];
  $('#dDots').innerHTML = DEMOS.map(() => '<i></i>').join('');
  let dI = 0, dS = 0, dT = 0;
  function demoTick() {
    const [k, a, q] = DEMOS[dI], r = VM.SOLVE[k](...a), m = METHODS[k];
    renderSutraName($('#dK'), m.name); $('#dQ').textContent = q; $('#dM').textContent = m.short.toLowerCase();
    $('#dVis').innerHTML = visualFor(r, dS);
    $('#dLine').textContent = dS >= r.steps.length - 1 ? r.line : r.steps[dS].v;
    $('#dDots').querySelectorAll('i').forEach((d, i) => d.classList.toggle('on', i === dI));
    if (dS >= r.steps.length - 1) { dS = 0; dI = (dI + 1) % DEMOS.length; dT = setTimeout(demoTick, 2600); }
    else { dS++; dT = setTimeout(demoTick, 1150); }
  }
  if (reduced) { const r = VM.SOLVE.urdhva('23', '41'); $('#dVis').innerHTML = visualFor(r, r.steps.length - 1); $('#dLine').textContent = r.line; } else demoTick();
  $('.demo').addEventListener('click', () => { const [k, a] = DEMOS[(dI + DEMOS.length - (dS === 0 ? 1 : 0)) % DEMOS.length]; setMethod(k, a, true); go('lab'); });
  $('.demo').style.cursor = 'pointer'; $('.demo').title = 'Open this example in the Sutra Lab';

  /* ---------------- sutra of the day ---------------- */
  { const d = new Date(), doy = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5), s = SUTRAS[doy % 16];
    $('#sotd').innerHTML = `<span class="k" style="white-space:nowrap">Sutra of<br>the day</span><div><div class="dv" lang="sa" translate="no">${s[1]}</div><small><b lang="sa-Latn" translate="no">${esc(s[2])}</b> · ${esc(s[3])}</small></div>`; }

  /* ---------------- sutra cards ---------------- */
  $('#sgrid').innerHTML = SUTRAS.map(s => `<article class="sc" data-c="${s[4]}" data-lab="${s[6] ? 1 : 0}"><span class="n" aria-hidden="true">${s[0]}</span><div class="dv" lang="sa" translate="no">${s[1]}</div><div class="ia" lang="sa-Latn" translate="no">${esc(s[2])}</div><div class="mn">${esc(s[3])}</div><div class="ex">${esc(s[5])}</div><div class="ft"><span class="ar">${s[4] === 'arith' ? 'Arithmetic' : 'Algebra'}</span>${s[6] ? `<button class="try" data-m="${s[6]}" type="button">${s[6] === 'check' ? 'See it in the Lab ↗' : 'Try in Lab ↗'}</button>` : ''}</div></article>`).join('');
  $('#sgrid').querySelectorAll('.try').forEach(b => b.onclick = () => { setMethod(b.dataset.m === 'check' ? 'urdhva' : b.dataset.m, null, true); go('lab'); if (b.dataset.m === 'check') toast('The green navasesh check under each answer is Guṇitasamuccayaḥ at work.'); });
  $('#sfilt').querySelectorAll('button').forEach(b => b.onclick = () => {
    $('#sfilt').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); const f = b.dataset.f;
    $('#sgrid').querySelectorAll('.sc').forEach(c => c.classList.toggle('hide', !(f === 'all' || (f === 'lab' ? c.dataset.lab === '1' : c.dataset.c === f))));
  });

  /* ---------------- timeline ---------------- */
  if ($('#tl')) $('#tl').innerHTML = TIMELINE.map(t => `<div class="ev ${t[4] ? 'hl' : ''}"><div class="era">${esc(t[0])}</div><h4>${esc(t[1])}</h4><p>${esc(t[2])}</p><div class="why">${esc(t[3])}${t[4] ? ' <a href="/explore" data-nav="/explore">Find it in the atlas →</a>' : ''}</div></div>`).join('');

  /* ---------------- ARENA ---------------- */
  const AM = [['mixed', '🎲 Mixed'], ...ORDER.map(k => [k, METHODS[k].short])];
  const A = { mode: 'mixed', lv: 1, on: false, score: 0, streak: 0, solved: 0, log: [], cur: null, end: 0, raf: 0, hinted: false, tShown: 0 };
  const DUR = 60;
  $('#aMode').innerHTML = AM.map(([k, n]) => `<button class="chip ${k === 'mixed' ? 'on' : ''}" data-m="${k}" type="button">${esc(n)}</button>`).join('');
  $('#aMode').querySelectorAll('button').forEach(b => b.onclick = () => { if (A.on) return; A.mode = b.dataset.m; $('#aMode').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); renderBests(); });
  $('#aLvl').querySelectorAll('button').forEach(b => b.onclick = () => { if (A.on) return; A.lv = +b.dataset.l; $('#aLvl').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); renderBests(); });
  const BK = 'vedicBest', bestKey = () => `${A.mode}|${A.lv}`;
  function renderBests() {
    const all = store.get(BK, {}), b = all[bestKey()], top = Object.values(all).reduce((m, x) => Math.max(m, x.score), 0);
    $('#bestTop').textContent = top; setTimeout(function () { bus.dispatchEvent(new Event('ganita-update')); }, 0);
    const name = AM.find(x => x[0] === A.mode)[1], lvn = ['', 'Śiṣya', 'Gaṇaka', 'Ācārya'][A.lv];
    $('#bests').innerHTML = b ? `Your best at <b>${esc(name)} · ${lvn}</b>: <b>${b.score}</b> points, ${b.correct} correct (${b.acc}% accuracy) on ${esc(b.date)}.` : `No score yet at <b>${esc(name)} · ${lvn}</b>. Set the first one!`;
  }
  renderBests();
  function newProblem() {
    const m = A.mode === 'mixed' ? ORDER[Math.floor(Math.random() * ORDER.length)] : A.mode;
    let p; do { p = VM.problem(m, A.lv); } while (A.cur && p.q === A.cur.q);
    A.cur = p; A.hinted = false; A.tShown = performance.now();
    $('#pM').textContent = METHODS[m].short; $('#pQ').textContent = p.q; $('#pQ').classList.remove('pop'); void $('#pQ').offsetWidth; $('#pQ').classList.add('pop');
    $('#pIn').value = ''; $('#pHintBox').hidden = true; $('#pIn').focus();
  }
  function hud() { $('#hScore').textContent = A.score; $('#hStreak').textContent = A.streak; $('#hSolved').textContent = A.solved; }
  function setPlaying(on) { ['#pIn', '#pGo', '#pHint', '#pSkip'].forEach(s => { $(s).disabled = !on; }); }
  function start() {
    Object.assign(A, { on: true, score: 0, streak: 0, solved: 0, log: [], cur: null }); hud();
    $('#cStart').hidden = true; $('#cEnd').hidden = true; $('#cCount').hidden = false;
    $('#stage').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    let n = 3; $('#cNum').textContent = n;
    const ct = setInterval(() => { n--; if (n > 0) { $('#cNum').textContent = n; return; } clearInterval(ct); $('#cCount').hidden = true; setPlaying(true); A.end = performance.now() + DUR * 1000; newProblem(); tickTimer(); }, 650);
  }
  function tickTimer() {
    const left = Math.max(0, A.end - performance.now()), sec = Math.ceil(left / 1000);
    $('#hTime').textContent = sec; $('#hRing').setAttribute('stroke-dashoffset', (157.08 * (1 - left / (DUR * 1000))).toFixed(2));
    $('#hRing').setAttribute('stroke', sec <= 10 ? '#df5934' : '#f1b43c');
    if (left <= 0) { finish(); return; }
    A.raf = requestAnimationFrame(tickTimer);
  }
  function feedback(ok, msg) { const f = $('#pFb'); f.className = 'fb ' + (ok ? 'ok' : 'no'); f.textContent = msg; if (!ok) { $('#pForm').classList.remove('shake'); void $('#pForm').offsetWidth; $('#pForm').classList.add('shake'); } }
  function answer(given, skipped) {
    if (!A.on || !A.cur) return;
    const p = A.cur, ok = !skipped && given.replace(/[\s,]/g, '') === p.answer, secs = (performance.now() - A.tShown) / 1000;
    A.log.push({ q: p.q, method: p.method, given: skipped ? '—' : given, answer: p.answer, ok, secs, steps: p.res.steps, hinted: A.hinted });
    if (ok) { A.streak++; A.solved++; const pts = 10 * A.lv + (A.streak >= 3 ? 5 * A.lv : 0) - (A.hinted ? 5 * A.lv : 0); A.score += Math.max(2, pts); feedback(true, A.streak >= 3 ? `✓ Correct! 🔥 Streak ×${A.streak}` : '✓ Correct!'); }
    else { A.streak = 0; feedback(false, skipped ? `Skipped. ${p.q} = ${p.answer}` : `✗ ${p.q} = ${p.answer}`); }
    hud(); newProblem();
  }
  $('#pForm').addEventListener('submit', e => { e.preventDefault(); const v = $('#pIn').value.trim(); if (!v) return; answer(v, false); });
  $('#pIn').addEventListener('input', () => { $('#pIn').value = $('#pIn').value.replace(/[^\d]/g, ''); });
  $('#pSkip').onclick = () => answer('', true);
  $('#pHint').onclick = () => { if (!A.cur) return; A.hinted = true; const st = A.cur.res.steps; $('#pHintBox').hidden = false; $('#pHintBox').textContent = `💡 ${METHODS[A.cur.method].name}: ${st[Math.min(1, st.length - 1)].v}`; };
  $('#aStart').onclick = start;
  function finish() {
    A.on = false; cancelAnimationFrame(A.raf); setPlaying(false); $('#pFb').textContent = '';
    const tries = A.log.length, correct = A.log.filter(x => x.ok).length, acc = tries ? Math.round(correct / tries * 100) : 0;
    const avg = correct ? (A.log.filter(x => x.ok).reduce((t, x) => t + x.secs, 0) / correct).toFixed(1) : '—';
    const all = store.get(BK, {}), prev = all[bestKey()], isBest = !prev || A.score > prev.score;
    if (isBest && tries) { all[bestKey()] = { score: A.score, correct, acc, date: new Date().toLocaleDateString(loc(), { day: '2-digit', month: 'short', year: 'numeric' }) }; store.set(BK, all); }
    if (tries) submit('vedic-sprint', { score: A.score, level: A.lv, time_taken_seconds: DUR, completed: true, meta: { mode: A.mode, correct, attempted: tries, accuracy: acc } });
    const per = A.score / A.lv, title = per >= 220 ? '🏅 Bhāskara-class mind' : per >= 140 ? '🎓 Ācārya (master)' : per >= 70 ? '🧮 Gaṇaka (reckoner)' : '📖 Śiṣya (student)';
    $('#cRes').innerHTML = `<div style="text-align:center"><span class="title">${title}</span><h3 style="margin-top:10px">${A.score} points${isBest && tries ? ' · new personal best!' : ''}</h3></div>
      <div class="rk"><div><small>Correct</small><b>${correct}</b></div><div><small>Attempted</small><b>${tries}</b></div><div><small>Accuracy</small><b>${acc}%</b></div><div><small>Avg time</small><b>${avg}${avg === '—' ? '' : ' s'}</b></div></div>
      ${tries ? `<div class="rev">${A.log.map(x => `<details><summary><i>${x.ok ? '✅' : '❌'}</i><span><b>${esc(x.q)}</b> = ${esc(x.answer)}${x.ok ? '' : ` <em>(you: ${esc(x.given)})</em>`}</span><em>${esc(METHODS[x.method].short)} ▾</em></summary><ol>${x.steps.map(s => `<li><b>${esc(s.k)}:</b> ${esc(s.v)}</li>`).join('')}</ol></details>`).join('')}</div>` : '<p style="text-align:center">No answers this round. Have another go!</p>'}
      <div style="display:flex;gap:10px;justify-content:center;margin-top:14px;flex-wrap:wrap"><button class="btn gold" id="again" type="button">↻ Play again</button><button class="btn" id="toLab" type="button">Practise in the Lab</button></div>`;
    $('#cEnd').hidden = false; $('#again').onclick = start;
    $('#toLab').onclick = () => { const miss = A.log.find(x => !x.ok); const k = miss ? miss.method : (A.mode === 'mixed' ? 'urdhva' : A.mode); setMethod(k, null, true); go('lab'); };
    renderBests(); $('#pQ').textContent = 'Time!'; $('#pM').textContent = '—';
  }

  /* ---------------- nav highlight ---------------- */
  const secs = ['lab', 'sutras', 'arena', 'heist-sec', 'heritage'].map(id => root.querySelector('#' + id)).filter(Boolean);
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) root.querySelectorAll('.nav a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id)); }), { rootMargin: '-45% 0px -50% 0px' }) : null;
  if (io) { secs.forEach(s => io.observe(s)); onCleanup(() => io.disconnect()); }

  setMethod('urdhva', null, false);
  return { VM, setMethod, solve, L, A, start, finish, answer, METHODS, renderBests };
  })();

  const HEIST = (function () {
/* =====================================================================
   THE ANCIENT HEIST: Secrets of Akbar's Court
   Stage 9 — Rich final summary screen.
   ===================================================================== */


const TOTAL_STAGES = STAGES.length;
const MAX_STARS_PER_LEVEL = 3;
const MAX_TOTAL_STARS = TOTAL_STAGES * MAX_STARS_PER_LEVEL;
const XP_PER_CORRECT = 20;
const XP_PER_LESSON = 15;
const XP_PER_CARD = 10;

const SAVE_KEY = "vedicHeist"; // was localStorage "ancientHeistSave_v1"; now per-user state

/* ---------- PROGRESS STATE ---------- */
let highestUnlockedIndex = 0;
let completedLevels = [];
let factCardCollection = [];
let lessonsOpened = [];
let playerXP = 0;
let playerCoins = 0;
let starsPerLevel = [0, 0, 0, 0, 0];
let badgesUnlocked = [];
let xpFromLessons = [];
let xpFromCards = [];

let mistakesThisAttempt = 0;

/* ---------- BOSS STATE ---------- */
let bossLockIndex = 0;
let usedQuestionsPerLock = [[], [], []];
let bossLocksOpened = [false, false, false];

/* ---------- RUN STATE ---------- */
let currentStageIndex = 0;
let currentQuestion = null;
let usedQuestions = [];
let alarmLevel = 0;
let score = 0;
let gameActive = false;
let reachedTreasure = false;
let pendingReward = null;


/* ---------- DOM ---------- */
const startScreen    = root.querySelector('#startScreen');
const mapScreen      = root.querySelector('#mapScreen');
const gameScreen     = root.querySelector('#gameScreen');
const summaryScreen  = root.querySelector('#summaryScreen');

const startBtn       = root.querySelector('#startBtn');
const backToStartBtn = root.querySelector('#backToStartBtn');
const mapGrid        = root.querySelector('#mapGrid');
const mapMessage     = root.querySelector('#mapMessage');
const mapStats       = root.querySelector('#mapStats');
const pillStars      = root.querySelector('#pillStars');
const pillCoins      = root.querySelector('#pillCoins');
const pillXP         = root.querySelector('#pillXP');
const pillBadges     = root.querySelector('#pillBadges');
const viewBadgesBtn  = root.querySelector('#viewBadgesBtn');
const resetProgressBtn = root.querySelector('#resetProgressBtn');

const roomCard       = root.querySelector('#roomCard');
const roomTitle      = root.querySelector('#roomTitle');
const roomSubtitle   = root.querySelector('#roomSubtitle');
const historicalRole = root.querySelector('#historicalRole');
const challengeText  = root.querySelector('#challengeText');
const techniqueHint  = root.querySelector('#techniqueHint');
const objectsRow     = root.querySelector('#objectsRow');
const bossStrip      = root.querySelector('#bossStrip');

const lessonToggle   = root.querySelector('#lessonToggle');
const lessonPanel    = root.querySelector('#lessonPanel');
const lessonTitle    = root.querySelector('#lessonTitle');
const lessonExplain  = root.querySelector('#lessonExplain');
const lessonExample  = root.querySelector('#lessonExample');
const lessonCompare  = root.querySelector('#lessonCompare');
const practiceQuestion = root.querySelector('#practiceQuestion');
const practiceInput  = root.querySelector('#practiceInput');
const practiceCheckBtn = root.querySelector('#practiceCheckBtn');
const practiceNewBtn = root.querySelector('#practiceNewBtn');
const practiceFeedback = root.querySelector('#practiceFeedback');
const lessonGotItBtn = root.querySelector('#lessonGotItBtn');

const answerInput    = root.querySelector('#answerInput');
const submitBtn      = root.querySelector('#submitBtn');
const feedbackMsg    = root.querySelector('#feedbackMsg');
const mapBtn         = root.querySelector('#mapBtn');

const alarmFill      = root.querySelector('#alarmFill');
const alarmPercent   = root.querySelector('#alarmPercent');
const progressText   = root.querySelector('#progressText');
const scoreDisplay   = root.querySelector('#scoreDisplay');

const factModal      = root.querySelector('#factModal');
const factTitle      = root.querySelector('#factTitle');
const factMeans      = root.querySelector('#factMeans');
const factMatters    = root.querySelector('#factMatters');
const factCardCount  = root.querySelector('#factCardCount');
const factCloseBtn   = root.querySelector('#factCloseBtn');

const rewardsModal       = root.querySelector('#rewardsModal');
const rewardsTitle       = root.querySelector('#rewardsTitle');
const rewardsSub         = root.querySelector('#rewardsSub');
const rewardsStars       = root.querySelector('#rewardsStars');
const rewardsLines       = root.querySelector('#rewardsLines');
const rewardsBadges      = root.querySelector('#rewardsBadges');
const rewardsContinueBtn = root.querySelector('#rewardsContinueBtn');

const badgesModal    = root.querySelector('#badgesModal');
const badgesList     = root.querySelector('#badgesList');
const badgesCloseBtn = root.querySelector('#badgesCloseBtn');

const resetModal     = root.querySelector('#resetModal');
const resetCancelBtn = root.querySelector('#resetCancelBtn');
const resetConfirmBtn= root.querySelector('#resetConfirmBtn');

/* Summary DOM */
const sumScore       = root.querySelector('#sumScore');
const sumXP          = root.querySelector('#sumXP');
const sumCoins       = root.querySelector('#sumCoins');
const sumStars       = root.querySelector('#sumStars');
const sumBadges      = root.querySelector('#sumBadges');
const summaryLevels  = root.querySelector('#summaryLevels');
const summaryTechniques = root.querySelector('#summaryTechniques');
const summaryChronicles = root.querySelector('#summaryChronicles');
const summaryBadgesRow  = root.querySelector('#summaryBadgesRow');
const sumReturnToMapBtn = root.querySelector('#sumReturnToMapBtn');
const sumPlayAgainBtn   = root.querySelector('#sumPlayAgainBtn');
const sumBackToStartBtn = root.querySelector('#sumBackToStartBtn');

const TOTAL_CARDS = STAGES.reduce(function (s, st) { return s + st.objects.length; }, 0);

/* =====================================================================
   SAVE / LOAD / RESET
   ===================================================================== */
function getSaveData() {
  return {
    version: 1,
    highestUnlockedIndex: highestUnlockedIndex,
    completedLevels: completedLevels.slice(),
    starsPerLevel: starsPerLevel.slice(),
    playerXP: playerXP,
    playerCoins: playerCoins,
    badgesUnlocked: badgesUnlocked.slice(),
    factCardCollection: factCardCollection.slice(),
    lessonsOpened: lessonsOpened.slice(),
    xpFromLessons: xpFromLessons.slice(),
    xpFromCards: xpFromCards.slice()
  };
}
function saveProgress() {
  store.set(SAVE_KEY, getSaveData()); bus.dispatchEvent(new Event("heist-save"));
}
function loadProgress() {
  try {
    const data = store.get(SAVE_KEY, null);
    if (!data || data.version !== 1) return false;

    if (typeof data.highestUnlockedIndex === "number") {
      highestUnlockedIndex = Math.max(0, Math.min(TOTAL_STAGES - 1, data.highestUnlockedIndex));
    }
    if (Array.isArray(data.completedLevels)) {
      completedLevels = data.completedLevels.filter(function (i) {
        return typeof i === "number" && i >= 0 && i < TOTAL_STAGES;
      });
    }
    if (Array.isArray(data.starsPerLevel) && data.starsPerLevel.length === TOTAL_STAGES) {
      starsPerLevel = data.starsPerLevel.map(function (s) {
        return Math.max(0, Math.min(MAX_STARS_PER_LEVEL, Number(s) || 0));
      });
    }
    if (typeof data.playerXP === "number" && data.playerXP >= 0) playerXP = data.playerXP;
    if (typeof data.playerCoins === "number" && data.playerCoins >= 0) playerCoins = data.playerCoins;
    if (Array.isArray(data.badgesUnlocked)) badgesUnlocked = data.badgesUnlocked.slice();
    if (Array.isArray(data.factCardCollection)) factCardCollection = data.factCardCollection.slice();
    if (Array.isArray(data.lessonsOpened)) lessonsOpened = data.lessonsOpened.slice();
    if (Array.isArray(data.xpFromLessons)) xpFromLessons = data.xpFromLessons.slice();
    if (Array.isArray(data.xpFromCards)) xpFromCards = data.xpFromCards.slice();
    return true;
  } catch (err) { return false; }
}
function clearProgressStorage() {
  store.set(SAVE_KEY, null); bus.dispatchEvent(new Event("heist-save"));
}
function wipeAllProgress() {
  clearProgressStorage();
  highestUnlockedIndex = 0;
  completedLevels = [];
  factCardCollection = [];
  lessonsOpened = [];
  playerXP = 0;
  playerCoins = 0;
  starsPerLevel = [0, 0, 0, 0, 0];
  badgesUnlocked = [];
  xpFromLessons = [];
  xpFromCards = [];
  mistakesThisAttempt = 0;
  resetRunState();
}

/* =====================================================================
   HELPERS
   ===================================================================== */
function unlockBadge(id) {
  if (badgesUnlocked.indexOf(id) === -1) { badgesUnlocked.push(id); return true; }
  return false;
}
function checkAndUnlockBadges() {
  const newlyUnlocked = [];
  if (lessonsOpened.length === TOTAL_STAGES && unlockBadge("scholar")) newlyUnlocked.push("scholar");
  if (factCardCollection.length === TOTAL_CARDS && unlockBadge("historian")) newlyUnlocked.push("historian");
  if (starsPerLevel.some(function (s) { return s >= 3; }) && unlockBadge("perfectionist")) newlyUnlocked.push("perfectionist");
  if (completedLevels.length === TOTAL_STAGES && unlockBadge("conqueror")) newlyUnlocked.push("conqueror");
  if (playerCoins >= 150 && unlockBadge("coin-collector")) newlyUnlocked.push("coin-collector");
  if (playerXP >= 500 && unlockBadge("mastermind")) newlyUnlocked.push("mastermind");
  return newlyUnlocked;
}
function updateRewardsStrip() {
  const totalStars = starsPerLevel.reduce(function (a, b) { return a + b; }, 0);
  pillStars.textContent  = '⭐ ' + totalStars + ' / ' + MAX_TOTAL_STARS;
  pillCoins.textContent  = '💰 ' + playerCoins;
  pillXP.textContent     = '✨ ' + playerXP + ' XP';
  pillBadges.textContent = '🏅 ' + badgesUnlocked.length + ' / ' + BADGES.length;
}
function updateUI() {
  const clamped = Math.min(100, Math.max(0, alarmLevel));
  alarmFill.style.width = clamped + '%';
  alarmPercent.textContent = Math.round(clamped) + '%';
  scoreDisplay.textContent = '🏆 ' + score;

  if (reachedTreasure) progressText.textContent = 'Treasure claimed!';
  else if (gameActive) progressText.textContent = 'Stage ' + (currentStageIndex + 1) + ' / ' + TOTAL_STAGES;
  else progressText.textContent = 'Stage 1 / ' + TOTAL_STAGES;
}

/* ---------- QUESTION SELECTION ---------- */
function pickQuestion() {
  const stage = STAGES[currentStageIndex];
  if (stage.isBoss) {
    const lockPool = stage.bossPools[bossLockIndex];
    const usedList = usedQuestionsPerLock[bossLockIndex];
    let available = [];
    for (let i = 0; i < lockPool.length; i++) if (!usedList.includes(i)) available.push(i);
    if (available.length === 0) {
      usedQuestionsPerLock[bossLockIndex] = [];
      for (let i = 0; i < lockPool.length; i++) available.push(i);
    }
    const pick = available[Math.floor(Math.random() * available.length)];
    usedQuestionsPerLock[bossLockIndex].push(pick);
    return lockPool[pick];
  }
  const pool = stage.pool;
  let available = [];
  for (let i = 0; i < pool.length; i++) if (!usedQuestions.includes(i)) available.push(i);
  if (available.length === 0) {
    usedQuestions = [];
    for (let i = 0; i < pool.length; i++) available.push(i);
  }
  const pick = available[Math.floor(Math.random() * available.length)];
  usedQuestions.push(pick);
  return pool[pick];
}

/* ---------- BOSS STRIP ---------- */
function renderBossStrip() {
  const stage = STAGES[currentStageIndex];
  if (!stage.isBoss) {
    bossStrip.classList.add('hidden');
    bossStrip.innerHTML = '';
    return;
  }
  bossStrip.classList.remove('hidden');
  bossStrip.innerHTML = '';

  for (let i = 0; i < 3; i++) {
    const el = document.createElement('div');
    el.className = 'boss-lock';

    let statusIcon = '🔒';
    if (bossLocksOpened[i]) statusIcon = '✅';
    else if (i === bossLockIndex) statusIcon = '🔓';

    if (bossLocksOpened[i]) el.classList.add('opened');
    else if (i === bossLockIndex) el.classList.add('current');

    const label = (stage.bossLockNames[i] || '').replace('Lock ' + (i+1) + ' — ', '');
    el.innerHTML = '<span class="boss-lock-num">Lock ' + (i + 1) + '</span>' + statusIcon + ' ' + label;
    bossStrip.appendChild(el);
  }
}

/* ---------- ROOM VISUALS + OBJECT CHIPS ---------- */
function applyStageVisuals(stage) {
  if (stage.backgroundUrl) {
    roomCard.style.backgroundImage =
      "linear-gradient(180deg, rgba(20,10,5,0.55) 0%, rgba(20,10,5,0.75) 100%), url('" + stage.backgroundUrl + "')";
  } else {
    roomCard.style.backgroundImage = "";
  }
  objectsRow.innerHTML = '';
  stage.objects.forEach(function (obj) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'object-chip';
    if (factCardCollection.indexOf(obj.id) !== -1) {
      chip.classList.add('collected');
      chip.textContent = '✅ ' + obj.label;
    } else {
      chip.textContent = obj.label;
    }
    chip.addEventListener('click', function () { openFactCard(obj); });
    objectsRow.appendChild(chip);
  });
}

/* ---------- FACT CARD MODAL ---------- */
function openFactCard(obj) {
  let newlyCollected = false;
  if (factCardCollection.indexOf(obj.id) === -1) {
    factCardCollection.push(obj.id);
    newlyCollected = true;
    if (xpFromCards.indexOf(obj.id) === -1) {
      xpFromCards.push(obj.id);
      playerXP += XP_PER_CARD;
    }
  }
  const chips = objectsRow.querySelectorAll('.object-chip');
  chips.forEach(function (chip) {
    if (chip.dataset.objectId === obj.id) {
      chip.classList.add('collected');
      if (chip.textContent.indexOf('✅') === -1) chip.textContent = '✅ ' + obj.label;
    }
  });
  factTitle.textContent = obj.title;
  factMeans.replaceChildren(Object.assign(document.createElement('span'), { textContent: obj.means }));
  if (newlyCollected) {
    factMeans.append(document.createTextNode('  '), Object.assign(document.createElement('span'), { textContent: '(New chronicle unlocked! +' + XP_PER_CARD + ' XP)' }));
  }
  factMatters.textContent = obj.matters;
  factCardCount.textContent = 'Chronicle ' + factCardCollection.length + ' / ' + TOTAL_CARDS;
  factModal.classList.remove('hidden');
  checkAndUnlockBadges();
  saveProgress();
}
function closeFactCard() { factModal.classList.add('hidden'); }

/* ---------- LESSON PANEL ---------- */
let lessonPanelOpen = false;
function renderLesson(stage) {
  const lesson = stage.lesson;
  lessonTitle.textContent = '📖 ' + lesson.name;
  lessonExplain.textContent = lesson.explain;
  lessonExample.textContent = lesson.example;
  lessonCompare.textContent = lesson.compare;
  loadPracticeQuestion();
  lessonPanel.classList.add('hidden');
  lessonToggle.classList.remove('open');
  lessonToggle.textContent = '📖 Learn the Technique';
  lessonPanelOpen = false;
}
function loadPracticeQuestion() {
  const lesson = STAGES[currentStageIndex].lesson;
  practiceQuestion.textContent = lesson.practice.q;
  practiceInput.value = '';
  practiceFeedback.textContent = '';
  practiceFeedback.classList.remove('correct');
}
function toggleLesson() {
  lessonPanelOpen = !lessonPanelOpen;
  if (lessonPanelOpen) {
    lessonPanel.classList.remove('hidden');
    lessonToggle.classList.add('open');
    lessonToggle.textContent = '📖 Hide the Technique';
    const stageId = STAGES[currentStageIndex].id;
    let changed = false;
    if (lessonsOpened.indexOf(stageId) === -1) {
      lessonsOpened.push(stageId);
      changed = true;
      if (xpFromLessons.indexOf(stageId) === -1) {
        xpFromLessons.push(stageId);
        playerXP += XP_PER_LESSON;
      }
      checkAndUnlockBadges();
    }
    if (changed) saveProgress();
    practiceInput.focus();
  } else {
    lessonPanel.classList.add('hidden');
    lessonToggle.classList.remove('open');
    lessonToggle.textContent = '📖 Learn the Technique';
  }
}
function checkPractice() {
  const raw = practiceInput.value.trim();
  if (raw === '') { practiceFeedback.textContent = 'Type an answer first.'; practiceFeedback.classList.remove('correct'); return; }
  const val = Number(raw);
  if (isNaN(val)) { practiceFeedback.textContent = 'Only numbers, please.'; practiceFeedback.classList.remove('correct'); return; }
  const answer = STAGES[currentStageIndex].lesson.practice.a;
  if (Math.abs(val - answer) < 0.0001) {
    practiceFeedback.textContent = '✅ Correct! Nicely done.';
    practiceFeedback.classList.add('correct');
  } else {
    practiceFeedback.textContent = 'Not quite — re-read the example and try again.';
    practiceFeedback.classList.remove('correct');
  }
}

/* ---------- LOAD STAGE ---------- */
function loadStage() {
  if (reachedTreasure) return;
  const stage = STAGES[currentStageIndex];

  roomTitle.textContent = stage.title;
  roomSubtitle.textContent = stage.subtitle;
  historicalRole.textContent = stage.historicalRole || '';
  techniqueHint.textContent = stage.technique || '';

  applyStageVisuals(stage);
  renderLesson(stage);
  renderBossStrip();

  currentQuestion = pickQuestion();
  challengeText.textContent = currentQuestion.q;

  answerInput.value = '';
  answerInput.disabled = false;
  submitBtn.disabled = false;
  feedbackMsg.textContent = '';
  feedbackMsg.classList.remove('success');

  roomCard.classList.remove('hidden');

  updateUI();
  answerInput.focus();
}

/* ---------- RESET ---------- */
function resetRunState() {
  currentQuestion = null;
  usedQuestions = [];
  alarmLevel = 0;
  score = 0;
  gameActive = false;
  reachedTreasure = false;
  lessonPanelOpen = false;
  mistakesThisAttempt = 0;
  bossLockIndex = 0;
  usedQuestionsPerLock = [[], [], []];
  bossLocksOpened = [false, false, false];
}

/* ---------- SCREEN SWITCHING ---------- */
function showStartScreen() {
  resetRunState();
  currentStageIndex = 0;
  startScreen.classList.remove('hidden');
  mapScreen.classList.add('hidden');
  gameScreen.classList.add('hidden');
  summaryScreen.classList.add('hidden');
  updateUI();
}
function showMapScreen() {
  resetRunState();
  startScreen.classList.add('hidden');
  gameScreen.classList.add('hidden');
  summaryScreen.classList.add('hidden');
  mapScreen.classList.remove('hidden');
  renderMap();
}
function showGameScreen() {
  startScreen.classList.add('hidden');
  mapScreen.classList.add('hidden');
  summaryScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');
}

/* ---------- MAP RENDERING ---------- */
function renderMap() {
  mapMessage.textContent = '';
  updateRewardsStrip();

  mapStats.innerHTML =
    '<span>📜 Chronicles: ' + factCardCollection.length + ' / ' + TOTAL_CARDS + '</span>' +
    ' · ' +
    '<span>📖 Knowledge Scroll: ' + lessonsOpened.length + ' / ' + TOTAL_STAGES + '</span>';

  mapGrid.innerHTML = '';

  for (let i = 0; i < STAGES.length; i++) {
    const stage = STAGES[i];
    const card = document.createElement('div');
    card.className = 'level-card';

    const isCompleted = completedLevels.indexOf(i) !== -1;
    const isUnlocked  = i <= highestUnlockedIndex;
    const isCurrent   = (i === highestUnlockedIndex) && !isCompleted;

    if (isCompleted) card.classList.add('completed');
    if (!isUnlocked) card.classList.add('locked');
    if (isCurrent)   card.classList.add('current');

    let statusIcon = '🔒';
    if (isCompleted) statusIcon = '✅';
    else if (isUnlocked) statusIcon = '🔓';

    const num = document.createElement('div');
    num.className = 'level-num';
    num.textContent = 'Level ' + (i + 1) + (stage.isBoss ? ' — Boss' : '');

    const name = document.createElement('div');
    name.className = 'level-name';
    name.textContent = stage.title;

    const desc = document.createElement('div');
    desc.className = 'level-desc';
    desc.textContent = stage.subtitle;

    const tag = document.createElement('span');
    tag.className = 'level-tag';
    tag.textContent = (stage.technique || '')
      .replace('Vedic Technique: ', '')
      .replace('Reasoning Technique: ', '')
      .replace('Mixed Techniques: ', '')
      .replace('Boss Chamber: ', '')
      .split('—')[0].replace(/\s*\(e\.g\.[\s\S]*$/, '').split('.')[0].trim();

    const status = document.createElement('div');
    status.className = 'level-status';
    status.textContent = statusIcon;

    const stars = document.createElement('div');
    stars.className = 'level-stars';
    const earned = starsPerLevel[i] || 0;
    let starsHtml = '';
    for (let s = 0; s < 3; s++) {
      if (s < earned) starsHtml += '★';
      else starsHtml += '<span class="empty">★</span>';
    }
    stars.innerHTML = starsHtml;

    card.appendChild(num);
    card.appendChild(name);
    card.appendChild(desc);
    card.appendChild(tag);
    card.appendChild(status);
    card.appendChild(stars);

    card.addEventListener('click', (function (idx, unlocked) {
      return function () {
        if (!unlocked) {
          mapMessage.textContent = '🔒 Complete the previous level to unlock this location.';
          return;
        }
        startLevel(idx);
      };
    })(i, isUnlocked));

    mapGrid.appendChild(card);
  }
}

/* ---------- START A LEVEL ---------- */
function startLevel(index) {
  resetRunState();
  currentStageIndex = index;
  gameActive = true;
  alarmLevel = 0;
  score = 0;
  mistakesThisAttempt = 0;
  bossLockIndex = 0;
  usedQuestionsPerLock = [[], [], []];
  bossLocksOpened = [false, false, false];
  showGameScreen();
  loadStage();
}

/* ---------- REWARDS MODAL ---------- */
function showRewardsModal(reward) {
  rewardsTitle.textContent = reward.title;
  rewardsSub.textContent = reward.subtitle || 'Rewards earned in this attempt:';

  let starsHtml = '';
  for (let s = 0; s < 3; s++) {
    if (s < reward.starsThisAttempt) starsHtml += '★';
    else starsHtml += '<span class="empty">★</span>';
  }
  rewardsStars.innerHTML = starsHtml;

  let lines = '';
  lines += '<div>🏅 Coins: +' + reward.coins + ' (total ' + playerCoins + ')</div>';
  lines += '<div>✨ XP this attempt: +' + reward.xpGained + ' (total ' + playerXP + ')</div>';
  if (reward.bestStars > 0) {
    lines += '<div>⭐ Best stars on this level: ' + reward.bestStars + ' / 3</div>';
  }
  rewardsLines.innerHTML = lines;

  rewardsBadges.innerHTML = '';
  if (reward.newBadges && reward.newBadges.length > 0) {
    reward.newBadges.forEach(function (bid) {
      const b = BADGES.find(function (x) { return x.id === bid; });
      if (!b) return;
      const chip = document.createElement('div');
      chip.className = 'badge-chip';
      chip.textContent = b.icon + ' ' + b.name + ' unlocked!';
      rewardsBadges.appendChild(chip);
    });
  }
  rewardsModal.classList.remove('hidden');
}
function closeRewardsModal() { rewardsModal.classList.add('hidden'); }

/* ---------- BADGES VIEW ---------- */
function renderBadgesView() {
  badgesList.innerHTML = '';
  BADGES.forEach(function (b) {
    const row = document.createElement('div');
    const unlocked = badgesUnlocked.indexOf(b.id) !== -1;
    row.className = 'badge-row' + (unlocked ? ' unlocked' : '');

    const icon = document.createElement('div');
    icon.className = 'badge-icon';
    icon.textContent = unlocked ? b.icon : '🔒';

    const info = document.createElement('div');
    info.className = 'badge-info';

    const name = document.createElement('div');
    name.className = 'badge-name';
    name.textContent = b.name;

    const desc = document.createElement('div');
    desc.className = 'badge-desc';
    desc.textContent = b.desc;

    info.appendChild(name);
    info.appendChild(desc);
    row.appendChild(icon);
    row.appendChild(info);
    badgesList.appendChild(row);
  });
  badgesModal.classList.remove('hidden');
}
function closeBadgesView() { badgesModal.classList.add('hidden'); }

/* ---------- LEVEL-COMPLETE ---------- */
function onLevelCleared(stageJustCompleted) {
  if (completedLevels.indexOf(stageJustCompleted) === -1) completedLevels.push(stageJustCompleted);

  let starsThisAttempt = 1;
  if (mistakesThisAttempt === 0) starsThisAttempt = 3;
  else if (mistakesThisAttempt === 1) starsThisAttempt = 2;

  const previousBest = starsPerLevel[stageJustCompleted] || 0;
  let bestStarsImproved = false;
  if (starsThisAttempt > previousBest) {
    starsPerLevel[stageJustCompleted] = starsThisAttempt;
    bestStarsImproved = true;
  }
  const bestStars = starsPerLevel[stageJustCompleted];

  let coinsThisCompletion = 0;
  if (previousBest === 0) {
    coinsThisCompletion = 10 + 10 * starsThisAttempt;
    playerCoins += coinsThisCompletion;
  }

  const xpGainedThisCompletion = XP_PER_CORRECT;

  if (stageJustCompleted + 1 > highestUnlockedIndex && stageJustCompleted + 1 < STAGES.length) {
    highestUnlockedIndex = stageJustCompleted + 1;
  }

  let newBadges = checkAndUnlockBadges();
  if (alarmLevel >= 75) { if (unlockBadge("survivor")) newBadges.push("survivor"); }
  if (starsPerLevel[stageJustCompleted] >= 3) { if (unlockBadge("perfectionist")) newBadges.push("perfectionist"); }
  if (completedLevels.length === TOTAL_STAGES) { if (unlockBadge("conqueror")) newBadges.push("conqueror"); }

  saveProgress();
  submit('vedic-heist', { score: score, level: stageJustCompleted + 1, completed: stageJustCompleted === TOTAL_STAGES - 1, meta: { stage: STAGES[stageJustCompleted].id, stars: starsThisAttempt, mistakes: mistakesThisAttempt, alarm: alarmLevel } });

  pendingReward = {
    title: 'Level Complete!',
    subtitle: 'Rewards earned in this attempt:',
    starsThisAttempt: starsThisAttempt,
    bestStars: bestStars,
    bestStarsImproved: bestStarsImproved,
    coins: coinsThisCompletion,
    xpGained: xpGainedThisCompletion,
    newBadges: newBadges
  };
  showRewardsModal(pendingReward);
}

/* ---------- CORRECT / WRONG ---------- */
function handleCorrect() {
  score += 100;
  playerXP += XP_PER_CORRECT;

  let newBadgesThisStep = [];
  if (badgesUnlocked.indexOf("first-blood") === -1) {
    if (unlockBadge("first-blood")) newBadgesThisStep.push("first-blood");
  }
  newBadgesThisStep = newBadgesThisStep.concat(checkAndUnlockBadges());

  feedbackMsg.textContent = '✅ The lock clicks open. Move on!' + (newBadgesThisStep.length ? '  🏅 New badge!' : '');
  feedbackMsg.classList.add('success');
  updateUI();

  answerInput.disabled = true;
  submitBtn.disabled = true;

  const stage = STAGES[currentStageIndex];
  const stageJustCompleted = currentStageIndex;

  setTimeout(function () {
    if (!gameActive) return;

    if (stage.isBoss) {
      bossLocksOpened[bossLockIndex] = true;
      renderBossStrip();

      if (bossLockIndex < 2) {
        bossLockIndex++;
        currentQuestion = pickQuestion();
        challengeText.textContent = currentQuestion.q;
        answerInput.value = '';
        answerInput.disabled = false;
        submitBtn.disabled = false;
        feedbackMsg.textContent = '🔓 Lock ' + bossLockIndex + ' opened! Next: ' + (STAGES[currentStageIndex].bossLockNames[bossLockIndex].replace('Lock ' + (bossLockIndex+1) + ' — ', ''));
        feedbackMsg.classList.add('success');
        renderBossStrip();
        answerInput.focus();
        saveProgress();
      } else {
        onLevelCleared(stageJustCompleted);
      }
    } else {
      onLevelCleared(stageJustCompleted);
    }
  }, 650);
}

function handleWrong() {
  mistakesThisAttempt += 1;
  alarmLevel += 25;
  score = Math.max(0, score - 20);
  updateUI();

  if (alarmLevel >= 100) {
    gameActive = false;
    feedbackMsg.textContent = '🚨 ALARM MAXED! The guards have caught you! 🚨';
    feedbackMsg.classList.remove('success');
    answerInput.disabled = true;
    submitBtn.disabled = true;
    setTimeout(function () { showMapScreen(); }, 2000);
    return;
  }

  feedbackMsg.textContent = '❌ Incorrect! The guards are getting closer! Tip: open 📖 Learn the Technique.';
  feedbackMsg.classList.remove('success');

  currentQuestion = pickQuestion();
  challengeText.textContent = currentQuestion.q;
  answerInput.value = '';
  answerInput.focus();
}

/* ---------- SUBMIT ---------- */
function handleSubmit() {
  if (!gameActive || reachedTreasure || !currentQuestion) return;

  const raw = answerInput.value.trim();
  if (raw === '') {
    feedbackMsg.textContent = '⚠️ Enter an answer, adventurer!';
    feedbackMsg.classList.remove('success');
    return;
  }
  const userAnswer = Number(raw);
  if (isNaN(userAnswer)) {
    feedbackMsg.textContent = '⚠️ Only numbers are allowed!';
    feedbackMsg.classList.remove('success');
    return;
  }
  const correct = Math.abs(userAnswer - currentQuestion.a) < 0.0001;
  if (correct) handleCorrect();
  else handleWrong();
}

/* =====================================================================
   STAGE 9 — FINAL SUMMARY SCREEN
   ===================================================================== */
function showSummaryScreen() {
  // Capture final run score before leaving the game screen.
  const finalScore = score;

  // Populate totals
  sumScore.textContent  = finalScore;
  sumXP.textContent     = playerXP;
  sumCoins.textContent  = playerCoins;
  const totalStars = starsPerLevel.reduce(function (a, b) { return a + b; }, 0);
  sumStars.textContent  = totalStars + ' / ' + MAX_TOTAL_STARS;
  sumBadges.textContent = badgesUnlocked.length + ' / ' + BADGES.length;

  // Levels completed list
  summaryLevels.innerHTML = '';
  for (let i = 0; i < STAGES.length; i++) {
    const stage = STAGES[i];
    const done = completedLevels.indexOf(i) !== -1;
    const row = document.createElement('div');
    row.className = 'summary-level-row';

    const nameEl = document.createElement('div');
    nameEl.className = 'lr-name';
    nameEl.textContent = (i + 1) + '. ' + stage.title;

    const tagEl = document.createElement('span');
    tagEl.className = 'lr-tag';
    tagEl.textContent = (stage.technique || '')
      .replace('Vedic Technique: ', '')
      .replace('Reasoning Technique: ', '')
      .replace('Boss Chamber: ', '')
      .split('—')[0].replace(/\s*\(e\.g\.[\s\S]*$/, '').split('.')[0].trim();

    const starsEl = document.createElement('div');
    starsEl.className = 'lr-stars';
    const earned = starsPerLevel[i] || 0;
    let starsHtml = '';
    for (let s = 0; s < 3; s++) {
      if (s < earned) starsHtml += '★';
      else starsHtml += '<span class="empty">★</span>';
    }
    starsEl.innerHTML = starsHtml;

    row.appendChild(nameEl);
    row.appendChild(tagEl);
    row.appendChild(starsEl);
    summaryLevels.appendChild(row);
  }

  // Techniques learned (only those whose lesson was opened)
  summaryTechniques.innerHTML = '';
  let techCount = 0;
  for (let i = 0; i < STAGES.length; i++) {
    if (lessonsOpened.indexOf(STAGES[i].id) === -1) continue;
    techCount++;
    const item = document.createElement('div');
    item.className = 'summary-list-item tech';
    item.textContent = '📖 ' + STAGES[i].lesson.name;
    summaryTechniques.appendChild(item);
  }
  if (techCount === 0) {
    const item = document.createElement('div');
    item.className = 'summary-list-item empty';
    item.textContent = 'No lesson panels were opened this run.';
    summaryTechniques.appendChild(item);
  }

  // Chronicles collected — walk every stage's objects and list only collected ones
  summaryChronicles.innerHTML = '';
  let cardCount = 0;
  for (let i = 0; i < STAGES.length; i++) {
    const stage = STAGES[i];
    stage.objects.forEach(function (obj) {
      if (factCardCollection.indexOf(obj.id) === -1) return;
      cardCount++;
      const item = document.createElement('div');
      item.className = 'summary-list-item';
      item.textContent = '📜 ' + obj.title.replace('Discover: ', '');
      summaryChronicles.appendChild(item);
    });
  }
  if (cardCount === 0) {
    const item = document.createElement('div');
    item.className = 'summary-list-item empty';
    item.textContent = 'No chronicles were collected this run.';
    summaryChronicles.appendChild(item);
  }

  // Badges earned
  summaryBadgesRow.innerHTML = '';
  if (badgesUnlocked.length === 0) {
    const item = document.createElement('div');
    item.className = 'summary-list-item empty';
    item.textContent = 'No badges were earned this run.';
    summaryBadgesRow.appendChild(item);
  } else {
    badgesUnlocked.forEach(function (bid) {
      const b = BADGES.find(function (x) { return x.id === bid; });
      if (!b) return;
      const chip = document.createElement('div');
      chip.className = 'badge-chip';
      chip.textContent = b.icon + ' ' + b.name;
      summaryBadgesRow.appendChild(chip);
    });
  }

  // Switch screens
  gameScreen.classList.add('hidden');
  summaryScreen.classList.remove('hidden');
  summaryScreen.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---------- REWARDS CONTINUE ---------- */
function rewardsContinue() {
  closeRewardsModal();

  if (currentStageIndex >= TOTAL_STAGES - 1) {
    // Completed the boss → show the rich summary screen
    showSummaryScreen();
  } else {
    currentStageIndex++;
    usedQuestions = [];
    mistakesThisAttempt = 0;
    bossLockIndex = 0;
    usedQuestionsPerLock = [[], [], []];
    bossLocksOpened = [false, false, false];
    loadStage();
  }
}

/* ---------- RESET MODAL ---------- */
function openResetModal() { resetModal.classList.remove('hidden'); }
function closeResetModal() { resetModal.classList.add('hidden'); }
function confirmReset() {
  wipeAllProgress();
  closeResetModal();
  showStartScreen();
}

/* ---------- EVENTS ---------- */
startBtn.addEventListener('click', showMapScreen);
backToStartBtn.addEventListener('click', showStartScreen);
submitBtn.addEventListener('click', handleSubmit);
answerInput.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); }
});
mapBtn.addEventListener('click', showMapScreen);

factCloseBtn.addEventListener('click', closeFactCard);
factModal.addEventListener('click', function (e) { if (e.target === factModal) closeFactCard(); });

lessonToggle.addEventListener('click', toggleLesson);
lessonGotItBtn.addEventListener('click', function () { if (lessonPanelOpen) toggleLesson(); });
practiceCheckBtn.addEventListener('click', checkPractice);
practiceNewBtn.addEventListener('click', loadPracticeQuestion);
practiceInput.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') { e.preventDefault(); checkPractice(); }
});

rewardsContinueBtn.addEventListener('click', rewardsContinue);
rewardsModal.addEventListener('click', function (e) { if (e.target === rewardsModal) rewardsContinue(); });

viewBadgesBtn.addEventListener('click', renderBadgesView);
badgesCloseBtn.addEventListener('click', closeBadgesView);
badgesModal.addEventListener('click', function (e) { if (e.target === badgesModal) closeBadgesView(); });

resetProgressBtn.addEventListener('click', openResetModal);
resetCancelBtn.addEventListener('click', closeResetModal);
resetConfirmBtn.addEventListener('click', confirmReset);
resetModal.addEventListener('click', function (e) { if (e.target === resetModal) closeResetModal(); });

/* Summary screen buttons */
sumReturnToMapBtn.addEventListener('click', showMapScreen);
sumPlayAgainBtn.addEventListener('click', showStartScreen);
sumBackToStartBtn.addEventListener('click', showStartScreen);

/* ---------- INITIAL ---------- */
showStartScreen();
return { load: function () { loadProgress(); if (!mapScreen.classList.contains('hidden')) renderMap(); bus.dispatchEvent(new Event("heist-save")); }, state: function () { return {
  xp: playerXP, coins: playerCoins, stars: starsPerLevel.reduce(function (a, b) { return a + b; }, 0), maxStars: MAX_TOTAL_STARS,
  levels: completedLevels.length, totalLevels: TOTAL_STAGES, cards: factCardCollection.length, totalCards: TOTAL_CARDS,
  lessons: lessonsOpened.length, badges: badgesUnlocked.length, totalBadges: BADGES.length, next: Math.min(highestUnlockedIndex, TOTAL_STAGES - 1),
  nextTitle: STAGES[Math.min(highestUnlockedIndex, TOTAL_STAGES - 1)].title, started: playerXP > 0 || completedLevels.length > 0 || lessonsOpened.length > 0 }; } };

  })();

  {
  const bests = () => store.get('vedicBest', {});
  const RANKS = [[0, 'Śiṣya', 'student'], [150, 'Gaṇaka', 'reckoner'], [450, 'Ācārya', 'master'], [1000, 'Bhāskara-class', 'legendary mind']];
  function render() {
    const b = bests(), vals = Object.values(b), sum = vals.reduce((t, x) => t + (x.score || 0), 0), top = vals.reduce((m, x) => Math.max(m, x.score || 0), 0);
    const h = HEIST ? HEIST.state() : null, xp = h ? h.xp : 0, pts = sum + xp;
    let ri = 0; RANKS.forEach((r, i) => { if (pts >= r[0]) ri = i; });
    const cur = RANKS[ri], nxt = RANKS[ri + 1];
    $('#ppTitle').textContent = cur[1]; $('#ppSub').textContent = cur[2] + ' · ' + pts + ' combined points';
    $('#ppFill').style.width = (nxt ? Math.min(100, (pts - cur[0]) / (nxt[0] - cur[0]) * 100) : 100) + '%';
    $('#ppNext').textContent = nxt ? (nxt[0] - pts) + ' pts to ' + nxt[1] : 'Top rank';
    const cell = (l, v) => `<div><small>${l}</small><b>${v}</b></div>`;
    $('#ppA').innerHTML = cell('Best score', top) + cell('Combos tried', vals.length + ' / 24') + cell('Challenge points', sum) + cell('Lab methods', '7');
    if (h) $('#ppB').innerHTML = cell('Stars', h.stars + ' / ' + h.maxStars) + cell('Chambers', h.levels + ' / ' + h.totalLevels) + cell('Chronicles', h.cards + ' / ' + h.totalCards) + cell('Badges', h.badges + ' / ' + h.totalBadges) + cell('Heist XP', h.xp) + cell('Coins', h.coins);
    $('#heistTop').textContent = (h ? h.stars : 0) + '★';
    let q;
    if (!vals.length && !(h && h.started)) q = '<span>🧭 <b>Next:</b> spot three sutras in a row</span><a class="btn sm gold" href="#spot">Play</a>';
    else if (h && h.levels < h.totalLevels) q = `<span>⚔️ <b>Next:</b> ${h.nextTitle.replace(/</g, '&lt;')}</span><a class="btn sm gold" href="#heist-sec">Resume</a>`;
    else q = '<span>🏅 <b>Heist cleared</b></span><a class="btn sm gold" href="#arena">Beat your score</a>';
    $('#ppQuest').innerHTML = q;
  }
  bus.addEventListener('heist-save', render); bus.addEventListener('ganita-update', render); render();

  /* Spot the Sutra */
  const SP = ['urdhva', 'nikhilam', 'yavadunam', 'ekadhika', 'ekanyunena', 'cuberoot', 'sqroot'], GN = GANITA;
  let cur = null, streak = 0, locked = false, sbest = 0;
  sbest = +store.get('spotBest', 0) || 0;
  const rnd = a => a[Math.floor(Math.random() * a.length)];
  function nextSpot() {
    const m = rnd(SP), p = GN.VM.problem(m, 2), o = [m];
    while (o.length < 4) { const x = rnd(SP); if (!o.includes(x)) o.push(x); }
    o.sort(() => Math.random() - .5); cur = { m, p, o }; locked = false; drawSpot();
  }
  function drawSpot(pick) {
    const ok = pick === cur.m;
    $('#spot').innerHTML = `<div class="spot-top"><span class="pill"><small>Streak</small>${streak}</span><span class="k">Fastest sutra?</span><span class="pill"><small>Best</small>${sbest}</span></div>
      <div class="spot-q">${cur.p.q}</div>
      <div class="spot-opts">${cur.o.map((k, i) => `<button type="button" data-k="${k}" ${pick ? 'disabled' : ''} class="${pick ? (k === cur.m ? 'ok' : k === pick ? 'no' : '') : ''}"><kbd>${i + 1}</kbd>${GN.METHODS[k].short}</button>`).join('')}</div>
      <div class="spot-res">${pick ? `<span>${ok ? '✓' : '✗'} ${cur.p.q} = ${cur.p.answer} · ${cur.p.res.line.split('  →')[0]}</span><button class="btn sm" type="button" id="spWatch">Watch it solve ↗</button><button class="btn sm gold" type="button" id="spNext">Next →</button>` : ''}</div>`;
    $('#spot').querySelectorAll('[data-k]').forEach(b => b.onclick = () => choose(b.dataset.k));
    if (pick) { $('#spNext').onclick = nextSpot; $('#spWatch').onclick = () => { GN.setMethod(cur.m, cur.p.args.map(String), true); go('lab'); }; $('#spNext').focus(); }
  }
  function choose(k) {
    if (locked) return; locked = true;
    if (k === cur.m) { streak++; if (streak > sbest) { sbest = streak; store.set('spotBest', sbest); } } else { submitSpot(); streak = 0; }
    drawSpot(k);
  }
  listen(document, 'keydown', e => { if (locked || !cur || !/^[1-4]$/.test(e.key) || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return; const r = $('#spot').getBoundingClientRect(); if (r.bottom > 0 && r.top < innerHeight) choose(cur.o[+e.key - 1]); });
  /* Spot the Sutra score: the streak is submitted when it ends (a miss, or leaving the page) */
  function submitSpot() { if (streak > 0) submit('spot-difference', { score: streak, completed: true, meta: { best: sbest } }); }
  onCleanup(submitSpot);
  nextSpot();

  /* Lab -> Heist */
  const LABMAP = { nikhilam: 'Heist stages 2 and 5', ekadhika: 'Heist stage 3' };
  bus.addEventListener('ganita-method', e => {
    const m = e.detail, t = LABMAP[m];
    $('#labBridge').innerHTML = t ? `<span>⚔️ <b>${t}</b></span><a class="btn sm ink" href="#heist-sec">Play it</a>` : '';
  });
  $('#labBridge').innerHTML = '';
  /* refresh once the saved bests arrive from the account */
  bus.addEventListener('state-loaded', () => { sbest = Math.max(sbest, +store.get('spotBest', 0) || 0); if (cur && !locked) drawSpot(); render(); });

  root.querySelectorAll('.bridgebar [data-lab]').forEach(b => b.addEventListener('click', () => { GANITA.setMethod(b.dataset.lab, null, true); go('lab'); }));

  /* Heist lesson -> Lab */
  const mapLesson = t => /nikhilam/i.test(t) ? 'nikhilam' : /ending in 5/i.test(t) ? 'ekadhika' : /boss/i.test(t) ? 'nikhilam' : null;
  const row = $('#labBridgeRow'), title = $('#lessonTitle');
  const sync = () => { row.style.display = mapLesson(origText(title)) ? '' : 'none'; };
  const mo = new MutationObserver(sync); mo.observe(title, { childList: true, characterData: true, subtree: true }); onCleanup(() => mo.disconnect()); sync();
  $('#lessonToggle').addEventListener('click', () => setTimeout(sync, 0));
  $('#openInLabBtn').addEventListener('click', () => { const k = mapLesson(origText(title)); if (k) { GANITA.setMethod(k, null, true); go('lab'); } });
  }

  /* ---- load saved progress from the account ---- */
  const startBtn = $('#startBtn'); startBtn.disabled = true;
  (async () => {
    for (let i = 0; i < 50 && alive && !ctx.me; i++) await new Promise(r => setTimeout(r, 200));
    if (!alive) return;
    const vals = await Promise.all(STATE_KEYS.map(k => ctx.loadState(k)));
    if (!alive) return;
    STATE_KEYS.forEach((k, i) => { if (vals[i] != null && mem[k] == null) mem[k] = vals[i]; });
    GANITA.renderBests();
    HEIST.load();
    bus.dispatchEvent(new Event('state-loaded'));
    startBtn.disabled = false;
  })();

  return () => {
    alive = false;
    Object.keys(saveT).forEach(k => { window.clearTimeout(saveT[k]); ctx.saveState(k, mem[k]); });
    cleanups.reverse().forEach(fn => { try { fn(); } catch (e) {} });
    timers.forEach(id => window.clearTimeout(id)); timers.clear();
    intervals.forEach(id => window.clearInterval(id)); intervals.clear();
    rafs.forEach(id => window.cancelAnimationFrame(id)); rafs.clear();
    try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) {}
  };
}
