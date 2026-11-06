#!/usr/bin/env node
// Checks every theme under themes/ the way LlamaTree reads it (see ThemeCatalog in the app), strictly: a value the app
// would leave out of a theme is an error here. With --base <ref>, a theme whose file changed since that ref must have a new
// version. No dependencies; schema/theme.schema.json says the same rules for editors.
//
//   node tools/validate.mjs              every theme
//   node tools/validate.mjs --base origin/main
//   node tools/validate.mjs forest       one theme
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const themesDir = path.join(root, 'themes');

const ID = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;
const RESERVED = ['system', 'light', 'dark'];
// Themes LlamaTree comes with: a theme here can't take their names.
const BUILT_IN = ['nerds', 'tron', 'matrix'];
const SEMVER = /^\d+\.\d+\.\d+$/;
const CSS_COLOR = /^(?:#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(?:,\s*(?:0|1|0?\.\d+)\s*)?\))$/;
const HEX_COLOR = /^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const SIX = /^#[0-9a-fA-F]{6}$/;
const FONT = /^[A-Za-z0-9][A-Za-z0-9 \-]{0,59}$/;
const MAX_BYTES = 64 * 1024;
const MAX_ACCENTS = 8;
// A floor: themes/<id>.floor.js, which the catalog puts into the theme as "floor" (see catalog.mjs).
const MAX_FLOOR_CHARS = 256 * 1024;   // as LlamaTree takes it (ThemeCatalog.MaxFloorChars)
const FLOOR_APP = '1.3.2';            // the first LlamaTree that draws one
/**
 * Names a floor mustn't use. LlamaTree runs a floor in a worker inside a sandboxed frame that allows no network, no
 * storage and no messages but its own, so none of these would work there anyway. Refusing them here makes a floor that
 * tries plainly wrong at once, rather than quietly broken, and keeps a reviewer's eye on the drawing.
 */
const FLOOR_FORBIDDEN = ['fetch', 'XMLHttpRequest', 'WebSocket', 'WebTransport', 'EventSource', 'importScripts', 'Worker', 'SharedWorker',
  'RTCPeerConnection', 'indexedDB', 'caches', 'localStorage', 'sessionStorage', 'sendBeacon', 'FontFace', 'postMessage', 'onmessage',
  'addEventListener', 'eval', 'Function', 'import', 'location', 'navigator', 'createImageBitmap', 'Image', 'Request', 'BroadcastChannel'];

export const COLORS = [
  'chrome', 'chrome-2', 'chrome-3', 'panel', 'panel-2', 'hover', 'hover-strong', 'border', 'border-soft', 'border-strong',
  'text', 'text-dim', 'text-faint', 'text-strong', 'focus', 'select', 'select-inactive', 'terminal-bg', 'editor-bg',
  'ok', 'working', 'attention', 'asking', 'danger', 'danger-fill', 'st-m', 'st-a', 'st-d', 'st-r', 'st-u',
  'info-bg', 'info-border', 'error-bg', 'error-border', 'pv-warn-bg', 'pv-warn-border', 'ico-folder', 'ico-file', 'graph',
  'ref-bg', 'ref-fg', 'ref-head-bg', 'ref-head-fg', 'ref-tag-bg', 'ref-tag-fg', 'scroll-thumb', 'scroll-thumb-hover',
  'tab-border-shown', 'tab-border-hover', 'tick', 'tick-active', 'tick-hot', 'card-bg', 'card-border', 'bubble',
  'code-fg', 'code-bg', 'well', 'table-head', 'link', 'update-fg',
];
export const TERMINAL = [
  'background', 'foreground', 'cursor', 'cursorAccent', 'selectionBackground', 'selectionForeground', 'selectionInactiveBackground',
  'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white',
  'brightBlack', 'brightRed', 'brightGreen', 'brightYellow', 'brightBlue', 'brightMagenta', 'brightCyan', 'brightWhite',
  'overviewRulerBorder', 'scrollbarSliderBackground', 'scrollbarSliderHoverBackground', 'scrollbarSliderActiveBackground',
];
export const DIFF = [
  'background', 'foreground', 'lineNumber', 'lineNumberActive', 'selection', 'cursor', 'lineHighlightBorder',
  'insertedLine', 'insertedText', 'removedLine', 'removedText', 'insertedGutter', 'removedGutter',
  'insertedOverview', 'removedOverview', 'diagonalFill', 'scrollbar',
  'comment', 'keyword', 'string', 'number', 'type',
];

/** What a theme's file says about itself for the gallery, rather than how it looks. */
export const META = ['version', 'description', 'author', 'minAppVersion'];
const LOOK = ['name', 'base', 'font', 'glow', 'grid', 'rain', 'monochrome', 'cursor', 'terminalBackground', 'accent', 'accents', 'colors', 'terminal', 'diff'];

const args = process.argv.slice(2);
const base = args.includes('--base') ? args[args.indexOf('--base') + 1] : null;
const only = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--base');

const problems = [];
const problem = (id, text) => problems.push(`${id}: ${text}`);

export const themeIds = () => fs.readdirSync(themesDir).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).sort();

export function readTheme(id) {
  const bytes = fs.readFileSync(path.join(themesDir, id + '.json'));
  const bom = bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
  return { theme: JSON.parse(bytes.subarray(bom ? 3 : 0).toString('utf8')), bom, size: bytes.length };
}

/** A theme's floor script (themes/<id>.floor.js), or null when it has none. */
export function readFloor(id) {
  const file = path.join(themesDir, id + '.floor.js');
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8').replace(/^﻿/, '') : null;
}

/** The floor's script with its comments and the text of its strings taken out, for checking the names it uses. */
function floorCode(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ')
    .replace(/'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`/g, '""');
}

function checkFloor(id, t, script) {
  if (script.length > MAX_FLOOR_CHARS) problem(id, `its floor is over ${MAX_FLOOR_CHARS / 1024}K characters`);
  try { new vm.Script(script, { filename: id + '.floor.js' }); }   // compiled to check it, never run
  catch (e) { return problem(id, `its floor isn't valid JavaScript: ${e.message}`); }
  const code = floorCode(script);
  if (!/\bfloor\s*\(/.test(code)) problem(id, 'its floor never calls floor({ draw(ctx, now, info) { … } })');
  for (const name of FLOOR_FORBIDDEN) {
    if (new RegExp(`(?<![\\w$])${name}(?![\\w$])`).test(code)) problem(id, `its floor uses "${name}", which a floor has no use for: it draws, and nothing else`);
  }
  const atLeast = (a, b) => { const [x, y] = [a, b].map((v) => v.split('.').map(Number)); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i]; return true; };
  if (typeof t.minAppVersion !== 'string' || !SEMVER.test(t.minAppVersion) || !atLeast(t.minAppVersion, FLOOR_APP))
    problem(id, `a theme with a floor needs "minAppVersion": "${FLOOR_APP}" or later, since older LlamaTree doesn't draw one`);
}

function checkSection(id, t, section, names, valid, what) {
  if (t[section] === undefined) return;
  if (typeof t[section] !== 'object' || t[section] === null || Array.isArray(t[section])) return problem(id, `"${section}" must be an object`);
  for (const [k, v] of Object.entries(t[section])) {
    if (!names.includes(k)) problem(id, `"${section}" has no colour called "${k}"`);
    else if (typeof v !== 'string' || !valid.test(v)) problem(id, `${section}.${k} isn't ${what}: ${JSON.stringify(v)}`);
  }
}

function checkTheme(id) {
  if (!ID.test(id)) return problem(id, 'the file\'s name must be letters, digits and hyphens, 40 at most, not starting or ending with a hyphen');
  if (RESERVED.includes(id)) return problem(id, 'light, dark and system are the app\'s own choices');
  if (BUILT_IN.includes(id)) return problem(id, 'LlamaTree comes with a theme of that name');
  let t, r;
  try { r = readTheme(id); t = r.theme; }
  catch (e) { return problem(id, `it can't be read: ${e.message}`); }
  if (r.bom) problem(id, 'the file starts with a byte order mark; save it as UTF-8 without one');
  if (r.size > MAX_BYTES) problem(id, `it's over ${MAX_BYTES / 1024} KB`);
  if (typeof t !== 'object' || t === null || Array.isArray(t)) return problem(id, 'a theme is a JSON object');

  for (const k of Object.keys(t)) if (!LOOK.includes(k) && !META.includes(k)) problem(id, `it has "${k}", which the app doesn't read`);
  if (typeof t.version !== 'string' || !SEMVER.test(t.version)) problem(id, '"version" is needed, as major.minor.patch');
  if (t.minAppVersion !== undefined && (typeof t.minAppVersion !== 'string' || !SEMVER.test(t.minAppVersion))) problem(id, '"minAppVersion" must be major.minor.patch');
  if (typeof t.description !== 'string' || !t.description.trim() || t.description.length > 300) problem(id, '"description" is needed: a sentence of 300 characters at most');
  if (t.author !== undefined && (typeof t.author !== 'string' || !t.author.trim() || t.author.length > 60)) problem(id, '"author" must be a name of 60 characters at most');

  if (typeof t.name !== 'string' || !t.name.trim() || t.name.trim().length > 40) problem(id, '"name" is needed, 40 characters at most');
  if (t.base !== undefined && !['dark', 'light'].includes(t.base)) problem(id, '"base" is "dark" or "light"');
  if (t.font !== undefined && (typeof t.font !== 'string' || !FONT.test(t.font))) problem(id, '"font" must be a font family name (letters, digits, spaces and hyphens)');
  for (const k of ['glow', 'grid', 'rain', 'monochrome']) if (t[k] !== undefined && typeof t[k] !== 'boolean') problem(id, `"${k}" must be true or false`);
  if (t.cursor !== undefined && t.cursor !== 'light-cycle') problem(id, '"cursor" is "light-cycle" or left out');
  if (t.terminalBackground !== undefined && !(Number.isInteger(t.terminalBackground) && t.terminalBackground >= 0 && t.terminalBackground <= 100))
    problem(id, '"terminalBackground" is a whole number from 0 (see-through) to 100 (solid)');
  if (t.accent !== undefined && !(t.accent && typeof t.accent === 'object' && CSS_COLOR.test(t.accent.line ?? '') && CSS_COLOR.test(t.accent.strong ?? '')))
    problem(id, '"accent" needs a "line" and a "strong" colour');
  if (t.accents !== undefined) {
    if (!Array.isArray(t.accents)) problem(id, '"accents" is a list of { "name", "color" }');
    else {
      if (t.accents.length > MAX_ACCENTS) problem(id, `"accents" can suggest ${MAX_ACCENTS} colours at most`);
      const seen = new Set();
      for (const a of t.accents) {
        if (!a || typeof a.name !== 'string' || !a.name.trim() || a.name.trim().length > 24 || !SIX.test(a.color ?? '')) problem(id, 'each of "accents" needs a "name" (24 characters at most) and a "color" written #rrggbb');
        else if (seen.has(a.name.trim().toLowerCase())) problem(id, `"accents" has "${a.name}" twice`);
        else seen.add(a.name.trim().toLowerCase());
      }
    }
  }
  checkSection(id, t, 'colors', COLORS, CSS_COLOR, 'a colour');
  checkSection(id, t, 'terminal', TERMINAL, CSS_COLOR, 'a colour');
  checkSection(id, t, 'diff', DIFF, HEX_COLOR, 'a colour written #rrggbb or #rrggbbaa');
  if ('floor' in t) problem(id, `a floor goes in themes/${id}.floor.js, not in the theme's file`);
  const script = readFloor(id);
  if (script !== null) checkFloor(id, t, script);
}

/** Themes whose file changed since `ref`, and the version each had there (null for a new theme). */
function changedSince(ref) {
  const out = execFileSync('git', ['diff', '--name-only', `${ref}...HEAD`, '--', 'themes'], { cwd: root, encoding: 'utf8' });
  const ids = [...new Set(out.split('\n').map((f) => f.match(/^themes\/([^/]+?)(?:\.floor\.js|\.json)$/)?.[1]).filter(Boolean))];
  return ids.map((id) => {
    let was = null;
    try { was = JSON.parse(execFileSync('git', ['show', `${ref}:themes/${id}.json`], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })).version ?? null; }
    catch { /* new, or not valid there */ }
    return { id, was };
  });
}

// Run, rather than imported by catalog.mjs.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const f of fs.readdirSync(themesDir)) {
    const full = path.join(themesDir, f);
    if (fs.lstatSync(full).isSymbolicLink()) problem(f, 'a link isn\'t allowed');
    else if (f.endsWith('.floor.js')) {
      if (!fs.existsSync(path.join(themesDir, f.slice(0, -'.floor.js'.length) + '.json'))) problem(f, 'a floor needs its theme: <id>.json beside <id>.floor.js');
    }
    else if (!f.endsWith('.json')) problem(f, 'themes/ holds only <id>.json files, and <id>.floor.js for a theme with a floor');
  }
  const ids = only.length ? only : themeIds();
  for (const id of ids) checkTheme(id);
  if (base) {
    const floors = execFileSync('git', ['diff', '--name-only', `${base}...HEAD`, '--', 'themes/*.floor.js'], { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);
    // A floor is code: it's run sandboxed, but it still needs a maintainer's read (CODEOWNERS asks for one).
    for (const f of floors) console.log(`::warning file=${f}::${f} is a floor (code). A maintainer must review it before it's merged.`);
    for (const { id, was } of changedSince(base)) {
      if (!fs.existsSync(path.join(themesDir, id + '.json')) || !was) continue;   // removed, or new
      const now = readTheme(id).theme.version;
      const newer = (a, b) => { const [x, y] = [a, b].map((v) => v.split('.').map(Number)); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i]; return false; };
      if (typeof now === 'string' && SEMVER.test(now) && SEMVER.test(was) && !newer(now, was)) problem(id, `it changed since ${base} but its version is still ${now}: raise it`);
    }
  }
  if (problems.length) {
    for (const p of problems) console.error(p);
    console.error(`\n${problems.length} problem${problems.length === 1 ? '' : 's'}.`);
    process.exit(1);
  }
  console.log(`${ids.length} theme${ids.length === 1 ? '' : 's'} checked.`);
}
