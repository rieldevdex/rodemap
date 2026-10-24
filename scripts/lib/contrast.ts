/**
 * Contrast rules for the appearance modes (DESIGN.md §2.4, §9). Pure: parses the custom
 * properties of src/styles/tokens.css, resolves the cascade for one appearance (mode, theme,
 * system setting) and measures WCAG 2.1 contrast ratios.
 */

export interface TokenRule {
  selector: string;
  /** At-rule preludes the rule sits in, outermost first, e.g. ['media screen']. */
  conditions: string[];
  declarations: [string, string][];
}

export interface Appearance {
  mode: string;
  /** The data-theme attribute; null when it is absent (Theo hệ thống). */
  theme: 'light' | 'dark' | null;
  systemDark: boolean;
  /** The data-interactivity attribute (motion tokens only); defaults to 'medium'. */
  interactivity?: string;
}

/** Collects every rule with custom properties, with the @media preludes around it. */
export function parseTokenRules(css: string): TokenRule[] {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, ' ');
  const rules: TokenRule[] = [];
  const walk = (body: string, conditions: string[]): void => {
    let i = 0;
    while (i < body.length) {
      const open = body.indexOf('{', i);
      if (open < 0) return;
      const prelude = body.slice(i, open).trim();
      let depth = 1;
      let j = open + 1;
      while (j < body.length && depth > 0) {
        if (body[j] === '{') depth += 1;
        else if (body[j] === '}') depth -= 1;
        j += 1;
      }
      const inner = body.slice(open + 1, j - 1);
      if (prelude.startsWith('@')) {
        walk(inner, [...conditions, prelude.slice(1).replace(/\s+/g, ' ')]);
      } else {
        const declarations: [string, string][] = [];
        for (const m of inner.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) declarations.push([m[1] ?? '', (m[2] ?? '').trim()]);
        if (declarations.length > 0) rules.push({ selector: prelude.replace(/\s+/g, ' '), conditions, declarations });
      }
      i = j;
    }
  };
  walk(text, []);
  return rules;
}

function conditionHolds(condition: string, a: Appearance): boolean {
  if (condition === 'media screen') return true;
  if (condition === 'media print') return false;
  if (condition === 'media (prefers-color-scheme: dark)') return a.systemDark;
  if (condition === 'media (prefers-reduced-motion: reduce)') return false;
  throw new Error(`Unknown condition in tokens.css: @${condition}`);
}

/** Specificity (classes and attributes) of a `:root`-only selector, or null when it does not match. */
export function matchRoot(selector: string, a: Appearance): number | null {
  let rest = selector.trim();
  let specificity = 0;
  const attr = (name: string): string | null => {
    if (name === 'data-mode') return a.mode;
    if (name === 'data-interactivity') return a.interactivity ?? 'medium';
    return a.theme;
  };
  while (rest.length > 0) {
    let m: RegExpMatchArray | null;
    if ((m = /^:root/.exec(rest))) {
      specificity += 1;
    } else if ((m = /^\[(data-mode|data-theme|data-interactivity)='([\w-]+)'\]/.exec(rest))) {
      if (attr(m[1] ?? '') !== m[2]) return null;
      specificity += 1;
    } else if ((m = /^:not\(\[(data-mode|data-theme|data-interactivity)='([\w-]+)'\]\)/.exec(rest))) {
      if (attr(m[1] ?? '') === m[2]) return null;
      specificity += 1;
    } else {
      throw new Error(`Unsupported selector in tokens.css: ${selector}`);
    }
    rest = rest.slice(m[0].length);
  }
  return specificity;
}

/** The custom properties in force for an appearance, with var() references resolved. */
export function resolveTokens(rules: readonly TokenRule[], a: Appearance): Map<string, string> {
  const applicable = rules
    .map((rule, order) => ({ rule, order, specificity: rule.conditions.every((c) => conditionHolds(c, a)) ? matchRoot(rule.selector, a) : null }))
    .filter((r): r is { rule: TokenRule; order: number; specificity: number } => r.specificity !== null)
    .sort((x, y) => x.specificity - y.specificity || x.order - y.order);
  const raw = new Map<string, string>();
  for (const { rule } of applicable) for (const [name, value] of rule.declarations) raw.set(name, value);
  const resolve = (value: string, seen: Set<string>): string =>
    value.replace(/var\((--[\w-]+)\)/g, (_all, name: string) => {
      if (seen.has(name)) throw new Error(`Circular token ${name}`);
      const next = raw.get(name);
      return next === undefined ? '' : resolve(next, new Set([...seen, name]));
    });
  return new Map([...raw].map(([name, value]) => [name, resolve(value, new Set([name]))]));
}

/** sRGB channels 0–255 of a #rgb / #rrggbb colour, or null for anything else. */
export function parseHex(value: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
  if (!m) return null;
  const digits = m[1] ?? '';
  const hex = digits.length === 3 ? digits.replace(/./g, (c) => c + c) : digits;
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

function luminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number): number => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG 2.1 contrast ratio of two hex colours. */
export function contrastRatio(a: string, b: string): number {
  const ca = parseHex(a);
  const cb = parseHex(b);
  if (!ca || !cb) throw new Error(`Not a hex colour: ${ca ? b : a}`);
  const [hi, lo] = [luminance(ca), luminance(cb)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

export interface ContrastCheck {
  label: string;
  fg: string;
  bg: string;
  min: number;
}

const SURFACES = ['--color-ground', '--color-surface', '--color-surface-2'];
const TEXT = ['--color-ink-2', '--color-signal', '--color-ok', '--color-warn', '--color-stop'];
const LINES = ['--line-ht', '--line-nt', '--line-tt', '--line-tn', '--line-kn', '--line-cn', '--line-ts'];

/**
 * The pairs every appearance must pass: ink 7:1 on its grounds (high contrast), every other
 * text colour 4.5:1, text on the signal and on each colour block 4.5:1, route lines and the
 * focus ring 3:1 on the ground, and the code on each line badge 4.5:1.
 */
export function contrastChecks(tokens: ReadonlyMap<string, string>): ContrastCheck[] {
  const get = (name: string): string => {
    const value = tokens.get(name);
    if (value === undefined) throw new Error(`Missing token ${name}`);
    return value;
  };
  const checks: ContrastCheck[] = [];
  for (const bg of SURFACES) {
    checks.push({ label: `ink on ${bg}`, fg: get('--color-ink'), bg: get(bg), min: 7 });
    for (const fg of TEXT) checks.push({ label: `${fg} on ${bg}`, fg: get(fg), bg: get(bg), min: 4.5 });
  }
  checks.push({ label: 'signal-ink on signal', fg: get('--color-signal-ink'), bg: get('--color-signal'), min: 4.5 });
  for (const block of ['a', 'b', 'c']) {
    checks.push({ label: `block-${block}-ink on block-${block}`, fg: get(`--color-block-${block}-ink`), bg: get(`--color-block-${block}`), min: 4.5 });
  }
  checks.push({ label: 'focus ring (signal) on ground', fg: get('--color-signal'), bg: get('--color-ground'), min: 3 });
  for (const line of LINES) {
    checks.push({ label: `${line} on ground`, fg: get(line), bg: get('--color-ground'), min: 3 });
    checks.push({ label: `badge code on ${line}`, fg: get('--line-text'), bg: get(line), min: 4.5 });
  }
  return checks;
}

/** Colour tokens whose value differs between two appearances (used to prove the cascade is consistent). */
export function colourDifferences(a: ReadonlyMap<string, string>, b: ReadonlyMap<string, string>): string[] {
  const names = new Set([...a.keys(), ...b.keys()].filter((n) => n.startsWith('--color-') || n.startsWith('--line-') || n.startsWith('--preview-')));
  return [...names].filter((n) => a.get(n) !== b.get(n)).sort();
}
