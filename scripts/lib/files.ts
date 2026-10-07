/** File-system helpers for the quality-gate scripts (Node built-ins only). */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const SKIPPED_DIRS = new Set(['node_modules', 'dist', 'coverage', '.git', 'test-results', 'playwright-report']);

/** Repository root: the parent of the `scripts/` directory. */
export function repoRoot(): string {
  return path.resolve(import.meta.dirname, '..', '..');
}

/** Converts an absolute path to a repo-relative path with forward slashes. */
export function toRepoPath(root: string, absolute: string): string {
  return path.relative(root, absolute).split(path.sep).join('/');
}

/**
 * Recursively lists files under `dir` (absolute paths, sorted) whose repo-relative
 * path satisfies `accept`. Missing directories yield an empty list.
 */
export function walkFiles(root: string, dir: string, accept: (repoPath: string) => boolean): string[] {
  const start = path.join(root, dir);
  if (!existsSync(start)) return [];
  const out: string[] = [];
  const visit = (current: string): void => {
    const entries = readdirSync(current, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1));
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!SKIPPED_DIRS.has(entry.name)) visit(full);
      } else if (entry.isFile() && accept(toRepoPath(root, full))) {
        out.push(full);
      }
    }
  };
  visit(start);
  return out;
}

/** Reads a UTF-8 text file, stripping a leading byte-order mark. */
export function readText(file: string): string {
  const text = readFileSync(file, 'utf8');
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}
