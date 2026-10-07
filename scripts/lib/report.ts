/**
 * Shared reporting helpers for the Rodemap quality-gate scripts.
 * Output format (one finding per line): `path:line:col  rule  message`.
 */

/** A finding inside one source text. `line` and `col` are 1-based. */
export interface Finding {
  line: number;
  col: number;
  rule: string;
  message: string;
}

/** A finding attached to a repo-relative file path (forward slashes). */
export interface FileFinding extends Finding {
  file: string;
}

/** Converts source offsets to 1-based line/column pairs (columns in UTF-16 code units). */
export type LineIndex = (offset: number) => { line: number; col: number };

/** Builds an offset → line/col lookup for `text`. Handles LF and CRLF line endings. */
export function createLineIndex(text: string): LineIndex {
  const starts: number[] = [0];
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) starts.push(i + 1);
  }
  return (offset: number) => {
    const clamped = Math.max(0, Math.min(offset, text.length));
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if ((starts[mid] ?? 0) <= clamped) lo = mid;
      else hi = mid - 1;
    }
    return { line: lo + 1, col: clamped - (starts[lo] ?? 0) + 1 };
  };
}

/** Formats one finding as `path:line:col  rule  message`. */
export function formatFinding(f: FileFinding): string {
  return `${f.file}:${f.line}:${f.col}  ${f.rule}  ${f.message}`;
}

/** Sorts findings by file, then line, then column (returns a new array). */
export function sortFindings(findings: readonly FileFinding[]): FileFinding[] {
  return [...findings].sort(
    (a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0) || a.line - b.line || a.col - b.col,
  );
}

/** One-line summary printed after the findings. */
export function summaryLine(tool: string, findings: readonly FileFinding[], filesScanned: number): string {
  const files = new Set(findings.map((f) => f.file)).size;
  const fileWord = filesScanned === 1 ? 'file' : 'files';
  if (findings.length === 0) return `${tool}: no findings (${filesScanned} ${fileWord} scanned).`;
  const findingWord = findings.length === 1 ? 'finding' : 'findings';
  return `${tool}: ${findings.length} ${findingWord} in ${files} of ${filesScanned} ${fileWord} scanned.`;
}

/** Shortens `text` around [start, end) to an excerpt with ellipses, on one line. */
export function excerpt(text: string, start: number, end: number, context = 24): string {
  const from = Math.max(0, start - context);
  const to = Math.min(text.length, end + context);
  const body = text.slice(from, to).replace(/\s+/g, ' ').trim();
  return `${from > 0 ? '…' : ''}${body}${to < text.length ? '…' : ''}`;
}
