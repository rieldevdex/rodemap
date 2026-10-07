/**
 * A small, error-tolerant CSS scanner for the token lint. It does not build a
 * full CSSOM: it strips comments, masks strings and url() contents (keeping
 * every offset and newline intact so findings report exact line/col), then
 * walks blocks to collect declarations and at-rule preludes. Supports native
 * CSS nesting and at-rules nested inside style rules.
 */

export interface PreparedCss {
  /** Comments replaced by spaces; strings and url() kept. */
  clean: string;
  /** Like `clean`, with string and url() contents replaced by spaces. Used for structure and most rules. */
  masked: string;
  /** Like `clean`, with url() contents masked but strings kept (font names live in strings). */
  fontView: string;
}

export interface CssDeclaration {
  /** Lowercased property name (custom properties keep their case). */
  property: string;
  propertyStart: number;
  /** Value range in the source: [valueStart, valueEnd). Excludes the trailing `;`. */
  valueStart: number;
  valueEnd: number;
}

export interface CssAtPrelude {
  /** Lowercased at-rule name without `@`, e.g. `media`. */
  name: string;
  start: number;
  end: number;
}

export interface ParsedCss {
  declarations: CssDeclaration[];
  preludes: CssAtPrelude[];
}

const IDENT_CHAR = /[\w-]/;

function blank(ch: string): string {
  return ch === '\n' || ch === '\r' ? ch : ' ';
}

/** Strips comments and builds the masked views. All outputs have the same length as `src`. */
export function prepareCss(src: string): PreparedCss {
  let clean = '';
  let masked = '';
  let fontView = '';
  const n = src.length;
  let i = 0;

  const emit = (c: string, m: string, f: string): void => {
    clean += c;
    masked += m;
    fontView += f;
  };

  /** Consumes a string starting at the quote at `i`; returns the index after it. */
  const readString = (start: number, maskFont: boolean): number => {
    const quote = src.charAt(start);
    emit(quote, quote, quote);
    let j = start + 1;
    while (j < n) {
      const ch = src.charAt(j);
      if (ch === '\\' && j + 1 < n) {
        const next = src.charAt(j + 1);
        emit(ch + next, blank(ch) + blank(next), maskFont ? blank(ch) + blank(next) : ch + next);
        j += 2;
        continue;
      }
      if (ch === quote) {
        emit(ch, ch, ch);
        return j + 1;
      }
      if (ch === '\n') return j; // unterminated string ends at the line break
      emit(ch, blank(ch), maskFont ? blank(ch) : ch);
      j++;
    }
    return j;
  };

  while (i < n) {
    const ch = src.charAt(i);
    if (ch === '/' && src.charAt(i + 1) === '*') {
      const close = src.indexOf('*/', i + 2);
      const end = close === -1 ? n : close + 2;
      for (let j = i; j < end; j++) {
        const b = blank(src.charAt(j));
        emit(b, b, b);
      }
      i = end;
      continue;
    }
    if (ch === '"' || ch === "'") {
      i = readString(i, false);
      continue;
    }
    if (
      (ch === 'u' || ch === 'U') &&
      src.slice(i, i + 4).toLowerCase() === 'url(' &&
      !IDENT_CHAR.test(src.charAt(i - 1))
    ) {
      emit(src.slice(i, i + 4), src.slice(i, i + 4), src.slice(i, i + 4));
      let j = i + 4;
      while (j < n && src.charAt(j) !== ')') {
        const c = src.charAt(j);
        if (c === '"' || c === "'") {
          j = readString(j, true);
          continue;
        }
        if (c === '\n') break;
        emit(c, blank(c), blank(c));
        j++;
      }
      i = j;
      continue;
    }
    emit(ch, ch, ch);
    i++;
  }
  return { clean, masked, fontView };
}

/** Returns the index of the first of `stops` at bracket depth 0, or `s.length`. */
function scanUntil(s: string, from: number, stops: string): number {
  let depth = 0;
  for (let i = from; i < s.length; i++) {
    const ch = s.charAt(i);
    if (ch === '(' || ch === '[') depth++;
    else if ((ch === ')' || ch === ']') && depth > 0) depth--;
    else if (depth === 0 && stops.includes(ch)) return i;
  }
  return s.length;
}

function isSpace(ch: string): boolean {
  return ch === ' ' || ch === '\n' || ch === '\r' || ch === '\t' || ch === '\f';
}

/**
 * Collects declarations and at-rule preludes from a masked stylesheet. Text that is
 * not inside any rule (e.g. the body of an HTML `style` attribute) is read as a
 * declaration list.
 */
export function parseCss(masked: string): ParsedCss {
  const out: ParsedCss = { declarations: [], preludes: [] };
  const n = masked.length;

  const parseItems = (start: number, depth: number): number => {
    let pos = start;
    while (pos < n) {
      const ch = masked.charAt(pos);
      if (isSpace(ch) || ch === ';') {
        pos++;
        continue;
      }
      if (ch === '}') {
        if (depth > 0) return pos;
        pos++; // stray closing brace at the top level
        continue;
      }
      if (ch === '@') {
        let j = pos + 1;
        while (j < n && IDENT_CHAR.test(masked.charAt(j))) j++;
        const name = masked.slice(pos + 1, j).toLowerCase();
        const end = scanUntil(masked, j, '{;}');
        out.preludes.push({ name, start: j, end });
        if (masked.charAt(end) === '{') {
          pos = parseItems(end + 1, depth + 1);
          if (masked.charAt(pos) === '}') pos++;
        } else {
          pos = masked.charAt(end) === ';' ? end + 1 : end;
        }
        continue;
      }
      const end = scanUntil(masked, pos, '{;}');
      if (masked.charAt(end) === '{') {
        pos = parseItems(end + 1, depth + 1);
        if (masked.charAt(pos) === '}') pos++;
        continue;
      }
      const colon = masked.indexOf(':', pos);
      if (colon !== -1 && colon < end) {
        const raw = masked.slice(pos, colon).trim();
        if (raw.length > 0) {
          out.declarations.push({
            property: raw.startsWith('--') ? raw : raw.toLowerCase(),
            propertyStart: pos,
            valueStart: colon + 1,
            valueEnd: end,
          });
        }
      }
      pos = masked.charAt(end) === ';' ? end + 1 : end;
    }
    return pos;
  };

  parseItems(0, 0);
  return out;
}
