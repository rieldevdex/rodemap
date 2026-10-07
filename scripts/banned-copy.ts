/**
 * Copy rules for `npm run lint:copy` (docs/ARCHITECTURE.md "Copy rules", DESIGN.md §8),
 * kept as data. Rodemap copy is formal administrative Vietnamese (văn phong hành chính).
 *
 * - scope 'vietnamese': checked only in strings that contain a Vietnamese diacritic letter.
 * - scope 'all': checked in every string (old brand name, emoji).
 *
 * Patterns are matched against NFC-normalised text with whitespace runs collapsed
 * to one space. Word boundaries are Unicode-aware: a match may not touch another
 * letter or combining mark, so "Lộ trình" never trips "lo".
 */

export type CopyRuleId = 'banned-word' | 'banned-structure' | 'old-brand' | 'emoji';

export interface CopyRule {
  id: CopyRuleId;
  /** Short label printed in the finding, e.g. the banned word. */
  label: string;
  /** Non-global pattern; the engine clones it with the `g` flag. */
  pattern: RegExp;
  /** Formal replacement hint. */
  hint: string;
  scope: 'vietnamese' | 'all';
}

/** Letters that only occur in Vietnamese text (matched case-insensitively after NFC). */
export const VIETNAMESE_DIACRITIC =
  /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/iu;

const L = '(?<![\\p{L}\\p{M}])';
const R = '(?![\\p{L}\\p{M}])';

/** Builds a Unicode-aware whole-word pattern (flags 'iu'). */
export function wordPattern(word: string): RegExp {
  const body = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+');
  return new RegExp(`${L}${body}${R}`, 'iu');
}

export const BANNED_WORDS: readonly { word: string; hint: string }[] = [
  { word: 'làm ra', hint: 'tạo ra / phát triển / xây dựng' },
  { word: 'lo', hint: 'phụ trách / đảm bảo / chuẩn bị' },
  { word: 'chạy', hint: 'vận hành / thực hiện / tổ chức' },
  { word: 'người lớn', hint: 'phụ huynh / người trưởng thành / giáo viên' },
  { word: 'thật', hint: 'bỏ từ này hoặc dùng "rất", "đặc biệt"' },
];

export const BANNED_STRUCTURES: readonly { label: string; pattern: RegExp; hint: string }[] = [
  {
    label: '… nào cũng …',
    pattern: /(?<![\p{L}\p{M}])nào cũng(?![\p{L}\p{M}])/iu,
    hint: 'dùng "mọi …", "tất cả …" hoặc "mỗi … đều …"',
  },
  {
    label: 'cứ … lại …',
    // "căn cứ", "chứng cứ", "bằng cứ" are formal nouns, not the spoken "cứ … lại …".
    pattern: /(?<![\p{L}\p{M}])(?<!căn )(?<!chứng )(?<!bằng )cứ(?![\p{L}\p{M}]).{1,40}?(?<![\p{L}\p{M}])lại(?![\p{L}\p{M}])/iu,
    hint: 'dùng "định kỳ …", "mỗi … đều …" hoặc "hằng tuần/hằng tháng"',
  },
  {
    label: 'chứ không phải',
    pattern: /chứ không phải/iu,
    hint: 'nêu trực tiếp nội dung khẳng định; có thể dùng "thay vì …"',
  },
  {
    label: ', không phải …',
    pattern: /[,;:—–]\s*không phải(?![\p{L}\p{M}])/iu,
    hint: 'bỏ cấu trúc đối lập kiểu khẩu hiệu; nêu trực tiếp nội dung khẳng định',
  },
  {
    label: 'không phải … mà là …',
    pattern: /(?<![\p{L}\p{M}])không phải(?![\p{L}\p{M}]).{1,60}?mà là/iu,
    hint: 'bỏ cấu trúc đối lập; nêu trực tiếp nội dung khẳng định hoặc dùng "thay vì …"',
  },
];

export const OLD_BRAND: { label: string; pattern: RegExp; hint: string } = {
  label: 'Rode',
  pattern: /(?<![\p{L}\p{M}])Rode(?![\p{L}\p{M}])/u,
  hint: 'tên sản phẩm là "Rodemap"',
};

export const EMOJI: { label: string; pattern: RegExp; hint: string } = {
  label: 'emoji',
  // One finding per run of adjacent emoji (including ZWJ sequences, VS16 and skin-tone modifiers).
  pattern: /\p{Extended_Pictographic}(?:\u200d|\ufe0f|\p{Emoji_Modifier}|\p{Extended_Pictographic})*/u,
  hint: 'bỏ biểu tượng cảm xúc; dùng biểu tượng SVG kèm nhãn chữ',
};

/** Every copy rule, in reporting order. */
export const COPY_RULES: readonly CopyRule[] = [
  ...BANNED_WORDS.map(
    (w): CopyRule => ({ id: 'banned-word', label: w.word, pattern: wordPattern(w.word), hint: w.hint, scope: 'vietnamese' }),
  ),
  ...BANNED_STRUCTURES.map(
    (s): CopyRule => ({ id: 'banned-structure', label: s.label, pattern: s.pattern, hint: s.hint, scope: 'vietnamese' }),
  ),
  { id: 'old-brand', label: OLD_BRAND.label, pattern: OLD_BRAND.pattern, hint: OLD_BRAND.hint, scope: 'all' },
  { id: 'emoji', label: EMOJI.label, pattern: EMOJI.pattern, hint: EMOJI.hint, scope: 'all' },
];
