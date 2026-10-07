/**
 * Copy lint engine (docs/ARCHITECTURE.md "Copy rules"). Pure: takes text or a
 * source file and returns findings. Rule data lives in scripts/banned-copy.ts.
 */
import { COPY_RULES, VIETNAMESE_DIACRITIC, type CopyRule, type CopyRuleId } from '../banned-copy';
import { htmlTextPieces } from './html';
import { createLineIndex, excerpt, type Finding } from './report';
import { extractStrings } from './ts-strings';

/** Normalised text plus, for each index, the index in the original string (sentinel at the end). */
export interface NormalisedText {
  text: string;
  map: number[];
}

/**
 * NFC-normalises `raw` and collapses whitespace runs to one space, keeping a map back
 * to the original indices so findings point at the right column.
 */
export function normaliseCopy(raw: string): NormalisedText {
  let text = '';
  const map: number[] = [];
  for (const m of raw.matchAll(/\s+|[^\s]\p{M}*/gu)) {
    const seg = m[0];
    if (/^\s/u.test(seg)) {
      text += ' ';
      map.push(m.index);
      continue;
    }
    const nfc = seg.normalize('NFC');
    for (let k = 0; k < nfc.length; k++) {
      text += nfc.charAt(k);
      map.push(m.index);
    }
  }
  map.push(raw.length);
  return { text, map };
}

/** True when the string contains at least one Vietnamese diacritic letter (after NFC). */
export function isVietnamese(text: string): boolean {
  return VIETNAMESE_DIACRITIC.test(text.normalize('NFC'));
}

/**
 * Hides URLs and ASCII route paths (e.g. "/lo-trinh") from the word rules: slugs are
 * ASCII by design and are not copy. Same length as the input.
 */
function maskPaths(text: string): string {
  return text.replace(
    /https?:\/\/\S+|(?<![\p{L}\p{M}\d])\/[a-z0-9][a-z0-9\-/]*/giu,
    (m) => '·'.repeat(m.length),
  );
}

export interface CopyMatch {
  rule: CopyRuleId;
  label: string;
  /** Index in the ORIGINAL string passed to checkCopy. */
  index: number;
  /** The matched text (normalised). */
  match: string;
  excerpt: string;
  hint: string;
}

function globalClone(re: RegExp): RegExp {
  return new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
}

/** Checks one string against every copy rule. */
export function checkCopy(raw: string, rules: readonly CopyRule[] = COPY_RULES): CopyMatch[] {
  const { text, map } = normaliseCopy(raw);
  const vietnamese = VIETNAMESE_DIACRITIC.test(text);
  const wordView = maskPaths(text);
  const out: CopyMatch[] = [];
  for (const rule of rules) {
    if (rule.scope === 'vietnamese' && !vietnamese) continue;
    const haystack = rule.scope === 'vietnamese' ? wordView : text;
    const re = globalClone(rule.pattern);
    let m: RegExpExecArray | null;
    while ((m = re.exec(haystack)) !== null) {
      if (m[0].length === 0) {
        re.lastIndex++;
        continue;
      }
      const matched = text.slice(m.index, m.index + m[0].length);
      out.push({
        rule: rule.id,
        label: rule.label,
        index: map[m.index] ?? 0,
        match: matched,
        excerpt: excerpt(text, m.index, m.index + m[0].length),
        hint: rule.hint,
      });
    }
  }
  return out.sort((a, b) => a.index - b.index);
}

/** Formats the message part of a copy finding. */
export function copyMessage(m: CopyMatch): string {
  const what =
    m.rule === 'emoji'
      ? `emoji "${m.match}"`
      : m.rule === 'banned-structure'
        ? `structure "${m.label}" ("${m.match}")`
        : `"${m.match}"`;
  return `${what} in «${m.excerpt}» → ${m.hint}`;
}

/** Lints the string literals, template literals, JSX text and JSX attribute strings of a TS/TSX source. */
export function lintTsCopy(source: string, fileName: string): Finding[] {
  const index = createLineIndex(source);
  const findings: Finding[] = [];
  for (const piece of extractStrings(source, fileName)) {
    for (const m of checkCopy(piece.text)) {
      const offset = piece.offsets[m.index] ?? piece.offsets[0] ?? 0;
      findings.push({ ...index(offset), rule: m.rule, message: copyMessage(m) });
    }
  }
  return findings.sort((a, b) => a.line - b.line || a.col - b.col);
}

/** Lints the visible text and attribute values of an HTML document. */
export function lintHtmlCopy(html: string): Finding[] {
  const index = createLineIndex(html);
  const findings: Finding[] = [];
  for (const piece of htmlTextPieces(html)) {
    for (const m of checkCopy(piece.text)) {
      findings.push({ ...index(piece.offset + m.index), rule: m.rule, message: copyMessage(m) });
    }
  }
  return findings.sort((a, b) => a.line - b.line || a.col - b.col);
}
