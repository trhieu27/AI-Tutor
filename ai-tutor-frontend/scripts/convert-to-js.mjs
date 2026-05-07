/**
 * Convert all .tsx / .ts -> .jsx / .js  (strip TypeScript, keep JS+JSX)
 * node scripts/convert-to-js.mjs
 */
import { createRequire }   from 'module';
import { readdirSync, readFileSync, writeFileSync, unlinkSync, statSync } from 'fs';
import { resolve, extname, dirname, basename } from 'path';
import { fileURLToPath }   from 'url';

const require  = createRequire(import.meta.url);
const __dir    = dirname(fileURLToPath(import.meta.url));
const ROOT     = resolve(__dir, '..');
const SRC      = resolve(ROOT, 'src');

const babel    = require('@babel/core');

// ── Walk src/ recursively ─────────────────────────────────────────────────────
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = resolve(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(tsx|ts)$/.test(name)) out.push(full);
  }
  return out;
}

// ── Strip TypeScript with Babel ───────────────────────────────────────────────
function toJS(code, file) {
  const isTSX = file.endsWith('.tsx');
  return babel.transformSync(code, {
    filename:   file,
    presets:    [
      ['@babel/preset-typescript'],
      ...(isTSX ? [['@babel/preset-react', { runtime: 'automatic' }]] : []),
    ],
    sourceType:  'module',
    configFile:  false,
    babelrc:     false,
    compact:     false,
    comments:    true,
    retainLines: false,
  }).code;
}

// ── Main ──────────────────────────────────────────────────────────────────────
const files = walk(SRC);
console.log(`\n🔄  Converting ${files.length} TypeScript files to JavaScript…\n`);

let ok = 0, fail = 0;

for (const src of files) {
  const ext   = extname(src);                  // .ts or .tsx
  const dest  = src.slice(0, -ext.length) + (ext === '.tsx' ? '.jsx' : '.js');
  const rel   = src.replace(ROOT + '\\', '').replace(ROOT + '/', '');

  try {
    const code = readFileSync(src, 'utf8');
    let   js   = toJS(code, src);

    // Patch any remaining .ts/.tsx imports just in case
    js = js.replace(/(['"])(.*?)\.tsx(['"])/g, "$1$2.jsx$3");
    js = js.replace(/(['"])(.*?)\.ts(['"])/g,  "$1$2.js$3");

    writeFileSync(dest, js, 'utf8');
    unlinkSync(src);
    console.log(`  ✅  ${rel}`);
    ok++;
  } catch (err) {
    console.error(`  ❌  ${rel}\n      ${err.message}\n`);
    fail++;
  }
}

console.log(`\n── Result: ${ok} converted, ${fail} failed ──\n`);
