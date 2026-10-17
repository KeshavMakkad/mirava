/* eslint-disable */
// VEDIC MATHS ENGINE — ported verbatim from legacy/vedicmaths.html (pure, no DOM).
/* =====================================================================
   VEDIC MATHS ENGINE — step-by-step solvers (exact, BigInt based)
   Every solver returns { ok, answer, steps[], line, meta } or { ok:false, error }.
   ===================================================================== */
export const VM = (() => {
  'use strict';
  const B = v => BigInt(v);
  const abs = v => (v < 0n ? -v : v);
  const pow10 = p => 10n ** B(p);
  const digits = v => abs(B(v)).toString().length;
  const pad = (v, n) => v.toString().padStart(n, '0');
  const sgn = v => (v < 0n ? '−' + abs(v) : '+' + v);
  const fmt = v => (v < 0n ? '−' + abs(v).toString() : v.toString());
  const par = v => (v < 0n ? '(−' + abs(v).toString() + ')' : v.toString());
  function parseInt_(s, max) {
    s = String(s == null ? '' : s).replace(/[\s,_]/g, '');
    if (!/^\d+$/.test(s)) return null;
    const v = B(s); if (max != null && v > B(max)) return null; return v;
  }

  /* digit root / navasesh (casting out nines) — 9 counts as 0 */
  const nav = v => { v = abs(B(v)); return Number(v % 9n); };
  const digitSumTrail = v => { const s = abs(B(v)).toString(); return s.length > 1 ? `${s.split('').join('+')} → ${nav(v)}` : `${nav(v)}`; };
  function beejank(kind, x, y, result) {
    // kind: 'mul' (x*y=result) | 'sq' (x^2=result) | 'cube' (x^3=result)
    const nx = nav(x), ny = kind === 'mul' ? nav(y) : nx, pw = kind === 'cube' ? 3 : 2;
    const lhsRaw = kind === 'cube' ? nx * nx * nx : nx * ny, lhs = lhsRaw % 9, rhs = nav(result);
    return {
      ok: lhs === rhs, lhs, rhs, nx, ny,
      text: kind === 'mul'
        ? `Navasesh of ${x}: ${digitSumTrail(x)} · of ${y}: ${digitSumTrail(y)} → ${nx} × ${ny} = ${lhsRaw} → ${lhs}. Navasesh of answer: ${rhs}.`
        : `Navasesh of ${x}: ${digitSumTrail(x)} → ${nx}${pw === 3 ? '³' : '²'} = ${lhsRaw} → ${lhs}. Navasesh of ${result}: ${rhs}.`
    };
  }

  /* conventional long multiplication — for honest comparison */
  function longMul(a, b) {
    a = B(a); b = B(b);
    const bd = b.toString().split('').reverse(), rows = [];
    bd.forEach((d, i) => { const pp = a * B(d); if (pp !== 0n || bd.length === 1) rows.push((pp.toString()) + (i ? '0'.repeat(i) : '')); });
    const ans = (a * b).toString(), W = Math.max(ans.length, a.toString().length, b.toString().length + 2, ...rows.map(r => r.length + 2)) + 1;
    const r = s => s.padStart(W, ' ');
    const lines = [r(a.toString()), r('× ' + b.toString()), r('─'.repeat(W - 1))];
    if (rows.length > 1) { rows.forEach((p, i) => lines.push(r((i === rows.length - 1 ? '+ ' : '') + p))); lines.push(r('─'.repeat(W - 1))); }
    lines.push(r(ans));
    return { text: lines.join('\n'), rows: rows.length > 1 ? rows.length + 1 : 1, mults: a.toString().length * b.toString().length };
  }

  /* ---------------- Ūrdhva-Tiryagbhyām: vertically & crosswise ---------------- */
  function urdhva(as, bs) {
    const a = parseInt_(as), b = parseInt_(bs);
    if (a == null || b == null) return { ok: false, error: 'Enter two whole numbers (digits only).' };
    if (digits(a) > 12 || digits(b) > 12) return { ok: false, error: 'Keep each number to 12 digits or fewer.' };
    const A = a.toString().split('').reverse().map(Number), Bd = b.toString().split('').reverse().map(Number);
    const L = Math.max(A.length, Bd.length), cols = [];
    for (let k = 0; k <= A.length + Bd.length - 2; k++) {
      const pairs = [];
      for (let i = 0; i < A.length; i++) { const j = k - i; if (j >= 0 && j < Bd.length) pairs.push([A[i], Bd[j], i, j]); }
      cols.push({ k, pairs, sum: pairs.reduce((t, p) => t + p[0] * p[1], 0) });
    }
    let carry = 0; const out = [];
    cols.forEach(c => { c.carryIn = carry; c.total = c.sum + carry; c.digit = c.total % 10; c.carryOut = Math.floor(c.total / 10); carry = c.carryOut; out.unshift(c.digit); });
    const ans = (carry ? String(carry) : '') + out.join('');
    const answer = B(ans).toString();
    if (answer !== (a * b).toString()) throw new Error('urdhva mismatch');
    const steps = [{ k: 'Set up', v: `Write ${a} above ${b}, digits aligned on the right. Work column by column from the right; each column multiplies vertically and crosswise.` }];
    cols.forEach((c, n) => {
      const expr = c.pairs.map(p => `${p[0]}×${p[1]}`).join(' + ');
      steps.push({ k: `Column ${n + 1}${n === 0 ? ' (units)' : ''}`, v: `${expr} = ${c.sum}${c.carryIn ? ` · + carry ${c.carryIn} = ${c.total}` : ''} → write ${c.digit}${c.carryOut ? `, carry ${c.carryOut}` : ''}`, col: c.k, pairs: c.pairs.map(p => [p[2], p[3]]) });
    });
    if (carry) steps.push({ k: 'Final carry', v: `Bring down the last carry ${carry} on the left.` });
    steps.push({ k: 'Answer', v: `${a} × ${b} = ${answer}`, final: true });
    const line = cols.slice().reverse().map(c => c.sum).join(' | ');
    return { ok: true, method: 'urdhva', a, b, answer, steps, line: `${line}  →  ${answer}`, cols, A, B: Bd, L, check: beejank('mul', a, b, answer), compare: compareMul(a, b, { lines: 1, mults: A.length * Bd.length, note: 'Same digit products, but the partial-product rows disappear: each column is finished in your head.' }) };
  }
  function compareMul(a, b, vedic) { const c = longMul(a, b); return { conv: { lines: c.rows, mults: c.mults, text: c.text }, vedic }; }

  /* choose a power-of-ten base close to the numbers */
  function pickBase(list) {
    let best = null;
    for (let p = 1; p <= 12; p++) { const Bs = pow10(p), cost = list.reduce((t, v) => t + abs(v - Bs), 0n); if (best == null || cost < best.cost) best = { p, base: Bs, cost }; }
    return best;
  }

  /* ---------------- Nikhilam: all from 9, the last from 10 ---------------- */
  function nikhilam(as, bs) {
    const a = parseInt_(as), b = parseInt_(bs);
    if (a == null || b == null || a < 1n || b < 1n) return { ok: false, error: 'Enter two positive whole numbers.' };
    if (digits(a) > 10 || digits(b) > 10) return { ok: false, error: 'Keep each number to 10 digits or fewer.' };
    const { p, base } = pickBase([a, b]);
    const da = a - base, db = b - base;
    let left = a + db, right = da * db;
    const steps = [
      { k: 'Base', v: `Both numbers are close to ${base} (a 1 followed by ${p} zero${p > 1 ? 's' : ''}), so the right part of the answer gets ${p} digit${p > 1 ? 's' : ''}.` },
      { k: 'Deviations', v: `${a} is ${sgn(da)} from ${base} · ${b} is ${sgn(db)} from ${base}${da < 0n ? `. Nikhilam: take each digit from 9 and the last from 10 to read ${abs(da)} off ${a} instantly` : ''}.` },
      { k: 'Left part (crosswise)', v: `${a} ${db < 0n ? '−' : '+'} ${abs(db)} = ${left}   (the same as ${b} ${da < 0n ? '−' : '+'} ${abs(da)} = ${b + da})` },
      { k: 'Right part (vertical)', v: `${par(da)} × ${par(db)} = ${fmt(right)}` }
    ];
    const raw = `${left} | ${fmt(right)}`;
    if (right < 0n) {
      const k = (-right + base - 1n) / base; left -= k; right += k * base;
      steps.push({ k: 'Borrow', v: `The right part is negative, so borrow ${k} from the left: left ${left + k} − ${k} = ${left}, right ${fmt(right - k * base)} + ${k * base} = ${right}.` });
    } else if (right >= base) {
      const c = right / base; left += c; right %= base;
      steps.push({ k: 'Carry', v: `The right part has more than ${p} digit${p > 1 ? 's' : ''}, so carry ${c} to the left: left becomes ${left}, right becomes ${pad(right, p)}.` });
    }
    const answer = (left * base + right).toString();
    if (answer !== (a * b).toString()) throw new Error('nikhilam mismatch');
    steps.push({ k: 'Answer', v: `${left} | ${pad(right, p)} → ${a} × ${b} = ${answer}`, final: true });
    const far = abs(da) * 2n > base || abs(db) * 2n > base;
    return { ok: true, method: 'nikhilam', a, b, base, p, da, db, answer, steps, line: `${raw}  →  ${answer}`, warn: far ? `These numbers are far from ${base}, so the deviations are big. Nikhilam still works, but Ūrdhva-Tiryagbhyām is quicker here.` : '', check: beejank('mul', a, b, answer), compare: compareMul(a, b, { lines: 1, mults: digits(da) * digits(db), note: `Only the small deviations are multiplied (${fmt(da)} × ${fmt(db)}), plus one addition.` }) };
  }

  /* ---------------- Yāvadūnam: squares near a base ---------------- */
  function yavadunam(ns) {
    const n = parseInt_(ns);
    if (n == null || n < 1n) return { ok: false, error: 'Enter a positive whole number.' };
    if (digits(n) > 10) return { ok: false, error: 'Keep the number to 10 digits or fewer.' };
    const { p, base } = pickBase([n]), d = n - base;
    let left = n + d, right = d * d;
    const steps = [
      { k: 'Base', v: `${n} is close to ${base}; the right part gets ${p} digit${p > 1 ? 's' : ''}.` },
      { k: 'Deficiency / surplus', v: `${n} is ${sgn(d)} from ${base}. "Whatever the extent of its deficiency, lessen it by that much${d >= 0n ? ' (or add the surplus)' : ''}."` },
      { k: 'Left part', v: `${n} ${d < 0n ? '−' : '+'} ${abs(d)} = ${left}` },
      { k: 'Right part', v: `square of the ${d < 0n ? 'deficiency' : 'surplus'}: ${abs(d)}² = ${right}` }
    ];
    if (right >= base) { const c = right / base; left += c; right %= base; steps.push({ k: 'Carry', v: `${abs(d)}² has more than ${p} digit${p > 1 ? 's' : ''}: carry ${c} to the left → ${left} | ${pad(right, p)}.` }); }
    const answer = (left * base + right).toString();
    if (answer !== (n * n).toString()) throw new Error('yavadunam mismatch');
    steps.push({ k: 'Answer', v: `${left} | ${pad(right, p)} → ${n}² = ${answer}`, final: true });
    return { ok: true, method: 'yavadunam', n, base, p, d, answer, steps, line: `${n + d} | ${d * d}  →  ${answer}`, warn: abs(d) * 2n > base ? `${n} is far from ${base}; the method still works but the square of the deviation is large.` : '', check: beejank('sq', n, null, answer), compare: compareMul(n, n, { lines: 1, mults: digits(d) * digits(d), note: `Only the deviation ${abs(d)} is squared.` }) };
  }

  /* ---------------- Ekādhikena Pūrveṇa: one more than the previous ---------------- */
  function ekadhika(as, bs) {
    const a = parseInt_(as), b = parseInt_(bs == null || bs === '' ? as : bs);
    if (a == null || b == null) return { ok: false, error: 'Enter whole numbers (digits only).' };
    if (digits(a) > 10 || digits(b) > 10) return { ok: false, error: 'Keep each number to 10 digits or fewer.' };
    const n = a / 10n, x = a % 10n, y = b % 10n;
    if (b / 10n !== n || x + y !== 10n) return { ok: false, error: `This sutra needs the same leading part and last digits that add to 10 (e.g. 35 × 35, 43 × 47). ${a} and ${b} ${b / 10n !== n ? 'have different leading parts' : `end in ${x} and ${y}, which add to ${x + y}`}.` };
    const left = n * (n + 1n), right = x * y, answer = (left * 100n + right).toString();
    if (answer !== (a * b).toString()) throw new Error('ekadhika mismatch');
    const sq = a === b;
    const steps = [
      { k: 'Split', v: `${sq ? `${a} ends in 5` : `${a} and ${b} share the leading part ${n} and their last digits ${x} + ${y} = 10`}. Leading part: ${n}.` },
      { k: 'Ekādhika (one more)', v: `One more than ${n} is ${n + 1n}. Left part: ${n} × ${n + 1n} = ${left}.` },
      { k: 'Right part', v: `Last digits: ${x} × ${y} = ${right} → always two digits: ${pad(right, 2)}.` },
      { k: 'Answer', v: `${left} | ${pad(right, 2)} → ${sq ? `${a}²` : `${a} × ${b}`} = ${answer}`, final: true }
    ];
    return { ok: true, method: 'ekadhika', a, b, answer, steps, line: `${n}×${n + 1n} | ${x}×${y}  =  ${left} | ${pad(right, 2)}  →  ${answer}`, check: sq ? beejank('sq', a, null, answer) : beejank('mul', a, b, answer), compare: compareMul(a, b, { lines: 1, mults: digits(n) * digits(n + 1n) + 1, note: 'One small multiplication of the leading part, one of the last digits.' }) };
  }

  /* ---------------- Ekanyūnena Pūrveṇa: one less than the previous (× 9s) ---------------- */
  function ekanyunena(as, ns) {
    const a = parseInt_(as), nn = String(ns || '').replace(/\s/g, '');
    if (a == null || a < 1n) return { ok: false, error: 'Enter a positive whole number to multiply.' };
    if (!/^9+$/.test(nn) || nn.length > 12) return { ok: false, error: 'The multiplier must be all nines: 9, 99, 999 … (up to 12 nines).' };
    if (digits(a) > 12) return { ok: false, error: 'Keep the number to 12 digits or fewer.' };
    const k = nn.length, nines = B(nn), base = pow10(k);
    let steps, answer;
    if (digits(a) <= k) {
      const left = a - 1n, right = base - a; answer = (left * base + right).toString();
      steps = [
        { k: 'Check', v: `${a} has ${digits(a)} digit${digits(a) > 1 ? 's' : ''}, no more than the ${k} nines, so the sutra applies directly.` },
        { k: 'Ekanyūna (one less)', v: `Left part: one less than ${a} → ${left}.` },
        { k: 'Right part', v: `Subtract ${left} from ${nn} (every digit from 9): ${nn} − ${pad(left, k)} = ${pad(right, k)}.` },
        { k: 'Answer', v: `${left} | ${pad(right, k)} → ${a} × ${nn} = ${answer}`, final: true }
      ];
    } else {
      answer = (a * base - a).toString();
      steps = [
        { k: 'Check', v: `${a} has more digits than there are nines, so use the companion rule: × ${nn} is × ${base} minus once.` },
        { k: 'Shift', v: `${a} × ${base} = ${a * base}` },
        { k: 'Subtract once', v: `${a * base} − ${a} = ${answer}` },
        { k: 'Answer', v: `${a} × ${nn} = ${answer}`, final: true }
      ];
    }
    if (answer !== (a * nines).toString()) throw new Error('ekanyunena mismatch');
    return { ok: true, method: 'ekanyunena', a, b: nines, answer, steps, line: digits(a) <= k ? `${a - 1n} | ${pad(base - a, k)}  →  ${answer}` : `${a * base} − ${a}  →  ${answer}`, check: beejank('mul', a, nines, answer), compare: compareMul(a, nines, { lines: 1, mults: 0, note: 'No multiplication at all: one subtraction of 1 and one complement from 9.' }) };
  }

  /* ---------------- Vilokanam: cube & square roots of perfect powers ---------------- */
  const CUBE_LAST = { 0: 0, 1: 1, 2: 8, 3: 7, 4: 4, 5: 5, 6: 6, 7: 3, 8: 2, 9: 9 };
  function icbrt(n) { let r = B(Math.round(Math.cbrt(Number(n)))); while (r * r * r > n) r--; while ((r + 1n) ** 3n <= n) r++; return r; }
  function isqrt(n) { if (n < 2n) return n; let r = B(Math.floor(Math.sqrt(Number(n)))); while (r * r > n) r--; while ((r + 1n) * (r + 1n) <= n) r++; return r; }
  function cuberoot(ns) {
    const N = parseInt_(ns);
    if (N == null || N < 1n) return { ok: false, error: 'Enter a positive whole number.' };
    if (digits(N) > 9) return { ok: false, error: 'Use a perfect cube under 1,000,000,000 (roots up to 999).' };
    const r = icbrt(N);
    if (r * r * r !== N) { const lo = r, hi = r + 1n; return { ok: false, error: `${N} is not a perfect cube (it lies between ${lo}³ = ${lo ** 3n} and ${hi}³ = ${hi ** 3n}). This trick is for perfect cubes.` }; }
    const last = Number(N % 10n), u = CUBE_LAST[last], head = N / 1000n, q = icbrt(head);
    const steps = [
      { k: 'Last digit', v: `${N} ends in ${last}. Cubes ending in ${last} come from roots ending in ${u}${[2, 3, 7, 8].includes(last) ? ` (2↔8 and 3↔7 swap; the rest match)` : ' (0, 1, 4, 5, 6, 9 end the same as their cube)'}. Units digit of the root: ${u}.` },
      { k: 'Strike off three digits', v: `Remove the last three digits: ${N} → ${head}.` },
      { k: 'Largest cube that fits', v: head === 0n ? 'Nothing is left, so the root is a single digit.' : `The largest cube not exceeding ${head} is ${q}³ = ${q ** 3n}${(q + 1n) ** 3n > head ? ` (${q + 1n}³ = ${(q + 1n) ** 3n} is too big)` : ''}. Tens part: ${q}.` },
      { k: 'Answer', v: `∛${N} = ${q ? q : ''}${u} (check: ${r}³ = ${N})`, final: true }
    ];
    if (B(`${q}${u}`) !== r) throw new Error('cube mismatch');
    return { ok: true, method: 'cuberoot', N, answer: r.toString(), steps, line: `${q ? q : ''} | ${u}  →  ${r}`, check: beejank('cube', r, null, N) };
  }
  const SQ_LAST = { 0: [0, 0], 1: [1, 9], 4: [2, 8], 5: [5, 5], 6: [4, 6], 9: [3, 7] };
  function sqroot(ns) {
    const N = parseInt_(ns);
    if (N == null || N < 1n) return { ok: false, error: 'Enter a positive whole number.' };
    if (digits(N) > 10) return { ok: false, error: 'Use a perfect square under 10,000,000,000 (roots up to 99,999).' };
    const r = isqrt(N);
    if (r * r !== N) return { ok: false, error: `${N} is not a perfect square (it lies between ${r}² = ${r * r} and ${r + 1n}² = ${(r + 1n) * (r + 1n)}). This trick is for perfect squares.` };
    const last = Number(N % 10n), [u1, u2] = SQ_LAST[last], head = N / 100n, q = isqrt(head), mid = (10n * q + 5n) ** 2n;
    const u = u1 === u2 ? u1 : (N > mid ? u2 : u1);
    const steps = [
      { k: 'Last digit', v: `${N} ends in ${last}, so the root ends in ${u1 === u2 ? u1 : `${u1} or ${u2}`}.` },
      { k: 'Strike off two digits', v: `Remove the last two digits: ${N} → ${head}. The largest square not exceeding ${head} is ${q}² = ${q * q}. Tens part: ${q}.` }
    ];
    if (u1 !== u2) steps.push({ k: 'Choose the units digit', v: `Compare with ${10n * q + 5n}² = ${q} × ${q + 1n} | 25 = ${mid} (Ekādhika!). ${N} is ${N > mid ? 'bigger' : 'smaller'}, so take the ${N > mid ? 'larger' : 'smaller'} digit: ${u}.` });
    steps.push({ k: 'Answer', v: `√${N} = ${q ? q : ''}${u} (check: ${r}² = ${N})`, final: true });
    if (B(`${q}${u}`) !== r) throw new Error('sqrt mismatch');
    return { ok: true, method: 'sqroot', N, answer: r.toString(), steps, line: `${q ? q : ''} | ${u}  →  ${r}`, check: beejank('sq', r, null, N) };
  }

  /* ---------------- practice problem generators ---------------- */
  function rnd(lo, hi, R) { return lo + Math.floor((R || Math.random)() * (hi - lo + 1)); }
  const GEN = {
    ekadhika: lv => { if (lv === 1 || Math.random() < 0.5) { const n = rnd(1, [9, 19, 99][lv - 1]); const v = n * 10 + 5; return { q: `${v}²`, args: [v, v] }; } const n = rnd(1, [9, 19, 49][lv - 1]), x = rnd(1, 9); return { q: `${n * 10 + x} × ${n * 10 + 10 - x}`, args: [n * 10 + x, n * 10 + 10 - x] }; },
    nikhilam: lv => { const base = lv === 3 ? 1000 : 100, sp = [9, 12, 30][lv - 1]; let a, b; do { a = base + rnd(-sp, lv === 1 ? -1 : sp); b = base + rnd(-sp, lv === 1 ? -1 : sp); } while (a === base || b === base); return { q: `${a} × ${b}`, args: [a, b] }; },
    urdhva: lv => { const a = lv === 3 ? rnd(101, 999) : rnd(11, lv === 1 ? 39 : 99), b = rnd(11, lv === 1 ? 39 : 99); return { q: `${a} × ${b}`, args: [a, b] }; },
    yavadunam: lv => { const base = lv === 3 ? 1000 : 100, sp = [9, 15, 40][lv - 1]; let n; do { n = base + rnd(-sp, sp); } while (n === base); return { q: `${n}²`, args: [n] }; },
    ekanyunena: lv => { const k = [2, 3, 4][lv - 1], a = rnd(Math.pow(10, k - 2) + 1, Math.pow(10, k) - 1); return { q: `${a} × ${'9'.repeat(k)}`, args: [a, '9'.repeat(k)] }; },
    cuberoot: lv => { const r = rnd(lv === 1 ? 2 : 11, [20, 99, 99][lv - 1]); return { q: `∛${B(r) ** 3n}`, args: [(B(r) ** 3n).toString()] }; },
    sqroot: lv => { const r = rnd(lv === 1 ? 4 : 11, [30, 99, 300][lv - 1]); return { q: `√${r * r}`, args: [String(r * r)] }; }
  };
  const SOLVE = { urdhva, nikhilam, yavadunam, ekadhika, ekanyunena, cuberoot, sqroot };
  function problem(method, lv) {
    const g = GEN[method](lv), res = SOLVE[method](...g.args.map(String));
    return { method, q: g.q, args: g.args, answer: res.answer, res };
  }

  return { urdhva, nikhilam, yavadunam, ekadhika, ekanyunena, cuberoot, sqroot, beejank, longMul, nav, problem, SOLVE, GEN };
})();
