#!/usr/bin/env node
/* ==================================================================
   8-point grid check (and fixer) for spacing, sizing and radius values.

   Rule:  every value is a multiple of 8px; 4px half-steps are allowed below 24px.
   Exempt: ≤ 2px (hairlines, borders), ≥ 999px (off-screen / pill radii),
           translate nudges ≤ 4px, typography, blur/shadow, media-query breakpoints.

   Scans:  Tailwind classes in app/, components/, lib/ (scale steps incl. .5, and arbitrary [..px..] values)
           CSS spacing/sizing/radius declarations in app/globals.css and public/admin/admin.css

   Usage:  npm run check:grid            → lists off-grid values, exits 1 if any
           node scripts/check-grid.js --fix → rewrites them to the nearest allowed value
================================================================== */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TSX_DIRS = ['app', 'components', 'lib'];
const CSS_FILES = ['app/globals.css', 'public/admin/admin.css'];
const FIX = process.argv.includes('--fix');

/* ---------- the rule ---------- */
const HAIRLINE = 2;
const OFFSCREEN = 999;
const TRANSLATE_NUDGE = 4;

function isAllowed(px, { translate = false } = {}) {
  const a = Math.abs(px);
  if (a <= HAIRLINE || a >= OFFSCREEN) return true;
  if (translate && a <= TRANSLATE_NUDGE) return true;
  return a % 8 === 0 || (a < 24 && a % 4 === 0);
}

/** Nearest allowed value. Below 24: nearest 4 (ties → the multiple of 8). From 24: nearest 8 (ties → up). */
function snap(px) {
  const a = Math.abs(px);
  let r;
  if (a < 24) {
    const lo = Math.floor(a / 4) * 4, hi = lo + 4;
    r = a - lo < hi - a ? lo : hi - a < a - lo ? hi : lo % 8 === 0 ? lo : hi;
    if (r === 0) r = 4;
  } else {
    const lo = Math.floor(a / 8) * 8, hi = lo + 8;
    r = a - lo < hi - a ? lo : hi;
  }
  return Math.sign(px) * r;
}

/* ---------- Tailwind (TSX) ---------- */
// Spacing / sizing / position / radius utilities. Typography (text-, tracking-, leading-), borders, blur, shadow are not listed.
const PREFIX = '-?(?:p|px|py|pt|pr|pb|pl|ps|pe|m|mx|my|mt|mr|mb|ml|ms|me|gap|gap-x|gap-y|space-x|space-y|inset|inset-x|inset-y|top|right|bottom|left|w|h|size|min-w|min-h|max-w|max-h|translate-x|translate-y|scroll-mt|scroll-pt)';
const RADIUS_PREFIX = 'rounded(?:-(?:t|r|b|l|tl|tr|bl|br|s|e|ss|se|es|ee))?';
const SCALE_RE = new RegExp(`(?<![\\w-])(${PREFIX})-(\\d+(?:\\.5)?)(?![\\w./])`, 'g');
const ARBITRARY_RE = new RegExp(`(?<![\\w-])(${PREFIX}|${RADIUS_PREFIX})-\\[([^\\]\\s]*?\\d(?:[^\\]\\s]*?)px[^\\]\\s]*)\\]`, 'g');
const PX_RE = /(-?)(\d+(?:\.\d+)?)px/g;

function fixTsx(src, report) {
  let out = src.replace(SCALE_RE, (token, prefix, step) => {
    const px = parseFloat(step) * 4;
    const translate = prefix.includes('translate');
    if (isAllowed(px, { translate })) return token;
    const next = `${prefix}-${snap(px) / 4}`;
    report(token, next);
    return next;
  });
  out = out.replace(ARBITRARY_RE, (token, prefix, inner) => {
    const translate = prefix.includes('translate');
    const nextInner = inner.replace(PX_RE, (m, sign, num) => {
      const px = parseFloat(num);
      return isAllowed(px, { translate }) ? m : `${sign}${snap(px)}px`;
    });
    if (nextInner === inner) return token;
    const next = `${prefix}-[${nextInner}]`;
    report(token, next);
    return next;
  });
  return out;
}

/* ---------- CSS ---------- */
const CSS_PROPS = new Set([
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'padding-inline', 'padding-block',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'margin-inline', 'margin-block',
  'gap', 'row-gap', 'column-gap', 'top', 'right', 'bottom', 'left', 'inset',
  'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
  'border-radius', 'grid-template-columns', '--gutter', '--nav-h', '--max',
]);
const DECL_RE = /([a-z-]+)\s*:\s*([^;{}]+)/g;

function fixCss(src, report) {
  return src.replace(DECL_RE, (decl, prop, value, offset) => {
    if (!CSS_PROPS.has(prop)) return decl;
    if (src[offset - 1] === '(') return decl; // @media (max-width: …) — breakpoints are exempt
    const nextValue = value.replace(PX_RE, (m, sign, num) => {
      const px = parseFloat(num);
      return isAllowed(px) ? m : `${sign}${snap(px)}px`;
    });
    if (nextValue === value) return decl;
    const next = `${prop}: ${nextValue.trim()}`;
    report(`${prop}: ${value.trim()}`, next);
    return decl.replace(value, nextValue);
  });
}

/* ---------- run ---------- */
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(d => {
  const p = path.join(dir, d.name);
  return d.isDirectory() ? walk(p) : /\.(tsx|ts)$/.test(d.name) ? [p] : [];
});

const files = [
  ...TSX_DIRS.flatMap(d => walk(path.join(ROOT, d))).map(f => ({ file: f, fixer: fixTsx })),
  ...CSS_FILES.map(f => ({ file: path.join(ROOT, f), fixer: fixCss })),
];

let total = 0;
for (const { file, fixer } of files) {
  const rel = path.relative(ROOT, file);
  const src = fs.readFileSync(file, 'utf8');
  const found = [];
  const out = fixer(src, (from, to) => found.push(`${from} → ${to}`));
  if (!found.length) continue;
  total += found.length;
  console.log(`\n${rel}  (${found.length})`);
  for (const line of found) console.log(`  ${line}`);
  if (FIX) fs.writeFileSync(file, out);
}

if (!total) {
  console.log('✓ All spacing, sizing and radius values are on the 8-point grid.');
} else if (FIX) {
  console.log(`\nFixed ${total} off-grid value${total === 1 ? '' : 's'}.`);
} else {
  console.log(`\n✗ ${total} off-grid value${total === 1 ? '' : 's'}. Run \`node scripts/check-grid.js --fix\` to snap them.`);
  process.exitCode = 1;
}
