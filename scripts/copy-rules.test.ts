import { describe, expect, it } from 'vitest';
import { BANNED_WORDS, COPY_RULES, VIETNAMESE_DIACRITIC, wordPattern } from './banned-copy';
import { checkCopy, copyMessage, isVietnamese, lintHtmlCopy, lintTsCopy, normaliseCopy } from './lib/copy-rules';

const ids = (text: string): string[] => checkCopy(text).map((m) => m.rule);
const labels = (text: string): string[] => checkCopy(text).map((m) => m.label);

describe('banned-copy data', () => {
  it('lists the five banned words with formal hints', () => {
    expect(BANNED_WORDS.map((w) => w.word)).toEqual(['làm ra', 'lo', 'chạy', 'người lớn', 'thật']);
    for (const w of BANNED_WORDS) expect(w.hint.length).toBeGreaterThan(0);
    expect(COPY_RULES.every((r) => !r.pattern.flags.includes('g'))).toBe(true);
  });

  it('builds Unicode-aware word patterns', () => {
    const lo = wordPattern('lo');
    expect(lo.flags).toBe('iu');
    expect(lo.test('Mochi sẽ lo việc này')).toBe(true);
    expect(lo.test('Lộ trình')).toBe(false);
    expect(lo.test('lọ')).toBe(false); // decomposed "lọ"
  });

  it('detects Vietnamese diacritics case-insensitively after NFC', () => {
    expect(VIETNAMESE_DIACRITIC.test('ĐĂNG KÝ')).toBe(true);
    expect(isVietnamese('Lộ trình')).toBe(true); // NFD input
    expect(isVietnamese('Rodemap demo')).toBe(false);
  });
});

describe('checkCopy: banned words', () => {
  it('flags each banned word in Vietnamese text', () => {
    expect(labels('Câu lạc bộ chạy chương trình mỗi tuần.')).toEqual(['chạy']);
    expect(labels('Ban cán sự sẽ lo phần hậu cần.')).toEqual(['lo']);
    expect(labels('Nhóm đã làm ra một ứng dụng.')).toEqual(['làm ra']);
    expect(labels('Cần có người lớn đi cùng học sinh.')).toEqual(['người lớn']);
    expect(labels('Đây là một hoạt động thật ý nghĩa.')).toEqual(['thật']);
  });

  it('is case-insensitive and handles NFD input and line breaks', () => {
    expect(labels('CHẠY thử hệ thống')).toEqual(['chạy']);
    expect(labels('Chạy thử hệ thống')).toEqual(['chạy']);
    expect(labels('Nhóm đã làm\n      ra sản phẩm')).toEqual(['làm ra']);
  });

  it('respects Unicode word boundaries', () => {
    expect(ids('Lộ trình hoạt động ngoại khóa')).toEqual([]);
    expect(ids('Lò rèn truyền thống và lọ hoa')).toEqual([]);
    expect(ids('Tham gia lớp học lập trình logo')).toEqual([]);
    expect(ids('Thật')).toEqual(['banned-word']);
    expect(ids('Sự thật')).toEqual(['banned-word']);
    expect(ids('Thất bại là bài học')).toEqual([]);
    expect(ids('chạy, thật.')).toEqual(['banned-word', 'banned-word']);
  });

  it('checks banned words only in strings with Vietnamese diacritics', () => {
    expect(ids('lo')).toEqual([]);
    expect(ids('hello lo world')).toEqual([]);
    expect(ids('lo-trinh')).toEqual([]);
  });

  it('ignores ASCII route paths and URLs inside Vietnamese copy', () => {
    expect(ids('Xem lộ trình tại /lo-trinh hoặc https://rodemap.app/lo-trinh.')).toEqual([]);
    expect(ids('Học sinh lo/không lo')).toEqual(['banned-word', 'banned-word']);
  });
});

describe('checkCopy: banned structures', () => {
  it('flags "… nào cũng …"', () => {
    expect(labels('Sự kiện nào cũng hấp dẫn.')).toEqual(['… nào cũng …']);
    expect(ids('Bất kỳ sự kiện nào đều được kiểm duyệt.')).toEqual([]);
  });

  it('flags "cứ … lại …" within 40 characters', () => {
    expect(labels('Cứ mỗi tuần lại có sự kiện mới.')).toEqual(['cứ … lại …']);
    expect(labels('cứ mỗi tuần lại')).toEqual(['cứ … lại …']);
    expect(ids('Căn cứ vào kế hoạch, ban tổ chức tổng hợp lại danh sách.')).toEqual([]);
    expect(ids('Chứng cứ được ghi nhận lại đầy đủ.')).toEqual([]);
    expect(ids(`Cứ ${'x'.repeat(45)} lại`)).toEqual([]);
    expect(ids('Định kỳ mỗi tuần, ban tổ chức cập nhật sự kiện mới.')).toEqual([]);
  });

  it('flags "chứ không phải"', () => {
    expect(labels('Đây là lộ trình chứ không phải danh sách.')).toEqual(['chứ không phải']);
  });

  it('flags slogan contrasts ", không phải …" and "không phải … mà là …"', () => {
    expect(labels('Một lộ trình, không phải một danh sách.')).toEqual([', không phải …']);
    expect(labels('Hệ thống thống nhất — không phải nhiều kênh rời rạc.')).toEqual([', không phải …']);
    expect(labels('Đây không phải là danh sách mà là lộ trình.')).toEqual(['không phải … mà là …']);
    expect(ids('Học sinh không phải đăng nhập để xem lịch.')).toEqual([]);
    expect(ids('Không phải sự kiện nào cũng mở đăng ký')).toEqual(['banned-structure']);
  });
});

describe('checkCopy: brand and emoji (all strings)', () => {
  it('flags the old brand name in any string', () => {
    expect(ids('Rode helps students')).toEqual(['old-brand']);
    expect(ids('Rode tổng hợp sự kiện.')).toEqual(['old-brand']);
    expect(ids('Rodemap tổng hợp sự kiện.')).toEqual([]);
    expect(ids('rodemap:v1')).toEqual([]);
    expect(ids('She rode a bike')).toEqual([]);
  });

  it('flags emoji in any string, one finding per sequence', () => {
    expect(ids('Done ✅')).toEqual(['emoji']);
    expect(ids('Chúc mừng 🎉🎉')).toEqual(['emoji']);
    expect(ids('A 🎉 B 🎉')).toEqual(['emoji', 'emoji']);
    expect(ids('Lưu ý ⚠️')).toEqual(['emoji']);
    expect(ids('Nhóm 👩‍💻 phát triển')).toEqual(['emoji']);
    expect(ids('⌘K · Ctrl K → 07:30 – 09:00')).toEqual([]);
  });
});

describe('normaliseCopy', () => {
  it('composes to NFC, collapses whitespace and maps back to original indices', () => {
    const raw = 'A  Chạy';
    const { text, map } = normaliseCopy(raw);
    expect(text).toBe('A Chạy');
    expect(map[2]).toBe(3);
    expect(map[4]).toBe(5); // "ạ" starts at the base letter
    expect(map[text.length]).toBe(raw.length);
  });

  it('reports the original index and an excerpt with a formal hint', () => {
    const [m] = checkCopy('Ban tổ chức sẽ chạy chương trình');
    expect(m?.index).toBe(15);
    expect(m && copyMessage(m)).toBe('"chạy" in «Ban tổ chức sẽ chạy chương trình» → vận hành / thực hiện / tổ chức');
  });
});

describe('lintTsCopy', () => {
  it('scans string literals, templates, JSX text and JSX attributes with positions', () => {
    const source = [
      "const a = 'Câu lạc bộ chạy chương trình';",
      'const b = `Cứ ${n} tuần lại có hoạt động`;',
      'const c = <p title="Rode">',
      '  Ban tổ chức sẽ lo hậu cần',
      '</p>;',
    ].join('\n');
    expect(lintTsCopy(source, 'x.tsx').map((f) => [f.line, f.col, f.rule])).toEqual([
      [1, 23, 'banned-word'],
      [2, 12, 'banned-structure'],
      [3, 21, 'old-brand'],
      [4, 18, 'banned-word'],
    ]);
  });

  it('passes formal copy and ignores comments and identifiers', () => {
    const source = [
      '// chạy thử: không quét chú thích',
      'const chay = 1;',
      "export const title = 'Lộ trình hoạt động ngoại khóa';",
      "export const body = 'Rodemap tổng hợp sự kiện, qua đó hỗ trợ học sinh xây dựng lộ trình cá nhân.';",
      'export const el = <p>Ban tổ chức phụ trách hậu cần, đồng thời đảm bảo an toàn.</p>;',
    ].join('\n');
    expect(lintTsCopy(source, 'x.tsx')).toEqual([]);
  });
});

describe('lintHtmlCopy', () => {
  it('scans text and attribute values, skipping scripts, styles and comments', () => {
    const html = [
      '<html lang="vi"><head>',
      '<meta name="description" content="Rode tổng hợp sự kiện">',
      '<title>Rodemap · Lộ trình</title>',
      '<script>const s = "chạy";</script><style>p::after { content: "chạy" }</style>',
      '<!-- chạy -->',
      '</head><body><noscript>Vui lòng bật JavaScript để chạy ứng dụng.</noscript></body></html>',
    ].join('\n');
    expect(lintHtmlCopy(html).map((f) => [f.line, f.col, f.rule])).toEqual([
      [2, 35, 'old-brand'],
      [6, 51, 'banned-word'],
    ]);
  });
});
