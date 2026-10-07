/**
 * `npm run lint:tokens` — no raw design values outside src/styles/tokens.css.
 * Scans src/**\/*.css (except tokens.css), src/**\/*.{ts,tsx} (except tests) and the
 * style blocks/attributes of index.html. Files under public/ are exempt.
 * Prints `path:line:col  rule  message`, a summary, and exits 1 on any finding.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { readText, repoRoot, toRepoPath, walkFiles } from './lib/files';
import { formatFinding, sortFindings, summaryLine, type FileFinding, type Finding } from './lib/report';
import { lintCss, lintHtmlStyles, lintTsTokens } from './lib/token-rules';

const TOKENS_FILE = 'src/styles/tokens.css';
const TEST_FILE = /\.test\.tsx?$/;

function main(): number {
  const root = repoRoot();
  const files = walkFiles(root, 'src', (p) => {
    if (p === TOKENS_FILE) return false;
    if (p.endsWith('.css')) return true;
    return (p.endsWith('.ts') || p.endsWith('.tsx')) && !TEST_FILE.test(p);
  });
  const indexHtml = path.join(root, 'index.html');
  if (existsSync(indexHtml)) files.push(indexHtml);

  const findings: FileFinding[] = [];
  for (const file of files) {
    const rel = toRepoPath(root, file);
    let result: Finding[];
    try {
      const source = readText(file);
      if (rel.endsWith('.css')) result = lintCss(source);
      else if (rel.endsWith('.html')) result = lintHtmlStyles(source);
      else result = lintTsTokens(source, rel);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      result = [{ line: 1, col: 1, rule: 'internal-error', message: `Could not lint this file: ${reason}` }];
    }
    for (const f of result) findings.push({ file: rel, ...f });
  }

  const sorted = sortFindings(findings);
  for (const f of sorted) process.stdout.write(`${formatFinding(f)}\n`);
  process.stdout.write(`${summaryLine('lint-tokens', sorted, files.length)}\n`);
  return sorted.length > 0 ? 1 : 0;
}

process.exitCode = main();
