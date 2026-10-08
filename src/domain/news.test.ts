import { describe, expect, it } from 'vitest';
import { toMillis } from './dates';
import {
  bodyToText,
  filterPosts,
  groupByIssue,
  groupThousands,
  isPublished,
  issueNumber,
  leadPost,
  NEWS_CATEGORY_LABELS,
  NEWS_LIMITS,
  newsBodyText,
  parseNewsBody,
  postFromDraft,
  postsAboutClub,
  postsAboutEvent,
  publishedPosts,
  readingMinutes,
  relatedPosts,
  sortNews,
  uniqueNewsSlug,
  validateNewsDraft,
} from './news';
import type { NewsBlock, NewsDraft, NewsPost } from './types';

let n = 0;
function post(overrides: Partial<NewsPost> = {}): NewsPost {
  n += 1;
  const id = overrides.id ?? `bt-t${String(n).padStart(3, '0')}`;
  return {
    id,
    slug: id,
    title: `Bài viết thử nghiệm ${id}`,
    category: 'announcement',
    author: 'Ban Truyền thông',
    publishedAt: '2026-10-01T08:00:00+07:00',
    summary: 'Tóm tắt bài viết thử nghiệm của Hội đồng Học sinh.',
    body: [{ kind: 'paragraph', text: 'Nội dung bài viết.' }],
    eventIds: [],
    clubIds: [],
    ...overrides,
  };
}

const now = toMillis('2026-10-07T09:00:00+07:00');

describe('labels', () => {
  it('names the four columns', () => {
    expect(NEWS_CATEGORY_LABELS).toEqual({ announcement: 'Thông báo', activity: 'Tin hoạt động', club: 'Câu lạc bộ', guide: 'Hướng dẫn' });
  });
});

describe('body text', () => {
  const blocks: NewsBlock[] = [
    { kind: 'heading', text: 'Nội dung chính' },
    { kind: 'paragraph', text: 'Đoạn mở đầu.' },
    { kind: 'list', items: ['Mục một', 'Mục hai'] },
    { kind: 'quote', text: 'Câu trích dẫn.', source: 'Đại diện Ban chủ nhiệm' },
  ];

  it('flattens every block in reading order', () => {
    expect(newsBodyText(blocks)).toBe('Nội dung chính\nĐoạn mở đầu.\nMục một\nMục hai\nCâu trích dẫn.\nĐại diện Ban chủ nhiệm');
  });

  it('counts reading time in whole minutes, at least one', () => {
    expect(readingMinutes(post())).toBe(1);
    const long = post({ body: [{ kind: 'paragraph', text: Array.from({ length: 450 }, () => 'chữ').join(' ') }] });
    expect(readingMinutes(long)).toBe(3);
  });

  it('parses headings, lists, quotes and paragraphs', () => {
    const text = [
      '## Nội dung chính',
      'Dòng một',
      'dòng hai.',
      '',
      '- Mục một',
      '- Mục hai',
      '',
      '> Câu trích dẫn',
      '> tiếp theo. — Đại diện Ban chủ nhiệm',
      '',
      '> Trích dẫn không ghi nguồn.',
      '',
      '   ',
      '-',
      '',
      'Đoạn kết.',
    ].join('\r\n');
    expect(parseNewsBody(text)).toEqual([
      { kind: 'heading', text: 'Nội dung chính' },
      { kind: 'paragraph', text: 'Dòng một dòng hai.' },
      { kind: 'list', items: ['Mục một', 'Mục hai'] },
      { kind: 'quote', text: 'Câu trích dẫn tiếp theo.', source: 'Đại diện Ban chủ nhiệm' },
      { kind: 'quote', text: 'Trích dẫn không ghi nguồn.', source: '' },
      { kind: 'paragraph', text: 'Đoạn kết.' },
    ]);
    expect(parseNewsBody('## ')).toEqual([]);
    expect(parseNewsBody('   ')).toEqual([]);
    expect(parseNewsBody('> Câu một\ncâu hai — Nguồn')).toEqual([{ kind: 'quote', text: 'Câu một câu hai', source: 'Nguồn' }]);
    expect(parseNewsBody('- \n- ')).toEqual([]);
  });

  it('takes the source after the last spaced em dash only', () => {
    expect(parseNewsBody('> Sinh hoạt từ 7 - 9 giờ – phòng A1.')).toEqual([{ kind: 'quote', text: 'Sinh hoạt từ 7 - 9 giờ – phòng A1.', source: '' }]);
    expect(parseNewsBody('> Năm học 2026-2027 — mở đầu — Ban chủ nhiệm, Khối 10-11')).toEqual([
      { kind: 'quote', text: 'Năm học 2026-2027 — mở đầu', source: 'Ban chủ nhiệm, Khối 10-11' },
    ]);
    const hyphens: NewsBlock[] = [{ kind: 'quote', text: 'Từ 7 - 9 giờ, năm học 2026–2027.', source: 'Ban chủ nhiệm, Khối 10-11' }];
    expect(parseNewsBody(bodyToText(hyphens))).toEqual(hyphens);
  });

  it('round-trips through the compose text', () => {
    const withBare: NewsBlock[] = [...blocks, { kind: 'quote', text: 'Không nguồn.', source: '' }];
    expect(parseNewsBody(bodyToText(withBare))).toEqual(withBare);
  });
});

describe('publication', () => {
  const a = post({ id: 'a', publishedAt: '2026-09-20T08:00:00+07:00' });
  const b = post({ id: 'b', publishedAt: '2026-10-05T08:00:00+07:00' });
  const c = post({ id: 'c', publishedAt: '2026-10-05T08:00:00+07:00', pinned: true });
  const later = post({ id: 'later', publishedAt: '2026-10-20T08:00:00+07:00' });

  it('hides scheduled posts and sorts newest first; at the same instant the later one in the list first', () => {
    expect(isPublished(later, now)).toBe(false);
    expect(publishedPosts([a, later, c, b], now).map((p) => p.id)).toEqual(['b', 'c', 'a']);
    expect(sortNews([b, c]).map((p) => p.id)).toEqual(['c', 'b']);
    expect(sortNews([later, a]).map((p) => p.id)).toEqual(['later', 'a']);
  });

  it('keeps the last copy of a repeated id, in its place', () => {
    const edited = { ...b, title: 'Đã chỉnh sửa' };
    expect(publishedPosts([a, b, c, edited], now).map((p) => p.title)).toEqual(['Đã chỉnh sửa', c.title, a.title]);
  });

  it('leads with the newest pinned post, else the newest', () => {
    expect(leadPost([a, b, c])?.id).toBe('c');
    expect(leadPost([a, b])?.id).toBe('b');
    expect(leadPost([])).toBeUndefined();
  });
});

describe('issues', () => {
  it('numbers months from the start of the school year', () => {
    expect(issueNumber(toMillis('2026-09-15'))).toBe(1);
    expect(issueNumber(toMillis('2026-10-31'))).toBe(2);
    expect(issueNumber(toMillis('2027-01-02'))).toBe(5);
    expect(issueNumber(toMillis('2026-08-01'))).toBe(1);
  });

  it('groups by month, newest first', () => {
    const issues = groupByIssue([
      post({ id: 's1', publishedAt: '2026-09-10T08:00:00+07:00' }),
      post({ id: 'o1', publishedAt: '2026-10-02T08:00:00+07:00' }),
      post({ id: 'o2', publishedAt: '2026-10-06T08:00:00+07:00' }),
    ]);
    expect(issues.map((i) => [i.key, i.number, i.label, i.posts.map((p) => p.id)])).toEqual([
      ['2026-10', 2, 'Tháng 10/2026', ['o2', 'o1']],
      ['2026-09', 1, 'Tháng 9/2026', ['s1']],
    ]);
  });
});

describe('search and relations', () => {
  const debate = post({ id: 'd', title: 'Giải Tranh biện cấp trường', category: 'activity', eventIds: ['ev-018'], clubIds: ['tranh-bien'] });
  const guide = post({ id: 'g', title: 'Hướng dẫn đăng ký', category: 'guide', body: [{ kind: 'list', items: ['Mở trang Khám phá sự kiện'] }] });
  const club = post({ id: 'k', title: 'Giới thiệu câu lạc bộ', category: 'club', clubIds: ['tranh-bien'] });
  const same = post({ id: 's', title: 'Tin hoạt động khác', category: 'activity' });
  const both = post({ id: 'b', title: 'Vòng loại', category: 'announcement', eventIds: ['ev-018'], clubIds: ['tranh-bien'] });
  const all = [debate, guide, club, same, both];

  it('filters by category and folded query over title, summary, author and body', () => {
    expect(filterPosts(all, { category: 'guide', query: '' }).map((p) => p.id)).toEqual(['g']);
    expect(filterPosts(all, { category: null, query: 'kham pha' }).map((p) => p.id)).toEqual(['g']);
    expect(filterPosts(all, { category: null, query: 'tranh bien' }).map((p) => p.id)).toEqual(['d']);
    expect(filterPosts(all, { category: 'club', query: 'truyen thong' }).map((p) => p.id)).toEqual(['k']);
  });

  it('ranks related posts by shared events, clubs and category', () => {
    expect(relatedPosts(debate, all).map((p) => p.id)).toEqual(['b', 'k', 's']);
    expect(relatedPosts(debate, all, 1).map((p) => p.id)).toEqual(['b']);
    expect(relatedPosts(debate, all, -1)).toEqual([]);
    expect(relatedPosts(guide, all)).toEqual([]);
    const older = post({ id: 'o1', category: 'guide', publishedAt: '2026-09-01T08:00:00+07:00' });
    const newer = post({ id: 'o2', category: 'guide', publishedAt: '2026-09-15T08:00:00+07:00' });
    expect(relatedPosts(guide, [older, newer]).map((p) => p.id)).toEqual(['o2', 'o1']);
  });

  it('finds posts about an event or a club', () => {
    expect(postsAboutEvent(all, 'ev-018').map((p) => p.id)).toEqual(['d', 'b']);
    expect(postsAboutClub(all, 'tranh-bien').map((p) => p.id)).toEqual(['d', 'k', 'b']);
  });
});

describe('compose', () => {
  const valid: NewsDraft = {
    title: 'Thông báo lịch sinh hoạt câu lạc bộ',
    category: 'announcement',
    author: 'Ban Truyền thông',
    summary: 'Hội đồng Học sinh thông báo lịch sinh hoạt của các câu lạc bộ trong tháng 11/2026.',
    bodyText: `## Lịch sinh hoạt\n\n${'Các câu lạc bộ duy trì lịch sinh hoạt định kỳ theo kế hoạch đã đăng ký với Hội đồng Học sinh. '.repeat(2)}`,
    eventIds: ['ev-018'],
  };
  const known = new Set(['ev-018', 'ev-020']);

  it('accepts a complete draft', () => {
    expect(validateNewsDraft(valid, known)).toEqual({});
  });

  it('groups thousands with a dot', () => {
    expect([0, 120, 6000, 1234567, 999.9].map(groupThousands)).toEqual(['0', '120', '6.000', '1.234.567', '999']);
  });

  it('reports every field', () => {
    const L = NEWS_LIMITS;
    expect(
      validateNewsDraft({ title: 'Ngắn', category: 'other' as never, author: ' ', summary: 'Ngắn.', bodyText: 'Ngắn.', eventIds: ['ev-999'] }, known),
    ).toEqual({
      title: `Tiêu đề cần có từ ${String(L.titleMin)} đến ${String(L.titleMax)} ký tự.`,
      category: 'Vui lòng chọn chuyên mục.',
      author: 'Vui lòng chọn ban phụ trách bài viết.',
      summary: `Phần tóm tắt cần có từ ${String(L.summaryMin)} đến ${String(L.summaryMax)} ký tự.`,
      bodyText: 'Nội dung cần có từ 120 đến 6.000 ký tự.',
      eventIds: 'Danh sách sự kiện liên quan không hợp lệ.',
    });
    expect(validateNewsDraft({ ...valid, eventIds: ['ev-018', 'ev-018'] }, known).eventIds).toBe('Danh sách sự kiện liên quan không hợp lệ.');
    expect(validateNewsDraft({ ...valid, eventIds: ['a', 'b', 'c', 'd', 'e'] }, known).eventIds).toBe('Mỗi bài viết liên kết tối đa 4 sự kiện.');
    expect(validateNewsDraft({ ...valid, author: 'x'.repeat(61) }, known).author).toBeDefined();
    expect(validateNewsDraft({ ...valid, bodyText: 'x'.repeat(6001) }, known).bodyText).toBeDefined();
  });

  it('makes slugs unique and avoids reserved page names', () => {
    expect(uniqueNewsSlug('Thông báo mới', new Set())).toBe('thong-bao-moi');
    expect(uniqueNewsSlug('Thông báo mới', new Set(['thong-bao-moi', 'thong-bao-moi-2']))).toBe('thong-bao-moi-3');
    expect(uniqueNewsSlug('Soạn bài', new Set())).toBe('soan-bai-2');
  });

  it('builds the post with clubs taken from the related events', () => {
    const p = postFromDraft(
      { ...valid, title: '  Thông báo lịch sinh hoạt câu lạc bộ ', eventIds: ['ev-018', 'ev-020', 'ev-x'] },
      {
        id: 'bt-new',
        now,
        takenSlugs: new Set(),
        clubOfEvent: (id) => ({ 'ev-018': 'tranh-bien', 'ev-020': 'tranh-bien' })[id],
      },
    );
    expect(p).toEqual({
      id: 'bt-new',
      slug: 'thong-bao-lich-sinh-hoat-cau-lac-bo',
      title: 'Thông báo lịch sinh hoạt câu lạc bộ',
      category: 'announcement',
      author: 'Ban Truyền thông',
      publishedAt: '2026-10-07T09:00:00+07:00',
      summary: valid.summary,
      body: parseNewsBody(valid.bodyText),
      eventIds: ['ev-018', 'ev-020', 'ev-x'],
      clubIds: ['tranh-bien'],
    });
  });
});
