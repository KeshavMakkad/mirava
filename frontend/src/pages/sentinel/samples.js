/* eslint-disable */
// Ported verbatim from legacy/Sentinel.html — procedural demo photos.
import { CV } from './cv.js'
/* =====================================================================
   PROCEDURAL DEMO PHOTOS — carved stone with real damage patterns
   ===================================================================== */
export const Samples = (() => {
  'use strict';
  function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function noise(w, h, cell, rand) {
    const gw = Math.ceil(w / cell) + 2, gh = Math.ceil(h / cell) + 2, G = new Float32Array(gw * gh);
    for (let i = 0; i < G.length; i++) G[i] = rand();
    const o = new Float32Array(w * h);
    for (let y = 0; y < h; y++) { const gy = y / cell, y0 = gy | 0, fy = gy - y0, sy = fy * fy * (3 - 2 * fy);
      for (let x = 0; x < w; x++) { const gx = x / cell, x0 = gx | 0, fx = gx - x0, sx = fx * fx * (3 - 2 * fx), i = y0 * gw + x0;
        o[y * w + x] = (G[i] * (1 - sx) + G[i + 1] * sx) * (1 - sy) + (G[i + gw] * (1 - sx) + G[i + gw + 1] * sx) * sy; } }
    return o;
  }
  function fbm(w, h, rand, base, oct) {
    const o = new Float32Array(w * h); let amp = 1, tot = 0, cell = base;
    for (let k = 0; k < oct; k++) { const n = noise(w, h, Math.max(2, cell), rand); for (let i = 0; i < o.length; i++) o[i] += n[i] * amp; tot += amp; amp *= 0.5; cell /= 2; }
    for (let i = 0; i < o.length; i++) o[i] /= tot; return o;
  }
  function blur(a, w, h, r, times) { let o = a; for (let t = 0; t < times; t++) o = CV.boxBlur(o, w, h, r); return o; }

  function motif(ctx, W, H, kind) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#fff';
    const cx = W / 2, cy = H / 2;
    if (kind === 'wheel') {
      const R = Math.min(W, H) * 0.44;
      ctx.lineWidth = R * 0.11; ctx.beginPath(); ctx.arc(cx, cy, R * 0.9, 0, 7); ctx.stroke();
      ctx.lineWidth = R * 0.03; ctx.beginPath(); ctx.arc(cx, cy, R * 0.74, 0, 7); ctx.stroke();
      for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; ctx.lineWidth = i % 2 ? R * 0.035 : R * 0.075; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * R * 0.2, cy + Math.sin(a) * R * 0.2); ctx.lineTo(cx + Math.cos(a) * R * 0.85, cy + Math.sin(a) * R * 0.85); ctx.stroke(); }
      for (let i = 0; i < 32; i++) { const a = i / 32 * Math.PI * 2; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * R * 1.02, cy + Math.sin(a) * R * 1.02, R * 0.028, 0, 7); ctx.fill(); }
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.2, 0, 7); ctx.fill();
      for (let i = 0; i < 8; i++) { const a = (i + 0.5) / 8 * Math.PI * 2; ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * R * 0.52, cy + Math.sin(a) * R * 0.52, R * 0.09, R * 0.05, a, 0, 7); ctx.fill(); }
    } else if (kind === 'lotus') {
      const R = Math.min(W, H) * 0.36;
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * R * 0.55, cy + Math.sin(a) * R * 0.55, R * 0.45, R * 0.17, a, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(cx, cy, R * 0.3, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, R * 0.22, 0, 7); ctx.fill();
      ctx.lineWidth = 16; ctx.strokeRect(W * 0.06, H * 0.07, W * 0.88, H * 0.86);
      for (let i = 0; i < 22; i++) { ctx.beginPath(); ctx.arc(W * 0.1 + i * W * 0.8 / 21, H * 0.035, 9, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(W * 0.1 + i * W * 0.8 / 21, H * 0.965, 9, 0, 7); ctx.fill(); }
    } else { // panel with arch + pilasters
      ctx.lineWidth = 22; ctx.strokeRect(W * 0.08, H * 0.08, W * 0.84, H * 0.84);
      ctx.beginPath(); ctx.moveTo(W * 0.25, H * 0.88); ctx.lineTo(W * 0.25, H * 0.45); ctx.quadraticCurveTo(W * 0.5, H * 0.08, W * 0.75, H * 0.45); ctx.lineTo(W * 0.75, H * 0.88); ctx.lineWidth = 18; ctx.stroke();
      for (let i = 0; i < 6; i++) { ctx.fillRect(W * 0.12, H * (0.16 + i * 0.12), W * 0.07, H * 0.06); ctx.fillRect(W * 0.81, H * (0.16 + i * 0.12), W * 0.07, H * 0.06); }
      ctx.beginPath(); ctx.arc(W * 0.5, H * 0.56, Math.min(W, H) * 0.09, 0, 7); ctx.fill();
    }
  }

  function scene(W, H, o) {
    const rand = rng(o.seed), n = W * H;
    const N = fbm(W, H, rand, 220, 5), G = fbm(W, H, rand, 26, 3), V = fbm(W, H, rand, 120, 4);
    const mc = document.createElement('canvas'); mc.width = W; mc.height = H; const mx = mc.getContext('2d'); motif(mx, W, H, o.motif);
    const md = mx.getImageData(0, 0, W, H).data; let Hm = new Float32Array(n); for (let i = 0; i < n; i++) Hm[i] = md[i * 4] / 255;
    Hm = blur(Hm, W, H, 4, 3);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const ctx = cv.getContext('2d');
    const img = ctx.createImageData(W, H), d = img.data, [r0, g0, b0] = o.base;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, xl = x > 0 ? i - 1 : i, xr = x < W - 1 ? i + 1 : i, yu = y > 0 ? i - W : i, yd = y < H - 1 ? i + W : i;
      const nx = (Hm[xr] - Hm[xl]) * 9, ny = (Hm[yd] - Hm[yu]) * 9;
      const sh = Math.min(1.45, Math.max(0.55, 1 + (-nx * 0.7 - ny * 0.7))) * (0.86 + 0.14 * Hm[i]);
      let t = (0.8 + 0.34 * (N[i] - 0.5) * 2 * 0.5 + 0.1) * (0.93 + 0.14 * G[i]);
      if (o.speckle) { const s = rand(); if (s < 0.05) t *= 0.62; else if (s < 0.09) t *= 1.22; }
      if (o.veins) t *= 1 - 0.12 * Math.max(0, 1 - Math.abs(V[i] - 0.5) * 18);
      let r = r0 * t * sh, g = g0 * t * sh, b = b0 * t * sh;
      if (o.moss) { const m = V[i] * 0.7 + N[i] * 0.3, yy = y / H; if (m > 0.58 && yy > 0.3) { const a = Math.min(1, (m - 0.58) * 9) * Math.min(1, (yy - 0.3) / 0.18); r = r * (1 - a) + (62 + 30 * G[i]) * a * sh; g = g * (1 - a) + (92 + 40 * G[i]) * a * sh; b = b * (1 - a) + (34 + 14 * G[i]) * a * sh; } }
      if (o.crust) { const m = N[i]; if (m > 0.6 && y / H < 0.5) { const a = Math.min(0.92, (m - 0.6) * 8) * Math.min(1, (0.5 - y / H) / 0.15); r = r * (1 - a) + 34 * a; g = g * (1 - a) + 31 * a; b = b * (1 - a) + 30 * a; } }
      if (o.salt) { const m = V[i] * 0.6 + G[i] * 0.4, yy = y / H; if (m > 0.55 && yy > 0.5) { const a = Math.min(0.95, (m - 0.55) * 7) * (0.75 + 0.25 * rand()) * Math.min(1, (yy - 0.5) / 0.16); r = r * (1 - a) + 242 * a; g = g * (1 - a) + 240 * a; b = b * (1 - a) + 234 * a; } }
      const p = i * 4; d[p] = r; d[p + 1] = g; d[p + 2] = b; d[p + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return cv;
  }

  function spray(ctx, text, x, y, size, color, rand, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || -0.06);
    ctx.font = `900 ${size}px "Arial Black", Impact, Arial, sans-serif`; ctx.textBaseline = 'middle';
    ctx.globalAlpha = 0.35; ctx.shadowColor = color; ctx.shadowBlur = size * 0.18; ctx.fillStyle = color; ctx.fillText(text, 0, 0);
    ctx.globalAlpha = 0.9; ctx.shadowBlur = size * 0.05; ctx.lineWidth = size * 0.075; ctx.lineJoin = 'round'; ctx.strokeStyle = color; ctx.strokeText(text, 0, 0); ctx.fillText(text, 0, 0);
    const tw = ctx.measureText(text).width; ctx.shadowBlur = 0; ctx.globalAlpha = 0.75;
    for (let i = 0; i < 420; i++) { ctx.beginPath(); ctx.arc(rand() * tw, (rand() - 0.5) * size * 1.3, rand() * 1.8 + 0.4, 0, 7); ctx.fill(); }
    for (let i = 0; i < 4; i++) { const dx = rand() * tw; ctx.fillRect(dx, size * 0.2, 2.5, size * (0.3 + rand() * 0.5)); }
    ctx.restore();
  }
  function scratch(ctx, text, x, y, size, color, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0.04); ctx.font = `italic 600 ${size}px Georgia, "Times New Roman", serif`;
    ctx.lineWidth = Math.max(1.6, size / 32); ctx.strokeStyle = color; ctx.globalAlpha = 0.95; ctx.strokeText(text, 0, 0);
    ctx.globalAlpha = 0.5; ctx.strokeText(text, 1.2, 0.8);
    ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.moveTo(-10, size * 0.32); ctx.lineTo(ctx.measureText(text).width + 14, size * 0.24); ctx.stroke();
    ctx.restore();
  }
  function crack(ctx, rand, x, y, len, ang, width) {
    const pts = [[x, y]]; let a = ang, px = x, py = y, steps = Math.round(len / 7);
    for (let i = 0; i < steps; i++) { a += (rand() - 0.5) * 0.75; a = ang + (a - ang) * 0.8; px += Math.cos(a) * 7; py += Math.sin(a) * 7; pts.push([px, py]); }
    const draw = (p, w0, w1, c) => { for (let i = 1; i < p.length; i++) { ctx.strokeStyle = c; ctx.lineWidth = w0 + (w1 - w0) * i / p.length; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(p[i - 1][0], p[i - 1][1]); ctx.lineTo(p[i][0], p[i][1]); ctx.stroke(); } };
    ctx.save(); ctx.translate(0.8, 0.8); draw(pts, width * 0.8, 0.6, 'rgba(255,240,220,.35)'); ctx.restore();
    draw(pts, width, 1, 'rgba(22,15,12,.93)');
    for (let b = 0; b < 3; b++) {
      const s = pts[Math.floor(pts.length * (0.25 + rand() * 0.5))], bp = [[s[0], s[1]]]; let ba = ang + (rand() < 0.5 ? -1 : 1) * (0.6 + rand() * 0.5), bx = s[0], by = s[1];
      for (let i = 0; i < steps * 0.3; i++) { ba += (rand() - 0.5) * 0.7; bx += Math.cos(ba) * 6; by += Math.sin(ba) * 6; bp.push([bx, by]); }
      draw(bp, width * 0.55, 0.6, 'rgba(22,15,12,.9)');
    }
  }

  const W = 960, Hh = 720;
  const DEFS = [
    { id: 'konark', label: 'Konark wheel', sub: 'fresh spray graffiti', mon: 'konark', make() { const c = scene(W, Hh, { seed: 11, motif: 'wheel', base: [150, 128, 104] }); const x = c.getContext('2d'), r = rng(5); spray(x, 'RAJ ♥ ANU', 300, 470, 92, '#d3122a', r, -0.08); spray(x, 'KK', 690, 190, 70, '#1e4fd8', r, 0.12); return c; } },
    { id: 'hampi', label: 'Hampi pillar', sub: 'structural crack', mon: 'hampi', make() { const c = scene(W, Hh, { seed: 23, motif: 'panel', base: [158, 150, 140], speckle: true }); const x = c.getContext('2d'), r = rng(9); crack(x, r, 180, 70, 820, 1.02, 4.2); return c; } },
    { id: 'ellora', label: 'Ellora wall', sub: 'moss & black crust', mon: 'ellora', make() { return scene(W, Hh, { seed: 37, motif: 'lotus', base: [118, 112, 106], moss: true, crust: true }); } },
    { id: 'qutb', label: 'Qutb panel', sub: 'carved names + salt', mon: 'qutb', make() { const c = scene(W, Hh, { seed: 41, motif: 'panel', base: [176, 104, 78], salt: true }); const x = c.getContext('2d'); scratch(x, 'Vicky + Sona', 250, 300, 74, 'rgba(250,226,205,.95)', -0.05); scratch(x, 'was here', 330, 390, 58, 'rgba(250,226,205,.9)', 0.02); return c; } }
  ];
  function pair() {
    const big = scene(1200, 900, { seed: 77, motif: 'lotus', base: [172, 98, 72] });
    const dmg = document.createElement('canvas'); dmg.width = 1200; dmg.height = 900; const x = dmg.getContext('2d'); x.drawImage(big, 0, 0);
    const r = rng(3); crack(x, r, 330, 160, 520, 1.15, 3.6); spray(x, 'SAM 2026', 610, 640, 80, '#0b8f3a', r, -0.05); scratch(x, 'Ravi', 700, 300, 66, 'rgba(250,226,205,.95)', 0.1);
    const before = document.createElement('canvas'); before.width = W; before.height = Hh; const bx = before.getContext('2d');
    bx.filter = 'sepia(0.35) saturate(0.8) contrast(0.92) brightness(0.96)'; bx.drawImage(big, -120, -90); bx.filter = 'none';
    const after = document.createElement('canvas'); after.width = W; after.height = Hh; const ax = after.getContext('2d');
    ax.filter = 'brightness(1.07) saturate(1.06)'; ax.translate(W / 2 + 14, Hh / 2 - 9); ax.rotate(2.6 * Math.PI / 180); ax.scale(1.06, 1.06); ax.drawImage(dmg, -600, -450); ax.setTransform(1, 0, 0, 1, 0, 0); ax.filter = 'none';
    return { before, after };
  }
  return { DEFS, pair };
})();
