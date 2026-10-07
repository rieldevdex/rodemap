/** Text helpers for diacritic-insensitive Vietnamese search. Pure. */

/** Lowercases, strips diacritics (đ → d) and collapses whitespace. */
export function foldVietnamese(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** True when every folded token of `query` appears in the folded `haystack`. Empty query matches. */
export function matchesQuery(haystack: string, query: string): boolean {
  const tokens = foldVietnamese(query).split(' ').filter(Boolean);
  if (tokens.length === 0) return true;
  const folded = foldVietnamese(haystack);
  return tokens.every((t) => folded.includes(t));
}

/** "2,5" for 2.5 and "7,25" for 7.25: at most two decimals, Vietnamese decimal comma. */
export function formatHours(hours: number): string {
  return String(Math.round(hours * 100) / 100).replace('.', ',');
}
