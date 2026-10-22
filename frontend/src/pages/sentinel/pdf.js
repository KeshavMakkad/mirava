/* eslint-disable */
// Ported from the new Sentinel.html — PDF writer (Unicode/Devanagari text runs) + ticket / patrol layouts.
/* =====================================================================
   PDF WRITER — vector layout/JPEG photos with shaped Unicode text runs
   Devanagari is rendered by the local font, never stripped or transliterated.
   ===================================================================== */
export const PDF = (() => {
  'use strict';
  const WR = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
  const WBD = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584];
  const EX = { 0x2014: [151, 1000, 1000], 0x2013: [150, 556, 556], 0x2019: [146, 222, 278], 0x2018: [145, 222, 278], 0x201C: [147, 333, 500], 0x201D: [148, 333, 500], 0x2022: [149, 350, 350], 0xB7: [183, 278, 278], 0xB0: [176, 400, 400], 0xD7: [215, 584, 584], 0x2026: [133, 1000, 1000], 0xA9: [169, 737, 737] };
  const tr = s => sentinelText(s);
  const clean = s => String(s == null ? '' : s).normalize('NFC').replace(/\r\n?/g, '\n').replace(/\t/g, ' ').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '');
  const prepared = (s, translate = true) => clean(translate ? tr(s) : s);
  const unicode = s => Array.from(s).some(ch => { const c = ch.codePointAt(0); return !(c >= 32 && c <= 126) && !EX[c]; });
  let measureCanvas, measureContext;
  function rawCanvas() { const canvas = document.createElement('canvas'); canvas.dataset.miravaRaw = 'true'; canvas.setAttribute('data-i18n-ignore', ''); canvas.setAttribute('translate', 'no'); return canvas; }
  function context(size, bold) {
    if (!measureCanvas) { measureCanvas = rawCanvas(); measureContext = measureCanvas.getContext('2d'); }
    measureContext.font = `${bold ? 700 : 400} ${size}px "Mirava Devanagari", "Noto Sans Devanagari", sans-serif`;
    measureContext.textBaseline = 'alphabetic';
    return measureContext;
  }
  function width(s, size, bold) {
    s = clean(s).replace(/\n/g, ' ');
    if (unicode(s)) return context(size, bold).measureText(s).width;
    let w = 0; const T = bold ? WBD : WR;
    for (const ch of s) { const c = ch.codePointAt(0); if (c >= 32 && c <= 126) w += T[c - 32]; else if (EX[c]) w += EX[c][bold ? 2 : 1]; }
    return w * size / 1000;
  }
  function enc(s) { let out = ''; for (const ch of s) { const c = ch.codePointAt(0); if (c === 40 || c === 41 || c === 92) out += '\\' + ch; else if (c < 128) out += ch; else if (EX[c]) out += '\\' + EX[c][0].toString(8).padStart(3, '0'); } return out; }
  // UTF-16BE strings preserve report metadata and accessible text in PDF readers.
  function unicodeHex(s) { let out = 'FEFF'; for (let i = 0; i < s.length; i++) out += s.charCodeAt(i).toString(16).padStart(4, '0'); return out; }
  const f = v => (Math.round(v * 100) / 100).toString();
  const col = hex => { const h = hex.replace('#', ''); return [0, 2, 4].map(i => f(parseInt(h.substr(i, 2), 16) / 255)).join(' '); };
  function b64bytes(dataURL) { const b = atob(dataURL.split(',')[1]); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  // PDF RunLengthDecode (PackBits) keeps glyph masks compact and synchronous.
  function pack(bytes) {
    const out = []; let i = 0;
    while (i < bytes.length) {
      let run = 1;
      while (run < 128 && i + run < bytes.length && bytes[i + run] === bytes[i]) run++;
      if (run >= 3) { out.push(257 - run, bytes[i]); i += run; continue; }
      const start = i; i += run;
      while (i < bytes.length && i - start < 128) {
        run = 1; while (run < 3 && i + run < bytes.length && bytes[i + run] === bytes[i]) run++;
        if (run >= 3) break;
        i += Math.min(run, 128 - (i - start));
      }
      out.push(i - start - 1); for (let j = start; j < i; j++) out.push(bytes[j]);
    }
    out.push(128); return new Uint8Array(out);
  }
  const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('hi', { granularity: 'grapheme' }) : null;
  const graphemes = s => segmenter ? Array.from(segmenter.segment(s), item => item.segment) : Array.from(s);

  class Doc {
    constructor(meta) { this.W = 595.28; this.H = 841.89; this.pages = []; this.imgs = []; this.meta = meta || {}; this.textImages = new Map(); this.preparedRuns = new Set(); this.addPage(); }
    addPage() { this.p = []; this.pages.push(this.p); return this; }
    rect(x, y, w, h, fill, stroke, lw) { const Y = this.H - y - h; let s = ''; if (fill) s += col(fill) + ' rg '; if (stroke) s += col(stroke) + ' RG ' + f(lw || 1) + ' w '; s += `${f(x)} ${f(Y)} ${f(w)} ${f(h)} re ` + (fill && stroke ? 'B' : fill ? 'f' : 'S'); this.p.push(s); }
    rrect(x, y, w, h, r, fill, stroke, lw) {
      const k = 0.5523 * r, H = this.H, X0 = x, X1 = x + w, Y0 = H - y, Y1 = H - y - h;
      let s = ''; if (fill) s += col(fill) + ' rg '; if (stroke) s += col(stroke) + ' RG ' + f(lw || 1) + ' w ';
      s += `${f(X0 + r)} ${f(Y0)} m ${f(X1 - r)} ${f(Y0)} l ${f(X1 - r + k)} ${f(Y0)} ${f(X1)} ${f(Y0 - r + k)} ${f(X1)} ${f(Y0 - r)} c ${f(X1)} ${f(Y1 + r)} l ${f(X1)} ${f(Y1 + r - k)} ${f(X1 - r + k)} ${f(Y1)} ${f(X1 - r)} ${f(Y1)} c ${f(X0 + r)} ${f(Y1)} l ${f(X0 + r - k)} ${f(Y1)} ${f(X0)} ${f(Y1 + r - k)} ${f(X0)} ${f(Y1 + r)} c ${f(X0)} ${f(Y0 - r)} l ${f(X0)} ${f(Y0 - r + k)} ${f(X0 + r - k)} ${f(Y0)} ${f(X0 + r)} ${f(Y0)} c h `;
      s += fill && stroke ? 'B' : fill ? 'f' : 'S'; this.p.push(s);
    }
    line(x1, y1, x2, y2, c, lw, dash) { this.p.push(`${col(c)} RG ${f(lw || 1)} w ${dash ? '[3 3] 0 d ' : ''}${f(x1)} ${f(this.H - y1)} m ${f(x2)} ${f(this.H - y2)} l S${dash ? ' [] 0 d' : ''}`); }
    shapedText(s, size, bold, color) {
      const key = JSON.stringify([s, size, bold, color]);
      if (this.textImages.has(key)) return this.textImages.get(key);
      const metrics = context(size, bold).measureText(s), scale = 3, pad = 2;
      const left = Math.ceil(Math.max(0, metrics.actualBoundingBoxLeft || 0) + pad);
      const right = Math.ceil(Math.max(metrics.width, metrics.actualBoundingBoxRight || 0) + pad);
      const ascent = Math.ceil(Math.max(size * 0.9, metrics.actualBoundingBoxAscent || 0) + pad);
      const descent = Math.ceil(Math.max(size * 0.35, metrics.actualBoundingBoxDescent || 0) + pad);
      const canvas = rawCanvas(); canvas.width = Math.max(1, Math.ceil((left + right) * scale)); canvas.height = Math.max(1, Math.ceil((ascent + descent) * scale));
      const ctx = canvas.getContext('2d', { willReadFrequently: true }); ctx.scale(scale, scale);
      ctx.font = `${bold ? 700 : 400} ${size}px "Mirava Devanagari", "Noto Sans Devanagari", sans-serif`; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#ffffff'; ctx.fillText(s, left, ascent);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data, alpha = new Uint8Array(canvas.width * canvas.height);
      for (let i = 0; i < alpha.length; i++) alpha[i] = pixels[i * 4 + 3];
      const name = 'Im' + (this.imgs.length + 1);
      // A one-colour indexed RGB image plus an 8-bit soft mask preserves edge
      // antialiasing on white, burgundy and coloured panels without colour halos.
      this.imgs.push({ name, w: canvas.width, h: canvas.height, color: color.replace('#', ''), bytes: pack(new Uint8Array(Math.ceil(canvas.width / 8) * canvas.height)), alpha: pack(alpha) });
      const result = { name, left, ascent, w: canvas.width / scale, h: canvas.height / scale };
      this.textImages.set(key, result); return result;
    }
    text(x, y, s, o) {
      o = o || {}; const bold = !!o.bold;
      s = (this.preparedRuns.has(s) ? clean(s) : prepared(s, o.translate !== false)).replace(/\n/g, ' ');
      let size = o.size || 10, w = width(s, size, bold);
      if (o.maxWidth > 0 && w > o.maxWidth) { size *= o.maxWidth / w; w = width(s, size, bold); }
      if (o.align === 'right') x -= w; else if (o.align === 'center') x -= w / 2;
      if (s && unicode(s)) {
        const im = this.shapedText(s, size, bold, o.color || '#222222');
        // ActualText plus an invisible anchor keeps copied/extracted Unicode
        // available even though shaping is painted as an image run.
        this.p.push(`/Span << /ActualText <${unicodeHex(s)}> >> BDC`);
        this.p.push(`q BT /F1 ${f(size)} Tf 3 Tr ${f(w / (size * 0.5) * 100)} Tz 1 0 0 1 ${f(x)} ${f(this.H - y)} Tm (x) Tj ET Q`);
        this.p.push('EMC');
        this.image(im.name, x - im.left, y - im.ascent, im.w, im.h);
      } else this.p.push(`BT /${bold ? 'F2' : 'F1'} ${f(size)} Tf 0 Tr ${col(o.color || '#222222')} rg 1 0 0 1 ${f(x)} ${f(this.H - y)} Tm (${enc(s)}) Tj ET`);
      return w;
    }
    wrap(s, size, bold, maxW, translate = true) {
      const lines = [];
      for (const paragraph of prepared(s, translate).split('\n')) {
        const words = paragraph.split(/\s+/).filter(Boolean); let cur = '';
        if (!words.length) { lines.push(''); continue; }
        for (let word of words) {
          if (width(word, size, bold) > maxW) {
            if (cur) { lines.push(cur); cur = ''; }
            let part = '';
            for (const glyph of graphemes(word)) { if (part && width(part + glyph, size, bold) > maxW) { lines.push(part); part = ''; } part += glyph; }
            cur = part; continue;
          }
          const candidate = cur ? cur + ' ' + word : word;
          if (cur && width(candidate, size, bold) > maxW) { lines.push(cur); cur = word; } else cur = candidate;
        }
        if (cur) lines.push(cur);
      }
      lines.forEach(line => this.preparedRuns.add(line)); return lines;
    }
    addJpeg(dataURL, w, h) { const name = 'Im' + (this.imgs.length + 1); this.imgs.push({ name, bytes: b64bytes(dataURL), w, h }); return name; }
    image(name, x, y, w, h) { this.p.push(`q ${f(w)} 0 0 ${f(h)} ${f(x)} ${f(this.H - y - h)} cm /${name} Do Q`); }
    build() {
      const lat = s => { const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 255; return u; };
      const chunks = []; let off = 0; const offs = [];
      const push = u => { chunks.push(u); off += u.length; };
      const obj = (id, body) => { offs[id] = off; push(lat(`${id} 0 obj\n`)); if (body instanceof Array) body.forEach(b => push(typeof b === 'string' ? lat(b) : b)); else push(lat(body)); push(lat('\nendobj\n')); };
      push(lat('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'));
      let nextId = 6; const images = this.imgs.map(im => ({ ...im, id: nextId++, maskId: im.alpha ? nextId++ : null }));
      const firstPageId = nextId, nPg = this.pages.length;
      const pageId = i => firstPageId + i * 2, contId = i => firstPageId + i * 2 + 1;
      const pstr = s => { s = clean(s).replace(/\n/g, ' '); return unicode(s) ? '<' + unicodeHex(s) + '>' : '(' + enc(s) + ')'; };
      obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
      obj(2, `<< /Type /Pages /Count ${nPg} /Kids [${this.pages.map((_, i) => pageId(i) + ' 0 R').join(' ')}] >>`);
      obj(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
      obj(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
      const d = new Date(), p2 = v => String(v).padStart(2, '0'), tz = -d.getTimezoneOffset(), tzs = (tz >= 0 ? '+' : '-') + p2(Math.floor(Math.abs(tz) / 60)) + "'" + p2(Math.abs(tz) % 60) + "'";
      const ds = `D:${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}${p2(d.getHours())}${p2(d.getMinutes())}${p2(d.getSeconds())}${tzs}`;
      obj(5, `<< /Title ${pstr(tr(this.meta.title || 'Report'))} /Subject ${pstr(this.meta.subject || '')} /Author ${pstr(this.meta.author || '')} /Creator (Mirava Sentinel) /Producer (Mirava Sentinel PDF) /CreationDate (${ds}) >>`);
      images.forEach(im => {
        if (im.alpha) {
          obj(im.id, [`<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace [/Indexed /DeviceRGB 0 <${im.color}>] /BitsPerComponent 1 /Filter /RunLengthDecode /SMask ${im.maskId} 0 R /Length ${im.bytes.length} >>\nstream\n`, im.bytes, '\nendstream']);
          obj(im.maskId, [`<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /RunLengthDecode /Length ${im.alpha.length} >>\nstream\n`, im.alpha, '\nendstream']);
        } else obj(im.id, [`<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.bytes.length} >>\nstream\n`, im.bytes, '\nendstream']);
      });
      const xo = images.length ? `/XObject << ${images.map(im => `/${im.name} ${im.id} 0 R`).join(' ')} >>` : '';
      this.pages.forEach((pg, i) => {
        obj(pageId(i), `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${f(this.W)} ${f(this.H)}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> ${xo} >> /Contents ${contId(i)} 0 R >>`);
        const content = pg.join('\n'); obj(contId(i), [`<< /Length ${content.length} >>\nstream\n`, lat(content), '\nendstream']);
      });
      const total = firstPageId + nPg * 2, xref = off;
      let x = `xref\n0 ${total}\n0000000000 65535 f \n`;
      for (let i = 1; i < total; i++) x += String(offs[i]).padStart(10, '0') + ' 00000 n \n';
      x += `trailer\n<< /Size ${total} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xref}\n%%EOF\n`; push(lat(x));
      return new Blob(chunks, { type: 'application/pdf' });
    }
  }
  // Register the self-hosted Devanagari face if the global i18n stylesheet has not.
  let facesAdded = false;
  function ensureFaces() {
    if (facesAdded || typeof FontFace !== 'function' || !document.fonts) return;
    facesAdded = true;
    try {
      if ([...document.fonts].some(face => face.family.replace(/["']/g, '') === 'Mirava Devanagari')) return;
      for (const weight of ['400', '700']) document.fonts.add(new FontFace('Mirava Devanagari', `url(/fonts/NotoSansDevanagari-${weight}.ttf)`, { weight }));
    } catch (_) {}
  }
  async function ready() {
    ensureFaces();
    try {
      if (window.MiravaI18n) { await window.MiravaI18n.ready; await window.MiravaI18n.fontReady(); }
      if (document.fonts) await Promise.all([document.fonts.load('400 16px "Mirava Devanagari"'), document.fonts.load('700 16px "Mirava Devanagari"')]);
    } catch (_) { /* fall back to system Devanagari fonts */ }
  }
  return { Doc, clean, width, ready };
})();

/* =====================================================================
   TICKET LAYOUT
   ===================================================================== */
// Report labels need their conservation context: "Fair" is a condition band,
// "Clear" is a scan result, and "Patrol" means गश्त, not petrol.
const SENTINEL_REPORT_HI = {
  'monument health assessment ticket': 'स्मारक स्थिति आकलन रिपोर्ट',
  'monument health assessment ticket (continued)': 'स्मारक स्थिति आकलन रिपोर्ट (जारी)',
  'monument health ticket': 'स्मारक स्थिति रिपोर्ट',
  'mirava sentinel · heritage field inspection report': 'मिरावा प्रहरी · विरासत स्थल निरीक्षण रिपोर्ट',
  'mirava sentinel · batch screening of one patrol round': 'मिरावा प्रहरी · एक गश्त की सामूहिक जाँच',
  'ticket id': 'रिपोर्ट आईडी', 'reference': 'संदर्भ',
  'mode a · single image scan': 'मोड A · एक तस्वीर की जाँच',
  'mode b · temporal change detection': 'मोड B · समय के साथ बदलाव की जाँच',
  'monument': 'स्मारक', 'location': 'स्थान', 'main material': 'मुख्य निर्माण सामग्री',
  'inspector': 'निरीक्षक', 'image analysed': 'जाँची गई तस्वीर',
  'not attached': 'संलग्न नहीं', 'not given': 'उल्लेख नहीं',
  'primary defect': 'मुख्य क्षति', 'affected area': 'प्रभावित क्षेत्र', 'findings': 'निष्कर्ष',
  'response window': 'कार्रवाई की समय सीमा', 'response': 'कार्रवाई',
  'severity': 'गंभीरता', 'severity level': 'गंभीरता स्तर', 'level': 'स्तर',
  'low': 'कम', 'medium': 'मध्यम', 'critical': 'गंभीर', 'clear': 'सामान्य',
  'fair': 'संतोषजनक', 'poor': 'खराब', 'good': 'अच्छा',
  'no anomaly': 'असामान्यता नहीं', 'none': 'कोई नहीं',
  'monument health index': 'स्मारक स्वास्थ्य सूचकांक', 'health index': 'स्वास्थ्य सूचकांक',
  'trend': 'रुझान', 'first assessment logged for this site': 'इस स्थल का पहला आकलन दर्ज हुआ',
  'visual evidence': 'दृश्य साक्ष्य', 'original image': 'मूल तस्वीर',
  'detected anomalies': 'पहचानी गई असामान्यताएँ', 'defect type': 'क्षति का प्रकार',
  'area': 'क्षेत्र', 'position': 'स्थान', 'evidence': 'साक्ष्य',
  'inspector field notes': 'निरीक्षक की टिप्पणियाँ', 'notes': 'टिप्पणियाँ',
  'recommended heritage-safe conservation action': 'विरासत को सुरक्षित रखने के लिए सुझाई गई कार्रवाई',
  'avoid:': 'बचें:', 'substrate note:': 'सामग्री संबंधी टिप्पणी:', 'legal:': 'कानूनी जानकारी:',
  'verification & sign-off': 'सत्यापन और हस्ताक्षर',
  'inspected by': 'निरीक्षण करने वाला', 'verified by (conservation assistant)': 'सत्यापन करने वाला (संरक्षण सहायक)',
  'action taken / date closed': 'की गई कार्रवाई / समापन तारीख',
  'signature & date': 'हस्ताक्षर और तारीख', 'remarks': 'टिप्पणी',
  'patrol': 'गश्त', 'patrol summary': 'गश्त का सारांश',
  'patrol inspection summary': 'गश्त निरीक्षण सारांश',
  'patrol inspection summary (continued)': 'गश्त निरीक्षण सारांश (जारी)',
  'avg health index': 'औसत स्वास्थ्य सूचकांक', 'average health index': 'औसत स्वास्थ्य सूचकांक',
  'photos ranked by risk': 'जोखिम के अनुसार क्रमबद्ध तस्वीरें',
  'photo': 'तस्वीर', 'photos': 'तस्वीरें', 'location / file': 'स्थान / फ़ाइल',
  'primary defect · response': 'मुख्य क्षति · कार्रवाई', 'next steps': 'अगले कदम',
  'cracks': 'दरारें', 'signal': 'संकेत', 'strong': 'प्रबल', 'weak': 'कमज़ोर',
  'demo data': 'उदाहरण डेटा', 'ticket': 'रिपोर्ट'
};
export function sentinelText(value) {
  const source = String(value == null ? '' : value), key = source.replace(/\s+/g, ' ').trim().toLowerCase();
  const hindi = window.MiravaI18n ? window.MiravaI18n.language() === 'hi' : document.documentElement.lang === 'hi';
  if (hindi) {
    if (Object.prototype.hasOwnProperty.call(SENTINEL_REPORT_HI, key)) return SENTINEL_REPORT_HI[key];
    let match;
    if ((match = source.match(/^#(\d+) (.*?) · L(\d+)(.*)$/i))) return `#${match[1]} ${sentinelText(match[2])} · स्तर ${match[3]}${sentinelText(match[4])}`;
    if ((match = source.match(/^L(\d+)$/i))) return `स्तर ${match[1]}`;
    if ((match = source.match(/^SEVERITY LEVEL (\d+)$/i))) return `गंभीरता स्तर ${match[1]}`;
    if ((match = source.match(/^L(\d+) (LOW|MEDIUM|CRITICAL)$/i))) return `स्तर ${match[1]} ${SENTINEL_REPORT_HI[match[2].toLowerCase()]}`;
    if ((match = source.match(/^(\d+) findings?$/i))) return `${match[1]} निष्कर्ष`;
    if ((match = source.match(/^(.+?)\s*·\s*Page (\d+) of (\d+)$/i))) return `${match[1]} · पृष्ठ ${match[2]} / ${match[3]}`;
  }
  return window.MiravaI18n ? window.MiravaI18n.t(source) : source;
}
export const sentinelLocale = () => window.MiravaI18n ? window.MiravaI18n.locale() : 'en-IN';

export function buildTicketPDF(t) {
  const doc = new PDF.Doc({ title: `Monument Health Assessment Ticket ${t.id}`, subject: `${t.monument.name} - ${t.levelName}`, author: t.inspector || 'Mirava Sentinel' });
  const W = doc.W, M = 36, CW = W - 2 * M;
  const SEV = { 0: '#3b6fd8', 1: '#2f9e5e', 2: '#d4930f', 3: '#c8361f' };
  const WINE = '#3a1520', GOLD = '#c8901f', INK = '#26161a', MUTE = '#6d5a55', LINE = '#e3d6c8';
  let y = 0;
  const header = (first) => {
    doc.rect(0, 0, W, first ? 104 : 46, WINE);
    doc.rect(0, first ? 104 : 46, W, 3, GOLD);
    if (first) {
      doc.text(M, 32, 'MONUMENT HEALTH ASSESSMENT TICKET', { size: 17, bold: true, color: '#ffffff', maxWidth: CW - 172 });
      doc.text(M, 50, 'Mirava Sentinel  ·  Heritage field inspection report', { size: 8.4, color: '#f1c56a', maxWidth: CW - 172 });
      doc.text(M, 89, `For the site in-charge / ASI Circle office  ·  Generated ${t.tsText}`, { size: 8.2, color: '#e8d6cd', maxWidth: CW });
      doc.text(W - M, 30, 'TICKET ID', { size: 7.5, bold: true, color: '#f1c56a', align: 'right' });
      doc.text(W - M, 47, t.id, { size: 13, bold: true, color: '#ffffff', align: 'right' });
      doc.text(W - M, 66, t.mode === 'temporal' ? 'Mode B · Temporal change detection' : 'Mode A · Single image scan', { size: 8, color: '#e8d6cd', align: 'right', maxWidth: CW });
      y = 124;
    } else {
      doc.text(M, 29, 'MONUMENT HEALTH ASSESSMENT TICKET  (continued)', { size: 11, bold: true, color: '#ffffff', maxWidth: CW - 150 });
      doc.text(W - M, 29, t.id, { size: 10, bold: true, color: '#f1c56a', align: 'right' });
      y = 66;
    }
  };
  const ensure = hNeed => { if (y + hNeed > doc.H - 52) { doc.addPage(); header(false); } };
  const section = title => { ensure(40); doc.text(M, y + 10, title.toUpperCase(), { size: 8.5, bold: true, color: GOLD }); doc.line(M, y + 15, W - M, y + 15, LINE, 0.8); y += 26; };
  const para = (s, o) => { o = o || {}; const size = o.size || 9.2, lh = size * 1.55, x = o.x || M, mw = o.w || CW; const lines = doc.wrap(s, size, o.bold, mw, o.translate !== false); lines.forEach(l => { ensure(lh); doc.text(x, y + size, l, { size, bold: o.bold, color: o.color || INK, translate: o.translate }); y += lh; }); return lines.length; };

  header(true);

  // ---- identity block
  const kv = [
    ['Monument', t.monument.name], ['Location', t.monument.location], ['Main material', t.monument.materialLabel],
    ['GPS', t.gps || 'Not attached'], ['Inspector', (t.inspector || sentinelText('Not given')) + ' (' + sentinelText(t.role) + ')'], ['Image analysed', t.imageInfo]
  ];
  const colW = CW / 2 - 8;
  kv.forEach((p, i) => {
    const cx = M + (i % 2) * (colW + 16), cy = y + Math.floor(i / 2) * 34;
    doc.text(cx, cy + 8, p[0].toUpperCase(), { size: 6.8, bold: true, color: MUTE });
    let lns = doc.wrap(p[1], 9.6, true, colW, p[0] !== 'Inspector' && p[0] !== 'Image analysed');
    if (lns.length > 1) { lns = doc.wrap(p[1], 8, true, colW, p[0] !== 'Inspector' && p[0] !== 'Image analysed').slice(0, 2); lns.forEach((l, k) => doc.text(cx, cy + 19 + k * 9.5, l, { size: 8, bold: true, color: INK })); }
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
  doc.text(M + 100, y + 56, t.levelName.toUpperCase(), { size: 17, bold: true, color: '#ffffff', align: 'center', maxWidth: 160 });
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
  ensure(90); section('Detected anomalies');
  if (!t.findings.length) { para('No surface anomaly passed the detection thresholds at this sensitivity. Re-photograph in even daylight if damage is suspected.'); }
  else {
    const cols = [[M, 18, '#'], [M + 20, 190, 'DEFECT TYPE'], [M + 214, 70, 'SEVERITY'], [M + 288, 52, 'AREA'], [M + 344, 70, 'POSITION'], [M + 418, CW - 418, 'EVIDENCE']];
    ensure(40);
    doc.rect(M, y, CW, 16, '#f3e7d8');
    cols.forEach(c => doc.text(c[0] + 4, y + 11, c[2], { size: 6.8, bold: true, color: MUTE }));
    y += 16;
    t.findings.forEach((fd, i) => {
      const nameL = doc.wrap(fd.name, 8.4, true, 184), evL = doc.wrap(sentinelText(fd.detail) + (fd.manual ? ' · ' + sentinelText('Marked by inspector') : ' · ' + sentinelText('Signal') + ' ' + sentinelText(fd.signal)), 7.4, false, CW - 426);
      const rh = Math.max(nameL.length * 11, evL.length * 9.5) + 10;
      ensure(rh);
      if (i % 2) doc.rect(M, y, CW, rh, '#fbf6ef');
      doc.text(M + 4, y + 13, String(fd.no), { size: 8.4, bold: true, color: INK });
      nameL.forEach((l, k) => doc.text(M + 24, y + 13 + k * 11, l, { size: 8.4, bold: true, color: INK }));
      doc.rrect(M + 218, y + 4, 58, 13, 6, SEV[fd.sev]);
      doc.text(M + 247, y + 13.2, ['', 'LOW', 'MEDIUM', 'CRITICAL'][fd.sev], { size: 6.8, bold: true, color: '#ffffff', align: 'center', maxWidth: 64 });
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
    const lines = doc.wrap(t.notes, 9.4, false, CW - 24, false), hN = lines.length * 14.6 + 16;
    ensure(Math.min(hN, 200));
    if (hN < doc.H - 52 - y) { doc.rrect(M, y, CW, hN, 6, '#fbf6ef', LINE, 0.6); doc.rect(M, y, 3, hN, GOLD); }
    y += 8; para(t.notes, { x: M + 14, w: CW - 24, size: 9.4, translate: false }); y += 14;
  }

  // ---- remediation
  section('Recommended heritage-safe conservation action');
  t.reco.forEach(g => {
    ensure(40);
    doc.rrect(M, y + 1, 8, 8, 2, SEV[g.sev]);
    doc.text(M + 14, y + 9, g.title, { size: 9.6, bold: true, color: INK }); y += 16;
    g.actions.forEach((a, i) => { ensure(14); doc.text(M + 6, y + 9.2, (i + 1) + '.', { size: 9, bold: true, color: GOLD }); para(a, { x: M + 20, w: CW - 20, size: 9 }); y += 2; });
    if (g.avoid.length) { ensure(14); doc.text(M + 6, y + 9, 'Avoid:', { size: 8.6, bold: true, color: '#c8361f' }); const before = y; para(g.avoid.map(sentinelText).join('; ') + '.', { x: M + 42, w: CW - 42, size: 8.6, color: '#7a2a1c' }); if (y === before) y += 12; }
    y += 8;
  });
  if (t.substrate) { ensure(42); doc.text(M, y + 9, 'Substrate note:', { size: 8.6, bold: true, color: INK }); y += 15; para(t.substrate, { x: M, w: CW, size: 8.6, color: MUTE }); y += 6; }
  if (t.legal) { ensure(42); doc.text(M, y + 9, 'Legal:', { size: 8.6, bold: true, color: INK }); y += 15; para(t.legal, { x: M, w: CW, size: 8.6, color: MUTE }); y += 6; }

  // ---- sign-off
  ensure(96);
  section('Verification & sign-off');
  const bw = (CW - 20) / 3;
  ['Inspected by', 'Verified by (Conservation Assistant)', 'Action taken / date closed'].forEach((lb, i) => {
    const bx = M + i * (bw + 10);
    doc.rrect(bx, y, bw, 58, 5, null, LINE, 0.8);
    doc.text(bx + 8, y + 13, lb.toUpperCase(), { size: 6.6, bold: true, color: MUTE, maxWidth: bw - 16 });
    if (i === 0 && t.inspector) doc.text(bx + 8, y + 28, t.inspector, { size: 9, bold: true, color: INK, translate: false, maxWidth: bw - 16 });
    doc.line(bx + 8, y + 46, bx + bw - 8, y + 46, '#bfae9e', 0.6, true);
    doc.text(bx + 8, y + 54, i === 2 ? 'Remarks' : 'Signature & date', { size: 6.2, color: MUTE });
  });
  y += 70;

  // ---- footers
  const N = doc.pages.length;
  doc.pages.forEach((pg, i) => {
    doc.p = pg;
    doc.line(M, doc.H - 38, W - M, doc.H - 38, LINE, 0.6);
    doc.text(M, doc.H - 26, 'Automated visual screening by Mirava Sentinel. Findings must be verified on site by a qualified conservator before any treatment.', { size: 6.8, color: MUTE, maxWidth: CW });
    doc.text(M, doc.H - 17, 'Not an official ASI document until countersigned by an authorised officer.', { size: 6.8, color: MUTE, maxWidth: CW - 175 });
    doc.text(W - M, doc.H - 17, `${t.id}  ·  Page ${i + 1} of ${N}`, { size: 7, bold: true, color: INK, align: 'right', maxWidth: 165 });
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
    doc.rect(0, 0, W, first ? 104 : 46, WINE); doc.rect(0, first ? 104 : 46, W, 3, GOLD);
    if (first) {
      doc.text(M, 32, 'PATROL INSPECTION SUMMARY', { size: 17, bold: true, color: '#ffffff', maxWidth: CW - 172 });
      doc.text(M, 50, 'Mirava Sentinel  ·  Batch screening of one patrol round', { size: 8.4, color: '#f1c56a', maxWidth: CW - 172 });
      doc.text(M, 89, `For the site in-charge / ASI Circle office  ·  Generated ${p.tsText}`, { size: 8.2, color: '#e8d6cd', maxWidth: CW });
      doc.text(W - M, 30, 'REFERENCE', { size: 7.5, bold: true, color: '#f1c56a', align: 'right' });
      doc.text(W - M, 47, p.id, { size: 13, bold: true, color: '#ffffff', align: 'right' });
      doc.text(W - M, 66, `${p.stats.photos} photos  ·  sensitivity ${p.sens}/10`, { size: 8, color: '#e8d6cd', align: 'right', maxWidth: CW });
      y = 124;
    } else {
      doc.text(M, 29, 'PATROL INSPECTION SUMMARY  (continued)', { size: 11, bold: true, color: '#ffffff', maxWidth: CW - 150 });
      doc.text(W - M, 29, p.id, { size: 10, bold: true, color: '#f1c56a', align: 'right' }); y = 66;
    }
  };
  const ensure = h => { if (y + h > doc.H - 52) { doc.addPage(); header(false); } };
  header(true);
  // identity
  const sitesL = doc.wrap(p.sites.join(', '), 8.4, true, CW * 0.5 - 14).slice(0, 4);
  [['Sites covered (' + p.sites.length + ')', null, 0, 0.5], ['Inspector', (p.inspector || sentinelText('Not given')) + ' (' + sentinelText(p.role) + ')', 0.5, 0.28], ['GPS', p.gps || 'Not attached', 0.78, 0.22]].forEach(kv => {
    const cx = M + kv[2] * CW; doc.text(cx, y + 8, kv[0].toUpperCase(), { size: 6.8, bold: true, color: MUTE });
    (kv[1] == null ? sitesL : doc.wrap(kv[1], 8.4, true, CW * kv[3] - 12, kv[0] !== 'Inspector').slice(0, 3)).forEach((l, k) => doc.text(cx, y + 20 + k * 10, l, { size: 8.4, bold: true, color: INK }));
  });
  y += 30 + Math.max(2, sitesL.length) * 10;
  // KPI tiles
  const tiles = [['CRITICAL', p.stats.crit, SEV[3]], ['MEDIUM', p.stats.med, SEV[2]], ['LOW', p.stats.low, SEV[1]], ['CLEAR', p.stats.clear, SEV[0]], ['AVG HEALTH INDEX', p.stats.avg == null ? '-' : `${p.stats.avg}`, INK]];
  const tw = (CW - 4 * 8) / 5;
  tiles.forEach((tl, i) => { const x = M + i * (tw + 8); doc.rrect(x, y, tw, 52, 6, '#fbf3ea', LINE, 0.7); doc.rect(x, y + 8, 3, 36, tl[2]); doc.text(x + 12, y + 31, String(tl[1]), { size: 20, bold: true, color: tl[2] }); doc.text(x + 12, y + 44, tl[0], { size: 6.4, bold: true, color: MUTE, maxWidth: tw - 20 }); });
  y += 66;
  const urgent = p.entries.filter(e => e.level === 3);
  if (urgent.length) { doc.rrect(M, y, CW, 22, 5, '#fbe9e5', '#e8b4a8', 0.7); doc.text(M + 10, y + 14.5, `ACTION: ${urgent.length} location${urgent.length === 1 ? '' : 's'} need a team dispatched within 24 hours. Raise a full incident ticket for each.`, { size: 8.4, bold: true, color: '#9c2a17', maxWidth: CW - 20 }); y += 32; }
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
    doc.text(M + 112, y + 41, doc.wrap(e.name, 7.4, false, 180, false)[0] || '', { size: 7.4, color: MUTE });
    doc.text(M + 112, y + 52, `${e.n} finding${e.n === 1 ? '' : 's'}`, { size: 7.4, color: MUTE });
    doc.rrect(M + 300, y + 8, 64, 14, 7, SEV[e.level]); doc.text(M + 332, y + 17.6, e.level ? `L${e.level} ${e.levelName.toUpperCase()}` : 'CLEAR', { size: 6.8, bold: true, color: '#ffffff', align: 'center', maxWidth: 58 });
    doc.text(M + 372, y + 19, String(e.mhi), { size: 12, bold: true, color: e.color });
    doc.text(M + 372, y + 30, e.band.toUpperCase(), { size: 6, bold: true, color: MUTE });
    const pl = doc.wrap(e.level ? `${sentinelText(e.primary)} (${sentinelText(e.pos)})` : 'No significant anomaly', 8, true, CW - 410).slice(0, 2);
    pl.forEach((l, k) => doc.text(M + 406, y + 16 + k * 10, l, { size: 8, bold: true, color: INK }));
    doc.text(M + 406, y + 16 + pl.length * 10 + 2, doc.wrap(e.resp, 7.4, false, CW - 410)[0] || '', { size: 7.4, color: MUTE });
    y += rh; doc.line(M, y, W - M, y, LINE, 0.5);
  });
  y += 14;
  ensure(80);
  doc.text(M, y + 10, 'NEXT STEPS', { size: 8.5, bold: true, color: GOLD }); doc.line(M, y + 15, W - M, y + 15, LINE, 0.8); y += 26;
  ['Open each Critical and Medium photo in Sentinel and generate a full incident ticket with conservation guidance.', 'Re-photograph flagged spots from the same position on the next round to confirm whether damage is growing.', 'Every finding is automated screening: verify on site before any treatment.'].forEach((s, i) => { const lines = doc.wrap(s, 9, false, CW - 22); ensure(14); doc.text(M + 4, y + 9, `${i + 1}.`, { size: 9, bold: true, color: GOLD }); lines.forEach(l => { ensure(14); doc.text(M + 20, y + 9, l, { size: 9, color: INK }); y += 14; }); y += 3; });
  const N = doc.pages.length;
  doc.pages.forEach((pg, i) => { doc.p = pg; doc.line(M, doc.H - 38, W - M, doc.H - 38, LINE, 0.6); doc.text(M, doc.H - 26, 'Automated visual screening by Mirava Sentinel. Findings must be verified on site by a qualified conservator before any treatment.', { size: 6.8, color: MUTE, maxWidth: CW }); doc.text(M, doc.H - 17, 'Health Index (MHI): a 0-100 screening score from severity and extent. Not a structural assessment.', { size: 6.8, color: MUTE, maxWidth: CW - 175 }); doc.text(W - M, doc.H - 17, `${p.id}  ·  Page ${i + 1} of ${N}`, { size: 7, bold: true, color: INK, align: 'right', maxWidth: 165 }); });
  return doc.build();
}
