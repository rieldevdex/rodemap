/**
 * Token lint rules (DESIGN.md, docs/ARCHITECTURE.md "Styling rules"). Pure:
 * every function takes source text and returns findings with 1-based line/col.
 * Only src/styles/tokens.css may hold raw values; callers exempt it.
 */
import { parseCss, prepareCss } from './css-parse';
import { htmlCssView } from './html';
import { createLineIndex, type Finding } from './report';
import { extractStrings, TEMPLATE_PLACEHOLDER, type ExtractedString } from './ts-strings';

/** The only raw lengths allowed outside tokens.css, and only in @media/@container preludes. */
export const BREAKPOINTS: readonly string[] = ['720px', '1080px'];

/** Literal font names banned outside tokens.css (CSS and TS strings). */
export const FONT_NAMES: readonly string[] = [
  'Bricolage',
  'Lexend',
  'JetBrains',
  'Be Vietnam',
  'Inter',
  'Arial',
  'Helvetica',
  'Roboto',
  'serif',
  'sans-serif',
  'monospace',
  'system-ui',
];

/** Extra generic/system font names checked in CSS only (too ambiguous for prose strings). */
export const CSS_ONLY_FONT_NAMES: readonly string[] = [
  'ui-monospace',
  'ui-sans-serif',
  'ui-serif',
  'SFMono-Regular',
  'Menlo',
  'Consolas',
  'Segoe UI',
  '-apple-system',
  'BlinkMacSystemFont',
  'Courier New',
  'Times New Roman',
  'Georgia',
  'cursive',
  'fantasy',
];

/** CSS named colors (CSS Color 4), excluding `transparent` and `currentcolor`. */
export const NAMED_COLORS: ReadonlySet<string> = new Set(
  (
    'aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown ' +
    'burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan ' +
    'darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid ' +
    'darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet ' +
    'deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ' +
    'ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki ' +
    'lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow ' +
    'lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray ' +
    'lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine ' +
    'mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise ' +
    'mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab ' +
    'orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru ' +
    'pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown ' +
    'seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan ' +
    'teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen'
  ).split(' '),
);

const COLOR_PROPERTIES = new Set([
  'color',
  'background',
  'background-color',
  'fill',
  'stroke',
  'box-shadow',
  'text-shadow',
  'text-decoration',
  'text-decoration-color',
  'caret-color',
  'accent-color',
  'scrollbar-color',
  'stop-color',
  'flood-color',
  'lighting-color',
  '-webkit-text-fill-color',
  '-webkit-tap-highlight-color',
]);
const COLOR_PROPERTY_PREFIXES = ['border', 'outline', 'column-rule', 'text-emphasis', '-webkit-text-stroke'];

const MOTION_PROPERTIES = new Set([
  'transition',
  'animation',
  'transition-duration',
  'animation-duration',
  'transition-delay',
  'animation-delay',
]);

/** JSX attributes that take an SVG/HTML color. */
const JSX_COLOR_ATTRIBUTES = new Set(['fill', 'stroke', 'color', 'stopColor', 'stop-color', 'floodColor', 'lightingColor']);

/** Contexts where a `#…` string is a fragment, id or selector (e.g. `href="#add"`), not a color. */
const ANCHOR_ATTRIBUTES = new Set(['href', 'to', 'id', 'htmlFor', 'xlinkHref', 'xlink:href', 'form', 'list', 'headers']);
const ANCHOR_PROPERTIES = new Set(['href', 'to', 'hash', 'id', 'anchor', 'target', 'selector', 'path']);
const ANCHOR_CALLEES = new Set([
  'querySelector',
  'querySelectorAll',
  'closest',
  'matches',
  'getElementById',
  'navigate',
  'pushState',
  'replaceState',
  'assign',
  'replace',
  'pathFor',
]);
const ANCHOR_COMPARISONS = new Set(['hash', 'href', 'pathname', 'id']);

function isAnchorContext(piece: ExtractedString): boolean {
  if (piece.attribute !== undefined) return ANCHOR_ATTRIBUTES.has(piece.attribute) || piece.attribute.startsWith('aria-');
  if (piece.propertyName !== undefined) return ANCHOR_PROPERTIES.has(piece.propertyName);
  if (piece.callee !== undefined) return ANCHOR_CALLEES.has(piece.callee);
  if (piece.comparedWith !== undefined) return ANCHOR_COMPARISONS.has(piece.comparedWith);
  return false;
}

const HEX_IN_CSS = /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![\w-])/gi;
const HEX_ENTIRE = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const COLOR_FUNCTION_CSS = /(?<![\w-])(?:rgba?|hsla?|hwb|oklch|oklab|lab|lch|color)\(/gi;
const COLOR_FUNCTION_TS = /(?<![\w-])(?:rgba?|hsla?|hwb|oklch|oklab|lab|lch)\(/gi;
const LENGTH = /(?<![\w.#-])[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?(?:px|rem)(?![\w-])/gi;
const GRADIENT = /(?<![\w-])(?:-(?:webkit|moz|o)-)?(?:repeating-)?(?:linear|radial|conic)-gradient\(/gi;
const EASING = /(?<![\w-])(?:cubic-bezier|steps|linear)\(/gi;
const DURATION = /(?<![\w.#-])[+-]?(?:\d+\.?\d*|\.\d+)(?:ms|s)(?![\w-])/gi;
const IDENT = /[a-zA-Z_-][\w-]*/g;
const MEDIA_QUERY_LIKE = /\(\s*(?:(?:min|max)-)?(?:width|height|inline-size|block-size)\s*(?::|[<>]=?)/i;
const IMPORTANT = /\s*!\s*important\s*$/i;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const TEMPLATE_LENGTH = new RegExp(`${escapeRegExp(TEMPLATE_PLACEHOLDER)}(?:px|rem)(?![\\w-])`, 'g');

function fontNameRegExp(names: readonly string[]): RegExp {
  const alternatives = [...names]
    .sort((a, b) => b.length - a.length)
    .map((n) => escapeRegExp(n).replace(/ /g, '\\s+'))
    .join('|');
  return new RegExp(`(?<![\\w-])(?:${alternatives})(?![\\w-])`, 'gi');
}

const FONT_NAME_CSS = fontNameRegExp([...FONT_NAMES, ...CSS_ONLY_FONT_NAMES]);
const FONT_NAME_TS = fontNameRegExp(FONT_NAMES);

function isColorProperty(property: string): boolean {
  return COLOR_PROPERTIES.has(property) || COLOR_PROPERTY_PREFIXES.some((p) => property.startsWith(p));
}

function stripVendor(property: string): string {
  return property.replace(/^-(?:webkit|moz|ms|o)-/, '');
}

/** Normalises a declaration value for exact comparisons: no `!important`, single spaces, lowercase. */
function normaliseValue(value: string): string {
  return value.replace(IMPORTANT, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

interface RawFinding {
  offset: number;
  rule: string;
  message: string;
}

function* matches(re: RegExp, text: string): Generator<RegExpExecArray> {
  const global = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
  let m: RegExpExecArray | null;
  while ((m = global.exec(text)) !== null) {
    yield m;
    if (m[0].length === 0) global.lastIndex++;
  }
}

function firstNonSpace(text: string, from: number, to: number): number {
  let i = from;
  while (i < to && /\s/.test(text.charAt(i))) i++;
  return i;
}

/** Runs every CSS rule over a stylesheet (or a declaration list). */
function lintCssRaw(source: string): RawFinding[] {
  const { masked, fontView } = prepareCss(source);
  const { declarations, preludes } = parseCss(masked);
  const found: RawFinding[] = [];
  const add = (offset: number, rule: string, message: string): void => {
    found.push({ offset, rule, message });
  };

  for (const at of preludes) {
    if (['import', 'charset', 'namespace', 'layer'].includes(at.name)) continue;
    const prelude = masked.slice(at.start, at.end);
    const breakpointsAllowed = at.name === 'media' || at.name === 'container' || at.name === 'custom-media';
    for (const m of matches(LENGTH, prelude)) {
      const value = m[0].toLowerCase();
      if (breakpointsAllowed && BREAKPOINTS.includes(value)) continue;
      add(
        at.start + m.index,
        'raw-length',
        breakpointsAllowed
          ? `"${m[0]}" in @${at.name}: only the breakpoints 720px and 1080px are allowed.`
          : `"${m[0]}" in @${at.name}: use a token from tokens.css.`,
      );
    }
  }

  for (const decl of declarations) {
    const { property, valueStart, valueEnd } = decl;
    const value = masked.slice(valueStart, valueEnd);
    const fontValue = fontView.slice(valueStart, valueEnd);
    const valueAt = firstNonSpace(masked, valueStart, valueEnd);
    const isCustom = property.startsWith('--');
    const base = stripVendor(property);
    const normalised = normaliseValue(value);

    for (const m of matches(HEX_IN_CSS, value)) {
      add(valueStart + m.index, 'raw-color-hex', `Raw color "${m[0]}": use a color token (var(--color-*), var(--line-*)).`);
    }
    for (const m of matches(COLOR_FUNCTION_CSS, value)) {
      add(valueStart + m.index, 'raw-color-function', `Raw color function "${m[0]}…)": use a color token.`);
    }
    if (isColorProperty(property)) {
      for (const m of matches(IDENT, value)) {
        const prev = value.charAt(m.index - 1);
        const next = value.charAt(m.index + m[0].length);
        if (prev === '#' || next === '(') continue;
        if (NAMED_COLORS.has(m[0].toLowerCase())) {
          add(valueStart + m.index, 'raw-color-name', `Named color "${m[0]}" in ${property}: use a color token.`);
        }
      }
    } else if (isCustom && NAMED_COLORS.has(normalised)) {
      add(valueAt, 'raw-color-name', `Named color "${normalised}" in ${property}: use a color token.`);
    }
    if (property === 'font-family' && normalised !== 'inherit' && !/^var\(--font-[\w-]+\)$/.test(normalised)) {
      add(valueAt, 'font-family', 'font-family must be var(--font-display|body|mono) or inherit.');
    }
    for (const m of matches(FONT_NAME_CSS, fontValue)) {
      add(valueStart + m.index, 'font-name', `Font name "${m[0]}": fonts come from var(--font-*) in tokens.css.`);
    }
    for (const m of matches(LENGTH, value)) {
      add(valueStart + m.index, 'raw-length', `Raw length "${m[0]}": use a size token (var(--space-*), var(--text-*) …).`);
    }
    for (const m of matches(GRADIENT, value)) {
      add(valueStart + m.index, 'gradient', `Gradient "${m[0]}…)" is not part of the design system.`);
    }
    if (base === 'backdrop-filter') {
      add(decl.propertyStart, 'backdrop-filter', 'backdrop-filter is not allowed (no glassmorphism).');
    }
    if (base === 'box-shadow' && normalised !== 'none' && normalised !== 'var(--shadow-panel)') {
      add(valueAt, 'raw-shadow', 'box-shadow may only be var(--shadow-panel) or none.');
    }
    if (MOTION_PROPERTIES.has(base) || isCustom) {
      for (const m of matches(DURATION, value)) {
        if (Number.parseFloat(m[0]) === 0) continue;
        add(valueStart + m.index, 'raw-duration', `Raw duration "${m[0]}": use var(--dur-*).`);
      }
    }
    for (const m of matches(EASING, value)) {
      add(valueStart + m.index, 'raw-easing', `Raw easing "${m[0]}…)": use var(--ease-*).`);
    }
    if (
      property === 'z-index' &&
      !['0', '1', '-1', 'auto'].includes(normalised) &&
      !/^var\(--z-[\w-]+\)$/.test(normalised)
    ) {
      add(valueAt, 'raw-z-index', `z-index "${normalised}": use var(--z-*) (or 0, 1, -1, auto).`);
    }
  }
  return found;
}

function toFindings(source: string, raw: RawFinding[]): Finding[] {
  const index = createLineIndex(source);
  return raw
    .map((f) => ({ ...index(f.offset), rule: f.rule, message: f.message }))
    .sort((a, b) => a.line - b.line || a.col - b.col);
}

/** Lints a component/page stylesheet. Do not call it for src/styles/tokens.css. */
export function lintCss(source: string): Finding[] {
  return toFindings(source, lintCssRaw(source));
}

/** Lints `<style>` blocks and `style` attributes of an HTML document with the CSS rules. */
export function lintHtmlStyles(html: string): Finding[] {
  return toFindings(html, lintCssRaw(htmlCssView(html)));
}

/** True when `text` reads like a media query, where only the breakpoints are allowed. */
function isMediaQueryString(text: string): boolean {
  return MEDIA_QUERY_LIKE.test(text);
}

/**
 * Lints string literals and template literals in a TS/TSX source: hex colors (only when
 * the whole string is a hex color, so `#add` anchors pass), rgb()/hsl()…, px/rem lengths
 * (media-query strings may use the breakpoints), font names, and named colors in JSX
 * color attributes or custom-property values. JSX text is prose and is not checked here.
 */
export function lintTsTokens(source: string, fileName: string): Finding[] {
  const found: RawFinding[] = [];
  for (const piece of extractStrings(source, fileName)) {
    if (piece.kind === 'jsx-text') continue;
    const { text, offsets } = piece;
    const at = (i: number): number => offsets[i] ?? offsets[offsets.length - 1] ?? 0;
    const trimmed = text.trim();

    if (HEX_ENTIRE.test(trimmed) && !isAnchorContext(piece)) {
      found.push({ offset: at(text.indexOf('#')), rule: 'raw-color-hex', message: `Raw color "${trimmed}": use a CSS class with a color token.` });
    }
    for (const m of matches(COLOR_FUNCTION_TS, text)) {
      found.push({ offset: at(m.index), rule: 'raw-color-function', message: `Raw color function "${m[0]}…)": use a CSS class with a color token.` });
    }
    const mediaQuery = isMediaQueryString(text);
    for (const m of matches(LENGTH, text)) {
      if (mediaQuery && BREAKPOINTS.includes(m[0].toLowerCase())) continue;
      found.push({ offset: at(m.index), rule: 'raw-length', message: `Raw length "${m[0]}" in a string: use tokens (CSS) or unitless SVG user units.` });
    }
    for (const m of matches(TEMPLATE_LENGTH, text)) {
      found.push({ offset: at(m.index), rule: 'raw-length', message: 'Interpolated px/rem length in a template: pass a unitless number to a custom property instead.' });
    }
    for (const m of matches(FONT_NAME_TS, text)) {
      found.push({ offset: at(m.index), rule: 'font-name', message: `Font name "${m[0]}" in a string: fonts come from var(--font-*) in tokens.css.` });
    }
    const colorSlot =
      (piece.attribute !== undefined && JSX_COLOR_ATTRIBUTES.has(piece.attribute) ? piece.attribute : undefined) ??
      (piece.propertyName?.startsWith('--') ? piece.propertyName : undefined);
    if (colorSlot !== undefined && NAMED_COLORS.has(trimmed.toLowerCase())) {
      found.push({ offset: at(text.indexOf(trimmed)), rule: 'raw-color-name', message: `Named color "${trimmed}" in ${colorSlot}: use a color token through a CSS class or var(--…).` });
    }
  }
  return toFindings(source, found);
}
