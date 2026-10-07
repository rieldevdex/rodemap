/**
 * Minimal HTML helpers for index.html (no DOM dependency). All extractors keep
 * source offsets so findings report exact line/col.
 */

export interface HtmlTag {
  /** Lowercased tag name. */
  name: string;
  start: number;
  end: number;
  attributes: HtmlAttribute[];
}

export interface HtmlAttribute {
  /** Lowercased attribute name. */
  name: string;
  value: string;
  /** Offset of the first character of the value; -1 for valueless attributes. */
  valueStart: number;
}

export interface HtmlTextPiece {
  text: string;
  offset: number;
  kind: 'text' | 'attribute';
  /** Attribute name when kind is 'attribute'. */
  attribute?: string;
}

/** Replaces HTML comments with spaces (same UTF-16 length, newlines kept). */
export function stripHtmlComments(html: string): string {
  // Without the `u` flag, [^\r\n] matches single UTF-16 code units, so lengths are preserved.
  return html.replace(/<!--[\s\S]*?(?:-->|$)/g, (m) => m.replace(/[^\r\n]/g, ' '));
}

const ATTRIBUTE_RE = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

/** Parses the attributes of a tag whose source is `tag` starting at `tagStart`. */
function parseAttributes(tag: string, tagStart: number, nameLength: number): HtmlAttribute[] {
  const attrs: HtmlAttribute[] = [];
  const body = tag.slice(1 + nameLength);
  const bodyOffset = tagStart + 1 + nameLength;
  for (const m of body.matchAll(ATTRIBUTE_RE)) {
    const name = (m[1] ?? '').toLowerCase();
    const value = m[2] ?? m[3] ?? m[4];
    if (value === undefined) {
      attrs.push({ name, value: '', valueStart: -1 });
      continue;
    }
    const whole = m[0];
    const quoted = m[2] !== undefined || m[3] !== undefined;
    const valueIndex = quoted ? whole.length - value.length - 1 : whole.length - value.length;
    attrs.push({ name, value, valueStart: bodyOffset + m.index + valueIndex });
  }
  return attrs;
}

/** Lists start tags (with parsed attributes) in document order. Comments are ignored. */
export function parseTags(html: string): HtmlTag[] {
  const src = stripHtmlComments(html);
  const tags: HtmlTag[] = [];
  const re = /<([a-zA-Z][\w:-]*)\b(?:[^>"']|"[^"]*"|'[^']*')*>/g;
  for (const m of src.matchAll(re)) {
    const name = (m[1] ?? '').toLowerCase();
    tags.push({
      name,
      start: m.index,
      end: m.index + m[0].length,
      attributes: parseAttributes(m[0], m.index, name.length),
    });
  }
  return tags;
}

/** Finds the end of a raw-text element (`script`, `style`) starting after its open tag. */
function rawTextEnd(src: string, from: number, name: string): { contentEnd: number; closeEnd: number } {
  const re = new RegExp(`</${name}\\s*>`, 'gi');
  re.lastIndex = from;
  const m = re.exec(src);
  return m ? { contentEnd: m.index, closeEnd: m.index + m[0].length } : { contentEnd: src.length, closeEnd: src.length };
}

/**
 * Builds a CSS view of an HTML document with the same length as `html`: the content
 * of every `<style>` element and every `style="…"` attribute is kept, everything else
 * becomes whitespace. A `;` separates each region so declarations never merge.
 */
export function htmlCssView(html: string): string {
  const src = stripHtmlComments(html);
  const chars: string[] = src.split('').map((c) => (c === '\n' || c === '\r' ? c : ' '));
  for (const tag of parseTags(html)) {
    if (tag.name === 'style') {
      const { contentEnd } = rawTextEnd(src, tag.end, 'style');
      for (let i = tag.end; i < contentEnd; i++) chars[i] = src.charAt(i);
      if (contentEnd < chars.length) chars[contentEnd] = ';';
    }
    for (const attr of tag.attributes) {
      if (attr.name !== 'style' || attr.valueStart < 0) continue;
      const end = attr.valueStart + attr.value.length;
      for (let i = attr.valueStart; i < end; i++) chars[i] = src.charAt(i);
      if (end < chars.length) chars[end] = ';';
    }
  }
  return chars.join('');
}

/**
 * Extracts visible text and attribute values from an HTML document. Comments and the
 * content of `<script>` and `<style>` elements are skipped.
 */
export function htmlTextPieces(html: string): HtmlTextPiece[] {
  const src = stripHtmlComments(html);
  const pieces: HtmlTextPiece[] = [];
  const tags = parseTags(html);
  let cursor = 0;
  const pushText = (from: number, to: number): void => {
    const text = src.slice(from, to);
    if (text.trim().length > 0) pieces.push({ text, offset: from, kind: 'text' });
  };
  for (const tag of tags) {
    if (tag.start < cursor) continue; // inside a skipped raw-text element
    pushText(cursor, tag.start);
    for (const attr of tag.attributes) {
      if (attr.valueStart >= 0 && attr.value.trim().length > 0) {
        pieces.push({ text: attr.value, offset: attr.valueStart, kind: 'attribute', attribute: attr.name });
      }
    }
    cursor = tag.end;
    if (tag.name === 'script' || tag.name === 'style') cursor = rawTextEnd(src, tag.end, tag.name).closeEnd;
  }
  pushText(cursor, src.length);
  // Closing tags inside text runs are markup, not copy: split them out.
  return pieces.flatMap((p) => {
    if (p.kind !== 'text') return [p];
    const parts: HtmlTextPiece[] = [];
    let last = 0;
    for (const m of p.text.matchAll(/<\/[^>]*>|<!doctype[^>]*>/gi)) {
      const text = p.text.slice(last, m.index);
      if (text.trim().length > 0) parts.push({ text, offset: p.offset + last, kind: 'text' });
      last = m.index + m[0].length;
    }
    const tail = p.text.slice(last);
    if (tail.trim().length > 0) parts.push({ text: tail, offset: p.offset + last, kind: 'text' });
    return parts;
  });
}
