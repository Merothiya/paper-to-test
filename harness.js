// Runs the real read()/parse() from paper-to-test.html inside Node against the INI CET PDF.
// No browser needed. Usage: node harness.js [--layout auto|1|2|3] [--dump out.json]
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const PDF = '_INI CET May 2023_260930_145125.pdf';
const HTML = process.env.HTML_SRC || 'paper-to-test.html';

// ---- pull the main <script> block out of the HTML (the last one; the others are CDN tags) ----
const html = fs.readFileSync(HTML, 'utf8');
const blocks = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)];
if (!blocks.length) throw new Error('no inline script found');
const code = blocks[blocks.length - 1][1];
console.log('script block: ' + code.length + ' chars');

// ---- minimal DOM shim ----
const store = {};
function el(id) {
  if (store[id]) return store[id];
  const e = {
    id, value: id === 'mi' ? '180' : id === 'lm' ? 'auto' : id === 'em' ? 'auto' : id === 'sm' ? 'a' : '',
    textContent: '', innerHTML: '', hidden: false, files: [], dataset: {}, classList: { add(){}, remove(){}, contains(){return false} },
    style: {}, width: 0, height: 0,
    insertAdjacentHTML(){}, appendChild(){},
    getContext: () => ({ fillRect(){}, fillStyle:'', drawImage(){}, }),
    toDataURL: () => 'data:,',
    addEventListener(){}, click(){}, closest(){ return null },
    getBoundingClientRect: () => ({ left:0, top:0, width:0, height:0 }),
    querySelector(){ return el('_anon') }, querySelectorAll(){ return [] },
  };
  return (store[id] = e);
}
const document = {
  head: el('head'),
  createElement: t => el('made_' + t),
  querySelector: s => el(s.replace(/^#/, '')),
  querySelectorAll: () => [],
  addEventListener(){},
};
// The page does: fetch(workerUrl) -> blob -> URL.createObjectURL(blob) -> workerSrc.
// In Node we make createObjectURL return the real path to the worker file on disk.
const WORKER = path.resolve('node_modules/pdfjs-dist/legacy/build/pdf.worker.js');
const ctx = {
  console, setTimeout, clearInterval, setInterval: () => 0, JSON, Math, Date, Object, Array, String, Number, RegExp, Error, Infinity, NaN, undefined,
  document,
  window: { addEventListener(){}, onkeydown: null },
  fetch: async () => ({ blob: async () => ({}) }),
  URL: { createObjectURL: () => WORKER, revokeObjectURL(){} },
  Blob: class { constructor(){} },
  TextDecoder, TextEncoder, Uint8Array, ArrayBuffer, Promise, alert(){}, confirm: () => true,
  localStorage: { getItem: () => null, setItem(){} },
};
ctx.globalThis = ctx;
ctx.self = ctx;

// pdfjs: the HTML expects a global `pdfjsLib`
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
pdfjsLib.GlobalWorkerOptions.workerSrc = '';
ctx.pdfjsLib = pdfjsLib;
ctx.Tesseract = undefined;

vm.createContext(ctx);
vm.runInContext(code, ctx, { filename: 'paper-to-test.html' });
// the page attaches helpers to window for harness use; surface them on ctx
for (const k of Object.keys(ctx.window)) if (ctx[k] === undefined) ctx[k] = ctx.window[k];

for (const fn of ['read', 'parse', 'keyMap', 'matchQPrefix', 'opt', 'parseInlineOpts']) {
  if (typeof ctx[fn] !== 'function') throw new Error('missing global: ' + fn);
}
console.log('extracted functions OK\n');

(async () => {
  const args = process.argv.slice(2);
  const li = args.indexOf('--layout');
  const layout = li >= 0 ? args[li + 1] : 'auto';
  const di = args.indexOf('--dump');
  const dump = di >= 0 ? args[di + 1] : null;

  const buf = fs.readFileSync(PDF);
  const file = { arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) };
  console.log('PDF: ' + PDF + '  (' + (buf.length / 1048576).toFixed(1) + ' MB)  layout=' + layout + '\n');

  const logs = [];
  const r = await ctx.read(file, t => { logs.push(t); if (/^\D/.test(t)) console.log('  ' + t); }, layout, 'pdf');
  console.log('\npages: ' + r.n);
  console.log('text lines kept: ' + r.L.length);
  console.log('image boxes kept: ' + r.I.length);

  // column split per page, to see if auto-detect misfired
  const byCol = {};
  r.L.forEach(l => { byCol[l.p] = byCol[l.p] || {}; byCol[l.p][l.col] = (byCol[l.p][l.col] || 0) + 1; });
  const twoColPages = Object.entries(byCol).filter(([, c]) => Object.keys(c).length > 1).length;
  console.log('pages with >1 column in output: ' + twoColPages + ' of ' + r.n);

  const P = ctx.parse(r.L);
  const Q = P.Q;
  console.log('\n=== PARSE RESULT ===');
  console.log('questions: ' + Q.length + '   (baseline expected ~200)');
  console.log('questions with >=1 image: ' + Q.filter(q => q.img && q.img.length).length);
  console.log('key entries parsed from PDF: ' + Object.keys(P.key).length);

  const nos = Q.map(q => q.no);
  console.log('numbering: min=' + Math.min(...nos) + ' max=' + Math.max(...nos) + ' unique=' + new Set(nos).size + ' count=' + nos.length);
  const dupes = nos.filter((n, i) => nos.indexOf(n) !== i);
  if (dupes.length) console.log('  DUPLICATE numbers: ' + [...new Set(dupes)].slice(0, 30).join(',') + (new Set(dupes).size > 30 ? ' ...' : ''));
  const missing = []; for (let i = 1; i <= Math.max(...nos); i++) if (!nos.includes(i)) missing.push(i);
  console.log('  missing numbers: ' + missing.length + (missing.length ? ' -> ' + missing.slice(0, 40).join(',') + (missing.length > 40 ? ' ...' : '') : ''));

  const hist = {};
  Q.forEach(q => { const k = q.o.length; hist[k] = (hist[k] || 0) + 1; });
  console.log('option-count histogram: ' + JSON.stringify(hist));
  const bad = Q.filter(q => q.o.length < 2);
  console.log('questions with <2 options: ' + bad.length + (bad.length ? ' -> Q' + bad.slice(0, 30).map(q => q.no).join(',Q') : ''));
  const emptyOpt = Q.filter(q => q.o.some(o => !o || !o.trim()));
  console.log('questions with an empty option: ' + emptyOpt.length);
  const longStem = Q.filter(q => (q.stem || '').length > 600);
  console.log('stems over 600 chars: ' + longStem.length + (longStem.length ? ' -> Q' + longStem.slice(0, 15).map(q => q.no).join(',Q') : ''));
  const inl = Q.filter(q => q.inl !== undefined);
  console.log('inline answers found: ' + inl.length);
  const subs = {}; Q.forEach(q => { subs[q.sub || '(none)'] = (subs[q.sub || '(none)'] || 0) + 1; });
  console.log('subjects: ' + JSON.stringify(subs));

  console.log('\n=== first 3 questions ===');
  Q.slice(0, 3).forEach(q => {
    console.log('\nQ' + q.no + '  [p' + q.p + ' col' + q.col + '] sub=' + JSON.stringify(q.sub));
    console.log('  stem: ' + JSON.stringify((q.stem || '').slice(0, 260)));
    q.o.forEach((o, i) => console.log('  ' + 'ABCDE'[i] + ') ' + JSON.stringify(o.slice(0, 120))));
  });
  console.log('\n=== last 3 questions ===');
  Q.slice(-3).forEach(q => {
    console.log('\nQ' + q.no + '  [p' + q.p + ' col' + q.col + ']');
    console.log('  stem: ' + JSON.stringify((q.stem || '').slice(0, 260)));
    q.o.forEach((o, i) => console.log('  ' + 'ABCDE'[i] + ') ' + JSON.stringify(o.slice(0, 120))));
  });

  if (dump) {
    fs.writeFileSync(dump, JSON.stringify({ n: r.n, H:r.H, Wd:r.Wd, L:r.L, I:r.I, Q, key: P.key }, null, 1));
    console.log('\nwrote ' + dump);
  }

  // uncaught syntax check: try building the export
  try {
    const D = { title: 't', id: 'x', min: 180, q: [{ no: 1, sub: '', stem: 's', o: ['a','b'], ans: 0, img: [] }] };
    const out = ctx.EX(D);
    fs.writeFileSync('_exjs_export_test.html', out);
    console.log('export builder OK -> _exjs_export_test.html (' + out.length + ' bytes)');
  } catch (e) { console.log('export builder FAILED: ' + e.message); }
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(1); });
