#!/usr/bin/env node
// Builds catalog.json, what LlamaTree reads for Get themes, from every themes/<id>.json, and the table of themes in
// README.md between its markers. The catalog workflow runs it on every push to main; nobody edits the catalog by hand.
//
//   node tools/catalog.mjs --readme            rewrite the README table from the themes
//   node tools/catalog.mjs --readme --check    fail if the README table is out of date (the validate workflow)
//   node tools/catalog.mjs --out catalog.json  write the catalog
//
// A theme is small and only data, so the catalog carries each one whole: the app shows it, and lets you try it on, before
// it's installed, and installing it writes it to the themes folder as <id>.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { themeIds, readTheme, META } from './validate.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = 'LlamachantTechnology/LlamaTree-Themes';
const args = process.argv.slice(2);
const opt = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);

function entries() {
  return themeIds().map((id) => {
    const { theme } = readTheme(id);
    const look = Object.fromEntries(Object.entries(theme).filter(([k]) => !META.includes(k)));
    return {
      id, name: theme.name, version: theme.version, minAppVersion: theme.minAppVersion ?? null,
      description: theme.description ?? '', author: theme.author ?? null, base: theme.base ?? 'dark', theme: look,
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
}

function readmeTable(list) {
  const effects = (t) => [t.glow && 'glow', t.grid && 'grid', t.rain && 'rain', t.cursor && t.cursor, t.monochrome && 'monochrome'].filter(Boolean).join(', ') || '';
  const lines = ['| Theme | What it looks like | Version | Base | Effects |', '|---|---|---|---|---|'];
  for (const e of list) lines.push(`| [${e.name}](themes/${e.id}.json) | ${e.description} | ${e.version} | ${e.base} | ${effects(e.theme)} |`);
  return lines.join('\n');
}

if (args.includes('--readme')) {
  const file = path.join(root, 'README.md');
  const text = fs.readFileSync(file, 'utf8');
  const start = '<!-- themes:start -->', end = '<!-- themes:end -->';
  const a = text.indexOf(start), b = text.indexOf(end);
  if (a < 0 || b < 0 || b < a) { console.error('README.md needs the markers <!-- themes:start --> and <!-- themes:end -->'); process.exit(1); }
  const next = text.slice(0, a + start.length) + '\n' + readmeTable(entries()) + '\n' + text.slice(b);
  if (args.includes('--check')) {
    if (next !== text) { console.error('README.md\'s table of themes is out of date: run  node tools/catalog.mjs --readme  and commit it.'); process.exit(1); }
    console.log('README.md\'s table of themes is up to date.');
  } else {
    fs.writeFileSync(file, next);
    console.log('README.md\'s table of themes rewritten.');
  }
}

if (opt('--out')) {
  const themes = entries().map(({ id, version, minAppVersion, description, author, theme }) => ({ id, version, minAppVersion, description, author, theme }));
  const catalog = { schema: 1, generated: new Date().toISOString(), repository: `https://github.com/${REPO}`, themes };
  fs.mkdirSync(path.dirname(path.resolve(opt('--out'))), { recursive: true });
  fs.writeFileSync(opt('--out'), JSON.stringify(catalog, null, 2) + '\n');
  console.log(`${opt('--out')}: ${themes.length} theme${themes.length === 1 ? '' : 's'}.`);
}
