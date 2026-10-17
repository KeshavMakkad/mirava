// SOUND-law engine ported verbatim from legacy Bhasha.html (pure functions).
/* =====================================================================
   SOUND-LAW ENGINE — Sanskrit (IAST) → Pali → Mahārāṣṭrī Prakrit → Hindi-type
   A teaching model of regular Middle Indo-Aryan sound changes.
   ===================================================================== */
const SOUND = (() => {
  'use strict';
  const MULTI = ['kh', 'gh', 'ch', 'jh', 'ṭh', 'ḍh', 'th', 'dh', 'ph', 'bh', 'ai', 'au'];
  const VOW = new Set(['a', 'ā', 'i', 'ī', 'u', 'ū', 'ṛ', 'ṝ', 'ḷ', 'e', 'ai', 'o', 'au']);
  const STOPS = new Set(['k', 'kh', 'g', 'gh', 'c', 'ch', 'j', 'jh', 'ṭ', 'ṭh', 'ḍ', 'ḍh', 't', 'th', 'd', 'dh', 'p', 'ph', 'b', 'bh']);
  const NASAL = new Set(['ṅ', 'ñ', 'ṇ', 'n', 'm']);
  const LABIAL = new Set(['p', 'ph', 'b', 'bh', 'm', 'v']);
  const isV = p => VOW.has(p), isC = p => p && !VOW.has(p) && p !== 'ṃ' && p !== 'ḥ' && p !== "'";
  const LONG = { a: 'ā', i: 'ī', u: 'ū' }, SHORT = { ā: 'a', ī: 'i', ū: 'u' };
  const deasp = c => (c.length === 2 && c[1] === 'h') ? c[0] : c;
  const gem = c => (c.length === 2 && c[1] === 'h') ? [c[0], c] : [c, c];
  const ORG = { k: 'v', kh: 'v', g: 'v', gh: 'v', ṅ: 'v', c: 'p', ch: 'p', j: 'p', jh: 'p', ñ: 'p', ṭ: 'r', ṭh: 'r', ḍ: 'r', ḍh: 'r', ṇ: 'r', t: 'd', th: 'd', d: 'd', dh: 'd', n: 'd', p: 'l', ph: 'l', b: 'l', bh: 'l', m: 'l' };

  function phon(w) {
    w = w.normalize('NFC').toLowerCase().replace(/ṁ/g, 'ṃ').replace(/[^a-zāīūṛṝḷḹṅñṭḍṇśṣṃḥ']/g, '');
    const out = [];
    for (let i = 0; i < w.length;) {
      const two = w.substr(i, 2);
      if (MULTI.includes(two)) { out.push(two); i += 2; } else { out.push(w[i]); i++; }
    }
    return out;
  }

  // ---- cluster assimilation (middle of word) ----
  const SPECIAL = {
    common: {
      'kṣ': ['k', 'kh'], 'kṣṇ': ['ṇh'], 'ṣṇ': ['ṇh'], 'sn': ['nh'], 'śn': ['ñh'], 'ṣm': ['mh'], 'sm': ['mh'], 'śm': ['mh'], 'hm': ['mh'], 'hn': ['nh'], 'hv': ['vh'], 'hy': ['yh'],
      'ty': ['c', 'c'], 'thy': ['c', 'ch'], 'dy': ['j', 'j'], 'dhy': ['j', 'jh'], 'ny': ['ñ', 'ñ'], 'ṇy': ['ñ', 'ñ'], 'sy': ['s', 's'], 'śy': ['s', 's'], 'ṣy': ['s', 's'], 'ly': ['l', 'l'],
      'tv': ['t', 't'], 'dv': ['d', 'd'], 'dhv': ['d', 'dh'], 'śv': ['s', 's'], 'sv': ['s', 's'], 'jv': ['j', 'j'], 'kv': ['k', 'k'], 'tm': ['t', 't'], 'tn': ['t', 't'],
      'st': ['t', 'th'], 'sth': ['t', 'th'], 'ṣṭ': ['ṭ', 'ṭh'], 'ṣṭh': ['ṭ', 'ṭh'], 'sk': ['k', 'kh'], 'ṣk': ['k', 'kh'], 'sp': ['p', 'ph'], 'ṣp': ['p', 'ph'], 'śc': ['c', 'ch'], 'ts': ['c', 'ch'], 'ps': ['c', 'ch']
    },
    pali: { 'ry': ['y', 'y'], 'rv': ['b', 'b'], 'vv': ['b', 'b'], 'vy': ['b', 'b'], 'jñ': ['ñ', 'ñ'] },
    pk: { 'ry': ['j', 'j'], 'rv': ['v', 'v'], 'vv': ['v', 'v'], 'vy': ['v', 'v'], 'jñ': ['ṇ', 'ṇ'] }
  };
  function assimilate(cl, mode) {
    const s = cl.join('');
    const sp = SPECIAL[mode][s] || SPECIAL.common[s];
    if (sp) return sp.slice();
    // homorganic nasal + stop(s): keep nasal, assimilate the rest
    if (NASAL.has(cl[0]) && cl.length > 1 && STOPS.has(cl[1]) && ORG[cl[0]] === ORG[cl[1]]) {
      const rest = cl.slice(1).filter(c => c !== 'r' && c !== 'y' && c !== 'v');
      return [cl[0], rest.length > 1 ? rest[rest.length - 1] : rest[0]];
    }
    let c = cl.filter(x => x !== 'r');
    if (c.length !== cl.length) { // r dropped → geminate the survivor
      if (c.length === 0) return [];
      const t = c.length === 1 ? c : assimilate(c, mode);
      return t.length === 1 ? gem(t[0]) : t;
    }
    if (c.length === 1) return c;
    if (c.length >= 3) { const t = assimilate(c.slice(-2), mode); return t.length === 2 && t[0] === t[1] || (t.length === 2 && deasp(t[1]) === t[0]) ? t : gem(c[c.length - 1]); }
    const [a, b] = c;
    if (['y', 'v', 'l', 'r'].includes(b)) return gem(a);
    if (['l', 'r'].includes(a)) return gem(b);
    if (NASAL.has(b) && STOPS.has(a)) return gem(a);
    if (STOPS.has(a) && STOPS.has(b)) return gem(b);
    if (['ś', 'ṣ', 's'].includes(a)) return gem(b);
    if (['ś', 'ṣ', 's'].includes(b)) return gem(a);
    return [a, b];
  }
  function initial(cl, mode) {
    const s = cl.join('');
    const T = { 'kṣ': ['kh'], 'jñ': [mode === 'pk' ? 'ṇ' : 'ñ'], 'dhy': ['jh'], 'dy': ['j'], 'ty': ['c'], 'sth': ['th'], 'st': ['th'], 'sk': ['kh'], 'sp': ['ph'], 'ṣṭ': ['ṭh'], 'sm': ['s'], 'sv': ['s'], 'śv': ['s'], 'sn': ['n'], 'śr': ['s'], 'tv': ['t'], 'dv': ['d'], 'hr': ['h'] };
    if (T[s]) return T[s];
    const c = cl.filter(x => !['r', 'y', 'v', 'l'].includes(x));
    return c.length ? [c[0]] : [cl[0]];
  }

  function mia(w, mode) {
    let p = phon(w); if (!p.length) return '';
    const notes = new Set();
    // finals
    const last = p[p.length - 1], prev = p[p.length - 2];
    if (last === 'ḥ' && prev === 'a') { p.splice(-2, 2, 'o'); notes.add('-aḥ → -o (nominative)'); }
    else if (last === 's' && prev === 'a' && p.length > 2) { p.splice(-2, 2, 'o'); notes.add('-as → -o'); }
    else if (last === 'n' && prev === 'a' && p.length > 2) { p.splice(-2, 2, 'ā'); notes.add('-an → -ā'); }
    else if (last === 'n' && prev === 'i' && p.length > 2) { p.splice(-2, 2, 'ī'); notes.add('-in → -ī'); }
    else if (last === 'ḥ') p.pop();
    else if (last === 'm') { p[p.length - 1] = 'ṃ'; }
    else if (isC(last) && p.length > 2) { p.pop(); notes.add('final consonant lost'); }
    // vowels
    p = p.map((x, i) => {
      if (x === 'ai') { notes.add('ai → e'); return 'e'; }
      if (x === 'au') { notes.add('au → o'); return 'o'; }
      if (x === 'ṛ' || x === 'ṝ') { notes.add('ṛ → a / i / u'); if (i === 0) return 'i'; return LABIAL.has(p[i - 1]) ? 'u' : 'a'; }
      if (x === 'ḷ') return 'i';
      return x;
    });
    // sibilants
    p = p.map(x => { if (x === 'ś' || x === 'ṣ') { notes.add('ś, ṣ → s'); return x === 'ś' ? 'ś*' : 'ṣ*'; } return x; });
    // segment into syllable skeleton & resolve clusters (sibilant identity kept for cluster rules)
    const sib = x => x === 'ś*' ? 'ś' : x === 'ṣ*' ? 'ṣ' : x;
    const out = []; let i = 0;
    while (i < p.length) {
      if (isC(p[i])) {
        let j = i; while (j < p.length && isC(p[j])) j++;
        const cl = p.slice(i, j).map(sib);
        let res;
        if (cl.length === 1) res = cl;
        else if (i === 0) { res = initial(cl, mode); notes.add('initial cluster simplified'); }
        else { res = assimilate(cl, mode); notes.add('consonant cluster assimilated'); }
        res = res.map(x => (x === 'ś' || x === 'ṣ') ? 's' : x);
        // law of two morae: long vowel before a double consonant becomes short
        const prevV = out[out.length - 1];
        if (res.length >= 2 && SHORT[prevV]) { out[out.length - 1] = SHORT[prevV]; notes.add('long vowel shortened before double consonant'); }
        out.push(...res); i = j;
      } else { out.push(sib(p[i]) === 'ś' || sib(p[i]) === 'ṣ' ? 's' : p[i]); i++; }
    }
    let r = out;
    if (mode === 'pk') {
      // Mahārāṣṭrī: n → ṇ, nasal+stop → ṃ, initial y → j, intervocalic consonants weaken
      r = r.map(x => x === 'n' ? 'ṇ' : x);
      if (r[0] === 'y') { r[0] = 'j'; notes.add('initial y → j'); }
      const q = [];
      for (let k = 0; k < r.length; k++) {
        const x = r[k], a = r[k - 1], b = r[k + 1];
        if (NASAL.has(x) && b && STOPS.has(b) && k > 0) { q.push('ṃ'); continue; }
        const iv = k > 0 && isV(a) && isV(b);
        if (iv) {
          if (['k', 'g', 'c', 'j', 't', 'd'].includes(x)) { notes.add('intervocalic stop elided (ya-śruti)'); if ((a === 'a' || a === 'ā') && (b === 'a' || b === 'ā')) q.push('y'); continue; }
          if (x === 'p' || x === 'b') { q.push('v'); notes.add('intervocalic p → v'); continue; }
          if (['kh', 'gh', 'th', 'dh', 'ph', 'bh'].includes(x)) { q.push('h'); notes.add('intervocalic aspirate → h'); continue; }
          if (x === 'ṭ') { q.push('ḍ'); continue; }
          if (x === 'ṭh') { q.push('ḍh'); continue; }
        }
        q.push(x);
      }
      if (r.includes('ṇ') && out.includes('n')) notes.add('n → ṇ');
      r = q;
    }
    return { form: r.join(''), notes: [...notes] };
  }

  function nia(w) {
    // from an early Prakrit form (clusters assimilated, stops kept) to a Hindi-type outcome
    let p = phon(mia(w, 'pk-early').form);
    const notes = [];
    if (p.length > 2 && ['a', 'i', 'u', 'o'].includes(p[p.length - 1]) && isC(p[p.length - 2])) { p.pop(); notes.push('final short vowel dropped'); }
    const q = [];
    for (let k = 0; k < p.length; k++) {
      const x = p[k], b = p[k + 1];
      // geminate → single + compensatory lengthening
      if (isC(x) && b && (b === x || (b.length === 2 && b[1] === 'h' && b[0] === x))) {
        const v = q[q.length - 1]; if (LONG[v]) { q[q.length - 1] = LONG[v]; }
        notes.push('double consonant simplified, vowel lengthened'); continue;
      }
      // nasal + stop → nasalised long vowel
      if (NASAL.has(x) && b && STOPS.has(b) && k > 0 && isV(q[q.length - 1])) {
        const v = q[q.length - 1]; if (LONG[v]) q[q.length - 1] = LONG[v]; q.push('ṃ'); notes.push('nasal + stop → nasalised vowel'); continue;
      }
      if (['kh', 'gh', 'th', 'dh', 'ph', 'bh'].includes(x) && k > 0 && isV(p[k - 1]) && isV(b)) { q.push('h'); notes.push('aspirate → h'); continue; }
      q.push(x === 'ṇ' ? 'n' : x);
    }
    return { form: q.join(''), notes: [...new Set(notes)] };
  }

  function derive(w) {
    const pali = mia(w, 'pali'), pk = mia(w, 'pk'), hi = nia(w);
    return { pali, pk, hi };
  }
  // early Prakrit = Prakrit clusters but no intervocalic weakening
  SPECIAL['pk-early'] = SPECIAL.pk;
  return { derive, mia, nia, phon };
})();

export default SOUND;
export { SOUND };
