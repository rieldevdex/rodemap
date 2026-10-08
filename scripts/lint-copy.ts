/**
 * `npm run lint:copy` — formal administrative Vietnamese only (văn phong hành chính).
 * Scans string literals, template literals, JSX text and JSX attribute strings in
 * src/**\/*.{ts,tsx} and worker/**\/*.ts (except tests and src/domain/test-fixtures.ts),
 * plus the text of index.html. Rules live in scripts/banned-copy.ts.
 * Prints `path:line:col  rule  message`, a summary, and exits 1 on any finding.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { lintHtmlCopy, lintTsCopy } from './lib/copy-rules';
import { readText, repoRoot, toRepoPath, walkFiles } from './lib/files';
import { formatFinding, sortFindings, summaryLine, type FileFinding, type Finding } from './lib/report';

const EXCLUDED = new Set(['src/domain/test-fixtures.ts']);
const TEST_FILE = /\.test\.tsx?$/;

function main(): number {
  const root = repoRoot();
  const accept = (exts: readonly string[]) => (p: string) =>
    exts.some((e) => p.endsWith(e)) && !p.endsWith('.d.ts') && !TEST_FILE.test(p) && !EXCLUDED.has(p);
  const files = [...walkFiles(root, 'src', accept(['.ts', '.tsx'])), ...walkFiles(root, 'worker', accept(['.ts']))];
  const indexHtml = path.join(root, 'index.html');
  if (existsSync(indexHtml)) files.push(indexHtml);

  const findings: FileFinding[] = [];
  for (const file of files) {
    const rel = toRepoPath(root, file);
    let result: Finding[];
    try {
      const source = readText(file);
      result = rel.endsWith('.html') ? lintHtmlCopy(source) : lintTsCopy(source, rel);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      result = [{ line: 1, col: 1, rule: 'internal-error', message: `Could not lint this file: ${reason}` }];
    }
    for (const f of result) findings.push({ file: rel, ...f });
  }

  const sorted = sortFindings(findings);
  for (const f of sorted) process.stdout.write(`${formatFinding(f)}\n`);
  process.stdout.write(`${summaryLine('lint-copy', sorted, files.length)}\n`);
  return sorted.length > 0 ? 1 : 0;
}

process.exitCode = main();
