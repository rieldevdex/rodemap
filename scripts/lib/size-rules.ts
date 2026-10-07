/**
 * First-load JS budget (docs/PROMPT.md §7: under 200 KB gzipped). Pure helpers;
 * scripts/size-check.ts does the file I/O.
 */
import { gzipSync } from 'node:zlib';
import { parseTags } from './html';

/** 200 KB of gzipped JavaScript for the first load. */
export const FIRST_LOAD_BUDGET_BYTES = 200 * 1024;

export interface SizeRow {
  file: string;
  raw: number;
  gzip: number;
}

/**
 * Lists the first-load scripts referenced by a built index.html: the entry
 * `<script type="module" src>` tags first, then every `<link rel="modulepreload" href>`.
 * Query strings and hashes are dropped; duplicates and absolute URLs to other origins are skipped.
 */
export function firstLoadScripts(html: string): string[] {
  const entries: string[] = [];
  const preloads: string[] = [];
  for (const tag of parseTags(html)) {
    const attr = (name: string): string | undefined => tag.attributes.find((a) => a.name === name)?.value;
    if (tag.name === 'script') {
      const src = attr('src');
      if (attr('type')?.trim().toLowerCase() === 'module' && src) entries.push(src);
    } else if (tag.name === 'link') {
      const rel = (attr('rel') ?? '').toLowerCase().split(/\s+/);
      const href = attr('href');
      if (rel.includes('modulepreload') && href) preloads.push(href);
    }
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const ref of [...entries, ...preloads]) {
    if (/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(ref)) continue; // other origin
    const clean = ref.replace(/[?#].*$/, '');
    if (seen.has(clean)) continue;
    seen.add(clean);
    out.push(clean);
  }
  return out;
}

/** Maps an asset reference from index.html (`/assets/x.js`, `./assets/x.js`, `assets/x.js`) to a dist-relative path. */
export function distRelative(ref: string): string {
  return ref.replace(/^\.?\/+/, '');
}

/** Gzipped size at the maximum compression level. */
export function gzipSize(content: Uint8Array | string): number {
  return gzipSync(content, { level: 9 }).length;
}

export function sumRows(rows: readonly SizeRow[]): { raw: number; gzip: number } {
  return rows.reduce((acc, r) => ({ raw: acc.raw + r.raw, gzip: acc.gzip + r.gzip }), { raw: 0, gzip: 0 });
}

/** "61.2 KB" with one decimal (1 KB = 1024 bytes). */
export function formatKb(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

/** Renders an aligned plain-text table of files with raw and gzip sizes plus a total row. */
export function formatSizeTable(rows: readonly SizeRow[], totalLabel = 'Total'): string {
  const total = sumRows(rows);
  const body = rows.map((r) => [r.file, formatKb(r.raw), formatKb(r.gzip)]);
  const header = ['File', 'Raw', 'Gzip'];
  const footer = [totalLabel, formatKb(total.raw), formatKb(total.gzip)];
  const all = [header, ...body, footer];
  const width = [0, 1, 2].map((c) => Math.max(...all.map((row) => (row[c] ?? '').length)));
  const line = (row: string[]): string =>
    row.map((cell, c) => (c === 0 ? cell.padEnd(width[c] ?? 0) : cell.padStart(width[c] ?? 0))).join('  ');
  const rule = width.map((w) => '-'.repeat(w)).join('  ');
  return [line(header), rule, ...body.map(line), rule, line(footer)].join('\n');
}
