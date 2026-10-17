/* eslint-disable */
// Mirava Sentinel app logic, ported from legacy/Sentinel.html. Runs inside
// `root` via useLegacyPage; everything it starts is torn down in the returned cleanup.
import { CV } from './cv.js';
import { buildTicketPDF, buildPatrolPDF } from './pdf.js';
import { Samples } from './samples.js';
import { MONUMENTS, MATERIALS, SUBSTRATE, LEGAL, REMEDY, LEVELS } from './data.js';

/** UI-only preferences (inspector, role, sensitivity, detectors) stay in localStorage. */
const LOCAL_KEYS = new Set(['sentinelPrefs', 'sentinelDets']);
/** Tickets and the Command Centre log go to the per-user state API (metadata only). */
const REMOTE_KEYS = { sentinelTickets: 'sentinelReports', sentinelIndex: 'sentinelIndex' };
const STATE_MAX = 60000; // stay below the API's 64 KB value limit

export function init(root, ctx) {
  'use strict';
  let alive = true;
  /* ---- tracked timers / listeners so cleanup can stop everything ---- */
  const timers = new Set(), rafs = new Set(), offs = [];
  const setTimeout = (fn, ms) => { const id = window.setTimeout(() => { timers.delete(id); if (alive) fn(); }, ms); timers.add(id); return id; };
  const clearTimeout = id => { window.clearTimeout(id); timers.delete(id); };
  const requestAnimationFrame = fn => { const id = window.requestAnimationFrame(t => { rafs.delete(id); if (alive) fn(t); }); rafs.add(id); return id; };
  const listen = (target, type, fn, opts) => { target.addEventListener(type, fn, opts); offs.push(() => target.removeEventListener(type, fn, opts)); };
  let scrollLocked = false;
  const lockScroll = on => { scrollLocked = on; document.body.style.overflow = on ? 'hidden' : ''; };

  const $ = s => root.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const tick = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  /* ---- storage: localStorage for UI prefs, server state (cached in memory) for tickets & log ---- */
  const mem = {}, saveT = {};
  const clone = v => v == null ? v : JSON.parse(JSON.stringify(v));
  const store = {
    get(k, d) {
      if (LOCAL_KEYS.has(k)) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
      return k in mem ? clone(mem[k]) : d;
    },
    set(k, v) {
      if (LOCAL_KEYS.has(k)) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
      const json = JSON.stringify(v);
      if (json.length > STATE_MAX) return false;
      mem[k] = JSON.parse(json);
      clearTimeout(saveT[k]);
      saveT[k] = setTimeout(() => { delete saveT[k]; ctx.saveState(REMOTE_KEYS[k], mem[k]); }, 400);
      return true;
    }
  };
  // Full tickets (with images) generated this session, so re-opening keeps the photos in the PDF.
  const fullTickets = new Map();
  const compactTicket = t => {
    const { images, closeups, thumb, reco, substrate, legal, ...rest } = t;
    void images; void closeups; void thumb; void substrate;
    return { ...rest, reco: (reco || []).map(g => ({ type: g.type, title: g.title, sev: g.sev })), hasLegal: !!legal };
  };
  const hydrateTicket = t => {
    if (fullTickets.has(t.id)) return fullTickets.get(t.id);
    const mat = t.monument && SUBSTRATE[t.monument.mat] ? t.monument.mat : 'sandstone';
    return Object.assign({}, t, {
      images: [], closeups: [], thumb: null,
      reco: (t.reco || []).map(g => Object.assign({ actions: [], avoid: [] }, REMEDY[g.type] ? { actions: REMEDY[g.type].actions, avoid: REMEDY[g.type].avoid } : {}, g)),
      substrate: `${t.monument.materialLabel}: ${SUBSTRATE[mat]}`,
      legal: t.hasLegal ? LEGAL : ''
    });
  };

  const toast = (msg, err) => { const t = document.createElement('div'); t.className = 'toast' + (err ? ' err' : ''); t.textContent = msg; $('#toasts').appendChild(t); setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, err ? 4800 : 2800); };
  const MAXA = 960;
  const DETS = ['paint', 'carving', 'crack', 'bio', 'crust', 'salt'];
  const S = { mode: 'single', imgs: { single: null, before: null, after: null }, res: null, view: 'boxes', sel: -1, gps: null, busy: false, pdfUrl: null, lastScanMs: 0, patrol: [], loupe: false, zoom: 3, marking: false, cur: null };

  /* ---------------- monument & inspector ---------------- */
  $('#mon').innerHTML = MONUMENTS.map(m => `<option value="${m.id}">${esc(m.name)}</option>`).join('');
  const prefs = store.get('sentinelPrefs', {});
  const accName = () => { const p = ctx.me && ctx.me.profile; return p ? (p.display_name || p.username || (p.email || '').split('@')[0] || '') : ''; };
  $('#insp').value = prefs.insp || accName();
  if (prefs.role) $('#role').value = prefs.role;
  if (prefs.mon && MONUMENTS.some(m => m.id === prefs.mon)) $('#mon').value = prefs.mon;
  if (prefs.sens) { $('#sens').value = prefs.sens; }
  $('#sensV').textContent = $('#sens').value;
  function monument() {
    const m = MONUMENTS.find(x => x.id === $('#mon').value) || MONUMENTS[0];
    if (m.id !== 'custom') return { id: m.id, name: m.name, location: m.loc, mat: m.mat, materialLabel: m.matLabel };
    const mat = $('#cMat').value;
    return { id: 'custom', name: $('#cName').value.trim() || 'Unnamed monument', location: $('#cLoc').value.trim() || 'Location not given', mat, materialLabel: MATERIALS[mat] };
  }
  function syncMon() {
    const custom = $('#mon').value === 'custom';
    $('#customBox').style.display = custom ? 'block' : 'none';
    const m = monument();
    $('#matInfo').innerHTML = custom ? '' : `📍 ${esc(m.location)}<br>🪨 <b>${esc(m.materialLabel)}</b> — conservation advice is tuned to this stone.`;
    savePrefs(); if (S.res) renderReco();
  }
  function savePrefs() { store.set('sentinelPrefs', { insp: $('#insp').value.trim(), role: $('#role').value, mon: $('#mon').value, sens: $('#sens').value }); }
  ['#mon', '#cMat'].forEach(s => $(s).addEventListener('change', syncMon));
  ['#cName', '#cLoc', '#insp'].forEach(s => $(s).addEventListener('input', savePrefs));
  $('#role').addEventListener('change', savePrefs);
  syncMon();

  $('#gpsBtn').onclick = () => {
    if (!navigator.geolocation) { $('#gpsOut').textContent = 'Not supported on this device'; return; }
    $('#gpsOut').textContent = 'Locating…';
    navigator.geolocation.getCurrentPosition(p => {
      S.gps = `${p.coords.latitude.toFixed(5)}, ${p.coords.longitude.toFixed(5)} (±${Math.round(p.coords.accuracy)} m)`;
      $('#gpsOut').textContent = S.gps;
    }, e => { S.gps = null; $('#gpsOut').textContent = e.code === 1 ? 'Permission denied — optional' : 'Location unavailable — optional'; }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  };

  /* ---------------- detectors ---------------- */
  const detLabels = { paint: 'Paint graffiti', carving: 'Tool carving', crack: 'Cracks', bio: 'Moss / bio-film', crust: 'Black crust', salt: 'Salt bloom' };
  const detOn = store.get('sentinelDets', { paint: 1, carving: 1, crack: 1, bio: 1, crust: 1, salt: 1 });
  $('#dets').innerHTML = DETS.map(d => `<label class="det"><input type="checkbox" data-d="${d}" ${detOn[d] ? 'checked' : ''}><i style="background:${CV.TYPES[d].color}"></i>${detLabels[d]}</label>`).join('');
  let rescanT = 0;
  const rescan = () => { clearTimeout(rescanT); if (S.mode === 'patrol') { if (S.patrol.some(e => e.r)) rescanT = setTimeout(() => runPatrol(true), 400); return; } if (S.res) rescanT = setTimeout(() => runScan(true), 280); };
  $('#dets').addEventListener('change', e => { const d = e.target.dataset.d; if (!d) return; detOn[d] = e.target.checked ? 1 : 0; store.set('sentinelDets', detOn); rescan(); });
  $('#sens').addEventListener('input', () => { $('#sensV').textContent = $('#sens').value; savePrefs(); rescan(); });
  $('#autoAlign').addEventListener('change', rescan);

  /* ---------------- mode ---------------- */
  const MODE_NOTE = {
    single: 'Mode A finds anomalies directly in one photo: paint, tool carving, cracks, moss and bio-film, black crust and salt bloom.',
    temporal: 'Mode B compares an archival photo with today\'s. Sentinel aligns them, computes an SSIM + colour-difference heat-map, and classifies every new change.',
    patrol: 'Mode C screens a whole patrol round at once. Drop every photo you took, and Sentinel ranks them by risk, scores each one\'s health and builds a one-page patrol summary.'
  };
  function setMode(m) {
    if (S.marking) setMarking(false); if (S.loupe) setLoupe(false);
    S.mode = m; S.res = null; $('#results').classList.remove('on');
    root.querySelectorAll('#modeSeg button').forEach(b => { b.classList.toggle('on', b.dataset.mode === m); b.setAttribute('aria-selected', b.dataset.mode === m); });
    $('#modeNote').textContent = MODE_NOTE[m];
    $('#dets').style.display = m === 'temporal' ? 'none' : '';
    $('#alignRow').style.display = m === 'temporal' ? 'flex' : 'none';
    $('#patrol').classList.toggle('on', m === 'patrol');
    $('#scanBtn').innerHTML = m === 'patrol' ? '🔍 Scan all photos' : '🔍 Scan surface';
    buildDrops(); buildSamples(); updateScanBtn(); if (m === 'patrol') renderPatrol();
  }
  root.querySelectorAll('#modeSeg button').forEach(b => b.onclick = () => { if (S.mode !== b.dataset.mode) setMode(b.dataset.mode); });

  /* ---------------- uploads ---------------- */
  function dropHTML(slot, title, hint) {
    return `<div class="drop" id="drop-${slot}" data-slot="${slot}">
      ${title ? `<span class="k dtitle">${title}</span>` : ''}
      <div class="ic">${slot === 'before' ? '🗄️' : slot === 'patrol' ? '🗂️' : '📷'}</div>
      <b>${slot === 'before' ? 'Archival photo' : slot === 'after' ? 'Current photo' : slot === 'patrol' ? 'Drop all photos from your patrol round' : 'Drop a photo of the surface'}</b>
      <p>${hint}</p>
      <div class="acts">
        <label class="btn gold sm" tabindex="0">${slot === 'patrol' ? 'Choose photos' : 'Choose file'}<input type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png" hidden data-in="${slot}" ${slot === 'patrol' ? 'multiple' : ''}></label>
        <label class="btn sm" tabindex="0">📸 Camera<input type="file" accept="image/*" capture="environment" hidden data-in="${slot}"></label>
        ${slot === 'before' ? '' : `<button class="btn sm live" type="button" data-live="${slot}">🎥 Live scan</button>`}
      </div>
      <div class="prev"><canvas></canvas><div class="cap"><span></span><button type="button" data-clear="${slot}">✕ Remove</button></div></div>
    </div>`;
  }
  function buildDrops() {
    const box = $('#drops');
    if (S.mode === 'single') { box.className = 'drops'; box.innerHTML = dropHTML('single', '', 'JPG or PNG · close-up of the carving, wall or pillar · or drag &amp; drop'); }
    else if (S.mode === 'patrol') { box.className = 'drops'; box.innerHTML = dropHTML('patrol', '', `Up to ${PMAX} JPG or PNG photos · select many at once or drag &amp; drop a batch`); }
    else { box.className = 'drops two'; box.innerHTML = dropHTML('before', 'A · Before', 'Earlier photo from the archive or a past inspection') + dropHTML('after', 'B · After', 'Today\'s photo, from roughly the same angle'); }
    box.querySelectorAll('.drop').forEach(d => {
      const slot = d.dataset.slot;
      d.addEventListener('dragover', e => { e.preventDefault(); d.classList.add('over'); });
      d.addEventListener('dragleave', () => d.classList.remove('over'));
      d.addEventListener('drop', e => { e.preventDefault(); d.classList.remove('over'); const fs = e.dataTransfer.files; if (!fs || !fs.length) return; if (slot === 'patrol') addPatrolFiles([...fs]); else loadFile(fs[0], slot); });
      d.querySelectorAll('label.btn').forEach(l => l.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); l.querySelector('input').click(); } }));
    });
    box.querySelectorAll('[data-in]').forEach(inp => inp.addEventListener('change', () => { const fs = inp.files ? [...inp.files] : []; if (fs.length) { if (inp.dataset.in === 'patrol') addPatrolFiles(fs); else loadFile(fs[0], inp.dataset.in); } inp.value = ''; }));
    box.querySelectorAll('[data-live]').forEach(b => b.onclick = () => openLive(b.dataset.live));
    box.querySelectorAll('[data-clear]').forEach(b => b.onclick = () => { S.imgs[b.dataset.clear] = null; S.res = null; $('#results').classList.remove('on'); paintDrop(b.dataset.clear); updateScanBtn(); });
    ['single', 'before', 'after'].forEach(paintDrop);
  }
  function paintDrop(slot) {
    const d = $('#drop-' + slot); if (!d) return; const im = S.imgs[slot];
    d.classList.toggle('has', !!im);
    if (!im) return;
    const c = d.querySelector('.prev canvas'); c.width = im.frame.w; c.height = im.frame.h; c.getContext('2d').drawImage(im.frame.canvas, 0, 0);
    d.querySelector('.cap span').textContent = `${im.name} · ${im.ow}×${im.oh}`;
  }
  function toFrame(src, ow, oh) {
    const s = Math.min(1, MAXA / Math.max(ow, oh)), w = Math.max(16, Math.round(ow * s)), h = Math.max(16, Math.round(oh * s));
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d', { willReadFrequently: true });
    x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.imageSmoothingQuality = 'high'; x.drawImage(src, 0, 0, w, h);
    return { w, h, data: x.getImageData(0, 0, w, h).data, canvas: c };
  }
  function readImage(file) {
    return new Promise((resolve, reject) => {
      if (!/^image\/(jpeg|png|webp|jpg)$/i.test(file.type) && !/\.(jpe?g|png|webp)$/i.test(file.name)) return reject(new Error(`${file.name}: please use a JPG or PNG photo.`));
      if (file.size > 40 * 1024 * 1024) return reject(new Error(`${file.name} is over 40 MB. Please use a smaller photo.`));
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        try {
          const ow = img.naturalWidth, oh = img.naturalHeight;
          if (ow < 64 || oh < 64) return reject(new Error(`${file.name} is too small to inspect (min 64 px).`));
          resolve({ name: file.name, ow, oh, frame: toFrame(img, ow, oh), src: img });
        } catch (e) { reject(new Error(`Could not read ${file.name}. Try another JPG or PNG.`)); }
        finally { URL.revokeObjectURL(url); }
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`${file.name} could not be opened as an image. Use JPG or PNG.`)); };
      img.src = url;
    });
  }
  function loadFile(file, slot) {
    readImage(file).then(im => { setImage(slot, im); if (Math.max(im.ow, im.oh) < 400) toast('Low-resolution photo: small cracks may be missed.'); }).catch(e => toast(e.message, true));
  }
  function setImage(slot, im) {
    if (slot === 'patrol') { addPatrolImages([im]); return; }
    if (S.marking) setMarking(false);
    S.imgs[slot] = im; S.res = null; $('#results').classList.remove('on'); paintDrop(slot); updateScanBtn();
    if (S.mode === 'single' && slot === 'single') runScan();
    else if (S.mode === 'temporal' && S.imgs.before && S.imgs.after) runScan();
  }
  function ready() { return S.mode === 'single' ? !!S.imgs.single : S.mode === 'patrol' ? S.patrol.length > 0 : !!(S.imgs.before && S.imgs.after); }
  function updateScanBtn() {
    $('#scanBtn').disabled = !ready() || S.busy;
    if (S.mode === 'patrol') { const n = S.patrol.length, done = S.patrol.filter(e => e.r).length; $('#scanHint').textContent = n ? `${n} photo${n === 1 ? '' : 's'} queued${done ? ` · ${done} scanned` : ''}. Scanning starts automatically.` : `Add up to ${PMAX} photos from one patrol round.`; return; }
    $('#scanHint').textContent = ready() ? (S.res ? `Last scan took ${(S.lastScanMs / 1000).toFixed(2)} s. Change a setting to rescan.` : 'Ready. Scanning starts automatically.') : S.mode === 'single' ? 'Add a JPG or PNG photo to begin.' : `Add ${!S.imgs.before && !S.imgs.after ? 'both photos' : !S.imgs.before ? 'the archival photo' : 'the current photo'} to compare.`;
  }
  $('#scanBtn').onclick = () => S.mode === 'patrol' ? runPatrol() : runScan();

  /* ---------------- samples ---------------- */
  const sampleCache = {};
  function thumb(c) { const t = document.createElement('canvas'); t.width = 88; t.height = 66; t.getContext('2d').drawImage(c, 0, 0, 88, 66); return t; }
  function buildSamples() {
    const box = $('#samples'); box.querySelectorAll('.sample').forEach(b => b.remove());
    const items = S.mode === 'single' ? Samples.DEFS.map(d => ({ id: d.id, label: d.label, sub: d.sub, mon: d.mon })) : S.mode === 'patrol' ? [{ id: 'patrol', label: 'Demo patrol round', sub: `${Samples.DEFS.length + 1} photos · ${Samples.DEFS.length + 1} sites`, mon: Samples.DEFS[0].mon }] : [{ id: 'pair', label: 'Red Fort panel', sub: 'archive vs today', mon: 'redfort' }];
    items.forEach(it => {
      const b = document.createElement('button'); b.className = 'sample'; b.type = 'button';
      b.innerHTML = `<span class="th"></span><span>${esc(it.label)}<small>${esc(it.sub)}</small></span>`;
      b.onclick = () => useSample(it);
      box.appendChild(b);
      setTimeout(() => { try { const c = it.id === 'pair' ? getPair().after : it.id === 'patrol' ? getSample(Samples.DEFS[0].id) : getSample(it.id); b.querySelector('.th').replaceWith(thumb(c)); } catch (e) {} }, 30);
    });
  }
  function getSample(id) { if (!sampleCache[id]) sampleCache[id] = Samples.DEFS.find(d => d.id === id).make(); return sampleCache[id]; }
  function getPair() { if (!sampleCache.pair) sampleCache.pair = Samples.pair(); return sampleCache.pair; }
  function useSample(it) {
    if (it.id === 'patrol') {
      const ims = Samples.DEFS.map(d => { const c = getSample(d.id); return { name: `${d.id}-patrol.jpg`, ow: c.width, oh: c.height, frame: toFrame(c, c.width, c.height), sample: true, mon: d.mon }; });
      const p = getPair(); ims.push({ name: 'red-fort-panel-patrol.jpg', ow: p.after.width, oh: p.after.height, frame: toFrame(p.after, p.after.width, p.after.height), sample: true, mon: 'redfort' });
      addPatrolImages(ims); return;
    }
    $('#mon').value = it.mon; syncMon();
    if (it.id === 'pair') {
      const p = getPair();
      S.imgs.before = { name: 'red-fort-panel-2019-archive.jpg', ow: p.before.width, oh: p.before.height, frame: toFrame(p.before, p.before.width, p.before.height), sample: true };
      paintDrop('before');
      setImage('after', { name: 'red-fort-panel-today.jpg', ow: p.after.width, oh: p.after.height, frame: toFrame(p.after, p.after.width, p.after.height), sample: true });
    } else {
      const c = getSample(it.id);
      setImage('single', { name: `${it.id}-sample.jpg`, ow: c.width, oh: c.height, frame: toFrame(c, c.width, c.height), sample: true });
    }
  }

  /* ---------------- scan pipeline ---------------- */
  const STEPS = {
    single: ['Normalising colour to CIELAB & estimating the stone baseline', 'Segmenting paint, bio-growth, crust & salt anomalies', 'Black-hat / top-hat morphology for cracks & tool marks', 'Grouping, measuring & grading severity'],
    temporal: ['Detecting corner features & rotation-aware descriptors', 'Matching features & solving alignment (RANSAC)', 'Warping archive into today\'s frame, photometric normalisation', 'Windowed SSIM + ΔE colour difference → heat-map', 'Classifying new changes & grading severity']
  };
  async function runScan(quiet) {
    if (!ready() || S.busy) return;
    S.busy = true; updateScanBtn();
    const steps = STEPS[S.mode], list = $('#progList'), bar = $('#progBar');
    list.innerHTML = steps.map(s => `<li><i></i><span>${esc(s)}</span><em></em></li>`).join('');
    $('#prog').classList.add('on'); bar.style.width = '0%';
    const lis = [...list.children]; let si = 0, t0 = performance.now(), tStep = t0;
    const step = async () => { if (si > 0) { lis[si - 1].className = 'done'; lis[si - 1].querySelector('em').textContent = ((performance.now() - tStep) / 1000).toFixed(2) + ' s'; } tStep = performance.now(); if (si < lis.length) lis[si].className = 'run'; bar.style.width = (si / lis.length * 100) + '%'; si++; await tick(); if (!quiet) await sleep(110); };
    try {
      const P = { sens: +$('#sens').value, det: Object.assign({}, detOn), align: $('#autoAlign').checked };
      let res;
      if (S.mode === 'single') {
        await step(); await step(); await step();
        res = CV.scanSingle(S.imgs.single.frame, P);
        await step();
      } else {
        await step(); await step();
        res = CV.scanTemporal(S.imgs.after.frame, S.imgs.before.frame, P);
        await step(); await step(); await step();
        if (res.error) throw new Error(res.error);
      }
      await step();
      bar.style.width = '100%';
      S.lastScanMs = performance.now() - t0;
      res.src = S.mode === 'single' ? S.imgs.single : S.imgs.after;
      if (S.res && quiet) { // keep user's dismissals when re-scanning with new settings
        const off = S.res.findings.filter(f => !f.include);
        res.findings.forEach(f => { if (off.some(o => o.type === f.type && iou(o.box, f.box) > 0.4)) f.include = false; });
        S.res.findings.filter(f => f.manual).forEach(f => { f.no = res.findings.length + 1; res.findings.push(f); });
      }
      if (!quiet || !S.inspStart) S.inspStart = new Date().toISOString();
      S.res = res; S.sel = -1; S.view = S.mode === 'single' ? 'boxes' : 'heat';
      renderResults();
      setTimeout(() => $('#prog').classList.remove('on'), quiet ? 200 : 900);
      if (!quiet) { $('#results').scrollIntoView({ behavior: 'smooth', block: 'start' }); const L = level(); toast(L.level ? `Scan complete: ${res.findings.length} finding${res.findings.length === 1 ? '' : 's'}, Level ${L.level} (${LEVELS[L.level].name})` : 'Scan complete: no significant anomaly found'); }
      if (S.mode === 'temporal' && res.align && !res.align.ok && !res.align.skipped) toast('Could not auto-align these photos, so they were compared as-is. Use photos taken from a similar angle.', true);
    } catch (e) {
      console.warn(e); $('#prog').classList.remove('on'); toast(e && e.message && e.message.length < 160 ? e.message : 'The scan failed on this image. Try another photo.', true);
    } finally { S.busy = false; updateScanBtn(); }
  }
  function iou(a, b) { const x0 = Math.max(a[0], b[0]), y0 = Math.max(a[1], b[1]), x1 = Math.min(a[2], b[2]), y1 = Math.min(a[3], b[3]); const i = Math.max(0, x1 - x0) * Math.max(0, y1 - y0); const u = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - i; return u > 0 ? i / u : 0; }

  /* ---------------- triage ---------------- */
  function included(r) { r = r || S.res; return r ? r.findings.filter(f => f.include) : []; }
  function level(r) {
    r = r || S.res; const inc = included(r);
    if (!inc.length) return { level: 0, primary: null, area: 0 };
    const top = inc.slice().sort((a, b) => b.sev - a.sev || b.areaPx - a.areaPx)[0];
    let areaPx = 0; const lidsByLayer = {};
    inc.forEach(f => { if (f.manual) return; const ln = r.mode === 'single' ? f.type : 'change'; (lidsByLayer[ln] = lidsByLayer[ln] || new Set()).add(f.lid); });
    const seen = new Uint8Array(r.n);
    Object.keys(lidsByLayer).forEach(ln => { const L = r.layers[ln]; if (!L) return; const set = lidsByLayer[ln]; for (let i = 0; i < r.n; i++) if (L.raw[i] && !seen[i] && set.has(L.lab[i])) { seen[i] = 1; areaPx++; } });
    inc.forEach(f => { if (!f.manual) return; const [x0, y0, x1, y1] = f.box; for (let y = Math.max(0, y0); y < Math.min(r.h, y1); y++) for (let x = Math.max(0, x0), i = y * r.w + x; x < Math.min(r.w, x1); x++, i++) if (!seen[i]) { seen[i] = 1; areaPx++; } });
    const denom = r.mode === 'temporal' ? r.n * r.overlapPct / 100 : r.n;
    return { level: top.sev, primary: top, area: areaPx / denom * 100 };
  }
  /* Monument Health Index: 100 minus a weighted penalty per included finding (severity × extent) */
  const BANDS = [[85, 'Good', '#2f9e5e'], [65, 'Fair', '#b07a06'], [40, 'Poor', '#d4561f'], [0, 'Critical', '#c8361f']];
  const bandOf = v => BANDS.find(b => v >= b[0]);
  // the index is kept consistent with the severity level: Level 3 can never read better than "Poor", Level 2 stays within Poor–Fair, etc.
  const MHI_RANGE = { 0: [85, 100], 1: [65, 95], 2: [40, 84], 3: [0, 64] };
  function mhiFrom(list) { let p = 0, lv = 0; list.forEach(f => { lv = Math.max(lv, f.sev); p += ({ 1: 6, 2: 14, 3: 28 })[f.sev] * (0.6 + 0.4 * Math.min(1, (f.areaPct || 0) / 5)); }); const R = MHI_RANGE[lv], v = Math.max(R[0], Math.min(R[1], Math.round(100 - p))); const b = bandOf(v); return { v, band: b[1], color: b[2] }; }
  function mhi(r) { return mhiFrom(included(r)); }
  function gaugeSVG(v, color, size) {
    size = size || 104; const R = 42, C = 2 * Math.PI * R, arc = C * 0.75, val = arc * v / 100;
    return `<svg class="gauge" viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="Monument Health Index ${v} out of 100"><circle cx="50" cy="50" r="${R}" fill="none" stroke="#eadfce" stroke-width="9" stroke-linecap="round" stroke-dasharray="${arc} ${C}" transform="rotate(135 50 50)"/><circle cx="50" cy="50" r="${R}" fill="none" stroke="${color}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${val} ${C}" transform="rotate(135 50 50)" class="gv"/><text x="50" y="52" text-anchor="middle" font-family="Playfair Display,Georgia,serif" font-weight="700" font-size="26" fill="#24151a">${v}</text><text x="50" y="68" text-anchor="middle" font-family="DM Mono,monospace" font-size="8" letter-spacing="1.5" fill="#6f5d5f">MHI / 100</text></svg>`;
  }
  const fmtA = a => a === 0 ? '0%' : a < 0.1 ? a.toFixed(2) + '%' : a < 10 ? a.toFixed(1) + '%' : Math.round(a) + '%';
  function levelDesc(L) {
    if (L.level !== 3) return LEVELS[L.level].desc;
    const t = L.primary.type; return ['paint', 'carving'].includes(t) ? 'Physical defacement' : ['crack', 'loss'].includes(t) ? 'Structural threat' : 'Severe active deterioration';
  }

  /* ---------------- rendering ---------------- */
  function hexA(hex, a) { const h = hex.replace('#', ''); return `rgba(${parseInt(h.substr(0, 2), 16)},${parseInt(h.substr(2, 2), 16)},${parseInt(h.substr(4, 2), 16)},${a})`; }
  function drawMask(ctx, r, alpha) {
    const img = ctx.getImageData(0, 0, r.w, r.h), d = img.data;
    const inc = included(r);
    const layerNames = r.mode === 'single' ? DETS : ['change'];
    layerNames.forEach(ln => {
      const L = r.layers[ln]; if (!L) return;
      const map = new Map(); inc.forEach(f => { if ((r.mode === 'single' ? f.type : 'change') === ln) map.set(f.lid, f.color); });
      if (!map.size) return;
      const rgb = {}; map.forEach((c, k) => { const h = c.replace('#', ''); rgb[k] = [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; });
      for (let i = 0; i < r.n; i++) { if (!L.raw[i]) continue; const c = rgb[L.lab[i]]; if (!c) continue; const p = i * 4; d[p] = d[p] * (1 - alpha) + c[0] * alpha; d[p + 1] = d[p + 1] * (1 - alpha) + c[1] * alpha; d[p + 2] = d[p + 2] * (1 - alpha) + c[2] * alpha; }
    });
    inc.forEach(f => { // inspector-marked regions: hatched fill
      if (!f.manual) return; const h = f.color.replace('#', ''), c = [0, 2, 4].map(k => parseInt(h.substr(k, 2), 16)), a = alpha * 0.8;
      const [x0, y0, x1, y1] = f.box;
      for (let y = Math.max(0, y0); y < Math.min(r.h, y1); y++) for (let x = Math.max(0, x0); x < Math.min(r.w, x1); x++) { if (((x + y) >> 2) % 3) continue; const p = (y * r.w + x) * 4; d[p] = d[p] * (1 - a) + c[0] * a; d[p + 1] = d[p + 1] * (1 - a) + c[1] * a; d[p + 2] = d[p + 2] * (1 - a) + c[2] * a; }
    });
    ctx.putImageData(img, 0, 0);
  }
  const INF = [[0, 0, 4], [87, 16, 110], [188, 55, 84], [249, 142, 9], [252, 255, 164]];
  function cmap(t) { t = Math.max(0, Math.min(1, t)) * 4; const i = Math.min(3, t | 0), f = t - i, a = INF[i], b = INF[i + 1]; return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]; }
  function drawHeat(ctx, r) {
    const img = ctx.getImageData(0, 0, r.w, r.h), d = img.data, T = r.T;
    for (let i = 0; i < r.n; i++) {
      const p = i * 4; d[p] *= 0.55; d[p + 1] *= 0.55; d[p + 2] *= 0.55;
      if (!r.valid[i]) continue; const v = r.D[i]; if (v < 0.12) continue;
      const a = Math.min(0.85, (v - 0.12) / Math.max(0.1, T - 0.12) * 0.6), c = cmap(v / Math.max(T * 1.25, 0.3));
      d[p] = d[p] * (1 - a) + c[0] * a; d[p + 1] = d[p + 1] * (1 - a) + c[1] * a; d[p + 2] = d[p + 2] * (1 - a) + c[2] * a;
    }
    ctx.putImageData(img, 0, 0);
  }
  function drawBoxes(ctx, r, sel, k) {
    k = k || 1; const lw = Math.max(2, r.w / 300) * k, fs = Math.max(12, Math.round(r.w / 56)) * k;
    ctx.font = `800 ${fs}px Manrope, Arial, sans-serif`; ctx.textBaseline = 'top';
    r.findings.forEach((f, i) => {
      if (!f.include) return;
      const pad = lw * 2, [x0, y0, x1, y1] = f.box, x = x0 - pad, y = y0 - pad, w = x1 - x0 + pad * 2, h = y1 - y0 + pad * 2;
      const on = sel === i;
      ctx.lineWidth = on ? lw * 2 : lw; ctx.strokeStyle = f.color; ctx.shadowColor = 'rgba(0,0,0,.65)'; ctx.shadowBlur = on ? 10 : 4;
      ctx.setLineDash(f.sev === 3 ? [] : [lw * 4, lw * 2.5]); ctx.strokeRect(x, y, w, h); ctx.setLineDash([]); ctx.shadowBlur = 0;
      const tag = `#${f.no} ${f.short} · L${f.sev}${f.manual ? ' · marked' : ''}`, tw = ctx.measureText(tag).width + fs * 0.8, th = fs * 1.45;
      let ty = y - th - 2; if (ty < 0) ty = y + 2; let tx = Math.min(Math.max(0, x), r.w - tw);
      ctx.fillStyle = f.color; ctx.fillRect(tx, ty, tw, th);
      ctx.fillStyle = ['#ffffff', '#ffd23f', '#5ad8ff', '#4cd964'].includes(f.color) ? '#1a0d10' : '#ffffff';
      ctx.fillText(tag, tx + fs * 0.4, ty + fs * 0.22);
    });
  }
  function canvasFor(kind) {
    const r = S.res, c = document.createElement('canvas'); c.width = r.w; c.height = r.h; const x = c.getContext('2d');
    if (kind === 'orig') { x.drawImage(r.src.frame.canvas, 0, 0); }
    else if (kind === 'before') { x.putImageData(new ImageData(new Uint8ClampedArray(r.warped), r.w, r.h), 0, 0); }
    else if (kind === 'heat') { x.drawImage(r.src.frame.canvas, 0, 0); drawHeat(x, r); drawBoxes(x, r, -1); }
    else { x.drawImage(r.src.frame.canvas, 0, 0); if (kind === 'mask' || kind === 'both') drawMask(x, r, kind === 'mask' ? 0.75 : 0.45); if (kind !== 'mask') drawBoxes(x, r, kind === 'boxes' || kind === 'both' ? S.sel : -1); }
    return c;
  }
  function blit(id, src) { const c = $(id); c.width = src.width; c.height = src.height; c.getContext('2d').drawImage(src, 0, 0); }
  function renderViewer() {
    const r = S.res, views = r.mode === 'single' ? [['boxes', 'Boxes'], ['mask', 'Mask'], ['both', 'Both']] : [['heat', 'Heat-map'], ['boxes', 'Boxes'], ['swipe', 'Swipe']];
    $('#viewSeg').innerHTML = views.map(([k, n]) => `<button class="${S.view === k ? 'on' : ''}" data-v="${k}">${n}</button>`).join('');
    $('#viewSeg').querySelectorAll('button').forEach(b => b.onclick = () => { S.view = b.dataset.v; renderViewer(); });
    const swipe = S.view === 'swipe';
    $('#panes').style.display = swipe ? 'none' : ''; $('#swipe').classList.toggle('on', swipe);
    if (r.mode === 'single') {
      $('#lblL').textContent = 'Original'; $('#lblR').textContent = S.view === 'mask' ? 'Anomaly mask' : 'Annotated';
      blit('#cvL', canvasFor('orig')); blit('#cvR', canvasFor(S.view));
      $('#vMeta').textContent = `${r.w}×${r.h} analysed · ${(S.lastScanMs / 1000).toFixed(2)} s`;
    } else {
      const a = r.align;
      $('#vMeta').textContent = a.ok ? `aligned · ${a.inliers}/${a.matches} matches · rot ${a.rot.toFixed(1)}° · scale ${(1 / a.scale).toFixed(2)}× · SSIM ${r.ssim.toFixed(3)}` : `${a.skipped ? 'alignment off' : 'not aligned'} · SSIM ${r.ssim.toFixed(3)}`;
      if (swipe) {
        // bottom = current (annotated); top layer clipped from the left = archive
        blit('#swB', canvasFor('boxes')); blit('#swA', canvasFor('before'));
        const sb = $('#swB'), sa = $('#swA');
        const size = () => { sa.style.width = sb.clientWidth + 'px'; sa.style.height = sb.clientHeight + 'px'; };
        requestAnimationFrame(size); listen(window, 'resize', size, { once: true });
        const upd = () => { const v = +$('#swR').value; $('#swTop').style.width = v + '%'; $('#swH').style.left = v + '%'; };
        $('#swR').oninput = upd; upd();
      } else {
        $('#lblL').textContent = 'Archive · auto-aligned'; $('#lblR').textContent = S.view === 'heat' ? 'Current · change heat-map' : 'Current · annotated';
        blit('#cvL', canvasFor('before')); blit('#cvR', canvasFor(S.view === 'heat' ? 'heat' : 'boxes'));
      }
    }
  }
  function trendFor(monId, cur) {
    const prev = idxLoad().filter(e => e.mon && e.mon.id === monId && e.mhi != null && e.src !== 'demo' && (!S.inspStart || e.ts < S.inspStart)).sort((a, b) => b.ts.localeCompare(a.ts))[0];
    if (!prev) return null;
    const d = cur - prev.mhi, when = new Date(prev.ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    return { prev: prev.mhi, d, when, text: `${prev.mhi} → ${cur} (${d === 0 ? 'no change' : (d > 0 ? '▲ ' : '▼ ') + Math.abs(d)}) since ${when}` };
  }
  function renderTriage() {
    const L = level(), r = S.res, lv = LEVELS[L.level], H = mhi(), m = monument();
    const tr = trendFor(monKey(m), H.v);
    $('#triage').className = 'triage l' + L.level;
    const extra = r.mode === 'temporal' ? `<div><small>Structural similarity</small><b>${r.ssim.toFixed(3)}</b></div><div><small>Overlap compared</small><b>${fmtA(r.overlapPct)}</b></div>` : '';
    const man = included().filter(f => f.manual).length;
    $('#triage').innerHTML = `<div class="thead"><div><span class="lvl l${L.level}">${L.level ? `Severity · Level ${L.level}` : 'All clear'} — ${lv.name}</span>
      <h2>${esc(levelDesc(L))}</h2></div><div class="gwrap" title="Monument Health Index: 100 minus weighted penalties for each finding's severity and extent">${gaugeSVG(H.v, H.color)}<span class="band" style="background:${H.color}">${H.band}</span></div></div>
      <p>${L.level ? `Primary defect: <b>${esc(L.primary.name)}</b> (${esc(L.primary.pos)}). ${L.level === 3 ? 'Raise an incident ticket and alert the site in-charge now.' : L.level === 2 ? 'Schedule conservation and keep monitoring this spot.' : 'Log it and re-check on the next routine visit.'}` : 'Nothing crossed the detection thresholds. If you can see damage, photograph it closer and in even daylight, or raise the sensitivity.'}</p>
      <div class="tm"><div><small>Affected surface</small><b>${fmtA(L.area)}</b></div><div><small>Response window</small><b>${esc(lv.resp)}</b></div><div><small>Findings included</small><b>${included().length} of ${r.findings.length}${man ? ` <em class="mk">${man} marked</em>` : ''}</b></div><div><small>Material</small><b>${esc(m.materialLabel)}</b></div>${extra}<div class="wide"><small>Health trend at this site</small><b class="${tr ? (tr.d < 0 ? 'dn' : tr.d > 0 ? 'up' : '') : ''}">${tr ? esc(tr.text) : 'First assessment logged here'}</b></div></div>`;
  }
  /* close-up crop of a finding, with its box outlined */
  function cropOf(r, f, size) {
    const [x0, y0, x1, y1] = f.box, bw = x1 - x0, bh = y1 - y0, pad = Math.max(14, Math.max(bw, bh) * 0.35);
    let cx0 = Math.max(0, x0 - pad), cy0 = Math.max(0, y0 - pad), cx1 = Math.min(r.w, x1 + pad), cy1 = Math.min(r.h, y1 + pad);
    // keep crops roughly 4:3 so they tile neatly
    const want = 4 / 3; let cw = cx1 - cx0, ch = cy1 - cy0;
    if (cw / ch < want) { const ex = (ch * want - cw) / 2; cx0 = Math.max(0, cx0 - ex); cx1 = Math.min(r.w, cx1 + ex); } else { const ey = (cw / want - ch) / 2; cy0 = Math.max(0, cy0 - ey); cy1 = Math.min(r.h, cy1 + ey); }
    cw = cx1 - cx0; ch = cy1 - cy0;
    const s = size / Math.max(cw, ch), W = Math.max(8, Math.round(cw * s)), Hh = Math.max(8, Math.round(ch * s));
    const c = document.createElement('canvas'); c.width = W; c.height = Hh; const x = c.getContext('2d');
    x.imageSmoothingQuality = 'high'; x.drawImage(r.src.frame.canvas, cx0, cy0, cw, ch, 0, 0, W, Hh);
    x.lineWidth = Math.max(2, size / 90); x.strokeStyle = 'rgba(0,0,0,.55)'; x.strokeRect((x0 - cx0) * s - 1, (y0 - cy0) * s - 1, bw * s + 2, bh * s + 2);
    x.strokeStyle = f.color; x.strokeRect((x0 - cx0) * s, (y0 - cy0) * s, bw * s, bh * s);
    return c;
  }
  function thumbOf(f) { if (!f._th || f._thSrc !== S.res.src) { f._th = cropOf(S.res, f, 120).toDataURL('image/jpeg', 0.8); f._thSrc = S.res.src; } return f._th; }
  function renderFindings() {
    const r = S.res, fl = $('#flist');
    $('#fCount').textContent = r.findings.length ? 'Click to highlight · untick false alarms' : '';
    if (!r.findings.length) { fl.innerHTML = `<div class="empty">✅ No anomalies detected at sensitivity ${$('#sens').value}/10.</div>`; return; }
    fl.innerHTML = r.findings.map((f, i) => `<div class="fi ${f.include ? '' : 'off'} ${S.sel === i ? 'sel' : ''}" data-i="${i}">
      <span class="crop" style="border-color:${f.color}"><img src="${thumbOf(f)}" alt="Close-up of finding ${f.no}" loading="lazy"></span>
      <div><b>#${f.no} ${esc(f.name)}${f.manual ? ' <em class="mk">✎ marked</em>' : ''}</b><small>${esc(f.pos)} · ${esc(f.detail)}${f.manual ? '' : ' · signal ' + f.signal}</small></div>
      <div class="tg"><span class="badge s${f.sev}">${['', 'LOW', 'MEDIUM', 'CRITICAL'][f.sev]}</span>${f.manual ? `<button class="del" type="button" data-del="${i}" aria-label="Delete marked finding ${f.no}" title="Delete this mark">✕</button>` : `<input type="checkbox" ${f.include ? 'checked' : ''} aria-label="Include finding ${f.no} in ticket" data-t="${i}">`}</div></div>`).join('');
    fl.querySelectorAll('.fi').forEach(el => el.addEventListener('click', e => {
      const i = +el.dataset.i;
      if (e.target.matches('[data-del]')) { r.findings.splice(i, 1); r.findings.forEach((f, k) => f.no = k + 1); S.sel = -1; renderResults(true); toast('Mark removed'); return; }
      if (e.target.matches('input')) { r.findings[i].include = e.target.checked; renderResults(true); return; }
      S.sel = S.sel === i ? -1 : i; if (S.view === 'mask' || S.view === 'swipe') S.view = r.mode === 'single' ? 'boxes' : 'boxes'; renderViewer(); renderFindings();
    }));
  }
  function recoGroups() {
    const inc = included(), seen = new Map();
    inc.slice().sort((a, b) => b.sev - a.sev).forEach(f => { if (!seen.has(f.type)) seen.set(f.type, { type: f.type, sev: f.sev, title: (f.type === 'crack' ? 'Cracks' : CV.TYPES[f.type].name) + ` (${inc.filter(x => x.type === f.type).length} found)` }); });
    return [...seen.values()].map(g => Object.assign(g, REMEDY[g.type]));
  }
  function renderReco() {
    const r = S.res; if (!r) return; const G = recoGroups(), m = monument();
    const defaced = G.some(g => g.type === 'paint' || g.type === 'carving');
    $('#reco').innerHTML = `<h3>Recommended heritage-safe conservation action</h3><div class="sub">Tuned for ${esc(m.materialLabel)} at ${esc(m.name)}. Based on traditional, reversible conservation practice.</div>
      ${G.length ? G.map(g => `<div class="rg"><h4><span class="badge s${g.sev}">L${g.sev}</span>${esc(g.title)}</h4><ol>${g.actions.map(a => `<li>${esc(a)}</li>`).join('')}</ol><div class="avoid"><b>Avoid:</b> ${esc(g.avoid.join('; '))}.</div></div>`).join('') : '<p class="sub">No action needed beyond routine monitoring.</p>'}
      <div class="subnote">🪨 <b>Substrate note — ${esc(m.materialLabel)}:</b> ${esc(SUBSTRATE[m.mat])}</div>
      ${defaced ? `<p class="legal">⚖️ ${esc(LEGAL)}</p>` : ''}`;
  }
  function renderResults(keepView) {
    $('#results').classList.add('on');
    if (!keepView) S.sel = -1;
    renderViewer(); renderTriage(); renderFindings(); renderReco(); updateScanBtn();
  }

  /* ---------------- ticket ---------------- */
  function ticketId() { const d = new Date(), p = v => String(v).padStart(2, '0'); const a = new Uint8Array(3); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach((_, i) => a[i] = Math.random() * 256); return `MHT-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${[...a].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase()}`; }
  function jpeg(c, maxW, q) { const s = Math.min(1, maxW / c.width), o = document.createElement('canvas'); o.width = Math.round(c.width * s); o.height = Math.round(c.height * s); const x = o.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, o.width, o.height); x.drawImage(c, 0, 0, o.width, o.height); return { dataURL: o.toDataURL('image/jpeg', q || 0.86), w: o.width, h: o.height }; }
  function collectTicket() {
    const r = S.res, L = level(), m = monument(), now = new Date();
    const imgs = r.mode === 'single'
      ? [Object.assign(jpeg(canvasFor('both'), 1100), { label: 'ANNOTATED — flagged anomalies' }), Object.assign(jpeg(canvasFor('orig'), 700), { label: 'ORIGINAL PHOTO' })]
      : [Object.assign(jpeg(canvasFor('before'), 760), { label: 'A · ARCHIVE (ALIGNED)' }), Object.assign(jpeg(canvasFor('boxes'), 760), { label: 'B · CURRENT — NEW CHANGES' }), Object.assign(jpeg(canvasFor('heat'), 760), { label: 'SSIM + dE CHANGE HEAT-MAP' })];
    const a = r.align, H = mhi(), inc = included(), types = {};
    inc.forEach(f => { types[f.type] = (types[f.type] || 0) + 1; });
    const tr = trendFor(monKey(m), H.v);
    const closeups = inc.slice().sort((x, y) => y.sev - x.sev || x.no - y.no).slice(0, 12).sort((x, y) => x.no - y.no).map(f => Object.assign(jpeg(cropOf(r, f, 300), 300, 0.85), { label: `#${f.no} ${f.short} · L${f.sev}${f.manual ? ' · marked' : ''}`, color: f.color }));
    return {
      id: ticketId(), ts: now.toISOString(),
      mhi: H.v, mhiBand: H.band, mhiColor: H.color, trend: tr ? tr.text : '', notes: $('#notes').value.trim(), closeups, types, ptype: L.primary ? L.primary.type : null, manualCount: inc.filter(f => f.manual).length,
      tsText: now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) + ' IST',
      mode: r.mode, monument: m, gps: S.gps, inspector: $('#insp').value.trim(), role: $('#role').value,
      imageInfo: r.mode === 'single' ? `${S.imgs.single.name} (${S.imgs.single.ow}x${S.imgs.single.oh})` : `${S.imgs.before.name} vs ${S.imgs.after.name}`,
      level: L.level, levelName: LEVELS[L.level].name, levelDesc: levelDesc(L), primary: L.primary ? L.primary.name : 'None', areaText: fmtA(L.area), response: LEVELS[L.level].resp,
      findings: inc.map(f => ({ no: f.no, name: f.name, sev: f.sev, areaText: fmtA(f.areaPct), areaPct: f.areaPct, pos: f.pos, detail: f.detail, signal: f.signal, manual: !!f.manual })),
      reco: recoGroups().map(g => ({ type: g.type, title: g.title, sev: g.sev, actions: g.actions, avoid: g.avoid })),
      substrate: `${m.materialLabel}: ${SUBSTRATE[m.mat]}`,
      legal: recoGroups().some(g => g.type === 'paint' || g.type === 'carving') ? LEGAL : '',
      metrics: r.mode === 'temporal' ? `Alignment: ${a.ok ? `${a.inliers} of ${a.matches} feature matches, rotation ${a.rot.toFixed(1)} deg, scale ${(1 / a.scale).toFixed(2)}x` : 'not applied (photos compared as-is)'} · Mean SSIM ${r.ssim.toFixed(3)} · Changed area ${fmtA(r.changedPct)} of ${fmtA(r.overlapPct)} overlap · Sensitivity ${$('#sens').value}/10` : `Analysed at ${r.w}x${r.h} px · Sensitivity ${$('#sens').value}/10 · Scan time ${(S.lastScanMs / 1000).toFixed(2)} s`,
      images: imgs, thumb: jpeg(canvasFor(r.mode === 'single' ? 'boxes' : 'heat'), 160, 0.7).dataURL
    };
  }
  const safeName = s => String(s).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
  function ticketText(t) {
    return [`Monument Health Ticket ${t.id}`, `${t.monument.name} — ${t.monument.location}`, `Severity: Level ${t.level} ${t.levelName} (${t.levelDesc})`, t.mhi != null ? `Health Index: ${t.mhi}/100 (${t.mhiBand})${t.trend ? ' · trend ' + t.trend : ''}` : '', `Primary defect: ${t.primary} · Affected area ${t.areaText} · ${t.findings.length} finding(s)`, `Response: ${t.response}`, t.gps ? `GPS: ${t.gps}` : '', t.notes ? `Notes: ${t.notes}` : '', `Inspector: ${t.inspector || 'not given'} (${t.role}) · ${t.tsText}`].filter(Boolean).join('\n');
  }
  function showPdf(blob, fn, title, sub, text) {
    if (S.pdfUrl) URL.revokeObjectURL(S.pdfUrl);
    S.pdfUrl = URL.createObjectURL(blob); S.cur = { blob, fn, title, text };
    $('#pdfDl').href = S.pdfUrl; $('#pdfDl').download = fn; $('#pdfOpen').href = S.pdfUrl;
    $('#tTitleT').textContent = title; $('#tSub').textContent = sub + ` · ${Math.round(blob.size / 1024)} KB`;
    let canShare = false; try { canShare = !!(navigator.canShare && navigator.canShare({ files: [new File([blob], fn, { type: 'application/pdf' })] })); } catch (e) {}
    $('#pdfShare').hidden = !canShare;
    const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    $('#mbody').classList.toggle('nofr', mobile);
    $('#pdfFrame').src = mobile ? 'about:blank' : S.pdfUrl;
    $('#tModal').classList.add('on'); lockScroll(true);
    setTimeout(() => $('#pdfDl').focus(), 50);
  }
  function openTicket(t) {
    let blob;
    try { blob = buildTicketPDF(t); } catch (e) { console.error(e); toast('Could not build the PDF. Please try again.', true); return; }
    showPdf(blob, `${t.id}_${safeName(t.monument.name)}.pdf`, 'Monument Health Assessment Ticket', `${t.id} · ${t.monument.name} · Level ${t.level} ${t.levelName}${t.mhi != null ? ` · MHI ${t.mhi}` : ''}`, ticketText(t));
  }
  $('#pdfShare').onclick = async () => {
    const c = S.cur; if (!c) return;
    try { await navigator.share({ files: [new File([c.blob], c.fn, { type: 'application/pdf' })], title: c.title, text: c.text }); }
    catch (e) { if (e && e.name !== 'AbortError') toast('Sharing failed. Use Download instead.', true); }
  };
  async function copyText(txt) {
    try { await navigator.clipboard.writeText(txt); return true; } catch (e) {
      const ta = document.createElement('textarea'); ta.value = txt; ta.style.cssText = 'position:fixed;opacity:0'; root.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (e2) {} ta.remove(); return ok;
    }
  }
  $('#pdfCopy').onclick = async () => { if (S.cur && await copyText(S.cur.text)) toast('Summary copied. Paste it into WhatsApp, SMS or email.'); else toast('Could not copy on this browser.', true); };
  function closeTicket() { $('#tModal').classList.remove('on'); lockScroll(false); }
  $('#tClose').onclick = closeTicket;
  $('#tModal').addEventListener('click', e => { if (e.target === $('#tModal')) closeTicket(); });
  $('#ticketBtn').onclick = () => {
    if (!S.res) return;
    const t = collectTicket();
    openTicket(t); saveHistory(t);
    toast(`Ticket ${t.id} generated`);
  };
  $('#pngBtn').onclick = () => {
    if (!S.res) return;
    const c = canvasFor(S.res.mode === 'single' ? 'both' : 'heat');
    c.toBlob(b => { if (!b) return; const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `sentinel-annotated-${Date.now()}.png`; root.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }, 'image/png');
  };
  $('#newBtn').onclick = () => { S.imgs = { single: null, before: null, after: null }; S.res = null; S.inspStart = null; $('#notes').value = ''; stopDictation(); $('#results').classList.remove('on'); buildDrops(); updateScanBtn(); scrollTo({ top: 0, behavior: 'smooth' }); };

  /* ---------------- history ---------------- */
  const HK = 'sentinelTickets';
  function saveHistory(t) {
    idxAdd([idxEntry(t, 'ticket')]);
    fullTickets.set(t.id, t);
    let h = store.get(HK, []); h.unshift(compactTicket(t));
    h = h.slice(0, 8);
    while (h.length && !store.set(HK, h)) h.pop();
    if (!h.length) toast('Ticket generated but could not be saved to your account.', true);
    renderHistory();
  }
  function renderHistory() {
    const h = store.get(HK, []); $('#histN').textContent = h.length;
    $('#dlist').innerHTML = h.length ? h.map((t, i) => `<div class="hi">${fullTickets.has(t.id) && fullTickets.get(t.id).thumb ? `<img src="${fullTickets.get(t.id).thumb}" alt="">` : '<span class="nothumb" aria-hidden="true">📄</span>'}<div><b>${esc(t.monument.name)}</b><small>${esc(t.id)}</small><small>${esc(t.tsText)} · <span class="badge s${t.level || 1}" style="${t.level ? '' : 'background:#3b6fd8'}">L${t.level} ${esc(t.levelName)}</span>${t.mhi != null ? ` <span class="mhip" style="color:${t.mhiColor}">MHI ${t.mhi}</span>` : ''}</small></div><div class="hb"><button class="btn sm" data-o="${i}">Open</button><button class="btn sm" data-x="${i}">Delete</button></div></div>`).join('') : '<div class="empty">No tickets yet. Generated tickets are saved to your account (last 8).</div>';
    $('#dlist').querySelectorAll('[data-o]').forEach(b => b.onclick = () => { const t = store.get(HK, [])[+b.dataset.o]; if (t) { $('#drawer').classList.remove('on'); openTicket(hydrateTicket(t)); } });
    $('#dlist').querySelectorAll('[data-x]').forEach(b => b.onclick = () => { const h2 = store.get(HK, []); h2.splice(+b.dataset.x, 1); store.set(HK, h2); renderHistory(); });
  }
  $('#histBtn').onclick = () => { renderHistory(); $('#drawer').classList.add('on'); };
  $('#dClose').onclick = () => $('#drawer').classList.remove('on');
  listen(document, 'keydown', e => { if (e.key === 'Escape') { if ($('#markPop').classList.contains('on')) { cancelMark(); return; } if ($('#camModal').classList.contains('on')) { closeLive(); return; } closeTicket(); $('#drawer').classList.remove('on'); closeCC(); } });

  /* =====================================================================
     COMMAND CENTRE INDEX — light, long-lived log of every assessment
     ===================================================================== */
  const IK = 'sentinelIndex';
  const COORD = { konark: [19.8876, 86.0945], hampi: [15.335, 76.46], ellora: [20.0268, 75.1771], qutb: [28.5245, 77.1855], redfort: [28.6562, 77.241], taj: [27.1751, 78.0421], khajuraho: [24.8318, 79.9199], sanchi: [23.4794, 77.7399], thanjavur: [10.7828, 79.1318] };
  const SHORT = { konark: 'Konark', hampi: 'Hampi', ellora: 'Ellora', qutb: 'Qutb Minar', redfort: 'Red Fort', taj: 'Taj Mahal', khajuraho: 'Khajuraho', sanchi: 'Sanchi', thanjavur: 'Thanjavur' };
  const SEVC = { 0: '#3b6fd8', 1: '#2f9e5e', 2: '#d4930f', 3: '#c8361f' };
  const STATUS = { open: 'Open', dispatched: 'Dispatched', resolved: 'Resolved' };
  function monKey(m) { return !m.id || m.id === 'custom' ? 'custom:' + m.name : m.id; }
  function monById(id) { const m = MONUMENTS.find(x => x.id === id); return m && m.id !== 'custom' ? { id: m.id, name: m.name, location: m.loc, mat: m.mat, materialLabel: m.matLabel } : monument(); }
  function posOf(b, w, h) { const cx = (b[0] + b[2]) / 2 / w, cy = (b[1] + b[3]) / 2 / h; const v = cy < 0.34 ? 'upper' : cy > 0.66 ? 'lower' : 'middle', hz = cx < 0.34 ? 'left' : cx > 0.66 ? 'right' : 'centre'; return v === 'middle' && hz === 'centre' ? 'centre' : v + '-' + hz; }
  function idxLoad() { return store.get(IK, []); }
  function idxSave(a) { a = a.slice(0, 300); while (a.length && !store.set(IK, a)) a = a.slice(0, Math.floor(a.length * 0.8)); if (!a.length) store.set(IK, []); }
  function idxAdd(list) {
    const a = idxLoad();
    list.forEach(e => { const i = a.findIndex(x => x.id === e.id); if (i >= 0) a[i] = Object.assign({}, a[i], e, { status: a[i].status }); else a.unshift(e); });
    a.sort((x, y) => y.ts.localeCompare(x.ts)); idxSave(a); updateCCBadge();
  }
  const parseGps = g => { const m = g && String(g).match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/); return m ? [+m[1], +m[2]] : null; };
  function idxEntry(t, src) {
    const m = t.monument, id = m.id || (MONUMENTS.find(x => x.name === m.name) || {}).id || 'custom';
    let mh = t.mhi; if (mh == null) mh = mhiFrom((t.findings || []).map(f => ({ sev: f.sev, areaPct: f.areaPct != null ? f.areaPct : parseFloat(f.areaText) || 0 }))).v;
    return { id: t.id, ts: t.ts, mon: { id: id === 'custom' ? 'custom:' + m.name : id, name: m.name, loc: m.location }, ll: COORD[id] || parseGps(t.gps), level: t.level, mhi: mh, primary: t.primary, ptype: t.ptype || null, types: t.types || {}, n: (t.findings || []).length, status: t.level ? 'open' : 'resolved', insp: t.inspector || '', src };
  }

  /* =====================================================================
     MANUAL "MARK DAMAGE" TOOL
     ===================================================================== */
  const MARK_TYPES = ['paint', 'carving', 'crack', 'bio', 'crust', 'salt', 'loss', 'change'];
  $('#mpType').innerHTML = MARK_TYPES.map(t => `<option value="${t}">${esc(CV.TYPES[t].name)}</option>`).join('');
  let mk = null, mkSev = 2;
  const cvR = $('#cvR');
  const cvPt = (c, e) => { const b = c.getBoundingClientRect(); return [Math.max(0, Math.min(c.width, (e.clientX - b.left) / b.width * c.width)), Math.max(0, Math.min(c.height, (e.clientY - b.top) / b.height * c.height))]; };
  const mkBox = () => [Math.round(Math.min(mk.a[0], mk.b[0])), Math.round(Math.min(mk.a[1], mk.b[1])), Math.round(Math.max(mk.a[0], mk.b[0])), Math.round(Math.max(mk.a[1], mk.b[1]))];
  function setMarking(on) {
    if (on && !S.res) return;
    S.marking = on;
    if (on) { setLoupe(false); if (S.view === 'swipe') { S.view = 'boxes'; renderViewer(); } }
    $('#markBtn').classList.toggle('on', on); $('#markBtn').setAttribute('aria-pressed', on);
    cvR.parentElement.classList.toggle('marking', on);
    if (!on) cancelMark(); else toast('Drag a box around the damage on the right-hand image.');
  }
  $('#markBtn').onclick = () => setMarking(!S.marking);
  function drawMarkRect() {
    const el = $('#mrect'); if (!mk) { el.classList.remove('on'); return; }
    const pane = cvR.parentElement, cb = cvR.getBoundingClientRect(), pb = pane.getBoundingClientRect(), k = cb.width / cvR.width, b = mkBox();
    Object.assign(el.style, { left: (cb.left - pb.left + b[0] * k) + 'px', top: (cb.top - pb.top + b[1] * k) + 'px', width: ((b[2] - b[0]) * k) + 'px', height: ((b[3] - b[1]) * k) + 'px' });
    el.classList.add('on');
  }
  cvR.addEventListener('pointerdown', e => { if (!S.marking || !S.res) return; e.preventDefault(); try { cvR.setPointerCapture(e.pointerId); } catch (x) {} $('#markPop').classList.remove('on'); mk = { a: cvPt(cvR, e) }; mk.b = mk.a; drawMarkRect(); });
  cvR.addEventListener('pointermove', e => { if (!mk || mk.done) return; mk.b = cvPt(cvR, e); drawMarkRect(); });
  cvR.addEventListener('pointerup', e => {
    if (!mk || mk.done) return; mk.b = cvPt(cvR, e); const b = mkBox();
    if (b[2] - b[0] < 6 || b[3] - b[1] < 6) { cancelMark(); return; }
    mk.done = true; drawMarkRect(); openMarkPop();
  });
  function openMarkPop() {
    const pop = $('#markPop'), rb = $('#mrect').getBoundingClientRect();
    $('#mpNote').value = ''; pop.classList.add('on');
    const pw = pop.offsetWidth, ph = pop.offsetHeight;
    let x = Math.min(innerWidth - pw - 12, Math.max(12, rb.left)), y = rb.bottom + 10;
    if (y + ph > innerHeight - 12) y = Math.max(12, rb.top - ph - 10);
    pop.style.left = x + 'px'; pop.style.top = y + 'px';
    setTimeout(() => $('#mpType').focus(), 30);
  }
  function cancelMark() { mk = null; drawMarkRect(); $('#markPop').classList.remove('on'); }
  $('#mpSev').querySelectorAll('button').forEach(b => b.onclick = () => { mkSev = +b.dataset.s; $('#mpSev').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); });
  $('#mpCancel').onclick = cancelMark;
  $('#mpNote').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('#mpAdd').click(); } });
  $('#mpAdd').onclick = () => {
    if (!mk || !S.res) return;
    const t = $('#mpType').value, T = CV.TYPES[t], r = S.res, box = mkBox(), areaPx = (box[2] - box[0]) * (box[3] - box[1]);
    const f = { type: t, name: T.name, short: T.short, color: T.color, box, areaPx, areaPct: areaPx / r.n * 100, len: 0, lid: -1, include: true, sev: mkSev, signal: 'manual', no: r.findings.length + 1, pos: posOf(box, r.w, r.h), detail: $('#mpNote').value.trim().slice(0, 120) || 'Marked by inspector', manual: true };
    r.findings.push(f); cancelMark(); S.sel = r.findings.length - 1; renderResults(true);
    toast(`Marked #${f.no} ${T.short} · Level ${mkSev}`);
  };

  /* =====================================================================
     LOUPE MAGNIFIER
     ===================================================================== */
  const LZ = $('#loupe'), lx = LZ.getContext('2d'); LZ.width = LZ.height = 360;
  function setLoupe(on) {
    if (on && !S.res) return;
    S.loupe = on; if (on && S.marking) setMarking(false);
    $('#loupeBtn').classList.toggle('on', on); $('#loupeBtn').setAttribute('aria-pressed', on);
    $('.viewer').classList.toggle('louping', on);
    if (!on) LZ.classList.remove('on'); else toast('Hover over the photo to magnify. Scroll to change zoom.');
  }
  $('#loupeBtn').onclick = () => setLoupe(!S.loupe);
  function loupeAt(c, e, srcPick) {
    if (!S.loupe || S.marking) return;
    const b = c.getBoundingClientRect(); if (!b.width) return;
    const px = (e.clientX - b.left) / b.width * c.width, py = (e.clientY - b.top) / b.height * c.height;
    if (px < 0 || py < 0 || px > c.width || py > c.height) { LZ.classList.remove('on'); return; }
    const src = srcPick ? srcPick(e) : c, ss = 180 / S.zoom * (c.width / b.width);
    lx.fillStyle = '#f7f1e9'; lx.fillRect(0, 0, 360, 360); lx.imageSmoothingQuality = 'high';
    const sx = px - ss / 2, sy = py - ss / 2, cx0 = Math.max(0, sx), cy0 = Math.max(0, sy), cx1 = Math.min(c.width, sx + ss), cy1 = Math.min(c.height, sy + ss), k = 360 / ss;
    if (cx1 > cx0 && cy1 > cy0) lx.drawImage(src, cx0, cy0, cx1 - cx0, cy1 - cy0, (cx0 - sx) * k, (cy0 - sy) * k, (cx1 - cx0) * k, (cy1 - cy0) * k);
    lx.strokeStyle = 'rgba(255,255,255,.85)'; lx.lineWidth = 2; lx.beginPath(); lx.moveTo(180, 150); lx.lineTo(180, 168); lx.moveTo(180, 192); lx.lineTo(180, 210); lx.moveTo(150, 180); lx.lineTo(168, 180); lx.moveTo(192, 180); lx.lineTo(210, 180); lx.stroke();
    lx.fillStyle = 'rgba(36,21,26,.72)'; lx.fillRect(132, 316, 96, 28); lx.fillStyle = '#ffffff'; lx.font = '700 17px Manrope, Arial'; lx.textAlign = 'center'; lx.fillText(`× ${S.zoom.toFixed(1)}`, 180, 336); lx.textAlign = 'start';
    let x = e.clientX + 26, y = e.clientY - 206; if (x + 186 > innerWidth) x = e.clientX - 206; if (y < 8) y = e.clientY + 26;
    LZ.style.left = x + 'px'; LZ.style.top = y + 'px'; LZ.classList.add('on');
  }
  const wheelZoom = (c, pick) => e => { if (!S.loupe) return; e.preventDefault(); S.zoom = Math.max(1.5, Math.min(8, S.zoom + (e.deltaY < 0 ? 0.5 : -0.5))); loupeAt(c, e, pick); };
  ['#cvL', '#cvR'].forEach(sel => { const c = $(sel); c.addEventListener('pointermove', e => loupeAt(c, e)); c.addEventListener('pointerleave', () => LZ.classList.remove('on')); c.addEventListener('wheel', wheelZoom(c), { passive: false }); });
  { const sw = $('#swR'), pick = e => { const b = $('#swB').getBoundingClientRect(); return (e.clientX - b.left) / b.width * 100 < +sw.value ? $('#swA') : $('#swB'); };
    sw.addEventListener('pointermove', e => loupeAt($('#swB'), e, pick)); sw.addEventListener('pointerleave', () => LZ.classList.remove('on')); sw.addEventListener('wheel', wheelZoom($('#swB'), pick), { passive: false }); }

  /* =====================================================================
     FIELD NOTES + VOICE DICTATION
     ===================================================================== */
  const notes = $('#notes'), dictBtn = $('#dictBtn');
  const QTAGS = ['Paint still wet / fresh', 'Repeat incident at this spot', 'Reported by a visitor', 'Outside CCTV coverage', 'Water seepage nearby', 'Loose fragments, area cordoned', 'Suspect seen nearby'];
  $('#qtags').innerHTML = QTAGS.map(t => `<button type="button" class="chip">+ ${esc(t)}</button>`).join('');
  const nCount = () => { $('#nCount').textContent = notes.value.length; };
  notes.addEventListener('input', nCount);
  $('#qtags').querySelectorAll('button').forEach((b, i) => b.onclick = () => { const t = QTAGS[i]; if (notes.value.includes(t)) return; notes.value = (notes.value.trim() ? notes.value.trim().replace(/[.;]?$/, '. ') : '') + t + '.'; nCount(); });
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition; let rec = null;
  if (!SR) { dictBtn.disabled = true; dictBtn.title = 'Voice dictation is not supported in this browser. Try Chrome or Edge.'; }
  const dictUI = on => { dictBtn.classList.toggle('rec', on); dictBtn.innerHTML = on ? '⏹ Stop' : '🎙️ Dictate'; };
  function startDictation() {
    try {
      rec = new SR(); rec.lang = 'en-IN'; rec.continuous = true; rec.interimResults = true;
      const base = notes.value.trim(); let fin = '';
      rec.onresult = e => { let interim = ''; for (let i = e.resultIndex; i < e.results.length; i++) { const t = e.results[i][0].transcript.trim(); if (!t) continue; if (e.results[i].isFinal) fin += t.charAt(0).toUpperCase() + t.slice(1) + '. '; else interim += t + ' '; } notes.value = ((base ? base + ' ' : '') + fin + interim).slice(0, 1200); nCount(); };
      rec.onerror = e => { if (e.error !== 'aborted' && e.error !== 'no-speech') toast(e.error === 'not-allowed' ? 'Microphone permission was denied.' : 'Dictation stopped (' + e.error + ').', true); };
      rec.onend = () => { rec = null; dictUI(false); };
      rec.start(); dictUI(true); toast('Listening… speak your observations.');
    } catch (e) { rec = null; dictUI(false); toast('Could not start dictation on this browser.', true); }
  }
  function stopDictation() { if (rec) { try { rec.stop(); } catch (e) {} } rec = null; dictUI(false); }
  dictBtn.onclick = () => rec ? stopDictation() : startDictation();

  /* =====================================================================
     LIVE CAMERA SCAN
     ===================================================================== */
  const Live = { stream: null, on: false, timer: 0, facing: 'environment', slot: 'single', shots: 0 };
  const camV = $('#camVid'), camOv = $('#camOv'), work = document.createElement('canvas'), wx = work.getContext('2d', { willReadFrequently: true });
  async function openLive(slot) {
    Live.slot = slot || 'single'; Live.shots = 0;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { toast('Live camera needs a secure (https) page and a browser with camera access. Use 📸 Camera or Choose file instead.', true); return; }
    $('#camSub').textContent = Live.slot === 'patrol' ? 'Capture as many spots as you like, then close' : 'Point at the surface and hold steady';
    $('#camShot').innerHTML = Live.slot === 'patrol' ? '📸 Capture to patrol' : '📸 Capture &amp; full scan';
    $('#camHud').textContent = 'Starting camera…';
    $('#camModal').classList.add('on'); lockScroll(true);
    await startStream();
  }
  function stopStream() { Live.on = false; clearTimeout(Live.timer); if (Live.stream) Live.stream.getTracks().forEach(t => t.stop()); Live.stream = null; camV.srcObject = null; }
  async function startStream() {
    stopStream();
    try { Live.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: Live.facing }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false }); }
    catch (e) { closeLive(); toast(e && e.name === 'NotAllowedError' ? 'Camera permission was denied. Allow camera access, or use Choose file.' : 'Could not start the camera on this device.', true); return; }
    if (!alive || !$('#camModal').classList.contains('on')) { stopStream(); return; }
    camV.srcObject = Live.stream; try { await camV.play(); } catch (e) {}
    Live.on = true; liveLoop();
  }
  function liveLoop() {
    if (!Live.on) return;
    let dt = 300;
    if (camV.readyState >= 2 && camV.videoWidth) {
      const s = Math.min(1, 400 / Math.max(camV.videoWidth, camV.videoHeight)), w = Math.round(camV.videoWidth * s), h = Math.round(camV.videoHeight * s);
      if (work.width !== w || work.height !== h) { work.width = w; work.height = h; }
      wx.drawImage(camV, 0, 0, w, h);
      const t0 = performance.now();
      try {
        const r = CV.scanSingle({ w, h, data: wx.getImageData(0, 0, w, h).data }, { sens: +$('#sens').value, det: Object.assign({}, detOn), align: false });
        dt = performance.now() - t0;
        if (camOv.width !== w * 2 || camOv.height !== h * 2) { camOv.width = w * 2; camOv.height = h * 2; }
        const ox = camOv.getContext('2d'); ox.setTransform(1, 0, 0, 1, 0, 0); ox.clearRect(0, 0, camOv.width, camOv.height); ox.setTransform(2, 0, 0, 2, 0, 0);
        if ($('#camBoxes').checked) drawBoxes(ox, r, -1, 0.55);
        const L = level(r), H = mhi(r), lv = LEVELS[L.level];
        $('#camHud').innerHTML = `<i style="background:${SEVC[L.level]}"></i>LIVE · ${(1000 / Math.max(dt, 1)).toFixed(0)} scans/s · ${included(r).length} finding${included(r).length === 1 ? '' : 's'} · ${L.level ? 'L' + L.level + ' ' + lv.name : 'Clear'} · MHI ${H.v}${Live.shots ? ` · ${Live.shots} captured` : ''}`;
      } catch (e) { $('#camHud').textContent = 'Analysing…'; }
    }
    Live.timer = setTimeout(liveLoop, Math.max(180, dt * 1.6));
  }
  function closeLive() { stopStream(); $('#camModal').classList.remove('on'); lockScroll(false); }
  $('#camClose').onclick = closeLive;
  $('#camFlip').onclick = () => { Live.facing = Live.facing === 'environment' ? 'user' : 'environment'; startStream(); };
  $('#camShot').onclick = () => {
    if (!camV.videoWidth) return;
    const c = document.createElement('canvas'); c.width = camV.videoWidth; c.height = camV.videoHeight; c.getContext('2d').drawImage(camV, 0, 0);
    const d = new Date(), p = v => String(v).padStart(2, '0');
    const im = { name: `live-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.jpg`, ow: c.width, oh: c.height, frame: toFrame(c, c.width, c.height), src: c };
    $('#camStage').classList.add('flash'); setTimeout(() => $('#camStage').classList.remove('flash'), 260);
    if (Live.slot === 'patrol') { Live.shots++; addPatrolImages([im]); toast(`Captured ${Live.shots} · added to patrol`); return; }
    closeLive(); setImage(Live.slot, im);
  };

  /* =====================================================================
     PATROL BATCH
     ===================================================================== */
  const PMAX = 24;
  async function addPatrolFiles(files) {
    const room = PMAX - S.patrol.length;
    if (room <= 0) { toast(`The patrol queue is full (${PMAX} photos).`, true); return; }
    if (files.length > room) toast(`Only the first ${room} photo${room === 1 ? '' : 's'} were added (limit ${PMAX}).`, true);
    const ims = [];
    for (const f of files.slice(0, room)) { try { ims.push(await readImage(f)); } catch (e) { toast(e.message, true); } }
    if (ims.length) addPatrolImages(ims);
  }
  function addPatrolImages(ims) {
    ims.slice(0, Math.max(0, PMAX - S.patrol.length)).forEach(im => S.patrol.push({ id: Math.random().toString(36).slice(2, 8).toUpperCase(), name: im.name, im, mon: im.mon ? monById(im.mon) : monument(), r: null }));
    if (S.mode !== 'patrol') setMode('patrol');
    renderPatrol(); updateScanBtn(); runPatrol(false);
  }
  function annotatedOf(r) { const c = document.createElement('canvas'); c.width = r.w; c.height = r.h; const x = c.getContext('2d'); x.drawImage(r.src.frame.canvas, 0, 0); drawBoxes(x, r, -1); return c; }
  function summarize(r) {
    const L = level(r), H = mhi(r), inc = included(r), types = {};
    inc.forEach(f => { types[f.type] = (types[f.type] || 0) + 1; });
    return { level: L.level, area: L.area, mhi: H.v, band: H.band, color: H.color, n: inc.length, primary: L.primary ? L.primary.name : 'None', ptype: L.primary ? L.primary.type : null, pos: L.primary ? L.primary.pos : '', types, thumb: jpeg(annotatedOf(r), 320, 0.8) };
  }
  async function runPatrol(all) {
    if (S.busy) { S.patrolPending = true; return; }
    const todo = S.patrol.filter(e => all || !e.r); if (!todo.length) { renderPatrol(); return; }
    S.busy = true; updateScanBtn();
    const list = $('#progList'), bar = $('#progBar');
    list.innerHTML = todo.map(e => `<li><i></i><span>${esc(e.name)}</span><em></em></li>`).join('');
    $('#prog').classList.add('on'); bar.style.width = '0%';
    const P = { sens: +$('#sens').value, det: Object.assign({}, detOn), align: false };
    for (let i = 0; i < todo.length; i++) {
      const e = todo[i], li = list.children[i]; li.className = 'run'; bar.style.width = (i / todo.length * 100) + '%'; await tick();
      const t0 = performance.now();
      try { const r = CV.scanSingle(e.im.frame, P); r.src = e.im; e.r = summarize(r); } catch (err) { console.warn(err); e.r = { error: true }; }
      li.className = 'done'; li.querySelector('em').textContent = ((performance.now() - t0) / 1000).toFixed(2) + ' s';
    }
    bar.style.width = '100%'; S.busy = false; updateScanBtn(); renderPatrol();
    setTimeout(() => $('#prog').classList.remove('on'), 900);
    const crit = S.patrol.filter(e => e.r && e.r.level === 3).length;
    toast(`Patrol screened: ${S.patrol.length} photo${S.patrol.length === 1 ? '' : 's'}${crit ? `, ${crit} critical` : ', none critical'}`);
    if (S.patrolPending) { S.patrolPending = false; runPatrol(false); }
  }
  function patrolStats() {
    const done = S.patrol.filter(e => e.r && !e.r.error), c = l => done.filter(e => e.r.level === l).length;
    return { done, crit: c(3), med: c(2), low: c(1), clear: c(0), avg: done.length ? Math.round(done.reduce((t, e) => t + e.r.mhi, 0) / done.length) : null };
  }
  const patrolId = () => { const d = new Date(), p = v => String(v).padStart(2, '0'); return `PTL-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`; };
  function renderPatrol() {
    const box = $('#patrol'), E = S.patrol;
    if (!E.length) { box.innerHTML = `<div class="pempty">🗂️ Your patrol queue is empty. Add photos above, use <b>🎥 Live scan</b> to capture several spots in a row, or try the demo round.</div>`; return; }
    const st = patrolStats(), avgB = st.avg != null ? bandOf(st.avg) : null;
    const order = E.slice().sort((a, b) => (b.r ? b.r.level : -1) - (a.r ? a.r.level : -1) || (a.r ? a.r.mhi : 999) - (b.r ? b.r.mhi : 999));
    box.innerHTML = `<div class="phead"><div><h3>Patrol round <small>${E.length} photo${E.length === 1 ? '' : 's'} · ranked by risk</small></h3></div>
      <div class="pk"><div class="c3"><b>${st.crit}</b><small>Critical</small></div><div class="c2"><b>${st.med}</b><small>Medium</small></div><div class="c1"><b>${st.low}</b><small>Low</small></div><div class="c0"><b>${st.clear}</b><small>Clear</small></div><div><b style="color:${avgB ? avgB[2] : 'inherit'}">${st.avg != null ? st.avg : '—'}</b><small>Avg MHI</small></div></div></div>
      <div class="plist">${order.map(e => { const r = e.r; return `<div class="prow ${r && !r.error ? 'l' + r.level : ''}">
        <img src="${r && r.thumb ? r.thumb.dataURL : e.im.frame.canvas.toDataURL('image/jpeg', 0.6)}" alt="">
        <div class="pi"><b>${esc(e.name)}</b><small>${esc(e.mon.name)}${r && !r.error ? ` · ${r.n} finding${r.n === 1 ? '' : 's'}${r.level ? ` · ${esc(r.primary)} (${esc(r.pos)})` : ''}` : r ? ' · scan failed' : ' · waiting…'}</small></div>
        ${r && !r.error ? `<span class="badge s${r.level || 1}" style="${r.level ? '' : 'background:#3b6fd8'}">${r.level ? 'L' + r.level + ' ' + LEVELS[r.level].name.toUpperCase() : 'CLEAR'}</span><span class="mchip" style="color:${r.color};border-color:${r.color}">MHI ${r.mhi}</span>` : '<span class="pend">…</span><span></span>'}
        <div class="pb"><button class="btn sm" data-open="${e.id}" ${r ? '' : 'disabled'}>Open ↗</button><button class="x sm" data-rm="${e.id}" aria-label="Remove ${esc(e.name)}">×</button></div></div>`; }).join('')}</div>
      <div class="pact"><button class="btn red" id="pPdf" ${st.done.length ? '' : 'disabled'}>📄 Patrol summary PDF</button><button class="btn" id="pLog" ${st.done.length ? '' : 'disabled'}>📊 Log to Command Centre</button><span class="sp"></span><button class="btn sm" id="pClear">Clear queue</button></div>`;
    box.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { S.patrol = S.patrol.filter(e => e.id !== b.dataset.rm); renderPatrol(); updateScanBtn(); });
    box.querySelectorAll('[data-open]').forEach(b => b.onclick = () => {
      const e = S.patrol.find(x => x.id === b.dataset.open); if (!e) return;
      if (e.mon.id !== 'custom') $('#mon').value = e.mon.id; syncMon();
      setMode('single'); setImage('single', e.im);
    });
    $('#pClear').onclick = () => { if (S.busy) return; S.patrol = []; renderPatrol(); updateScanBtn(); };
    $('#pLog').onclick = () => {
      const pid = patrolId(), now = new Date().toISOString();
      const list = st.done.map(e => ({ id: `${pid}-${e.id}`, ts: now, mon: { id: monKey(e.mon), name: e.mon.name, loc: e.mon.location }, ll: COORD[e.mon.id] || parseGps(S.gps), level: e.r.level, mhi: e.r.mhi, primary: e.r.primary, ptype: e.r.ptype, types: e.r.types, n: e.r.n, status: e.r.level ? 'open' : 'resolved', insp: $('#insp').value.trim(), src: 'patrol', file: e.name }));
      idxAdd(list); toast(`${list.length} assessment${list.length === 1 ? '' : 's'} logged to the Command Centre`);
    };
    $('#pPdf').onclick = () => {
      const now = new Date(), id = `${patrolId()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const p = { id, tsText: now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) + ' IST', inspector: $('#insp').value.trim(), role: $('#role').value, gps: S.gps, sens: $('#sens').value,
        stats: { photos: st.done.length, crit: st.crit, med: st.med, low: st.low, clear: st.clear, avg: st.avg, avgBand: st.avg != null ? bandOf(st.avg)[1] : '' },
        sites: [...new Set(st.done.map(e => e.mon.name))],
        entries: order.filter(e => e.r && !e.r.error).map(e => ({ name: e.name, mon: e.mon.name, level: e.r.level, levelName: LEVELS[e.r.level].name, resp: LEVELS[e.r.level].resp, mhi: e.r.mhi, band: e.r.band, color: e.r.color, n: e.r.n, primary: e.r.primary, pos: e.r.pos, thumb: e.r.thumb })) };
      let blob; try { blob = buildPatrolPDF(p); } catch (err) { console.error(err); toast('Could not build the patrol PDF.', true); return; }
      const txt = [`Patrol summary ${p.id}`, `${p.stats.photos} photos · ${p.sites.join(', ')}`, `Critical ${p.stats.crit} · Medium ${p.stats.med} · Low ${p.stats.low} · Clear ${p.stats.clear} · Avg MHI ${p.stats.avg}`, ...p.entries.filter(e => e.level >= 2).map(e => `• L${e.level} ${e.mon}: ${e.primary} (${e.name})`), `Inspector: ${p.inspector || 'not given'} · ${p.tsText}`].join('\n');
      showPdf(blob, `${p.id}_patrol-summary.pdf`, 'Patrol Inspection Summary', `${p.id} · ${p.stats.photos} photos · ${p.stats.crit} critical`, txt);
    };
  }

  /* =====================================================================
     COMMAND CENTRE DASHBOARD
     ===================================================================== */
  const INDIA = [[68.4, 23.5], [69.0, 22.3], [69.7, 21.5], [70.9, 20.75], [72.1, 21.2], [72.6, 21.9], [72.9, 21.1], [72.85, 20.0], [72.8, 19.0], [73.0, 18.0], [73.3, 17.0], [73.7, 15.7], [74.1, 14.8], [74.7, 13.3], [75.2, 12.0], [75.8, 11.0], [76.2, 10.0], [76.6, 9.0], [77.1, 8.3], [77.55, 8.08], [78.1, 8.8], [78.4, 9.3], [79.1, 9.3], [79.3, 10.3], [79.85, 10.6], [79.85, 11.9], [80.25, 13.1], [80.15, 14.5], [80.3, 15.6], [81.0, 15.8], [81.3, 16.3], [82.3, 16.6], [82.6, 17.0], [83.3, 17.7], [84.2, 18.3], [85.1, 19.3], [85.9, 19.8], [86.6, 20.3], [86.9, 20.8], [87.0, 21.5], [87.8, 21.7], [88.2, 21.6], [88.9, 21.6], [89.1, 22.1], [88.9, 22.9], [88.6, 23.5], [88.7, 24.2], [88.1, 24.5], [88.45, 25.15], [88.5, 25.5], [88.1, 25.8], [88.4, 26.4], [89.8, 26.1], [89.85, 25.3], [92.0, 25.1], [92.4, 24.9], [92.3, 24.2], [91.6, 24.1], [91.2, 23.5], [91.4, 22.9], [91.7, 23.0], [92.3, 23.7], [92.6, 22.0], [93.2, 22.2], [93.4, 23.5], [94.2, 24.0], [94.6, 25.2], [95.2, 26.5], [96.0, 27.2], [97.2, 27.6], [97.4, 28.2], [96.6, 28.9], [95.3, 29.1], [93.6, 28.7], [92.0, 27.9], [91.6, 27.8], [92.0, 26.9], [89.8, 26.7], [88.9, 27.0], [88.85, 27.9], [88.1, 27.9], [88.0, 27.1], [88.15, 26.5], [87.0, 26.4], [85.8, 26.6], [84.6, 27.3], [83.3, 27.4], [82.0, 27.9], [81.0, 28.4], [80.1, 28.8], [80.3, 29.5], [80.9, 30.2], [79.4, 31.0], [78.8, 31.5], [78.4, 32.5], [79.5, 32.6], [79.4, 34.0], [80.3, 35.5], [79.0, 36.0], [77.8, 35.5], [76.8, 36.0], [75.8, 36.8], [74.9, 37.0], [73.6, 36.9], [72.6, 36.6], [73.5, 35.6], [73.9, 34.6], [73.6, 34.0], [74.4, 33.0], [74.7, 32.6], [75.3, 32.2], [74.6, 31.9], [74.6, 31.1], [74.0, 30.9], [73.9, 30.4], [73.4, 29.9], [72.9, 29.0], [71.9, 27.9], [70.7, 28.0], [70.0, 27.2], [69.5, 26.7], [70.1, 26.0], [70.6, 25.7], [70.4, 25.1], [69.5, 24.3], [68.8, 24.3]];
  const KX = Math.cos(22 * Math.PI / 180) * 10, prj = (lat, lon) => [(lon - 67.6) * KX + 6, (37.6 - lat) * 10 + 6];
  const LBL = { qutb: [-6, 12, 'end'], redfort: [9, -5, 'start'], taj: [9, 9, 'start'], sanchi: [-9, 4, 'end'], khajuraho: [9, 3, 'start'], ellora: [-9, 4, 'end'], konark: [9, 4, 'start'], hampi: [-9, 4, 'end'], thanjavur: [9, 4, 'start'] };
  const CC = { status: 'all', mon: 'all' };
  function updateCCBadge() { const n = idxLoad().filter(e => e.level === 3 && e.status !== 'resolved').length; $('#ccN').textContent = n; $('#ccN').style.display = n ? '' : 'none'; }
  function closeCC() { if (!$('#cc').classList.contains('on')) return; $('#cc').classList.remove('on'); lockScroll(false); }
  function openCC() { renderCC(); $('#cc').classList.add('on'); lockScroll(true); $('#cc').scrollTop = 0; }
  $('#ccBtn').onclick = openCC; $('#ccClose').onclick = closeCC;
  function siteRollup(all) {
    const sites = new Map();
    all.slice().sort((a, b) => a.ts.localeCompare(b.ts)).forEach(e => {
      const k = e.mon.id; if (!sites.has(k)) sites.set(k, { key: k, name: e.mon.name, short: SHORT[k] || e.mon.name, ll: e.ll, list: [] });
      const s = sites.get(k); s.list.push(e); if (e.ll) s.ll = e.ll;
    });
    sites.forEach(s => { const open = s.list.filter(e => e.status !== 'resolved'); s.open = open.length; s.worst = open.reduce((m, e) => Math.max(m, e.level), 0); s.latest = s.list[s.list.length - 1]; s.mhi = s.latest.mhi; });
    return [...sites.values()].sort((a, b) => b.worst - a.worst || a.mhi - b.mhi);
  }
  function spark(vals, color) {
    if (vals.length < 2) return `<svg class="spark" viewBox="0 0 110 30"><line x1="4" y1="15" x2="106" y2="15" stroke="#e3d6c8" stroke-dasharray="3 3"/><circle cx="106" cy="${30 - (vals[0] || 0) / 100 * 26 - 2}" r="3" fill="${color}"/></svg>`;
    const pts = vals.map((v, i) => [4 + i / (vals.length - 1) * 102, 28 - v / 100 * 26]);
    return `<svg class="spark" viewBox="0 0 110 30" aria-hidden="true"><polyline points="${pts.map(p => p.map(n => n.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${pts[pts.length - 1][0]}" cy="${pts[pts.length - 1][1]}" r="3" fill="${color}"/></svg>`;
  }
  function renderCC() {
    const all = idxLoad(), sites = siteRollup(all), demoN = all.filter(e => e.src === 'demo').length;
    const open = all.filter(e => e.status === 'open'), disp = all.filter(e => e.status === 'dispatched'), res = all.filter(e => e.status === 'resolved');
    const critOpen = all.filter(e => e.level === 3 && e.status !== 'resolved').length;
    const avg = sites.length ? Math.round(sites.reduce((t, s) => t + s.mhi, 0) / sites.length) : null, avgB = avg != null ? bandOf(avg) : null;
    $('#ccDemo').textContent = demoN ? '✕ Clear demo data' : '✨ Load demo data';
    if (!all.length) {
      $('#ccBody').innerHTML = `<div class="ccempty"><div style="font-size:48px">📊</div><h3>No assessments logged yet</h3><p>Every incident ticket you generate, and every patrol round you log, appears here: on a map of your sites, with health trends and a dispatch workflow.</p><p><button class="btn gold" id="ccDemo2">✨ Load demo data to explore</button></p></div>`;
      $('#ccDemo2').onclick = toggleDemo; return;
    }
    // map
    const P0 = INDIA.map(([lon, lat]) => prj(lat, lon).map(n => n.toFixed(1)).join(',')).join(' ');
    const known = Object.keys(COORD).map(k => { const [x, y] = prj(...COORD[k]); return sites.some(s => s.key === k) ? '' : `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6" fill="#c9b8a3"><title>${esc(SHORT[k])}: no assessments yet</title></circle>`; }).join('');
    const pins = sites.filter(s => s.ll).map(s => {
      const [x, y] = prj(s.ll[0], s.ll[1]), c = s.open ? SEVC[s.worst] : '#2f9e5e', r = 4.5 + Math.min(4, s.list.length * 0.6), lb = LBL[s.key] || [9, 4, 'start'];
      return `<g class="pin ${CC.mon === s.key ? 'sel' : ''}" data-k="${esc(s.key)}" tabindex="0" role="button" aria-label="${esc(s.name)}: ${s.open} open, MHI ${s.mhi}">${s.open && s.worst === 3 ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${c}" class="pulse"/>` : ''}<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${c}" stroke="#fff" stroke-width="1.6"/><text x="${(x + lb[0]).toFixed(1)}" y="${(y + lb[1]).toFixed(1)}" text-anchor="${lb[2]}">${esc(s.short)}</text><title>${esc(s.name)} · ${s.open} open · MHI ${s.mhi}</title></g>`;
    }).join('');
    const unmapped = sites.filter(s => !s.ll);
    // defect mix
    const mix = {}; all.filter(e => e.status !== 'resolved').forEach(e => Object.keys(e.types || {}).forEach(t => { mix[t] = (mix[t] || 0) + e.types[t]; }));
    const mixL = Object.entries(mix).sort((a, b) => b[1] - a[1]), mixMax = Math.max(1, ...mixL.map(m => m[1]));
    // table
    let rows = all.filter(e => (CC.status === 'all' || e.status === CC.status) && (CC.mon === 'all' || e.mon.id === CC.mon));
    const hist = store.get(HK, []), total = rows.length; rows = rows.slice(0, 80);
    const fmtD = ts => new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
    $('#ccBody').innerHTML = `${demoN ? `<div class="demonote">✨ Showing ${demoN} demo entr${demoN === 1 ? 'y' : 'ies'} alongside your own data. <button class="lnk" id="ccDemo3">Remove demo data</button></div>` : ''}
      <div class="kpis">
        <div><small>Assessments logged</small><b>${all.length}</b><em>${sites.length} site${sites.length === 1 ? '' : 's'}</em></div>
        <div class="k3"><small>Critical, unresolved</small><b>${critOpen}</b><em>dispatch within 24 h</em></div>
        <div><small>Open</small><b>${open.length}</b><em>awaiting action</em></div>
        <div><small>Dispatched</small><b>${disp.length}</b><em>team on the way</em></div>
        <div><small>Resolved</small><b>${res.length}</b><em>${all.length ? Math.round(res.length / all.length * 100) : 0}% closure rate</em></div>
        <div><small>Avg site health</small><b style="color:${avgB ? avgB[2] : 'inherit'}">${avg != null ? avg : '—'}</b><em>${avgB ? avgB[1] + ' · latest per site' : ''}</em></div>
      </div>
      <div class="ccgrid">
        <div class="ccard"><h4>Site map <small>schematic, not to scale · click a pin to filter</small></h4>
          <svg class="imap" viewBox="0 0 290 322" role="img" aria-label="Schematic map of India with monument status pins"><polygon points="${P0}" fill="#f3e6d3" stroke="#c9a979" stroke-width="1.2" stroke-linejoin="round"/>${known}${pins}</svg>
          <div class="legend"><span><i style="background:${SEVC[3]}"></i>Critical open</span><span><i style="background:${SEVC[2]}"></i>Medium</span><span><i style="background:${SEVC[1]}"></i>Low</span><span><i style="background:#2f9e5e;outline:2px solid #fff"></i>All resolved</span><span><i style="background:#c9b8a3"></i>No data</span></div>
          ${unmapped.length ? `<p class="mini">Not on map (no coordinates): ${unmapped.map(s => esc(s.name)).join(', ')}. Attach GPS on custom sites to pin them.</p>` : ''}</div>
        <div class="ccard"><h4>Site health <small>MHI trend, oldest → latest</small></h4><div class="sites">${sites.map(s => { const b = bandOf(s.mhi); return `<button class="site ${CC.mon === s.key ? 'sel' : ''}" data-k="${esc(s.key)}"><span class="sd" style="background:${s.open ? SEVC[s.worst] : '#2f9e5e'}"></span><span class="sn"><b>${esc(s.name)}</b><small>${s.list.length} logged · ${s.open} open</small></span>${spark(s.list.slice(-10).map(e => e.mhi), b[2])}<span class="mchip" style="color:${b[2]};border-color:${b[2]}">${s.mhi}</span></button>`; }).join('')}</div></div>
        <div class="ccard"><h4>Defect mix <small>across unresolved assessments</small></h4>${mixL.length ? `<div class="bars">${mixL.map(([t, n]) => `<div class="brow"><span>${esc(CV.TYPES[t] ? CV.TYPES[t].short : t)}</span><div class="bt"><i style="width:${n / mixMax * 100}%;background:${CV.TYPES[t] ? CV.TYPES[t].color : '#999'}"></i></div><b>${n}</b></div>`).join('')}</div>` : '<p class="mini">No unresolved defects. 🎉</p>'}
          <h4 style="margin-top:18px">Status pipeline</h4><div class="pipe">${[['open', open.length], ['dispatched', disp.length], ['resolved', res.length]].map(([k, n]) => `<button class="${CC.status === k ? 'sel' : ''}" data-st="${k}"><b>${n}</b><small>${STATUS[k]}</small></button>`).join('<span>→</span>')}</div></div>
      </div>
      <div class="ccard tbl"><div class="tf"><h4>Assessment log</h4><span class="sp"></span>
        <div class="seg fseg">${['all', 'open', 'dispatched', 'resolved'].map(k => `<button class="${CC.status === k ? 'on' : ''}" data-st="${k}">${k === 'all' ? 'All' : STATUS[k]}</button>`).join('')}</div>
        <select class="in" id="ccMon" aria-label="Filter by monument"><option value="all">All sites</option>${sites.map(s => `<option value="${esc(s.key)}" ${CC.mon === s.key ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>
        <div class="tw"><table><thead><tr><th>Date</th><th>Reference</th><th>Monument</th><th>Severity</th><th>MHI</th><th>Primary defect</th><th>Inspector</th><th>Status</th></tr></thead><tbody>
        ${rows.map(e => { const b = bandOf(e.mhi), ht = hist.some(t => t.id === e.id); return `<tr><td class="mono">${fmtD(e.ts)}</td><td>${ht ? `<button class="lnk mono" data-tk="${esc(e.id)}" title="Open the full ticket">${esc(e.id)}</button>` : `<span class="mono">${esc(e.id)}</span>`}${e.src !== 'ticket' ? ` <span class="src">${e.src === 'demo' ? 'demo' : 'patrol'}</span>` : ''}</td><td>${esc(e.mon.name)}</td><td><span class="badge s${e.level || 1}" style="${e.level ? '' : 'background:#3b6fd8'}">${e.level ? 'L' + e.level + ' ' + LEVELS[e.level].name : 'Clear'}</span></td><td><b style="color:${b[2]}">${e.mhi}</b></td><td>${esc(e.primary)}</td><td>${esc(e.insp || '—')}</td><td><select class="stsel st-${e.status}" data-id="${esc(e.id)}" aria-label="Status of ${esc(e.id)}">${Object.keys(STATUS).map(k => `<option value="${k}" ${e.status === k ? 'selected' : ''}>${STATUS[k]}</option>`).join('')}</select></td></tr>`; }).join('') || '<tr><td colspan="8" class="mini" style="text-align:center;padding:22px">No assessments match these filters.</td></tr>'}
        </tbody></table></div>${total > rows.length ? `<p class="mini">Showing the latest ${rows.length} of ${total}. Export CSV for the full log.</p>` : ''}</div>`;
    const body = $('#ccBody');
    const setMon = k => { CC.mon = CC.mon === k ? 'all' : k; renderCC(); };
    body.querySelectorAll('.pin, .site').forEach(el => { el.onclick = () => setMon(el.dataset.k); el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMon(el.dataset.k); } }; });
    body.querySelectorAll('[data-st]').forEach(b => b.onclick = () => { CC.status = b.dataset.st === CC.status && b.closest('.pipe') ? 'all' : b.dataset.st; renderCC(); });
    $('#ccMon').onchange = () => { CC.mon = $('#ccMon').value; renderCC(); };
    body.querySelectorAll('.stsel').forEach(sel => sel.onchange = () => { const a = idxLoad(), e = a.find(x => x.id === sel.dataset.id); if (!e) return; e.status = sel.value; idxSave(a); updateCCBadge(); const y = $('#cc').scrollTop; renderCC(); $('#cc').scrollTop = y; toast(`${e.id} → ${STATUS[e.status]}`); });
    body.querySelectorAll('[data-tk]').forEach(b => b.onclick = () => { const t = store.get(HK, []).find(x => x.id === b.dataset.tk); if (t) openTicket(hydrateTicket(t)); });
    const d3 = $('#ccDemo3'); if (d3) d3.onclick = toggleDemo;
  }
  function demoData() {
    let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const plan = { konark: ['salt', 'crust', 'loss'], hampi: ['paint', 'carving', 'bio'], ellora: ['bio', 'crack', 'salt'], qutb: ['carving', 'crust'], redfort: ['paint', 'carving', 'crack'], taj: ['crust', 'bio'], khajuraho: ['bio', 'crack'], sanchi: ['bio', 'salt'], thanjavur: ['crust', 'crack'] };
    const names = ['R. Meena', 'S. Iyer', 'A. Khan', 'P. Das', 'K. Rao'], out = []; let k = 0;
    Object.keys(plan).forEach(id => {
      const m = MONUMENTS.find(x => x.id === id), n = 2 + Math.floor(rnd() * 3); let base = 70 + Math.round(rnd() * 25);
      for (let i = 0; i < n; i++) {
        const daysAgo = Math.round((n - i) * (12 + rnd() * 14) - rnd() * 6), ts = new Date(Date.now() - daysAgo * 864e5 - rnd() * 36e6).toISOString();
        base = Math.max(22, Math.min(98, base + Math.round((rnd() - 0.62) * 22)));
        const lvl = base >= 88 ? (rnd() < 0.5 ? 0 : 1) : base >= 70 ? 1 + (rnd() < 0.35 ? 1 : 0) : base >= 48 ? 2 : 3;
        base = Math.max(MHI_RANGE[lvl][0], Math.min(MHI_RANGE[lvl][1], base));
        const t = plan[id][Math.floor(rnd() * plan[id].length)], types = {}; if (lvl) { types[t] = 1 + Math.floor(rnd() * 3); if (rnd() < 0.5) { const t2 = plan[id][Math.floor(rnd() * plan[id].length)]; types[t2] = (types[t2] || 0) + 1; } }
        const last = i === n - 1, status = !lvl ? 'resolved' : last ? (lvl === 3 && rnd() < 0.5 ? 'dispatched' : 'open') : (rnd() < 0.8 ? 'resolved' : 'dispatched');
        out.push({ id: `DEMO-${String(++k).padStart(3, '0')}`, ts, mon: { id, name: m.name, loc: m.loc }, ll: COORD[id], level: lvl, mhi: base, primary: lvl ? CV.TYPES[t].name : 'None', ptype: lvl ? t : null, types, n: Object.values(types).reduce((a, b) => a + b, 0), status, insp: names[Math.floor(rnd() * names.length)], src: 'demo' });
      }
    });
    return out;
  }
  function toggleDemo() {
    const a = idxLoad();
    if (a.some(e => e.src === 'demo')) { idxSave(a.filter(e => e.src !== 'demo')); toast('Demo data removed'); }
    else { idxAdd(demoData()); toast('Demo data loaded. It is clearly labelled and can be removed any time.'); }
    updateCCBadge(); renderCC();
  }
  $('#ccDemo').onclick = toggleDemo;
  $('#ccCsv').onclick = () => {
    const a = idxLoad(); if (!a.length) { toast('Nothing to export yet.', true); return; }
    const q = v => { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    const head = ['reference', 'date_iso', 'monument', 'location', 'latitude', 'longitude', 'severity_level', 'severity_name', 'health_index', 'health_band', 'primary_defect', 'findings', 'defect_types', 'status', 'inspector', 'source'];
    const lines = [head.join(',')].concat(a.map(e => [e.id, e.ts, e.mon.name, e.mon.loc, e.ll ? e.ll[0] : '', e.ll ? e.ll[1] : '', e.level, LEVELS[e.level].name, e.mhi, bandOf(e.mhi)[1], e.primary, e.n, Object.entries(e.types || {}).map(([t, n]) => `${t}:${n}`).join(' '), STATUS[e.status], e.insp, e.src].map(q).join(',')));
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), u = URL.createObjectURL(blob), l = document.createElement('a');
    l.href = u; l.download = `sentinel-command-centre-${new Date().toISOString().slice(0, 10)}.csv`; root.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
  };

  /* ---------------- what's new strip & shortcuts ---------------- */
  root.querySelectorAll('[data-go]').forEach(b => b.onclick = () => {
    const g = b.dataset.go;
    if (g === 'cc') return openCC();
    if (g === 'live') { if (S.mode === 'temporal') setMode('single'); return openLive(S.mode === 'patrol' ? 'patrol' : 'single'); }
    if (g === 'patrol') { setMode('patrol'); $('.work').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (!S.res) { $('.work').scrollIntoView({ behavior: 'smooth', block: 'start' }); toast(g === 'notes' ? 'Run a scan first. Field notes appear under the results.' : 'Run a scan first (try a sample photo), then use this on the result.'); return; }
    if (g === 'mark') { setMarking(true); $('.viewer').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    if (g === 'loupe') { setLoupe(true); $('.viewer').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    if (g === 'notes') { $('#notesCard').scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => notes.focus(), 400); }
  });
  listen(document, 'keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement && document.activeElement.tagName)) return;
    if (!S.res || !$('#results').classList.contains('on') || root.querySelector('.modal.on, .cc.on, .drawer.on')) return;
    if (e.key === 'm' || e.key === 'M') setMarking(!S.marking);
    else if (e.key === 'l' || e.key === 'L') setLoupe(!S.loupe);
  });

  /* migrate tickets saved before the Command Centre existed */
  const migrate = () => { const a = idxLoad(), ids = new Set(a.map(e => e.id)), add = store.get(HK, []).filter(t => !ids.has(t.id)).map(t => idxEntry(t, 'ticket')); if (add.length) idxAdd(add); };
  updateCCBadge();

  /* ---------------- boot ---------------- */
  setMode('single'); renderHistory();

  /* load saved tickets + Command Centre log from the account (once the profile is available) */
  (async () => {
    for (let i = 0; i < 50 && alive && !ctx.me; i++) await sleep(200);
    if (!alive) return;
    if (!$('#insp').value) $('#insp').value = accName();
    const [tickets, index] = await Promise.all([ctx.loadState(REMOTE_KEYS.sentinelTickets), ctx.loadState(REMOTE_KEYS.sentinelIndex)]);
    if (!alive) return;
    if (Array.isArray(tickets)) mem[HK] = tickets.concat((mem[HK] || []).filter(t => !tickets.some(x => x.id === t.id)));
    if (Array.isArray(index)) { const local = mem[IK] || []; mem[IK] = local.concat(index.filter(e => !local.some(x => x.id === e.id))).sort((x, y) => y.ts.localeCompare(x.ts)); }
    migrate(); updateCCBadge(); renderHistory();
    if ($('#cc').classList.contains('on')) renderCC();
  })();

  return () => {
    alive = false;
    // flush pending saves
    Object.keys(saveT).forEach(k => { window.clearTimeout(saveT[k]); ctx.saveState(REMOTE_KEYS[k], mem[k]); });
    timers.forEach(id => window.clearTimeout(id)); timers.clear();
    rafs.forEach(id => window.cancelAnimationFrame(id)); rafs.clear();
    offs.forEach(off => off()); offs.length = 0;
    Live.on = false; if (Live.stream) Live.stream.getTracks().forEach(t => t.stop()); Live.stream = null; try { camV.srcObject = null; } catch (e) {}
    if (rec) { try { rec.onend = null; rec.onresult = null; rec.onerror = null; rec.abort(); } catch (e) {} rec = null; }
    try { $('#pdfFrame').src = 'about:blank'; } catch (e) {}
    if (S.pdfUrl) { URL.revokeObjectURL(S.pdfUrl); S.pdfUrl = null; }
    if (scrollLocked) document.body.style.overflow = '';
  };
}
