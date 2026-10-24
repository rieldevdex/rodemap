import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { readText, repoRoot } from './lib/files';
import { colourDifferences, contrastChecks, contrastRatio, matchRoot, parseHex, parseTokenRules, resolveTokens } from './lib/contrast';

const CSS = `
:root { --color-ink: #000; --line-text: var(--color-ink); }
@media (prefers-color-scheme: dark) { :root:not([data-theme='light']) { --color-ink: #fff; } }
:root[data-theme='dark'] { --color-ink: #fff; }
@media screen { :root[data-mode='x'] { --color-ink: #111111; } }
@media print { :root:root:root { --color-ink: #222222; } }
`;

describe('contrast rules', () => {
  it('measures WCAG contrast of hex colours', () => {
    expect(parseHex('#fff')).toEqual([255, 255, 255]);
    expect(parseHex('rgb(0 0 0)')).toBeNull();
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#777')).toBeCloseTo(1, 5);
    expect(() => contrastRatio('red', '#fff')).toThrow(/Not a hex colour/);
  });

  it('matches :root selectors against the appearance', () => {
    const a = { mode: 'x', theme: null, systemDark: true } as const;
    expect(matchRoot(':root', a)).toBe(1);
    expect(matchRoot(":root[data-mode='x']:not([data-theme='light'])", a)).toBe(3);
    expect(matchRoot(":root[data-theme='dark']", a)).toBeNull();
    expect(() => matchRoot('.button', a)).toThrow(/Unsupported selector/);
  });

  it('resolves the cascade, var() references and media conditions', () => {
    const rules = parseTokenRules(CSS);
    expect(rules).toHaveLength(5);
    const light = resolveTokens(rules, { mode: 'lo-trinh', theme: null, systemDark: false });
    expect(light.get('--color-ink')).toBe('#000');
    expect(light.get('--line-text')).toBe('#000');
    expect(resolveTokens(rules, { mode: 'lo-trinh', theme: null, systemDark: true }).get('--line-text')).toBe('#fff');
    expect(resolveTokens(rules, { mode: 'lo-trinh', theme: 'light', systemDark: true }).get('--color-ink')).toBe('#000');
    expect(resolveTokens(rules, { mode: 'x', theme: 'dark', systemDark: false }).get('--color-ink')).toBe('#111111');
    expect(colourDifferences(light, resolveTokens(rules, { mode: 'x', theme: null, systemDark: false }))).toEqual(['--color-ink', '--line-text']);
    expect(() => resolveTokens(parseTokenRules('@supports (x) { :root { --a: 1; } }'), { mode: 'x', theme: null, systemDark: false })).toThrow(/Unknown condition/);
    expect(() => resolveTokens(parseTokenRules(':root { --a: var(--b); --b: var(--a); }'), { mode: 'x', theme: null, systemDark: false })).toThrow(/Circular/);
  });

  it('fails a missing token loudly', () => {
    expect(() => contrastChecks(new Map())).toThrow(/Missing token/);
  });

  it('passes every pair in every mode and theme of the real tokens', () => {
    const rules = parseTokenRules(readText(path.join(repoRoot(), 'src/styles/tokens.css')));
    for (const mode of ['lo-trinh', 'ruc-ro', 'ap-phich', 'diu-nhe']) {
      for (const theme of ['light', 'dark'] as const) {
        const tokens = resolveTokens(rules, { mode, theme, systemDark: theme === 'light' });
        expect(colourDifferences(tokens, resolveTokens(rules, { mode, theme: null, systemDark: theme === 'dark' })), `${mode} ${theme}`).toEqual([]);
        for (const check of contrastChecks(tokens)) {
          expect(contrastRatio(check.fg, check.bg), `${mode} ${theme}: ${check.label}`).toBeGreaterThanOrEqual(check.min);
        }
      }
    }
  });
});
