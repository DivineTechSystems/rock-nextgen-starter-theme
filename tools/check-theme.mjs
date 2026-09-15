// Theme consistency gate. Run with `npm run check` after `npm run build`.
//
// Asserts three contracts that fail silently at runtime if broken:
//
// 1. MARKERS — the four `/* CSS Overrides ... */` literals that Rock's
//    ThemeOverrideBuilder uses to locate its generated regions. Presence is
//    NOT the contract: Build() re-emits both regions with correct markers
//    whatever it found, so a file with no markers still works. What matters is
//    that the markers we ship can never form a region that straddles real CSS
//    — see the checkMarkers comment for the destructive case.
//
// 2. TOKEN SYNC — every theme.json field `default` must match the value
//    declared in Styles/_tokens.scss. core.css declares every --base-* token
//    itself, so a var() fallback aimed at a core token is dead code; _tokens'
//    :root declarations are the only thing making theme.json defaults real
//    before Rock's first build of the theme.
//
// 3. IMPORT ORDER — dart-sass passes a literal ".css" @import through
//    verbatim. Browsers silently DROP any CSS @import that appears after the
//    first style rule, which reads as "the token system isn't loading" with no
//    error anywhere. Verify every @import in the compiled file precedes the
//    first rule.
//
// SCOPE: run this against the repo's own source and build output. A theme.css
// that Rock has already rebuilt on a server legitimately carries a @charset
// line and non-empty override regions, and will fail check 1 by design.

import { readFileSync } from 'node:fs';

const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

// SCSS `//` comments never reach the compiled output, and this repo's doc
// comments legitimately quote marker literals and token examples — strip them
// before analyzing source files.
const stripLineComments = src => src.replace(/^\s*\/\/.*$/gm, '').replace(/([^:])\/\/[^\n]*/g, '$1');

let failed = 0;
const fail = msg => { console.log(`FAIL ${msg}`); failed++; };
const pass = msg => console.log(`PASS ${msg}`);

// --- 1. Markers --------------------------------------------------------------

const MARKERS = {
  topStart: '/* CSS Overrides Top Start */',
  topEnd: '/* CSS Overrides Top End */',
  bottomStart: '/* CSS Overrides Bottom Start */',
  bottomEnd: '/* CSS Overrides Bottom End */',
};

const PAIRS = [
  ['topStart', 'topEnd', 'Top'],
  ['bottomStart', 'bottomEnd', 'Bottom'],
];

// Rock's TopOverridePattern / BottomOverridePattern are `Start .* End`, compiled
// with RegexOptions.Singleline and a greedy `.*`. Every failure below is a way
// to make that match span content it must not touch:
//
//   half a pair   an orphan Start above our CSS, plus the End that Rock's next
//                 build writes below it, brackets the whole stylesheet — the
//                 build after that strips it;
//   duplicates    the match runs from the FIRST Start to the LAST End;
//   wrong order   or interleaved regions, same straddle by another route.
//
// Authoring inside a region is a quieter failure: Rock owns those bytes and
// discards whatever it finds there on the next build.
function checkMarkers(file, src) {
  const before = failed;
  const at = {};

  for (const [key, marker] of Object.entries(MARKERS)) {
    const count = src.split(marker).length - 1;
    if (count > 1) {
      fail(`${file}: ${marker} appears ${count} times — Rock's strip regex is greedy and Singleline, so it matches from the first Start to the last End and deletes everything between`);
    }
    at[key] = count >= 1 ? src.indexOf(marker) : -1;
  }

  for (const [startKey, endKey, label] of PAIRS) {
    const hasStart = at[startKey] >= 0;
    const hasEnd = at[endKey] >= 0;

    if (hasStart !== hasEnd) {
      fail(`${file}: ${label} override markers are a half pair (${hasStart ? 'Start' : 'End'} only) — Rock writes the missing one on its next build and the resulting region swallows this file's CSS`);
    } else if (!hasStart) {
      fail(`${file}: ${label} override markers are missing — Rock re-adds them, but this theme ships both pairs so repeated builds stay idempotent`);
    } else if (at[startKey] > at[endKey]) {
      fail(`${file}: ${label} End marker precedes its Start marker`);
    }
  }

  // Positional checks only make sense once every pair is intact.
  if (failed !== before) return;

  if (at.topEnd > at.bottomStart) {
    fail(`${file}: the Top and Bottom override regions interleave`);
  }
  if (src.slice(0, at.topStart).trim() !== '') {
    fail(`${file}: content precedes the Top Start marker — the Top region must sit at the head of the file`);
  }
  if (src.slice(at.topStart + MARKERS.topStart.length, at.topEnd).trim() !== '') {
    fail(`${file}: the Top override region is not empty — Rock owns its contents and discards anything authored there`);
  }
  if (src.slice(at.bottomStart + MARKERS.bottomStart.length, at.bottomEnd).trim() !== '') {
    fail(`${file}: the Bottom override region is not empty — Rock owns its contents and discards anything authored there`);
  }
  if (src.slice(at.bottomEnd + MARKERS.bottomEnd.length).trim() !== '') {
    fail(`${file}: content follows the Bottom End marker — the Bottom region must sit at the end of the file`);
  }
}

for (const file of ['Styles/theme.scss', 'Styles/theme.css']) {
  const src = file.endsWith('.scss') ? stripLineComments(read(file)) : read(file);
  checkMarkers(file, src);
}
if (!failed) pass('override markers are complete, ordered and positioned in theme.scss and theme.css');

// --- 2. theme.json defaults vs _tokens.scss -----------------------------------

const themeJson = JSON.parse(read('theme.json'));
const tokensSrc = stripLineComments(read('Styles/_tokens.scss'));

// Collect { variable, default } leaf fields from all panels.
const fields = [];
const walk = list => {
  for (const field of list ?? []) {
    if (field.type === 'panel') walk(field.fields);
    else if (field.variable && field.default !== undefined) fields.push(field);
  }
};
walk(themeJson.fields);

// Variables whose defaults are file paths (image fields) are consumed as
// var() fallbacks in _theme.scss rather than declared on :root — the fallback
// is genuinely reachable because core.css never defines them.
const NOT_DECLARED_ON_ROOT = new Set(['logo-image']);

const declared = new Map();
for (const m of tokensSrc.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
  if (!declared.has(m[1])) declared.set(m[1], m[2].trim());
}

const norm = v => v
  .toLowerCase()
  .replace(/["']/g, '')
  .replace(/\s+/g, ' ')
  .replace(/\s*,\s*/g, ',')
  .replace(/\s*\/\s*/g, '/')
  .trim();

let tokenFailures = 0;
for (const field of fields) {
  if (NOT_DECLARED_ON_ROOT.has(field.variable)) continue;
  const value = declared.get(field.variable);
  if (value === undefined) {
    fail(`theme.json variable "${field.variable}" is not declared in _tokens.scss — its default is not authoritative`);
    tokenFailures++;
  } else if (norm(value) !== norm(String(field.default))) {
    fail(`--${field.variable}: theme.json default ${JSON.stringify(field.default)} != _tokens.scss ${JSON.stringify(value)}`);
    tokenFailures++;
  }
}
if (!tokenFailures) pass(`${fields.length} theme.json variable(s) checked against _tokens.scss`);

// --- 3. compiled @import order -------------------------------------------------

const compiled = read('Styles/theme.css');
const firstRule = compiled.indexOf('{');
let importFailures = 0;
for (const m of compiled.matchAll(/@import\b[^;]*;/g)) {
  if (firstRule !== -1 && m.index > firstRule) {
    fail(`theme.css: @import after the first style rule is silently dropped by browsers: ${m[0].slice(0, 80)}`);
    importFailures++;
  }
}
if (!importFailures) pass('every @import in compiled theme.css precedes the first style rule');

console.log(failed ? `\n${failed} failure(s)` : '\nALL CHECKS PASSED');
process.exit(failed ? 1 : 0);
