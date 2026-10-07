/**
 * `npm run size` — first-load JS budget (200 KB gzipped). Run after `npm run build`.
 * Reads dist/index.html, gzips (level 9) the entry module script and every
 * modulepreload, prints a table, and exits 1 when the total exceeds the budget.
 * Also prints the gzipped total of every dist/assets/*.js for information.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { readText, repoRoot } from './lib/files';
import {
  FIRST_LOAD_BUDGET_BYTES,
  distRelative,
  firstLoadScripts,
  formatKb,
  formatSizeTable,
  gzipSize,
  sumRows,
  type SizeRow,
} from './lib/size-rules';

function out(line = ''): void {
  process.stdout.write(`${line}\n`);
}

function fail(message: string): number {
  process.stderr.write(`size-check: ${message}\n`);
  return 1;
}

function main(): number {
  const dist = path.join(repoRoot(), 'dist');
  const indexFile = path.join(dist, 'index.html');
  if (!existsSync(indexFile)) return fail('dist/index.html not found. Run `npm run build` first.');

  const refs = firstLoadScripts(readText(indexFile));
  if (refs.length === 0) return fail('dist/index.html references no <script type="module" src> entry.');

  const rows: SizeRow[] = [];
  for (const ref of refs) {
    const rel = distRelative(ref);
    const file = path.join(dist, rel);
    if (!existsSync(file)) return fail(`dist/${rel} (referenced by dist/index.html) does not exist.`);
    const content = readFileSync(file);
    rows.push({ file: `dist/${rel}`, raw: content.length, gzip: gzipSize(content) });
  }

  out('First-load JavaScript (entry module + modulepreload), gzip level 9:');
  out();
  out(formatSizeTable(rows));
  out();

  const assetsDir = path.join(dist, 'assets');
  if (existsSync(assetsDir)) {
    const all: SizeRow[] = readdirSync(assetsDir)
      .filter((f) => f.endsWith('.js'))
      .sort()
      .map((f) => {
        const content = readFileSync(path.join(assetsDir, f));
        return { file: `dist/assets/${f}`, raw: content.length, gzip: gzipSize(content) };
      });
    const allTotal = sumRows(all);
    out(
      `For information: all ${all.length} JS files in dist/assets total ${formatKb(allTotal.raw)} raw, ${formatKb(allTotal.gzip)} gzip (lazy chunks included).`,
    );
  }

  const total = sumRows(rows).gzip;
  const budget = `${formatKb(FIRST_LOAD_BUDGET_BYTES)} (${FIRST_LOAD_BUDGET_BYTES} bytes)`;
  if (total > FIRST_LOAD_BUDGET_BYTES) {
    out(`size-check: FAIL first-load JS is ${formatKb(total)} gzip (${total} bytes), over the ${budget} budget by ${total - FIRST_LOAD_BUDGET_BYTES} bytes.`);
    return 1;
  }
  out(`size-check: OK first-load JS is ${formatKb(total)} gzip (${total} bytes), within the ${budget} budget.`);
  return 0;
}

process.exitCode = main();
