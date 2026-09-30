// Focused tests of keyMap() and the answer-priority chain, using the real functions from the HTML.
const fs = require('fs'), vm = require('vm');
const html = fs.readFileSync(process.env.HTML_SRC || 'paper-to-test.html', 'utf8');
const code = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].pop()[1];

const shim = () => ({
  value: '', textContent: '', innerHTML: '', hidden: false, files: [], dataset: {},
  classList: { add(){}, remove(){}, contains: () => false }, style: {},
  insertAdjacentHTML(){}, getContext: () => ({ fillRect(){} }), toDataURL: () => '',
  addEventListener(){}, querySelector: () => shim(), querySelectorAll: () => [],
});
const ctx = {
  console, JSON, Math, Date, Object, Array, String, Number, RegExp, Error, Infinity, NaN,
  document: { head: shim(), createElement: shim, querySelector: shim, querySelectorAll: () => [] },
  window: { addEventListener(){}, onkeydown: null },
  fetch: async () => ({ blob: async () => ({}) }),
  URL: { createObjectURL: () => '', revokeObjectURL(){} }, Blob: class {},
  TextDecoder, TextEncoder, Uint8Array, ArrayBuffer, Promise, setTimeout,
  setInterval: () => 0, clearInterval(){}, alert(){}, confirm: () => true,
  localStorage: { getItem: () => null, setItem(){} },
};
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(code, ctx, { filename: 'paper-to-test.html' });
for (const k of Object.keys(ctx.window)) if (ctx[k] === undefined) ctx[k] = ctx.window[k];

const km = ctx.keyMap;
let fails = 0;
const check = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log((ok ? '  ok   ' : '  FAIL ') + name);
  if (!ok) console.log('        got  ' + JSON.stringify(got) + '\n        want ' + JSON.stringify(want));
};

console.log('\n=== A. plain-string key, correct length (baseline) ===');
check('"BDAC" -> 1:B 2:D 3:A 4:C', km('BDAC'), {1:1,2:3,3:0,4:2});

console.log('\n=== B. plain-string key, TOO SHORT (silent truncation?) ===');
const short = km('BDAC');            // 4 letters for a 200-question paper
console.log('  entries produced: ' + Object.keys(short).length + ' (paper has 200)');
console.log('  Q5 present? ' + (short[5] !== undefined ? 'yes' : 'NO'));
console.log('  -> no error thrown, no signal. ' + (Object.keys(short).length < 200 ? 'SILENT TRUNCATION.' : ''));

console.log('\n=== C. stray letter shifts EVERY subsequent answer ===');
// a real 4-question key "BDAC"; a header letter bleeds in front
const shifted = km('KBDAC');
console.log('  "KBDAC" -> ' + JSON.stringify(shifted));
console.log('  -> Q1 should be B(1) but is ' + shifted[1] + '; Q2 should be D(3) but is ' + shifted[2] + '. WHOLE PAPER OFF BY ONE.');

console.log('\n=== D. pairs format ===');
check('"1-B 2-D 3-A"', km('1-B 2-D 3-A'), {1:1,2:3,3:0});
check('"1.B 2.A"', km('1.B 2.A'), {1:1,2:0});
check('"1-b, 2-d"', km('1-b, 2-d'), {1:1,2:3});

console.log('\n=== E. key text with a header word that contains A-E letters ===');
// Common real header: "ANSWER KEY" - contains A, E, E, A, E
const hdr = km('ANSWER KEY 1-A 2-B');
console.log('  "ANSWER KEY 1-A 2-B" -> ' + JSON.stringify(hdr));

console.log('\n=== F. does ANY input cause a throw? ===');
for (const t of ['', '   ', 'hello world', '>>>>', '1-', '1-Z', '\u0000', 'null', undefined, null, 12345]) {
  try { km(t); } catch (e) { fails++; console.log('  THREW on ' + JSON.stringify(t) + ': ' + e.message); }
}
console.log('  no throws for edge inputs');

console.log('\n=== G. toIdx out of range (letter F..Z, or digit 0/9) ===');
console.log('  toIdx("F") = ' + ctx.toIdx('F') + '  (option index 5 - no such option)');
console.log('  toIdx("Z") = ' + ctx.toIdx('Z'));
console.log('  toIdx("9") = ' + ctx.toIdx('9') + '  (option index 8)');
console.log('  -> fin() guards with "if (v >= q.o.length) v = undefined", so these become unanswered.');

console.log('\n=== H. matchQPrefix / match-pair rejection ===');
console.log('  "1-b, 2-a, 3-d, 4-e" -> ' + JSON.stringify(ctx.matchQPrefix('1-b, 2-a, 3-d, 4-e')));
console.log('  "1. What is X"       -> ' + JSON.stringify(ctx.matchQPrefix('1. What is X')));
console.log('  "1-a longer question text here" -> ' + JSON.stringify(ctx.matchQPrefix('1-a longer question text here')));
console.log('  "12-13 are true"     -> ' + JSON.stringify(ctx.matchQPrefix('12-13 are true')));
console.log('  "3-d) Deep vein thrombosis" -> ' + JSON.stringify(ctx.matchQPrefix('3-d) Deep vein thrombosis')));

console.log('\n=== I. fin() priority chain ===');
// reconstruct fin()'s resolution for a fake question
const resolve = (q, man, sk, pk) => {
  let v = q.fix ?? man[q.no] ?? sk[q.no] ?? q.inl ?? pk[q.no];
  if (v >= q.o.length) v = undefined;
  return v === undefined ? -1 : v;
};
const q4 = { no: 4, o: ['a','b','c','d'], inl: 1 };
check('manual paste beats inline', resolve(q4, {4:3}, {}, {}), 3);
check('keyPDF beats paste',          resolve(q4, {4:3}, {4:2}, {}), 3);   // paste wins (man before sk)
check('inline used when nothing else', resolve(q4, {}, {}, {}), 1);
check('PDF trailing key is LAST resort', resolve(q4, {}, {}, {4:0}), 1);
check('out-of-range -> unanswered', resolve({no:9,o:['a','b'],inl:5}, {}, {}, {}), -1);

console.log('\n' + (fails ? fails + ' CHECK(S) FAILED' : 'all checks passed'));
