/* eslint-disable */
// Ported verbatim from legacy/Sentinel.html — minimal PDF writer + ticket / patrol layouts.
/* =====================================================================
   MINIMAL PDF WRITER (Helvetica + JPEG) — no dependencies
   ===================================================================== */
export const PDF = (() => {
  'use strict';
  const WR = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
  const WBD = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584];
  // unicode → [WinAnsi code, regular width, bold width]
  const EX = { 0x2014: [151, 1000, 1000], 0x2013: [150, 556, 556], 0x2019: [146, 222, 278], 0x2018: [145, 222, 278], 0x201C: [147, 333, 500], 0x201D: [148, 333, 500], 0x2022: [149, 350, 350], 0xB7: [183, 278, 278], 0xB0: [176, 400, 400], 0xD7: [215, 584, 584], 0x2026: [133, 1000, 1000], 0xA9: [169, 737, 737] };
  const SUBS = { '₹': 'Rs ', '≈': '~', '→': '->', '←': '<-', '✓': 'OK', '≥': '>=', '≤': '<=', '♥': '<3', 'Δ': 'd', '±': '+/-', ' ': ' ', '\t': ' ', '\n': ' ' };
  function clean(s) {
    s = String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '');
    let o = '';
    for (const ch of s) { const c = ch.codePointAt(0); if (c >= 32 && c <= 126) o += ch; else if (EX[c]) o += ch; else if (SUBS[ch] != null) o += SUBS[ch]; else o += ''; }
    return o;
  }
  function width(s, size, bold) { let w = 0; const T = bold ? WBD : WR; for (const ch of s) { const c = ch.codePointAt(0); if (c >= 32 && c <= 126) w += T[c - 32]; else if (EX[c]) w += EX[c][bold ? 2 : 1]; } return w * size / 1000; }
  function enc(s) { let o = ''; for (const ch of s) { const c = ch.codePointAt(0); if (c === 40 || c === 41 || c === 92) o += '\\' + ch; else if (c < 128) o += ch; else if (EX[c]) o += '\\' + EX[c][0].toString(8).padStart(3, '0'); } return o; }
  const f = v => (Math.round(v * 100) / 100).toString();
  const col = hex => { const h = hex.replace('#', ''); return [0, 2, 4].map(i => f(parseInt(h.substr(i, 2), 16) / 255)).join(' '); };
  function b64bytes(dataURL) { const b = atob(dataURL.split(',')[1]); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }

  class Doc {
    constructor(meta) { this.W = 595.28; this.H = 841.89; this.pages = []; this.imgs = []; this.meta = meta || {}; this.addPage(); }
    addPage() { this.p = []; this.pages.push(this.p); return this; }
    rect(x, y, w, h, fill, stroke, lw) { const Y = this.H - y - h; let s = ''; if (fill) s += col(fill) + ' rg '; if (stroke) s += col(stroke) + ' RG ' + f(lw || 1) + ' w '; s += `${f(x)} ${f(Y)} ${f(w)} ${f(h)} re ` + (fill && stroke ? 'B' : fill ? 'f' : 'S'); this.p.push(s); }
    rrect(x, y, w, h, r, fill, stroke, lw) {
      const k = 0.5523 * r, H = this.H, X0 = x, X1 = x + w, Y0 = H - y, Y1 = H - y - h;
      let s = ''; if (fill) s += col(fill) + ' rg '; if (stroke) s += col(stroke) + ' RG ' + f(lw || 1) + ' w ';
      s += `${f(X0 + r)} ${f(Y0)} m ${f(X1 - r)} ${f(Y0)} l ${f(X1 - r + k)} ${f(Y0)} ${f(X1)} ${f(Y0 - r + k)} ${f(X1)} ${f(Y0 - r)} c ${f(X1)} ${f(Y1 + r)} l ${f(X1)} ${f(Y1 + r - k)} ${f(X1 - r + k)} ${f(Y1)} ${f(X1 - r)} ${f(Y1)} c ${f(X0 + r)} ${f(Y1)} l ${f(X0 + r - k)} ${f(Y1)} ${f(X0)} ${f(Y1 + r - k)} ${f(X0)} ${f(Y1 + r)} c ${f(X0)} ${f(Y0 - r)} l ${f(X0)} ${f(Y0 - r + k)} ${f(X0 + r - k)} ${f(Y0)} ${f(X0 + r)} ${f(Y0)} c h `;
      s += fill && stroke ? 'B' : fill ? 'f' : 'S'; this.p.push(s);
    }
    line(x1, y1, x2, y2, c, lw, dash) { this.p.push(`${col(c)} RG ${f(lw || 1)} w ${dash ? '[3 3] 0 d ' : ''}${f(x1)} ${f(this.H - y1)} m ${f(x2)} ${f(this.H - y2)} l S${dash ? ' [] 0 d' : ''}`); }
    text(x, y, s, o) {
      o = o || {}; const size = o.size || 10, bold = !!o.bold; s = clean(s); const w = width(s, size, bold);
      if (o.align === 'right') x -= w; else if (o.align === 'center') x -= w / 2;
      this.p.push(`BT /${bold ? 'F2' : 'F1'} ${f(size)} Tf ${col(o.color || '#222222')} rg 1 0 0 1 ${f(x)} ${f(this.H - y)} Tm (${enc(s)}) Tj ET`);
      return w;
    }
    wrap(s, size, bold, maxW) {
      const words = clean(s).split(' ').filter(Boolean), lines = []; let cur = '';
      for (let wd of words) {
        while (width(wd, size, bold) > maxW) { let i = wd.length; while (i > 1 && width(wd.slice(0, i), size, bold) > maxW) i--; if (cur) { lines.push(cur); cur = ''; } lines.push(wd.slice(0, i)); wd = wd.slice(i); }
        const t = cur ? cur + ' ' + wd : wd;
        if (width(t, size, bold) > maxW && cur) { lines.push(cur); cur = wd; } else cur = t;
      }
      if (cur) lines.push(cur); return lines;
    }
    addJpeg(dataURL, w, h) { const name = 'Im' + (this.imgs.length + 1); this.imgs.push({ name, bytes: b64bytes(dataURL), w, h }); return name; }
    image(name, x, y, w, h) { this.p.push(`q ${f(w)} 0 0 ${f(h)} ${f(x)} ${f(this.H - y - h)} cm /${name} Do Q`); }
    build() {
      const te = new TextEncoder(), lat = s => { const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 255; return u; };
      const chunks = []; let off = 0; const offs = [];
      const push = u => { chunks.push(u); off += u.length; };
      const obj = (id, body) => { offs[id] = off; push(lat(`${id} 0 obj\n`)); if (body instanceof Array) body.forEach(b => push(typeof b === 'string' ? lat(b) : b)); else push(lat(body)); push(lat('\nendobj\n')); };
      push(lat('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'));
      const nImg = this.imgs.length, nPg = this.pages.length;
      const imgId = i => 6 + i, pageId = i => 6 + nImg + i * 2, contId = i => 7 + nImg + i * 2;
      const pstr = s => '(' + enc(clean(s)) + ')';
      obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
      obj(2, `<< /Type /Pages /Count ${nPg} /Kids [${this.pages.map((_, i) => pageId(i) + ' 0 R').join(' ')}] >>`);
      obj(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
      obj(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
      const d = new Date(), p2 = v => String(v).padStart(2, '0'), tz = -d.getTimezoneOffset(), tzs = (tz >= 0 ? '+' : '-') + p2(Math.floor(Math.abs(tz) / 60)) + "'" + p2(Math.abs(tz) % 60) + "'";
      const ds = `D:${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}${p2(d.getHours())}${p2(d.getMinutes())}${p2(d.getSeconds())}${tzs}`;
      obj(5, `<< /Title ${pstr(this.meta.title || 'Report')} /Subject ${pstr(this.meta.subject || '')} /Author ${pstr(this.meta.author || '')} /Creator (Mirava Sentinel) /Producer (Mirava Sentinel PDF) /CreationDate (${ds}) >>`);
      this.imgs.forEach((im, i) => obj(imgId(i), [`<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.bytes.length} >>\nstream\n`, im.bytes, '\nendstream']));
      const xo = this.imgs.length ? `/XObject << ${this.imgs.map((im, i) => `/${im.name} ${imgId(i)} 0 R`).join(' ')} >>` : '';
      this.pages.forEach((pg, i) => {
        obj(pageId(i), `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${f(this.W)} ${f(this.H)}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> ${xo} >> /Contents ${contId(i)} 0 R >>`);
        const content = pg.join('\n');
        obj(contId(i), [`<< /Length ${content.length} >>\nstream\n`, lat(content), '\nendstream']);
      });
      const total = 6 + nImg + nPg * 2, xref = off;
      let x = `xref\n0 ${total}\n0000000000 65535 f \n`;
      for (let i = 1; i < total; i++) x += String(offs[i]).padStart(10, '0') + ' 00000 n \n';
      x += `trailer\n<< /Size ${total} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
      push(lat(x));
      void te;
      return new Blob(chunks, { type: 'application/pdf' });
    }
  }
  return { Doc, clean, width };
})();

/* =====================================================================
   TICKET LAYOUT
   ===================================================================== */
export function buildTicketPDF(t) {
  const doc = new PDF.Doc({ title: `Monument Health Assessment Ticket ${t.id}`, subject: `${t.monument.name} - ${t.levelName}`, author: t.inspector || 'Mirava Sentinel' });
  const W = doc.W, M = 36, CW = W - 2 * M;
  const SEV = { 0: '#3b6fd8', 1: '#2f9e5e', 2: '#d4930f', 3: '#c8361f' };
  const WINE = '#3a1520', GOLD = '#c8901f', INK = '#26161a', MUTE = '#6d5a55', LINE = '#e3d6c8';
  let y = 0;
  const header = (first) => {
    doc.rect(0, 0, W, first ? 84 : 46, WINE);
    doc.rect(0, first ? 84 : 46, W, 3, GOLD);
    if (first) {
      doc.text(M, 32, 'MONUMENT HEALTH ASSESSMENT TICKET', { size: 17, bold: true, color: '#ffffff' });
      doc.text(M, 50, 'Mirava Sentinel  ·  Heritage field inspection report', { size: 8.4, color: '#f1c56a' });
      doc.text(M, 68, `For the site in-charge / ASI Circle office  ·  Generated ${t.tsText}`, { size: 8.2, color: '#e8d6cd' });
      doc.text(W - M, 30, 'TICKET ID', { size: 7.5, bold: true, color: '#f1c56a', align: 'right' });
      doc.text(W - M, 47, t.id, { size: 13, bold: true, color: '#ffffff', align: 'right' });
      doc.text(W - M, 66, t.mode === 'temporal' ? 'Mode B · Temporal change detection' : 'Mode A · Single image scan', { size: 8, color: '#e8d6cd', align: 'right' });
      y = 104;
    } else {
      doc.text(M, 29, 'MONUMENT HEALTH ASSESSMENT TICKET  (continued)', { size: 11, bold: true, color: '#ffffff' });
      doc.text(W - M, 29, t.id, { size: 10, bold: true, color: '#f1c56a', align: 'right' });
      y = 66;
    }
  };
  const ensure = hNeed => { if (y + hNeed > doc.H - 52) { doc.addPage(); header(false); } };
  const section = title => { ensure(40); doc.text(M, y + 10, title.toUpperCase(), { size: 8.5, bold: true, color: GOLD }); doc.line(M, y + 15, W - M, y + 15, LINE, 0.8); y += 26; };
  const para = (s, o) => { o = o || {}; const size = o.size || 9.2, lh = size * 1.38, x = o.x || M, mw = o.w || CW; const lines = doc.wrap(s, size, o.bold, mw); lines.forEach(l => { ensure(lh); doc.text(x, y + size, l, { size, bold: o.bold, color: o.color || INK }); y += lh; }); return lines.length; };

  header(true);

  // ---- identity block
  const kv = [
    ['Monument', t.monument.name], ['Location', t.monument.location], ['Main material', t.monument.materialLabel],
    ['GPS', t.gps || 'Not attached'], ['Inspector', (t.inspector || 'Not given') + ' (' + t.role + ')'], ['Image analysed', t.imageInfo]
  ];
  const colW = CW / 2 - 8;
  kv.forEach((p, i) => {
    const cx = M + (i % 2) * (colW + 16), cy = y + Math.floor(i / 2) * 34;
    doc.text(cx, cy + 8, p[0].toUpperCase(), { size: 6.8, bold: true, color: MUTE });
    let lns = doc.wrap(p[1], 9.6, true, colW);
    if (lns.length > 1) { lns = doc.wrap(p[1], 8, true, colW).slice(0, 2); lns.forEach((l, k) => doc.text(cx, cy + 19 + k * 9.5, l, { size: 8, bold: true, color: INK })); }
    else doc.text(cx, cy + 21, lns[0] || '', { size: 9.6, bold: true, color: INK });
  });
  y += 108;

  // ---- severity banner
  const hasM = t.mhi != null, BH = hasM ? 116 : 84;
  ensure(BH + 8);
  const sc = SEV[t.level];
  doc.rrect(M, y, CW, BH, 8, '#fbf3ea', LINE, 0.8);
  doc.rrect(M + 12, y + 12, 176, 60, 6, sc);
  doc.text(M + 100, y + 33, t.level ? `SEVERITY LEVEL ${t.level}` : 'NO ANOMALY', { size: 9, bold: true, color: '#ffffff', align: 'center' });
  doc.text(M + 100, y + 56, t.levelName.toUpperCase(), { size: 17, bold: true, color: '#ffffff', align: 'center' });
  const rx = M + 204, rw = CW - 216;
  doc.text(rx, y + 24, doc.wrap(t.levelDesc, 11.5, true, rw)[0] || '', { size: 11.5, bold: true, color: INK });
  const stats = [['Primary defect', t.primary], ['Affected area', t.areaText], ['Findings', String(t.findings.length)], ['Response window', t.response]];
  stats.forEach((s, i) => {
    const sx = rx + (i % 2) * (rw / 2), sy = y + 40 + Math.floor(i / 2) * 24;
    doc.text(sx, sy, s[0].toUpperCase(), { size: 6.5, bold: true, color: MUTE });
    doc.text(sx, sy + 11, doc.wrap(s[1], 8.8, true, rw / 2 - 8)[0] || '', { size: 8.8, bold: true, color: INK });
  });
  if (hasM) {
    const by = y + 86, bx = M + 12, lw = 150, tw = CW - 24 - lw - 120;
    doc.line(M + 12, y + 78, W - M - 12, y + 78, LINE, 0.6);
    doc.text(bx, by + 9, 'MONUMENT HEALTH INDEX', { size: 7, bold: true, color: MUTE });
    doc.text(bx, by + 22, t.trend ? 'Trend ' + t.trend : 'First assessment logged for this site', { size: 7, color: MUTE });
    doc.rrect(bx + lw, by + 3, tw, 10, 5, '#eadfce');
    if (t.mhi > 0) doc.rrect(bx + lw, by + 3, Math.max(10, tw * t.mhi / 100), 10, 5, t.mhiColor || GOLD);
    [40, 65, 85].forEach(v => doc.line(bx + lw + tw * v / 100, by + 1, bx + lw + tw * v / 100, by + 15, '#ffffff', 1));
    [[0, 'Critical'], [40, 'Poor'], [65, 'Fair'], [85, 'Good']].forEach(([v, n]) => doc.text(bx + lw + tw * v / 100 + 2, by + 23, `${v} ${n}`, { size: 5.8, color: MUTE }));
    doc.text(W - M - 12, by + 13, `${t.mhi} / 100`, { size: 15, bold: true, color: t.mhiColor || INK, align: 'right' });
    doc.text(W - M - 12, by + 24, (t.mhiBand || '').toUpperCase(), { size: 7, bold: true, color: MUTE, align: 'right' });
  }
  y += BH + 14;

  // ---- images
  section('Visual evidence');
  const imgs = t.images.filter(Boolean);
  if (imgs.length) {
    const gap = 10, n = imgs.length;
    const widths = n === 1 ? [CW] : n === 2 ? [CW * 0.62 - gap / 2, CW * 0.38 - gap / 2] : imgs.map(() => (CW - gap * (n - 1)) / n);
    const hs = imgs.map((im, i) => widths[i] * im.h / im.w);
    const rowH = Math.min(Math.max(...hs), 300);
    ensure(rowH + 22);
    let x = M;
    imgs.forEach((im, i) => {
      let w = widths[i], h = w * im.h / im.w; if (h > rowH) { h = rowH; w = h * im.w / im.h; }
      const name = doc.addJpeg(im.dataURL, im.w, im.h);
      doc.rect(x - 0.5, y - 0.5, w + 1, h + 1, null, LINE, 0.8);
      doc.image(name, x, y, w, h);
      doc.text(x, y + h + 11, im.label, { size: 7.6, bold: true, color: MUTE });
      x += widths[i] + gap;
    });
    y += rowH + 22;
    if (t.metrics) { para(t.metrics, { size: 8, color: MUTE }); y += 4; }
  }

  // ---- close-ups
  const cu = (t.closeups || []).filter(Boolean);
  if (cu.length) {
    section(`Close-up evidence (${cu.length})`);
    const per = 4, gap = 10, cw = (CW - gap * (per - 1)) / per, ch = cw * 0.75;
    for (let i = 0; i < cu.length; i += per) {
      ensure(ch + 22);
      cu.slice(i, i + per).forEach((im, k) => {
        const x = M + k * (cw + gap); let w = cw, h = cw * im.h / im.w; if (h > ch) { h = ch; w = h * im.w / im.h; }
        const ox = x + (cw - w) / 2, name = doc.addJpeg(im.dataURL, im.w, im.h);
        doc.rect(x, y, cw, ch, '#f7f1e9', LINE, 0.6); doc.image(name, ox, y + (ch - h) / 2, w, h);
        doc.rect(x, y + ch + 3, 3, 9, im.color && im.color !== '#ffffff' ? im.color : '#999999');
        doc.text(x + 6, y + ch + 10.5, doc.wrap(im.label, 7.2, true, cw - 8)[0] || '', { size: 7.2, bold: true, color: INK });
      });
      y += ch + 20;
    }
  }

  // ---- findings table
  section('Detected anomalies');
  if (!t.findings.length) { para('No surface anomaly passed the detection thresholds at this sensitivity. Re-photograph in even daylight if damage is suspected.'); }
  else {
    const cols = [[M, 18, '#'], [M + 20, 190, 'DEFECT TYPE'], [M + 214, 70, 'SEVERITY'], [M + 288, 52, 'AREA'], [M + 344, 70, 'POSITION'], [M + 418, CW - 418, 'EVIDENCE']];
    ensure(40);
    doc.rect(M, y, CW, 16, '#f3e7d8');
    cols.forEach(c => doc.text(c[0] + 4, y + 11, c[2], { size: 6.8, bold: true, color: MUTE }));
    y += 16;
    t.findings.forEach((fd, i) => {
      const nameL = doc.wrap(fd.name, 8.4, true, 184), evL = doc.wrap(fd.detail + (fd.manual ? ' · marked by inspector' : ' · signal ' + fd.signal), 7.4, false, CW - 426);
      const rh = Math.max(nameL.length * 11, evL.length * 9.5) + 10;
      ensure(rh);
      if (i % 2) doc.rect(M, y, CW, rh, '#fbf6ef');
      doc.text(M + 4, y + 13, String(fd.no), { size: 8.4, bold: true, color: INK });
      nameL.forEach((l, k) => doc.text(M + 24, y + 13 + k * 11, l, { size: 8.4, bold: true, color: INK }));
      doc.rrect(M + 218, y + 4, 58, 13, 6, SEV[fd.sev]);
      doc.text(M + 247, y + 13.2, ['', 'LOW', 'MEDIUM', 'CRITICAL'][fd.sev], { size: 6.8, bold: true, color: '#ffffff', align: 'center' });
      doc.text(M + 292, y + 13, fd.areaText, { size: 8.4, color: INK });
      doc.text(M + 348, y + 13, fd.pos, { size: 8.4, color: INK });
      evL.forEach((l, k) => doc.text(M + 422, y + 12.5 + k * 9.5, l, { size: 7.4, color: MUTE }));
      y += rh;
      doc.line(M, y, W - M, y, LINE, 0.5);
    });
    y += 8;
  }

  // ---- field notes
  if (t.notes) {
    section('Inspector field notes');
    const lines = doc.wrap(t.notes, 9.4, false, CW - 24), hN = lines.length * 13 + 16;
    ensure(Math.min(hN, 200));
    if (hN < doc.H - 52 - y) { doc.rrect(M, y, CW, hN, 6, '#fbf6ef', LINE, 0.6); doc.rect(M, y, 3, hN, GOLD); }
    y += 8; para(t.notes, { x: M + 14, w: CW - 24, size: 9.4 }); y += 14;
  }

  // ---- remediation
  section('Recommended heritage-safe conservation action');
  t.reco.forEach(g => {
    ensure(40);
    doc.rrect(M, y + 1, 8, 8, 2, SEV[g.sev]);
    doc.text(M + 14, y + 9, g.title, { size: 9.6, bold: true, color: INK }); y += 16;
    g.actions.forEach((a, i) => { ensure(14); doc.text(M + 6, y + 9.2, (i + 1) + '.', { size: 9, bold: true, color: GOLD }); para(a, { x: M + 20, w: CW - 20, size: 9 }); y += 2; });
    if (g.avoid.length) { ensure(14); doc.text(M + 6, y + 9, 'Avoid:', { size: 8.6, bold: true, color: '#c8361f' }); const before = y; para(g.avoid.join('; ') + '.', { x: M + 42, w: CW - 42, size: 8.6, color: '#7a2a1c' }); if (y === before) y += 12; }
    y += 8;
  });
  if (t.substrate) { ensure(30); doc.text(M, y + 9, 'Substrate note:', { size: 8.6, bold: true, color: INK }); para(t.substrate, { x: M + 70, w: CW - 70, size: 8.6, color: MUTE }); y += 6; }
  if (t.legal) { ensure(30); doc.text(M, y + 9, 'Legal:', { size: 8.6, bold: true, color: INK }); para(t.legal, { x: M + 70, w: CW - 70, size: 8.6, color: MUTE }); y += 6; }

  // ---- sign-off
  ensure(96);
  section('Verification & sign-off');
  const bw = (CW - 20) / 3;
  ['Inspected by', 'Verified by (Conservation Assistant)', 'Action taken / date closed'].forEach((lb, i) => {
    const bx = M + i * (bw + 10);
    doc.rrect(bx, y, bw, 58, 5, null, LINE, 0.8);
    doc.text(bx + 8, y + 13, lb.toUpperCase(), { size: 6.6, bold: true, color: MUTE });
    if (i === 0 && t.inspector) doc.text(bx + 8, y + 28, t.inspector, { size: 9, bold: true, color: INK });
    doc.line(bx + 8, y + 46, bx + bw - 8, y + 46, '#bfae9e', 0.6, true);
    doc.text(bx + 8, y + 54, i === 2 ? 'Remarks' : 'Signature & date', { size: 6.2, color: MUTE });
  });
  y += 70;

  // ---- footers
  const N = doc.pages.length;
  doc.pages.forEach((pg, i) => {
    doc.p = pg;
    doc.line(M, doc.H - 38, W - M, doc.H - 38, LINE, 0.6);
    doc.text(M, doc.H - 26, 'Automated visual screening by Mirava Sentinel. Findings must be verified on site by a qualified conservator before any treatment.', { size: 6.8, color: MUTE });
    doc.text(M, doc.H - 17, 'Not an official ASI document until countersigned by an authorised officer.', { size: 6.8, color: MUTE });
    doc.text(W - M, doc.H - 22, `${t.id}  ·  Page ${i + 1} of ${N}`, { size: 7, bold: true, color: INK, align: 'right' });
  });
  return doc.build();
}

/* =====================================================================
   PATROL SUMMARY LAYOUT
   ===================================================================== */
export function buildPatrolPDF(p) {
  const doc = new PDF.Doc({ title: `Patrol Inspection Summary ${p.id}`, subject: p.sites.join(', '), author: p.inspector || 'Mirava Sentinel' });
  const W = doc.W, M = 36, CW = W - 2 * M;
  const SEV = { 0: '#3b6fd8', 1: '#2f9e5e', 2: '#d4930f', 3: '#c8361f' };
  const WINE = '#3a1520', GOLD = '#c8901f', INK = '#26161a', MUTE = '#6d5a55', LINE = '#e3d6c8';
  let y = 0;
  const header = first => {
    doc.rect(0, 0, W, first ? 84 : 46, WINE); doc.rect(0, first ? 84 : 46, W, 3, GOLD);
    if (first) {
      doc.text(M, 32, 'PATROL INSPECTION SUMMARY', { size: 17, bold: true, color: '#ffffff' });
      doc.text(M, 50, 'Mirava Sentinel  ·  Batch screening of one patrol round', { size: 8.4, color: '#f1c56a' });
      doc.text(M, 68, `For the site in-charge / ASI Circle office  ·  Generated ${p.tsText}`, { size: 8.2, color: '#e8d6cd' });
      doc.text(W - M, 30, 'REFERENCE', { size: 7.5, bold: true, color: '#f1c56a', align: 'right' });
      doc.text(W - M, 47, p.id, { size: 13, bold: true, color: '#ffffff', align: 'right' });
      doc.text(W - M, 66, `${p.stats.photos} photos  ·  sensitivity ${p.sens}/10`, { size: 8, color: '#e8d6cd', align: 'right' });
      y = 104;
    } else {
      doc.text(M, 29, 'PATROL INSPECTION SUMMARY  (continued)', { size: 11, bold: true, color: '#ffffff' });
      doc.text(W - M, 29, p.id, { size: 10, bold: true, color: '#f1c56a', align: 'right' }); y = 66;
    }
  };
  const ensure = h => { if (y + h > doc.H - 52) { doc.addPage(); header(false); } };
  header(true);
  // identity
  const sitesL = doc.wrap(p.sites.join(', '), 8.4, true, CW * 0.5 - 14).slice(0, 4);
  [['Sites covered (' + p.sites.length + ')', null, 0, 0.5], ['Inspector', (p.inspector || 'Not given') + ' (' + p.role + ')', 0.5, 0.28], ['GPS', p.gps || 'Not attached', 0.78, 0.22]].forEach(kv => {
    const cx = M + kv[2] * CW; doc.text(cx, y + 8, kv[0].toUpperCase(), { size: 6.8, bold: true, color: MUTE });
    (kv[1] == null ? sitesL : doc.wrap(kv[1], 8.4, true, CW * kv[3] - 12).slice(0, 3)).forEach((l, k) => doc.text(cx, y + 20 + k * 10, l, { size: 8.4, bold: true, color: INK }));
  });
  y += 30 + Math.max(2, sitesL.length) * 10;
  // KPI tiles
  const tiles = [['CRITICAL', p.stats.crit, SEV[3]], ['MEDIUM', p.stats.med, SEV[2]], ['LOW', p.stats.low, SEV[1]], ['CLEAR', p.stats.clear, SEV[0]], ['AVG HEALTH INDEX', p.stats.avg == null ? '-' : `${p.stats.avg}`, INK]];
  const tw = (CW - 4 * 8) / 5;
  tiles.forEach((tl, i) => { const x = M + i * (tw + 8); doc.rrect(x, y, tw, 52, 6, '#fbf3ea', LINE, 0.7); doc.rect(x, y + 8, 3, 36, tl[2]); doc.text(x + 12, y + 31, String(tl[1]), { size: 20, bold: true, color: tl[2] }); doc.text(x + 12, y + 44, tl[0], { size: 6.4, bold: true, color: MUTE }); });
  y += 66;
  const urgent = p.entries.filter(e => e.level === 3);
  if (urgent.length) { doc.rrect(M, y, CW, 22, 5, '#fbe9e5', '#e8b4a8', 0.7); doc.text(M + 10, y + 14.5, `ACTION: ${urgent.length} location${urgent.length === 1 ? '' : 's'} need a team dispatched within 24 hours. Raise a full incident ticket for each.`, { size: 8.4, bold: true, color: '#9c2a17' }); y += 32; }
  // table
  doc.text(M, y + 10, 'PHOTOS RANKED BY RISK', { size: 8.5, bold: true, color: GOLD }); doc.line(M, y + 15, W - M, y + 15, LINE, 0.8); y += 24;
  const th = () => { doc.rect(M, y, CW, 16, '#f3e7d8'); [[M + 4, '#'], [M + 22, 'PHOTO'], [M + 112, 'LOCATION / FILE'], [M + 300, 'SEVERITY'], [M + 372, 'MHI'], [M + 406, 'PRIMARY DEFECT · RESPONSE']].forEach(c => doc.text(c[0], y + 11, c[1], { size: 6.8, bold: true, color: MUTE })); y += 16; };
  th();
  p.entries.forEach((e, i) => {
    const rh = 66; if (y + rh > doc.H - 52) { doc.addPage(); header(false); th(); }
    if (i % 2) doc.rect(M, y, CW, rh, '#fbf6ef');
    doc.text(M + 4, y + 16, String(i + 1), { size: 9, bold: true, color: INK });
    const tb = e.thumb, tw2 = 80, th2 = Math.min(56, tw2 * tb.h / tb.w), tw3 = th2 * tb.w / tb.h;
    doc.image(doc.addJpeg(tb.dataURL, tb.w, tb.h), M + 22 + (tw2 - tw3) / 2, y + 5, tw3, th2);
    doc.wrap(e.mon, 8.6, true, 180).slice(0, 2).forEach((l, k) => doc.text(M + 112, y + 16 + k * 10.5, l, { size: 8.6, bold: true, color: INK }));
    doc.text(M + 112, y + 41, doc.wrap(e.name, 7.4, false, 180)[0] || '', { size: 7.4, color: MUTE });
    doc.text(M + 112, y + 52, `${e.n} finding${e.n === 1 ? '' : 's'}`, { size: 7.4, color: MUTE });
    doc.rrect(M + 300, y + 8, 64, 14, 7, SEV[e.level]); doc.text(M + 332, y + 17.6, e.level ? `L${e.level} ${e.levelName.toUpperCase()}` : 'CLEAR', { size: 6.8, bold: true, color: '#ffffff', align: 'center' });
    doc.text(M + 372, y + 19, String(e.mhi), { size: 12, bold: true, color: e.color });
    doc.text(M + 372, y + 30, e.band.toUpperCase(), { size: 6, bold: true, color: MUTE });
    const pl = doc.wrap(e.level ? `${e.primary} (${e.pos})` : 'No significant anomaly', 8, true, CW - 410).slice(0, 2);
    pl.forEach((l, k) => doc.text(M + 406, y + 16 + k * 10, l, { size: 8, bold: true, color: INK }));
    doc.text(M + 406, y + 16 + pl.length * 10 + 2, doc.wrap(e.resp, 7.4, false, CW - 410)[0] || '', { size: 7.4, color: MUTE });
    y += rh; doc.line(M, y, W - M, y, LINE, 0.5);
  });
  y += 14;
  ensure(80);
  doc.text(M, y + 10, 'NEXT STEPS', { size: 8.5, bold: true, color: GOLD }); doc.line(M, y + 15, W - M, y + 15, LINE, 0.8); y += 26;
  ['Open each Critical and Medium photo in Sentinel and generate a full incident ticket with conservation guidance.', 'Re-photograph flagged spots from the same position on the next round to confirm whether damage is growing.', 'Every finding is automated screening: verify on site before any treatment.'].forEach((s, i) => { doc.text(M + 4, y + 9, `${i + 1}.`, { size: 9, bold: true, color: GOLD }); doc.wrap(s, 9, false, CW - 22).forEach((l, k) => { doc.text(M + 20, y + 9 + k * 12.4, l, { size: 9, color: INK }); }); y += doc.wrap(s, 9, false, CW - 22).length * 12.4 + 3; });
  const N = doc.pages.length;
  doc.pages.forEach((pg, i) => { doc.p = pg; doc.line(M, doc.H - 38, W - M, doc.H - 38, LINE, 0.6); doc.text(M, doc.H - 26, 'Automated visual screening by Mirava Sentinel. Findings must be verified on site by a qualified conservator before any treatment.', { size: 6.8, color: MUTE }); doc.text(M, doc.H - 17, 'Health Index (MHI): a 0-100 screening score from severity and extent. Not a structural assessment.', { size: 6.8, color: MUTE }); doc.text(W - M, doc.H - 22, `${p.id}  ·  Page ${i + 1} of ${N}`, { size: 7, bold: true, color: INK, align: 'right' }); });
  return doc.build();
}
