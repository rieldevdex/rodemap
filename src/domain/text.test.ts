import { describe, expect, it } from 'vitest';
import { foldVietnamese, formatHours, matchesQuery } from './text';

describe('foldVietnamese', () => {
  it('strips diacritics, folds đ and collapses whitespace', () => {
    expect(foldVietnamese('  Đăng ký   Tham gia  ')).toBe('dang ky tham gia');
    expect(foldVietnamese('Nghệ thuật – Văn hóa')).toBe('nghe thuat – van hoa');
    expect(foldVietnamese('đường')).toBe('duong');
  });
});

describe('matchesQuery', () => {
  it('matches every token regardless of accents and order', () => {
    expect(matchesQuery('Giải Tranh biện tiếng Anh mở rộng', 'tranh bien')).toBe(true);
    expect(matchesQuery('Giải Tranh biện tiếng Anh mở rộng', 'anh tranh')).toBe(true);
    expect(matchesQuery('Giải Tranh biện', 'robot')).toBe(false);
  });
  it('treats an empty query as a match', () => {
    expect(matchesQuery('bất kỳ', '   ')).toBe(true);
  });
});

describe('formatHours', () => {
  it('uses a decimal comma and at most two decimals', () => {
    expect(formatHours(3)).toBe('3');
    expect(formatHours(2.5)).toBe('2,5');
    expect(formatHours(7.25)).toBe('7,25');
    expect(formatHours(1 / 3)).toBe('0,33');
  });
});
