// Turns the single-file Vite build into page content for hosting inside a document skeleton:
// strips the doctype and html/head/body wrappers, keeping title, meta, styles and scripts.
import { readFileSync, writeFileSync } from 'node:fs';
const src = readFileSync('dist-single/index.html', 'utf8');
const out = src
  .replace(/<!doctype html>/i, '')
  .replace(/<\/?html[^>]*>/gi, '')
  .replace(/<\/?head>/gi, '')
  .replace(/<\/?body>/gi, '')
  .replace(/<meta charset="UTF-8" \/>\s*/i, '')
  .replace(/<meta name="viewport"[^>]*>\s*/i, '')
  .trim();
writeFileSync('dist-single/kldx-management.html', `${out}\n`);
console.log(`dist-single/kldx-management.html ${(out.length / 1024).toFixed(0)} KB`);
