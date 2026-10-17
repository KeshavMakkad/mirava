/* eslint-disable */
// Ported verbatim from legacy/Sentinel.html — SENTINEL CV ENGINE (pure JS, no DOM).
/* =====================================================================
   SENTINEL CV ENGINE — pure JavaScript, no dependencies
   ===================================================================== */
export const CV = (() => {
  'use strict';
  const LIN = new Float32Array(256);
  for (let i = 0; i < 256; i++) { const c = i / 255; LIN[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  const fl = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;

  function toLab(d, n) {
    const L = new Float32Array(n), A = new Float32Array(n), B = new Float32Array(n);
    for (let i = 0, j = 0; i < n; i++, j += 4) {
      const r = LIN[d[j]], g = LIN[d[j + 1]], b = LIN[d[j + 2]];
      const fx = fl((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047);
      const fy = fl(0.2126 * r + 0.7152 * g + 0.0722 * b);
      const fz = fl((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883);
      L[i] = 116 * fy - 16; A[i] = 500 * (fx - fy); B[i] = 200 * (fy - fz);
    }
    return { L, A, B };
  }
  function gray(d, n) { const g = new Float32Array(n); for (let i = 0, j = 0; i < n; i++, j += 4) g[i] = 0.299 * d[j] + 0.587 * d[j + 1] + 0.114 * d[j + 2]; return g; }

  function boxBlur(src, w, h, r) {
    const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
    if (r < 1) { out.set(src); return out; }
    for (let y = 0; y < h; y++) {
      const o = y * w; let acc = 0, cnt = 0;
      for (let x = 0; x <= r && x < w; x++) { acc += src[o + x]; cnt++; }
      for (let x = 0; x < w; x++) {
        tmp[o + x] = acc / cnt;
        const xa = x - r, xb = x + r + 1;
        if (xa >= 0) { acc -= src[o + xa]; cnt--; }
        if (xb < w) { acc += src[o + xb]; cnt++; }
      }
    }
    for (let x = 0; x < w; x++) {
      let acc = 0, cnt = 0;
      for (let y = 0; y <= r && y < h; y++) { acc += tmp[y * w + x]; cnt++; }
      for (let y = 0; y < h; y++) {
        out[y * w + x] = acc / cnt;
        const ya = y - r, yb = y + r + 1;
        if (ya >= 0) { acc -= tmp[ya * w + x]; cnt--; }
        if (yb < h) { acc += tmp[yb * w + x]; cnt++; }
      }
    }
    return out;
  }

  // separable min / max filter with square window (2r+1)
  function rank(src, w, h, r, isMax) {
    const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      const o = y * w;
      for (let x = 0; x < w; x++) {
        const a = x - r < 0 ? 0 : x - r, b = x + r >= w ? w - 1 : x + r;
        let m = src[o + a];
        if (isMax) { for (let k = a + 1; k <= b; k++) if (src[o + k] > m) m = src[o + k]; }
        else { for (let k = a + 1; k <= b; k++) if (src[o + k] < m) m = src[o + k]; }
        tmp[o + x] = m;
      }
    }
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        const a = y - r < 0 ? 0 : y - r, b = y + r >= h ? h - 1 : y + r;
        let m = tmp[a * w + x];
        if (isMax) { for (let k = a + 1; k <= b; k++) { const v = tmp[k * w + x]; if (v > m) m = v; } }
        else { for (let k = a + 1; k <= b; k++) { const v = tmp[k * w + x]; if (v < m) m = v; } }
        out[y * w + x] = m;
      }
    }
    return out;
  }

  // binary dilation via running box counts (O(n))
  function dilate(m, w, h, r) {
    if (r < 1) return m.slice();
    const tmp = new Uint16Array(w * h), out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      const o = y * w; let acc = 0;
      for (let x = 0; x <= r && x < w; x++) acc += m[o + x];
      for (let x = 0; x < w; x++) {
        tmp[o + x] = acc;
        if (x - r >= 0) acc -= m[o + x - r];
        if (x + r + 1 < w) acc += m[o + x + r + 1];
      }
    }
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let y = 0; y <= r && y < h; y++) acc += tmp[y * w + x] > 0 ? 1 : 0;
      for (let y = 0; y < h; y++) {
        out[y * w + x] = acc > 0 ? 1 : 0;
        if (y - r >= 0) acc -= tmp[(y - r) * w + x] > 0 ? 1 : 0;
        if (y + r + 1 < h) acc += tmp[(y + r + 1) * w + x] > 0 ? 1 : 0;
      }
    }
    return out;
  }
  function invert(m) { const o = new Uint8Array(m.length); for (let i = 0; i < m.length; i++) o[i] = m[i] ? 0 : 1; return o; }
  const erode = (m, w, h, r) => invert(dilate(invert(m), w, h, r));
  const open = (m, w, h, r) => dilate(erode(m, w, h, r), w, h, r);
  const close = (m, w, h, r) => erode(dilate(m, w, h, r), w, h, r);

  function sample(arr, step) { const out = new Float32Array(Math.ceil(arr.length / step)); let k = 0; for (let i = 0; i < arr.length; i += step) out[k++] = arr[i]; return out.subarray(0, k); }
  function median(arr) { const s = sample(arr, Math.max(1, Math.floor(arr.length / 60000))).slice().sort(); return s.length ? s[s.length >> 1] : 0; }
  function mad(arr, med) { const s = sample(arr, Math.max(1, Math.floor(arr.length / 60000))); const d = new Float32Array(s.length); for (let i = 0; i < s.length; i++) d[i] = Math.abs(s[i] - med); d.sort(); return d.length ? d[d.length >> 1] : 0; }
  function otsu(vals, mask, lo, hi) {
    const H = new Float64Array(256); let tot = 0;
    for (let i = 0; i < vals.length; i++) { if (mask && !mask[i]) continue; let v = (vals[i] - lo) / (hi - lo); v = v < 0 ? 0 : v > 1 ? 1 : v; H[Math.round(v * 255)]++; tot++; }
    let sum = 0; for (let i = 0; i < 256; i++) sum += i * H[i];
    let sB = 0, wB = 0, best = 0, th = 0;
    for (let t = 0; t < 256; t++) { wB += H[t]; if (!wB) continue; const wF = tot - wB; if (!wF) break; sB += t * H[t]; const mB = sB / wB, mF = (sum - sB) / wF, v = wB * wF * (mB - mF) * (mB - mF); if (v > best) { best = v; th = t; } }
    return lo + (th / 255) * (hi - lo);
  }

  // connected components (8-connectivity)
  function label(m, w, h) {
    const lab = new Int32Array(w * h), q = new Int32Array(w * h); let id = 0;
    for (let s = 0; s < w * h; s++) {
      if (!m[s] || lab[s]) continue;
      id++; let qh = 0, qt = 0; q[qt++] = s; lab[s] = id;
      while (qh < qt) {
        const p = q[qh++], x = p % w, y = (p - x) / w;
        for (let dy = -1; dy <= 1; dy++) {
          const yy = y + dy; if (yy < 0 || yy >= h) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx; if (xx < 0 || xx >= w) continue;
            const k = yy * w + xx; if (m[k] && !lab[k]) { lab[k] = id; q[qt++] = k; }
          }
        }
      }
    }
    return { lab, count: id };
  }

  // group raw mask pixels into clusters (dilation radius g), stats from raw pixels
  function clusters(raw, w, h, g, minPx, val) {
    const grp = g > 0 ? dilate(raw, w, h, g) : raw;
    const { lab, count } = label(grp, w, h);
    const S = [];
    for (let i = 0; i <= count; i++) S.push({ id: i, n: 0, x0: w, y0: h, x1: -1, y1: -1, sx: 0, sy: 0, sxx: 0, syy: 0, sxy: 0, sv: 0, seed: -1 });
    for (let i = 0; i < raw.length; i++) {
      if (!raw[i]) continue;
      const c = S[lab[i]]; const x = i % w, y = (i - x) / w;
      c.n++; if (c.seed < 0) c.seed = i;
      if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x; if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y;
      c.sx += x; c.sy += y; c.sxx += x * x; c.syy += y * y; c.sxy += x * y; if (val) c.sv += val[i];
    }
    const list = [];
    for (let i = 1; i <= count; i++) {
      const c = S[i]; if (c.n < minPx) continue;
      const mx = c.sx / c.n, my = c.sy / c.n, vxx = c.sxx / c.n - mx * mx, vyy = c.syy / c.n - my * my, vxy = c.sxy / c.n - mx * my;
      const tr = (vxx + vyy) / 2, dd = Math.sqrt(Math.max(0, ((vxx - vyy) / 2) ** 2 + vxy * vxy));
      const l1 = tr + dd;
      c.len = Math.max(1, Math.sqrt(12 * Math.max(l1, 0)));
      c.wid = c.n / c.len; c.ang = 0.5 * Math.atan2(2 * vxy, vxx - vyy) * 180 / Math.PI;
      c.cx = mx; c.cy = my; c.mv = val ? c.sv / c.n : 0;
      list.push(c);
    }
    return { list, lab };
  }

  /* ------------------------------ SINGLE SCAN ------------------------------ */
  const TYPES = {
    paint:   { name: 'Spray-Paint / Ink Graffiti', short: 'Graffiti', color: '#ff3d7f' },
    carving: { name: 'Sharp-Tool Carving / Scratched Graffiti', short: 'Carving', color: '#ffd23f' },
    crack:   { name: 'Surface Crack', short: 'Crack', color: '#ff6a1f' },
    bio:     { name: 'Bio-film & Moss Accumulation', short: 'Bio-growth', color: '#4cd964' },
    crust:   { name: 'Black Crust / Dark Bio-film', short: 'Black crust', color: '#a98bff' },
    salt:    { name: 'Salt Weathering / Efflorescence', short: 'Salt', color: '#5ad8ff' },
    loss:    { name: 'Material Loss / Spalling', short: 'Loss', color: '#ff9f43' },
    change:  { name: 'Unclassified Surface Change', short: 'Change', color: '#ffffff' }
  };

  function crackName(c, many) {
    if (many) return 'Micro-cracking Network';
    const a = Math.abs(c.ang);
    return a < 30 ? 'Transverse Surface Crack' : a > 60 ? 'Vertical Surface Crack' : 'Diagonal Surface Crack';
  }

  function sevFor(type, f, diag) {
    const a = f.areaPct;
    switch (type) {
      case 'paint': return a >= 0.25 ? 3 : 2;
      case 'carving': return a >= 0.08 || f.len >= 0.12 * diag ? 3 : 2;
      case 'crack': { const r = f.len / diag; return r >= 0.28 ? 3 : r >= 0.12 ? 2 : 1; }
      case 'bio': return a >= 25 ? 3 : a >= 6 ? 2 : 1;
      case 'crust': return a >= 30 ? 3 : a >= 8 ? 2 : 1;
      case 'salt': return a >= 20 ? 3 : a >= 4 ? 2 : 1;
      case 'loss': return a >= 1 ? 3 : 2;
      default: return a >= 1.5 ? 2 : 1;
    }
  }
  const sig = r => r >= 1.9 ? 'Strong' : r >= 1.35 ? 'Moderate' : 'Weak';

  const DBG = {};
  function scanSingle(F, P) {
    const { w, h, data } = F, n = w * h, diag = Math.hypot(w, h);
    const k = 9.4 - 0.62 * P.sens;            // robust-sigma multiplier: sens 1 → 8.8, sens 10 → 3.2
    const det = P.det;
    const { L, A, B } = toLab(data, n);
    const Lm = median(L), Ls = Math.max(4, 1.4826 * mad(L, Lm)), am = median(A), bm = median(B);
    const C = new Float32Array(n), dab = new Float32Array(n);
    for (let i = 0; i < n; i++) { C[i] = Math.hypot(A[i], B[i]); dab[i] = Math.hypot(A[i] - am, B[i] - bm); }
    const Cm = median(C), dm = median(dab), ds = Math.max(2, 1.4826 * mad(dab, dm));
    const Tpaint = Math.max(20, dm + k * ds * 1.15);
    const Tdark = Math.max(20, k * Ls * 0.6), Tlight = Math.max(24, k * Ls * 0.9);
    const hs = Math.atan2(bm, am);
    DBG.base = { Lm, Ls, am, bm, Cm, dm, ds, Tpaint, Tdark, Tlight, k };
    const paint = new Uint8Array(n), bio = new Uint8Array(n), crust = new Uint8Array(n), salt = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const da = A[i] - am, hue = Math.atan2(B[i], A[i]) * 57.2958;
      const greenish = hue > 92 && hue < 200 && C[i] > 7 && da < -Math.max(5, k * 0.9);
      if (greenish && C[i] < 55) { if (det.bio) bio[i] = 1; continue; }
      if (dab[i] > Tpaint && L[i] > 8) {
        let hd = Math.abs(Math.atan2(B[i], A[i]) - hs); if (hd > Math.PI) hd = 2 * Math.PI - hd;
        if (C[i] > Cm + 12 || (C[i] > 15 && hd > 0.9)) { if (det.paint) paint[i] = 1; continue; }
      }
      if (L[i] < Lm - Tdark && C[i] < 22) { if (det.crust) crust[i] = 1; continue; }
      if (L[i] > Lm + Tlight && C[i] < Math.max(9, Cm * 0.75) && B[i] > -6) { if (det.salt) salt[i] = 1; }
    }
    const layers = {}, findings = [];
    const add = (type, f, extra) => { f.areaPct = f.n / n * 100; const o = Object.assign({ type, name: TYPES[type].name, short: TYPES[type].short, color: TYPES[type].color, box: [f.x0, f.y0, f.x1, f.y1], areaPx: f.n, areaPct: f.areaPct, len: f.len, lid: f.id, include: true }, extra || {}); o.sev = sevFor(type, o, diag); findings.push(o); return o; };

    // colour / tone blobs
    const blob = (type, m, g, minFrac, opR, valArr, T, shapeOk) => {
      if (!det[type]) return;
      const mm = opR ? open(m, w, h, opR) : m;
      let { list, lab } = clusters(mm, w, h, g, Math.max(20, n * minFrac), valArr);
      if (shapeOk) list = list.filter(shapeOk);
      layers[type] = { raw: mm, lab };
      const fs = list.map(c => add(type, c, { signal: sig(T ? c.mv / T : 2) }));
      if (type !== 'paint' && fs.length) { const tot = fs.reduce((a, f) => a + f.areaPct, 0); fs.forEach(f => { f.sev = sevFor(type, { areaPct: tot, len: 0 }, diag); f.detail = `${f.areaPct < 0.1 ? f.areaPct.toFixed(2) : f.areaPct.toFixed(1)}% of frame (${tot.toFixed(1)}% total)`; }); }
    };
    const compact = c => c.len / Math.max(1, c.wid) < 7 && c.n / ((c.x1 - c.x0 + 1) * (c.y1 - c.y0 + 1)) > 0.12;
    blob('paint', paint, Math.round(diag / 110), 0.0005, 1, dab, Tpaint);
    blob('bio', bio, Math.round(diag / 70), 0.0018, 1);
    blob('crust', crust, Math.round(diag / 70), 0.0025, 2, null, 0, compact);
    blob('salt', salt, Math.round(diag / 90), 0.0018, 2, null, 0, compact);

    // thin structures from luminance morphology
    if (det.crack || det.carving) {
      let lum = new Float32Array(n); for (let i = 0; i < n; i++) lum[i] = L[i] * 2.55;
      lum = boxBlur(lum, w, h, 1);
      const r = Math.max(3, Math.round(Math.max(w, h) / 230));
      const ex0 = det.paint ? paint.slice() : new Uint8Array(n);
      ['paint', 'bio', 'crust', 'salt'].forEach(t => { const Ly = layers[t]; if (Ly) for (let i = 0; i < n; i++) if (Ly.raw[i]) ex0[i] = 1; });
      const excl = dilate(ex0, w, h, 5);
      if (det.crack) {
        const bh = rank(rank(lum, w, h, r, true), w, h, r, false);
        for (let i = 0; i < n; i++) bh[i] -= lum[i];
        const med = median(bh), sd = Math.max(1.5, 1.4826 * mad(bh, med));
        const T = Math.max(16, med + k * 1.15 * sd);
        const cm = new Uint8Array(n); for (let i = 0; i < n; i++) cm[i] = bh[i] > T && !excl[i] ? 1 : 0;
        const pre = clusters(cm, w, h, 0, 1, null), lab0 = label(cm, w, h).lab, small = new Set();
        pre.list.forEach(c => { if (c.n < 14 || c.len < 9) small.add(lab0[c.seed]); });
        for (let i = 0; i < n; i++) if (cm[i] && (small.has(lab0[i]) || !pre.list.length)) cm[i] = 0;
        const { list, lab } = clusters(cm, w, h, 5, Math.max(25, n * 0.00005), bh);
        DBG.crack = { T, med, sd, cands: list.map(c => [Math.round(c.len), +c.wid.toFixed(1), Math.round(c.mv)]).slice(0, 12) };
        const keep = list.filter(c => c.len >= 0.055 * diag && c.len / Math.max(1, c.wid) >= 7 && c.wid <= r * 2.4 && c.mv >= T * 1.7);
        // merge crack fragments that are close (a crack interrupted by a joint or a bright grain)
        const gap = diag / 22, near = (a, b) => a.x0 - gap <= b.x1 && b.x0 - gap <= a.x1 && a.y0 - gap <= b.y1 && b.y0 - gap <= a.y1;
        for (let changed = true; changed;) { changed = false;
          for (let i = 0; i < keep.length && !changed; i++) for (let j = i + 1; j < keep.length; j++) if (near(keep[i], keep[j])) {
            const a = keep[i], b = keep[j];
            a.x0 = Math.min(a.x0, b.x0); a.y0 = Math.min(a.y0, b.y0); a.x1 = Math.max(a.x1, b.x1); a.y1 = Math.max(a.y1, b.y1);
            a.mv = (a.mv * a.n + b.mv * b.n) / (a.n + b.n); a.n += b.n; a.len += b.len; (a.ids = a.ids || [a.id]).push(...(b.ids || [b.id]));
            keep.splice(j, 1); changed = true; break; } }
        keep.forEach(c => { if (c.ids) { const set = new Set(c.ids); for (let i = 0; i < n; i++) if (cm[i] && set.has(lab[i])) lab[i] = c.id; } });
        layers.crack = { raw: cm, lab };
        const many = keep.length >= 5 && keep.every(c => c.len < 0.15 * diag);
        keep.forEach(c => add('crack', c, { name: crackName(c, many), signal: sig(c.mv / T), detail: `≈${Math.round(c.len)} px long · ${(c.len / diag * 100).toFixed(0)}% of frame` }));
      }
      if (det.carving) {
        const rc = 2, th = rank(rank(lum, w, h, rc, false), w, h, rc, true);
        for (let i = 0; i < n; i++) th[i] = lum[i] - th[i];
        const med = median(th), sd = Math.max(1.5, 1.4826 * mad(th, med));
        const T = Math.max(13, med + (k + 1.2) * 1.15 * sd);
        const sm = new Uint8Array(n); for (let i = 0; i < n; i++) sm[i] = th[i] > T && !excl[i] ? 1 : 0;
        const er = erode(sm, w, h, 2), erf = new Float32Array(n); for (let i = 0; i < n; i++) erf[i] = er[i];
        const strokes = clusters(sm, w, h, 0, 12, erf).list.filter(c => Math.hypot(c.x1 - c.x0, c.y1 - c.y0) >= 0.02 * diag && c.mv < 0.12);
        DBG.carve = { T, med, sd, strokes: strokes.length };
        const sk = new Uint8Array(n);
        const sl = label(sm, w, h).lab; const keepIds = new Set(strokes.map(s => sl[s.seed]));
        for (let i = 0; i < n; i++) if (sm[i] && keepIds.has(sl[i])) sk[i] = 1;
        const g = Math.round(diag / 75);
        const { list, lab } = clusters(sk, w, h, g, 30, th);
        layers.carving = { raw: sk, lab };
        list.forEach(c => {
          const cnt = strokes.filter(s => lab[s.seed] === c.id).length;
          const tot = strokes.filter(s => lab[s.seed] === c.id).reduce((a, s) => a + s.len, 0);
          if ((cnt >= 3 && tot >= 0.09 * diag) || tot >= 0.16 * diag) add('carving', c, { len: tot, signal: sig(c.mv / T), detail: `${cnt} scratch stroke${cnt > 1 ? 's' : ''} · ${Math.round(tot)} px total` });
        });
      }
    }
    findings.sort((a, b) => b.sev - a.sev || b.areaPx - a.areaPx);
    findings.forEach((f, i) => { f.no = i + 1; f.pos = posOf(f.box, w, h); if (!f.detail) f.detail = `${f.areaPct < 0.1 ? f.areaPct.toFixed(2) : f.areaPct.toFixed(1)}% of frame`; });
    return { mode: 'single', w, h, n, findings, layers, valid: null, stats: { Lm, Cm } };
  }

  function posOf(b, w, h) {
    const cx = (b[0] + b[2]) / 2 / w, cy = (b[1] + b[3]) / 2 / h;
    const v = cy < 0.34 ? 'upper' : cy > 0.66 ? 'lower' : 'middle', hz = cx < 0.34 ? 'left' : cx > 0.66 ? 'right' : 'centre';
    return v === 'middle' && hz === 'centre' ? 'centre' : v + '-' + hz;
  }

  /* ------------------------------ FEATURES & ALIGNMENT ------------------------------ */
  function half(g, w, h) {
    const w2 = w >> 1, h2 = h >> 1, o = new Float32Array(w2 * h2);
    for (let y = 0; y < h2; y++) for (let x = 0; x < w2; x++) { const i = 2 * y * w + 2 * x; o[y * w2 + x] = (g[i] + g[i + 1] + g[i + w] + g[i + w + 1]) / 4; }
    return { g: o, w: w2, h: h2 };
  }
  function corners(g, w, h) {
    const n = w * h, Ixx = new Float32Array(n), Iyy = new Float32Array(n), Ixy = new Float32Array(n);
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx = (g[i - w + 1] + 2 * g[i + 1] + g[i + w + 1]) - (g[i - w - 1] + 2 * g[i - 1] + g[i + w - 1]);
      const gy = (g[i + w - 1] + 2 * g[i + w] + g[i + w + 1]) - (g[i - w - 1] + 2 * g[i - w] + g[i - w + 1]);
      Ixx[i] = gx * gx; Iyy[i] = gy * gy; Ixy[i] = gx * gy;
    }
    const a = boxBlur(Ixx, w, h, 2), b = boxBlur(Iyy, w, h, 2), c = boxBlur(Ixy, w, h, 2);
    const R = new Float32Array(n); let mx = 0;
    for (let i = 0; i < n; i++) { const tr = a[i] + b[i]; R[i] = a[i] * b[i] - c[i] * c[i] - 0.04 * tr * tr; if (R[i] > mx) mx = R[i]; }
    const Rm = rank(R, w, h, 3, true), thr = mx * 0.0004, B = 18;
    const GX = 10, GY = 8, cells = Array.from({ length: GX * GY }, () => []);
    for (let y = B; y < h - B; y++) for (let x = B; x < w - B; x++) {
      const i = y * w + x; if (R[i] > thr && R[i] >= Rm[i]) cells[Math.min(GY - 1, Math.floor(y / h * GY)) * GX + Math.min(GX - 1, Math.floor(x / w * GX))].push({ x, y, r: R[i] });
    }
    const out = []; cells.forEach(c => { c.sort((p, q) => q.r - p.r); out.push(...c.slice(0, 10)); });
    return out;
  }
  function bil(g, w, h, x, y) {
    if (x < 0 || y < 0 || x > w - 1.001 || y > h - 1.001) return NaN;
    const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0, i = y0 * w + x0;
    return g[i] * (1 - fx) * (1 - fy) + g[i + 1] * fx * (1 - fy) + g[i + w] * (1 - fx) * fy + g[i + w + 1] * fx * fy;
  }
  const SCALES = [1, 1.45, 2.1];
  function describe(g, w, h, kps) {
    for (const k of kps) {
      let m10 = 0, m01 = 0;
      for (let dy = -9; dy <= 9; dy++) for (let dx = -9; dx <= 9; dx++) { if (dx * dx + dy * dy > 81) continue; const v = g[(k.y + dy) * w + k.x + dx] || 0; m10 += dx * v; m01 += dy * v; }
      const th = Math.atan2(m01, m10), cs = Math.cos(th), sn = Math.sin(th);
      k.d = SCALES.map(s => {
        const v = new Float32Array(64); let mu = 0, ok = true;
        for (let j = 0; j < 8 && ok; j++) for (let i = 0; i < 8; i++) {
          const ox = (i - 3.5) * 2 * s, oy = (j - 3.5) * 2 * s;
          const val = bil(g, w, h, k.x + ox * cs - oy * sn, k.y + ox * sn + oy * cs);
          if (val !== val) { ok = false; break; } v[j * 8 + i] = val; mu += val;
        }
        if (!ok) return null;
        mu /= 64; let nn = 0; for (let i = 0; i < 64; i++) { v[i] -= mu; nn += v[i] * v[i]; }
        nn = Math.sqrt(nn); if (nn < 40) return null; for (let i = 0; i < 64; i++) v[i] /= nn; return v;
      });
    }
    return kps.filter(k => k.d[1]);
  }
  function match(ka, kb) {
    const M = [];
    for (const a of ka) {
      const da = a.d[1]; let b1 = -2, b2 = -2, bi = null;
      for (const b of kb) {
        let best = -2;
        for (const db of b.d) { if (!db) continue; let s = 0; for (let i = 0; i < 64; i++) s += da[i] * db[i]; if (s > best) best = s; }
        if (best > b1) { b2 = b1; b1 = best; bi = b; } else if (best > b2) b2 = best;
      }
      if (bi && b1 > 0.72 && (1 - b1) < 0.8 * (1 - b2)) M.push({ ax: a.x, ay: a.y, bx: bi.x, by: bi.y, s: b1 });
    }
    return M;
  }
  function fitSim(ms) {
    let max = 0, may = 0, mbx = 0, mby = 0; const N = ms.length;
    for (const m of ms) { max += m.ax; may += m.ay; mbx += m.bx; mby += m.by; }
    max /= N; may /= N; mbx /= N; mby /= N;
    let sxx = 0, sxy = 0, saa = 0;
    for (const m of ms) { const ax = m.ax - max, ay = m.ay - may, bx = m.bx - mbx, by = m.by - mby; sxx += ax * bx + ay * by; sxy += ax * by - ay * bx; saa += ax * ax + ay * ay; }
    if (saa < 1e-6) return null;
    const p = sxx / saa, q = sxy / saa;
    return { p, q, tx: mbx - (p * max - q * may), ty: mby - (q * max + p * may) };
  }
  function ransac(M, tol) {
    if (M.length < 6) return null;
    let best = null, bestIn = [];
    let seed = 12345; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    for (let it = 0; it < 2500; it++) {
      const i = (rnd() * M.length) | 0, j = (rnd() * M.length) | 0; if (i === j) continue;
      const T = fitSim([M[i], M[j]]); if (!T) continue;
      const sc = Math.hypot(T.p, T.q); if (sc < 0.33 || sc > 3) continue;
      const inl = M.filter(m => Math.hypot(T.p * m.ax - T.q * m.ay + T.tx - m.bx, T.q * m.ax + T.p * m.ay + T.ty - m.by) < tol);
      if (inl.length > bestIn.length) { bestIn = inl; best = T; }
    }
    if (!best) return null;
    for (let r = 0; r < 3; r++) {
      const T = fitSim(bestIn); if (!T) break; best = T;
      bestIn = M.filter(m => Math.hypot(T.p * m.ax - T.q * m.ay + T.tx - m.bx, T.q * m.ax + T.p * m.ay + T.ty - m.by) < tol);
    }
    return { T: best, inliers: bestIn.length, total: M.length };
  }
  function align(Fa, Fb) {
    const ga = half(boxBlur(gray(Fa.data, Fa.w * Fa.h), Fa.w, Fa.h, 1), Fa.w, Fa.h);
    const gb = half(boxBlur(gray(Fb.data, Fb.w * Fb.h), Fb.w, Fb.h, 1), Fb.w, Fb.h);
    const ka = describe(boxBlur(ga.g, ga.w, ga.h, 1), ga.w, ga.h, corners(ga.g, ga.w, ga.h));
    const kb = describe(boxBlur(gb.g, gb.w, gb.h, 1), gb.w, gb.h, corners(gb.g, gb.w, gb.h));
    const M = match(ka, kb); DBG.align = { ka: ka.length, kb: kb.length, M: M.length };
    const R = ransac(M, 3.5);
    if (!R || R.inliers < 10 || R.inliers / R.total < 0.18) return { ok: false, matches: M.length, inliers: R ? R.inliers : 0, kpA: ka.length, kpB: kb.length };
    const T = R.T;
    return { ok: true, a: T.p, b: -T.q, c: T.tx * 2, d: T.q, e: T.p, f: T.ty * 2, scale: Math.hypot(T.p, T.q), rot: Math.atan2(T.q, T.p) * 180 / Math.PI, matches: R.total, inliers: R.inliers, kpA: ka.length, kpB: kb.length };
  }

  /* ------------------------------ TEMPORAL CHANGE DETECTION ------------------------------ */
  function scanTemporal(Fa, Fb, P) {
    const { w, h } = Fa, n = w * h, diag = Math.hypot(w, h);
    let al = P.align ? align(Fa, Fb) : { ok: false, skipped: true };
    const X = al.ok ? al : { a: Fb.w / Fa.w, b: 0, c: 0, d: 0, e: Fb.h / Fa.h, f: 0 };
    // warp archival photo into the current photo's frame
    const wb = Fb.w, hb = Fb.h, db = Fb.data, warped = new Uint8ClampedArray(n * 4), valid = new Uint8Array(n);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const u = X.a * x + X.b * y + X.c, v = X.d * x + X.e * y + X.f, o = (y * w + x) * 4;
      if (u < 0 || v < 0 || u > wb - 1.001 || v > hb - 1.001) { warped[o] = 18; warped[o + 1] = 10; warped[o + 2] = 12; warped[o + 3] = 255; continue; }
      const x0 = u | 0, y0 = v | 0, fx = u - x0, fy = v - y0, i = (y0 * wb + x0) * 4;
      for (let c = 0; c < 3; c++) warped[o + c] = db[i + c] * (1 - fx) * (1 - fy) + db[i + 4 + c] * fx * (1 - fy) + db[i + wb * 4 + c] * (1 - fx) * fy + db[i + wb * 4 + 4 + c] * fx * fy;
      warped[o + 3] = 255; valid[y * w + x] = 1;
    }
    const vmask = erode(valid, w, h, 5);
    let vcount = 0; for (let i = 0; i < n; i++) vcount += vmask[i];
    if (vcount < n * 0.15) return { error: 'The two photos barely overlap after alignment. Use photos of the same surface from a similar angle.' };
    const la = toLab(Fa.data, n), lb = toLab(warped, n);
    // photometric normalisation of the archive to the current photo (exposure, tint, fading)
    const st = (arr) => { let s = 0, s2 = 0; for (let i = 0; i < n; i++) if (vmask[i]) { s += arr[i]; s2 += arr[i] * arr[i]; } const m = s / vcount; return [m, Math.sqrt(Math.max(1e-6, s2 / vcount - m * m))]; };
    const [maL, saL] = st(la.L), [mbL, sbL] = st(lb.L), [maA] = st(la.A), [mbA] = st(lb.A), [maB] = st(la.B), [mbB] = st(lb.B);
    const g = Math.min(2.5, Math.max(0.4, saL / sbL));
    for (let i = 0; i < n; i++) { lb.L[i] = (lb.L[i] - mbL) * g + maL; lb.A[i] += maA - mbA; lb.B[i] += maB - mbB; }
    // windowed SSIM on luminance (7x7)
    const X1 = new Float32Array(n), Y1 = new Float32Array(n), XX = new Float32Array(n), YY = new Float32Array(n), XY = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = la.L[i] * 2.55, y = lb.L[i] * 2.55; X1[i] = x; Y1[i] = y; XX[i] = x * x; YY[i] = y * y; XY[i] = x * y; }
    const R = 3, mx = boxBlur(X1, w, h, R), my = boxBlur(Y1, w, h, R), mxx = boxBlur(XX, w, h, R), myy = boxBlur(YY, w, h, R), mxy = boxBlur(XY, w, h, R);
    const C1 = (0.01 * 255) ** 2, C2 = (0.03 * 255) ** 2;
    const ssim = new Float32Array(n), dcol = new Float32Array(n);
    let ssum = 0;
    const dA = new Float32Array(n), dB = new Float32Array(n);
    for (let i = 0; i < n; i++) { dA[i] = la.A[i] - lb.A[i]; dB[i] = la.B[i] - lb.B[i]; }
    const sA = boxBlur(dA, w, h, 2), sB = boxBlur(dB, w, h, 2);
    for (let i = 0; i < n; i++) {
      const vx = mxx[i] - mx[i] * mx[i], vy = myy[i] - my[i] * my[i], cxy = mxy[i] - mx[i] * my[i];
      const s = ((2 * mx[i] * my[i] + C1) * (2 * cxy + C2)) / ((mx[i] * mx[i] + my[i] * my[i] + C1) * (vx + vy + C2));
      ssim[i] = s; if (vmask[i]) ssum += s;
      dcol[i] = Math.min(1, Math.max(0, (Math.hypot(sA[i], sB[i]) - 9) / 28));
    }
    const D0 = new Float32Array(n);
    for (let i = 0; i < n; i++) D0[i] = vmask[i] ? Math.max(Math.min(1, Math.max(0, 1 - ssim[i])), dcol[i]) : 0;
    const D = boxBlur(D0, w, h, 2);
    const lo = 0.66 - 0.032 * P.sens;          // sens 1 → 0.63, sens 10 → 0.34
    const T = Math.min(0.75, Math.max(lo, otsu(D, vmask, 0, 1)));
    let cm = new Uint8Array(n); for (let i = 0; i < n; i++) cm[i] = vmask[i] && D[i] > T ? 1 : 0;
    cm = open(cm, w, h, 1);
    const { list, lab } = clusters(cm, w, h, Math.round(diag / 160), Math.max(30, n * 0.0005), D);
    let changed = 0; for (let i = 0; i < n; i++) changed += cm[i];
    // classify every changed region using colour + tone + shape evidence
    const acc = new Map(); list.forEach(c => acc.set(c.id, { dL: 0, dC: 0, da: 0, ca: 0, k: 0, nd: 0, nb: 0, nc: 0 }));
    for (let i = 0; i < n; i++) {
      if (!cm[i]) continue; const s = acc.get(lab[i]); if (!s) continue;
      s.dL += la.L[i] - lb.L[i]; s.dC += Math.hypot(la.A[i], la.B[i]) - Math.hypot(lb.A[i], lb.B[i]); s.da += la.A[i] - lb.A[i]; s.ca += Math.hypot(la.A[i], la.B[i]); s.k++;
      const l = la.L[i] - lb.L[i], cc = Math.hypot(la.A[i], la.B[i]) - Math.hypot(lb.A[i], lb.B[i]);
      if (l < -14) s.nd++; else if (l > 14) s.nb++; if (cc > 15) s.nc++;
    }
    const findings = [];
    list.forEach(c => {
      const s = acc.get(c.id), dL = s.dL / s.k, dC = s.dC / s.k, da = s.da / s.k, ca = s.ca / s.k;
      const thin = c.len / Math.max(1, c.wid) >= 5 && c.wid <= diag / 40;
      const fd = s.nd / s.k, fb = s.nb / s.k, fc = s.nc / s.k;
      let type;
      if (fc > 0.2 && (da > -6 || ca > 42)) type = 'paint';
      else if (fc > 0.2 || (da < -7 && dC > 2)) type = 'bio';
      else if (fd > fb && fd > 0.05) type = thin ? 'crack' : fd > 0.4 ? 'crust' : c.len / Math.max(1, c.wid) >= 3.5 ? 'crack' : 'change';
      else if (fb > fd && fb > 0.05) type = fb > 0.55 ? (dC < -3 ? 'salt' : 'loss') : 'carving';
      else type = 'change';
      const f = { type, name: TYPES[type].name, short: TYPES[type].short, color: TYPES[type].color, box: [c.x0, c.y0, c.x1, c.y1], areaPx: c.n, areaPct: c.n / vcount * 100, len: c.len, lid: c.id, include: true, signal: sig(c.mv / T) };
      if (type === 'crack') f.name = 'New ' + crackName(c, false);
      if (type === 'paint') f.name = 'New ' + TYPES.paint.name;
      if (type === 'carving') f.name = 'New ' + TYPES.carving.name;
      f.sev = type === 'crack' ? (c.len >= 0.12 * diag ? 3 : 2) : type === 'bio' || type === 'salt' || type === 'crust' ? (f.areaPct >= 10 ? 3 : 2) : sevFor(type, f, diag);
      f.detail = `ΔL ${dL > 0 ? '+' : ''}${dL.toFixed(0)} · Δchroma ${dC > 0 ? '+' : ''}${dC.toFixed(0)} · ${f.areaPct < 0.1 ? f.areaPct.toFixed(2) : f.areaPct.toFixed(1)}% of overlap`;
      findings.push(f);
    });
    findings.sort((a, b) => b.sev - a.sev || b.areaPx - a.areaPx);
    findings.forEach((f, i) => { f.no = i + 1; f.pos = posOf(f.box, w, h); });
    return { mode: 'temporal', w, h, n, findings, layers: { change: { raw: cm, lab } }, D, valid: vmask, warped, align: al, ssim: ssum / vcount, changedPct: changed / vcount * 100, overlapPct: vcount / n * 100, T };
  }

  return { DBG, TYPES, scanSingle, scanTemporal, toLab, boxBlur, dilate };
})();
