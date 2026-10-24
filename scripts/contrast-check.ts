/**
 * `npm run lint:contrast` — every appearance mode (DESIGN.md §2.4) in light and dark passes the
 * contrast pairs of scripts/lib/contrast.ts, and "Theo hệ thống" resolves to the same colours as
 * the explicit Sáng / Tối choice. Prints failures and a summary; exits 1 on any failure.
 */
import path from 'node:path';
import { readText, repoRoot } from './lib/files';
import { colourDifferences, contrastChecks, contrastRatio, parseTokenRules, resolveTokens, type Appearance } from './lib/contrast';

const MODES = ['lo-trinh', 'ruc-ro', 'ap-phich', 'diu-nhe'];

function main(): number {
  const rules = parseTokenRules(readText(path.join(repoRoot(), 'src/styles/tokens.css')));
  let failures = 0;
  let checked = 0;
  for (const mode of MODES) {
    for (const dark of [false, true]) {
      const explicit: Appearance = { mode, theme: dark ? 'dark' : 'light', systemDark: !dark };
      const system: Appearance = { mode, theme: null, systemDark: dark };
      const tokens = resolveTokens(rules, explicit);
      const drift = colourDifferences(tokens, resolveTokens(rules, system));
      const label = `${mode} ${dark ? 'tối' : 'sáng'}`;
      if (drift.length > 0) {
        failures += 1;
        process.stdout.write(`${label}: "Theo hệ thống" differs from the explicit choice in ${drift.join(', ')}\n`);
      }
      for (const check of contrastChecks(tokens)) {
        checked += 1;
        const ratio = contrastRatio(check.fg, check.bg);
        if (ratio < check.min) {
          failures += 1;
          process.stdout.write(`${label}: ${check.label} ${check.fg} / ${check.bg} = ${ratio.toFixed(2)}:1 (needs ${String(check.min)}:1)\n`);
        }
      }
    }
  }
  process.stdout.write(`lint-contrast: ${String(checked)} pairs in ${String(MODES.length * 2)} appearances, ${String(failures)} failure(s).\n`);
  return failures > 0 ? 1 : 0;
}

process.exitCode = main();
