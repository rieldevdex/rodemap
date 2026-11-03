import { describe, expect, it } from 'vitest';
import { addDays, formatDate, formatTime, isoWeekKey, overlaps, SCHOOL_YEAR, toMillis, vnParts } from '../domain/dates';
import { AFTER_SCHOOL_MINUTE, eventEnd, eventHours, eventStart, isExternalCompetition, isOpenToAll } from '../domain/events';
import { charCount, validateDraft } from '../domain/moderation';
import { NEWS_LIMITS, newsBodyText, publishedPosts, RESERVED_NEWS_SLUGS } from '../domain/news';
import { hasContactDetails, responseError, validateActivityDraft } from '../domain/proposals';
import { CATEGORY_CODES, GRADES, NEWS_CATEGORIES, type ClubLinkKind, type NewsPost, type SchoolEvent } from '../domain/types';
import { PERIODS } from './calendar';
import { CATEGORIES, categoryByCode } from './categories';
import { CLUBS } from './clubs';
import { EVENTS } from './events';
import { GOALS } from './goals';
import { NEWS, NEWS_DEPARTMENTS } from './news';
import { ACTIVITY_PROPOSALS, COLLABORATIONS, PROPOSAL_RESPONSES } from './proposals';
import { SCHOOL } from './school';
import { SEED_PORTFOLIO, SEED_PROFILE, SEED_REGISTRATIONS } from './seed';
import { TAGS, tagLabel } from './tags';

const ms = toMillis;
/** "Today" in the demo (DEMO_TODAY in tests/support/app.ts). */
const DEMO_TODAY = ms('2026-10-07');
const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\+07:00$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HEADER = '// Dữ liệu minh họa phục vụ bản trình diễn. Thay thế bằng dữ liệu chính thức khi triển khai.';

const approved = EVENTS.filter((e) => e.status === 'approved');
const dateOnly = EVENTS.filter((e) => e.dateOnly === true);
const DAY = 24 * 60 * 60 * 1000;
const eventById = new Map(EVENTS.map((e) => [e.id, e]));
const clubById = new Map(CLUBS.map((c) => [c.id, c]));
const tagIds = new Set(TAGS.map((t) => t.id));

function getEvent(id: string): SchoolEvent {
  const e = eventById.get(id);
  if (!e) throw new Error(`Unknown event ${id}`);
  return e;
}

function isUnique(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

function sentenceCount(text: string): number {
  return text.split(/[.!?](?:\s+|$)/u).filter((s) => s.trim() !== '').length;
}

function startsIn(e: SchoolEvent, from: string, toExclusive: string): boolean {
  const s = eventStart(e);
  return s >= ms(from) && s < ms(toExclusive);
}

/* ── Copy check (mirrors the banned list in docs/ARCHITECTURE.md) ─────── */

const LETTER = '[\\p{L}\\p{M}]';

function bounded(core: string): RegExp {
  return new RegExp(`(?<!${LETTER})${core.normalize('NFC')}(?!${LETTER})`, 'iu');
}

const BANNED: readonly (readonly [string, RegExp])[] = [
  ['làm ra', bounded('làm\\s+ra')],
  ['lo', bounded('lo')],
  ['chạy', bounded('chạy')],
  ['người lớn', bounded('người\\s+lớn')],
  ['thật', bounded('thật')],
  ['… nào cũng …', bounded(`nào(?:\\s+${LETTER}+){0,4}\\s+cũng`)],
  ['cứ … lại …', bounded(`cứ(?:\\s+${LETTER}+){0,4}\\s+lại`)],
  ['chứ không phải', bounded('chứ\\s+không\\s+phải')],
  [', không phải …', new RegExp(`,\\s*${'không\\s+phải'.normalize('NFC')}(?!${LETTER})`, 'iu')],
  ['không phải … mà là …', bounded(`không\\s+phải[^.!?]*?(?<!${LETTER})mà\\s+là`)],
  ['emoji', /\p{Extended_Pictographic}/u],
  ['Rode', /(?<![\p{L}\p{M}])Rode(?![\p{L}\p{M}])/u],
];

interface FoundString {
  path: string;
  text: string;
}

function collectStrings(value: unknown, path: string, out: FoundString[]): FoundString[] {
  if (typeof value === 'string') {
    out.push({ path, text: value.normalize('NFC') });
  } else if (Array.isArray(value)) {
    const items: readonly unknown[] = value;
    items.forEach((item, i) => collectStrings(item, `${path}[${i}]`, out));
  } else if (typeof value === 'object' && value !== null) {
    for (const [key, item] of Object.entries(value)) collectStrings(item as unknown, `${path}.${key}`, out);
  }
  return out;
}

function copyViolations(text: string): string[] {
  return BANNED.filter(([, re]) => re.test(text.normalize('NFC'))).map(([label]) => label);
}

/* ── Tests ─────────────────────────────────────────────────────────── */

describe('data files', () => {
  const sources = import.meta.glob<string>(['./*.ts', '!./*.test.ts'], { query: '?raw', import: 'default', eager: true });

  it('every data file starts with the illustrative comment', () => {
    expect(Object.keys(sources).sort()).toEqual(
      ['calendar', 'categories', 'clubs', 'events', 'goals', 'news', 'proposals', 'school', 'seed', 'tags'].map((n) => `./${n}.ts`),
    );
    for (const [file, source] of Object.entries(sources)) {
      expect(source.startsWith(`${HEADER}\n`), file).toBe(true);
    }
  });

  it('the copy check catches every banned word and structure', () => {
    const samples: [string, string][] = [
      ['Câu lạc bộ làm ra sản phẩm.', 'làm ra'],
      ['Ban chủ nhiệm lo hậu cần.', 'lo'],
      ['Giải chạy bộ cấp trường.', 'chạy'],
      ['Dành cho người lớn.', 'người lớn'],
      ['Một trải nghiệm thật ý nghĩa.', 'thật'],
      ['Học sinh nào cũng có thể tham gia.', '… nào cũng …'],
      ['Học sinh khối nào quan tâm cũng có thể đăng ký.', '… nào cũng …'],
      ['Cứ mỗi tuần lại có một buổi.', 'cứ … lại …'],
      ['Đây là hội thảo chứ không phải lớp học.', 'chứ không phải'],
      ['Một lộ trình, không phải một danh sách.', ', không phải …'],
      ['Đây không phải lớp học mà là hội thảo.', 'không phải … mà là …'],
      ['Chào mừng 🎉', 'emoji'],
      ['Rode tổng hợp sự kiện.', 'Rode'],
    ];
    for (const [text, label] of samples) expect(copyViolations(text), text).toContain(label);
    // Words that merely contain a banned sequence are fine.
    expect(copyViolations('Thư viện, lối đi, sự thực, vsmcclubs, lộ trình, căn chỉnh.')).toEqual([]);
  });

  it('no string anywhere in the sample data uses banned copy', () => {
    const all = collectStrings(
      {
        CATEGORIES,
        TAGS,
        GOALS,
        CLUBS,
        EVENTS,
        PERIODS,
        SCHOOL,
        SEED_PROFILE,
        SEED_REGISTRATIONS,
        SEED_PORTFOLIO,
        NEWS,
      },
      'data',
      [],
    );
    expect(all.length).toBeGreaterThan(300);
    const violations = all.flatMap(({ path, text }) => copyViolations(text).map((label) => `${path}: ${label}`));
    expect(violations).toEqual([]);
  });

  it('stores every string NFC-normalised (precomposed diacritics)', () => {
    const raw = JSON.stringify([CATEGORIES, TAGS, GOALS, CLUBS, EVENTS, PERIODS, SEED_PORTFOLIO, NEWS]);
    expect(raw).toBe(raw.normalize('NFC'));
  });
});

describe('school', () => {
  it('uses the placeholder name and the 2026–2027 school year', () => {
    expect(SCHOOL).toEqual({ name: 'Vinschool Smart City', schoolYear: '2026–2027' });
  });
});

describe('categories', () => {
  it('lists the seven lines with their exact UI labels', () => {
    expect(CATEGORIES.map((c) => [c.code, c.name])).toEqual([
      ['HT', 'Học thuật'],
      ['NT', 'Nghệ thuật – Văn hóa'],
      ['TT', 'Thể thao'],
      ['TN', 'Tình nguyện – Cộng đồng'],
      ['KN', 'Kỹ năng – Hướng nghiệp'],
      ['CN', 'Công nghệ – Sáng tạo'],
      ['TS', 'Sự kiện toàn trường'],
    ]);
  });

  it('describes each category in one formal sentence', () => {
    for (const c of CATEGORIES) {
      expect(sentenceCount(c.description), c.code).toBe(1);
      expect(c.description.endsWith('.'), c.code).toBe(true);
    }
  });

  it('categoryByCode returns the matching category for every code', () => {
    for (const code of CATEGORY_CODES) expect(categoryByCode(code).code).toBe(code);
    expect(categoryByCode('TS').name).toBe('Sự kiện toàn trường');
  });
});

describe('tags and goals', () => {
  it('has about 20 tags with unique ASCII ids and Vietnamese labels', () => {
    expect(TAGS.length).toBeGreaterThanOrEqual(18);
    expect(TAGS.length).toBeLessThanOrEqual(24);
    expect(isUnique(TAGS.map((t) => t.id))).toBe(true);
    for (const t of TAGS) {
      expect(t.id, t.id).toMatch(SLUG);
      expect(t.label.length, t.id).toBeGreaterThan(0);
    }
  });

  it('tagLabel returns the label or falls back to the id', () => {
    expect(tagLabel('lanh-dao')).toBe('Lãnh đạo');
    expect(tagLabel('du-hoc')).toBe('Du học');
    expect(tagLabel('khong-ton-tai')).toBe('khong-ton-tai');
  });

  it('defines the eight goals with 2–4 known tags each', () => {
    expect(GOALS.map((g) => [g.id, g.label])).toEqual([
      ['leadership', 'Phát triển kỹ năng lãnh đạo'],
      ['study_abroad', 'Chuẩn bị hồ sơ du học'],
      ['volunteering', 'Tham gia hoạt động tình nguyện'],
      ['fitness', 'Rèn luyện thể chất'],
      ['academic', 'Nâng cao năng lực học thuật'],
      ['career', 'Định hướng nghề nghiệp'],
      ['arts', 'Phát triển năng khiếu nghệ thuật'],
      ['technology', 'Phát triển năng lực công nghệ'],
    ]);
    for (const g of GOALS) {
      expect(g.tags.length, g.id).toBeGreaterThanOrEqual(2);
      expect(g.tags.length, g.id).toBeLessThanOrEqual(4);
      for (const t of g.tags) expect(tagIds.has(t), `${g.id} → ${t}`).toBe(true);
    }
  });
});

describe('clubs', () => {
  const students = CLUBS.filter((c) => c.kind === 'club');
  const LINK_ORDER: readonly ClubLinkKind[] = ['facebook', 'instagram', 'tiktok'];
  const LINK_HOSTS: Record<ClubLinkKind, RegExp> = {
    facebook: /^https:\/\/www\.facebook\.com\/[^\s]+$/u,
    instagram: /^https:\/\/www\.instagram\.com\/[^\s]+$/u,
    tiktok: /^https:\/\/www\.tiktok\.com\/@[^\s/?]+$/u,
  };

  it('has 22 publishers (the 20 real clubs, the council, one office) with unique ids and ASCII slugs', () => {
    expect(CLUBS).toHaveLength(22);
    expect(CLUBS.slice(0, 2).map((c) => [c.id, c.kind])).toEqual([
      ['hdhs', 'council'],
      ['co-van-hoc-tap', 'office'],
    ]);
    expect(students).toHaveLength(20);
    expect(isUnique(CLUBS.map((c) => c.id))).toBe(true);
    expect(isUnique(CLUBS.map((c) => c.slug))).toBe(true);
    for (const c of CLUBS) expect(c.slug, c.id).toMatch(SLUG);
    for (const c of students) expect(c.slug, c.id).toBe(c.id);
  });

  it('lists the real clubs of Vinschool Smart City in the order of the school list', () => {
    expect(students.map((c) => c.shortName)).toEqual([
      'Bột và Bơ',
      'Góc Xì Xào',
      'Fluorescence the Lab',
      'The Papillon',
      'Psyched Club',
      'Hanoi Vinschool SEIA',
      'Novaris Project',
      'Humans of Vinschool Smart City',
      'KAT Music Club',
      'Mentis Club',
      'Vinschool Debate Society',
      'Young Business Creators',
      'Charité',
      'Vintervarme',
      'VPRC',
      'Artemis',
      'Hanami Shores',
      'SMC Enterprise',
      'Vinschool Business',
      'Green Guardian',
    ]);
    // The former sample clubs are gone.
    for (const id of ['inkstep', 'tranh-bien', 'robotics', 'tinh-nguyen-xanh']) expect(clubById.has(id), id).toBe(false);
  });

  it('includes Phòng Cố vấn Học tập, which publishes the external academic competitions', () => {
    expect(clubById.get('co-van-hoc-tap')).toMatchObject({
      kind: 'office',
      slug: 'phong-co-van-hoc-tap',
      name: 'Phòng Cố vấn Học tập',
      shortName: 'Phòng Cố vấn Học tập',
      categories: ['HT'],
      email: '[Email Phòng Cố vấn Học tập]',
      links: [],
    });
    const description = clubById.get('co-van-hoc-tap')?.description ?? '';
    for (const words of ['cuộc thi học thuật ngoài trường', 'thể lệ', 'hạn đăng ký', 'hồ sơ dự thi']) expect(description).toContain(words);
    // "Phòng Cố vấn Học tập" is always spelled exactly like that.
    for (const { path, text } of collectStrings({ CLUBS, EVENTS, CATEGORIES }, 'data', [])) {
      const mentions = text.match(/phòng cố vấn học tập/giu) ?? [];
      for (const m of mentions) expect(m, path).toBe('Phòng Cố vấn Học tập');
    }
  });

  it('includes Hội đồng Học sinh, which organises every school-wide event', () => {
    expect(clubById.get('hdhs')).toMatchObject({ name: 'Hội đồng Học sinh', shortName: 'HĐHS', categories: ['TS', 'KN'], links: [] });
    for (const e of EVENTS.filter((ev) => ev.category === 'TS')) expect(e.clubId, e.id).toBe('hdhs');
  });

  it('has valid categories and a two-sentence formal description', () => {
    for (const c of CLUBS) {
      expect(c.categories.length, c.id).toBeGreaterThan(0);
      expect(isUnique(c.categories), c.id).toBe(true);
      for (const code of c.categories) expect(CATEGORY_CODES, c.id).toContain(code);
      expect(sentenceCount(c.description), c.id).toBe(2);
      // Third person: the clubs' own "chúng mình" / "chúng tôi" is not kept.
      expect(c.description, c.id).not.toMatch(/chúng (?:mình|tôi|em)/iu);
    }
    for (const c of students) expect(c.categories, c.id).not.toContain('TS');
  });

  it('lists only the club address and public pages, never personal details', () => {
    for (const c of CLUBS) {
      if (c.email !== undefined) {
        const placeholder = /^\[.+\]$/u.test(c.email);
        // Students' and teachers' school addresses are never published.
        expect(placeholder || /^[a-z0-9.]+@gmail\.com$/u.test(c.email), `${c.id}: ${c.email}`).toBe(true);
        expect(placeholder, c.id).toBe(c.kind !== 'club');
      }
      const kinds = c.links.map((l) => l.kind);
      expect(isUnique(kinds), c.id).toBe(true);
      expect(kinds, c.id).toEqual([...kinds].sort((a, b) => LINK_ORDER.indexOf(a) - LINK_ORDER.indexOf(b)));
      for (const l of c.links) {
        expect(l.url, c.id).toMatch(LINK_HOSTS[l.kind]);
        // Share-tracking parameters are removed.
        expect(l.url, c.id).not.toMatch(/[?&](?:mibextid|_r|_t)=/u);
      }
    }
    expect(clubById.get('hdhs')?.email).toBe('[Email Hội đồng Học sinh]');
    // A club that published nothing says so on its page.
    expect(students.filter((c) => c.email === undefined && c.links.length === 0).map((c) => c.id)).toEqual(['vprc', 'smc-enterprise', 'vinschool-business']);
  });
});

describe('calendar periods', () => {
  it('lists the four exam periods and the Tết holiday', () => {
    expect(PERIODS.map((p) => [p.kind, p.label, p.start, p.end])).toEqual([
      ['exam', 'Kiểm tra định kỳ giữa học kỳ I', '2026-11-02', '2026-11-07'],
      ['exam', 'Kiểm tra định kỳ cuối học kỳ I', '2026-12-21', '2027-01-02'],
      ['holiday', 'Nghỉ Tết Nguyên đán', '2027-02-01', '2027-02-14'],
      ['exam', 'Kiểm tra định kỳ giữa học kỳ II', '2027-03-15', '2027-03-20'],
      ['exam', 'Kiểm tra định kỳ cuối học kỳ II', '2027-04-26', '2027-05-08'],
    ]);
    expect(isUnique(PERIODS.map((p) => p.id))).toBe(true);
    for (const p of PERIODS) {
      expect(p.start, p.id).toMatch(ISO_DATE);
      expect(p.end, p.id).toMatch(ISO_DATE);
      expect(ms(p.start) <= ms(p.end), p.id).toBe(true);
      expect(ms(p.start) >= ms(SCHOOL_YEAR.start) && ms(p.end) <= ms(SCHOOL_YEAR.end), p.id).toBe(true);
    }
  });
});

describe('events: shape and integrity', () => {
  it('has 6 school-wide events, 4 external competitions and 2 club events announced by date only, all approved', () => {
    expect(EVENTS).toHaveLength(12);
    expect(approved).toHaveLength(12);
    expect(EVENTS.filter((e) => e.clubId === 'hdhs')).toHaveLength(6);
    expect(EVENTS.filter((e) => isExternalCompetition(e))).toHaveLength(4);
    expect(dateOnly).toHaveLength(2);
  });

  it('keeps the ids of the remaining events (each run chronological) and uses unique ASCII slugs', () => {
    expect(EVENTS.map((e) => e.id)).toEqual([
      'ev-001', 'ev-003', 'ev-027', 'ev-035', 'ev-040', 'ev-045',
      'ev-051', 'ev-052', 'ev-053', 'ev-054',
      'ev-055', 'ev-056',
    ]);
    const council = EVENTS.slice(0, 6);
    const external = EVENTS.slice(6, 10);
    const clubs = EVENTS.slice(10);
    expect(council.every((e) => e.clubId === 'hdhs' && e.category === 'TS')).toBe(true);
    expect(external.every((e) => isExternalCompetition(e))).toBe(true);
    expect(clubs.every((e) => clubById.get(e.clubId)?.kind === 'club' && e.dateOnly === true)).toBe(true);
    for (const run of [council, external, clubs]) {
      run.slice(1).forEach((e, i) => {
        const prev = run[i]!;
        expect(eventStart(prev) <= eventStart(e), `${prev.id} before ${e.id}`).toBe(true);
      });
    }
    expect(isUnique(EVENTS.map((e) => e.slug))).toBe(true);
    for (const e of EVENTS) {
      expect(e.slug, e.id).toMatch(SLUG);
      expect(e.slug.length, e.id).toBeLessThanOrEqual(60);
    }
  });

  it('references existing clubs, categories within the club lines and known tags', () => {
    for (const e of EVENTS) {
      const club = clubById.get(e.clubId);
      expect(club, `${e.id} → ${e.clubId}`).toBeDefined();
      expect(CATEGORY_CODES, e.id).toContain(e.category);
      expect(club?.categories, e.id).toContain(e.category);
      expect(e.tags.length, e.id).toBeGreaterThan(0);
      expect(isUnique(e.tags), e.id).toBe(true);
      for (const t of e.tags) expect(tagIds.has(t), `${e.id} → ${t}`).toBe(true);
    }
  });

  it('has well-formed times: start < end, deadline ≤ start, all inside the school year', () => {
    const yearStart = ms(SCHOOL_YEAR.start);
    const yearEnd = addDays(ms(SCHOOL_YEAR.end), 1);
    for (const e of EVENTS) {
      for (const v of [e.start, e.end, e.registrationDeadline]) expect(v, e.id).toMatch(ISO_DATE_TIME);
      expect(eventStart(e) < eventEnd(e), e.id).toBe(true);
      // A date-only event spans its whole day; a timed event lasts at most 12 hours.
      expect(eventEnd(e) - eventStart(e) <= (e.dateOnly === true ? DAY : 12 * 60 * 60 * 1000), e.id).toBe(true);
      const deadline = ms(e.registrationDeadline);
      expect(deadline <= eventStart(e), e.id).toBe(true);
      expect(eventStart(e) - deadline <= 7 * DAY, e.id).toBe(true);
      expect(eventStart(e) >= yearStart && eventEnd(e) <= yearEnd, e.id).toBe(true);
    }
  });

  it('keeps approved events between 05/09/2026 and 25/05/2027', () => {
    for (const e of approved) expect(startsIn(e, '2026-09-05', '2027-05-26'), e.id).toBe(true);
  });

  it('never starts an approved event inside an exam or holiday period', () => {
    for (const p of PERIODS) {
      const from = ms(p.start);
      const to = addDays(ms(p.end), 1);
      for (const e of approved) {
        const s = eventStart(e);
        expect(s >= from && s < to, `${e.id} in ${p.id}`).toBe(false);
      }
    }
  });

  it('schedules timed club events on weekdays only after school (school-wide events may use school hours)', () => {
    for (const e of EVENTS.filter((ev) => ev.category !== 'TS' && ev.dateOnly !== true)) {
      const p = vnParts(eventStart(e));
      const weekend = p.weekday === 0 || p.weekday === 6;
      if (!weekend) expect(p.hour * 60 + p.minute >= AFTER_SCHOOL_MINUTE, e.id).toBe(true);
    }
  });

  it('has sensible seats: 20–600 capacity and seatsTaken ≤ capacity (none yet for a date-only event)', () => {
    for (const e of EVENTS) {
      expect(Number.isInteger(e.seatsTaken), e.id).toBe(true);
      if (e.dateOnly === true) {
        expect([e.capacity, e.seatsTaken], e.id).toEqual([0, 0]);
        continue;
      }
      expect(e.capacity >= 20 && e.capacity <= 600, e.id).toBe(true);
      expect(e.seatsTaken >= 0 && e.seatsTaken <= e.capacity, e.id).toBe(true);
    }
  });

  it('has formal copy of the expected length', () => {
    for (const e of EVENTS) {
      expect(e.title.length >= 8 && e.title.length <= 120, e.id).toBe(true);
      expect(e.summary.length >= 40 && e.summary.length <= 400, `${e.id} summary ${e.summary.length}`).toBe(true);
      const summarySentences = sentenceCount(e.summary);
      expect(summarySentences >= 2 && summarySentences <= 3, `${e.id} summary sentences`).toBe(true);
      expect(e.description.length, e.id).toBeGreaterThanOrEqual(120);
      expect(sentenceCount(e.description), e.id).toBeGreaterThanOrEqual(2);
      // A date-only event has no place yet.
      expect(e.location.trim().length > 0, e.id).toBe(e.dateOnly !== true);
      expect(e.eligibleGrades.length, e.id).toBeGreaterThan(0);
      expect(e.eligibleGrades.every((g) => GRADES.includes(g)), e.id).toBe(true);
      expect([...e.eligibleGrades].sort((a, b) => a - b), e.id).toEqual(e.eligibleGrades);
      expect(new Set(e.eligibleGrades).size, e.id).toBe(e.eligibleGrades.length);
    }
  });

  it('marks online events by their location', () => {
    for (const e of approved.filter((ev) => ev.format === 'online')) expect(e.location, e.id).toMatch(/^Trực tuyến – /u);
    for (const e of EVENTS.filter((ev) => ev.format === 'in_person')) expect(e.location, e.id).not.toMatch(/Trực tuyến/u);
  });

  it('includes the school-wide milestones organised by HĐHS', () => {
    const ts = approved.filter((e) => e.category === 'TS');
    const opening = ts.find((e) => e.title.startsWith('Lễ khai giảng'));
    expect(opening?.start).toBe('2026-09-05T07:00:00+07:00');
    expect(opening?.end).toBe('2026-09-05T09:30:00+07:00');
    expect(ts.some((e) => e.title.startsWith('Ngày hội Câu lạc bộ'))).toBe(true);
    expect(ts.some((e) => e.title.startsWith('Hội trại truyền thống') && e.start.startsWith('2027-03-26'))).toBe(true);
    expect(ts.some((e) => e.title.startsWith('Lễ tri ân và trưởng thành') && e.start.startsWith('2027-05'))).toBe(true);
    for (const e of ts) expect(isOpenToAll(e.eligibleGrades) || e.eligibleGrades.every((g) => g >= 10), e.id).toBe(true);
  });
});

describe('events: announced by the real clubs', () => {
  it('are the two events the clubs announced, by date only, with nothing filled in on their behalf', () => {
    expect(dateOnly.map((e) => [e.clubId, e.start, e.title])).toEqual([
      ['hanoi-vinschool-seia', '2027-01-23T00:00:00+07:00', 'Hội nghị SEIA khu vực mùa xuân 2027'],
      ['young-business-creators', '2027-01-30T00:00:00+07:00', 'Chung kết Cuộc thi khởi nghiệp cấp trường VBIS Innovation Challenge'],
    ]);
    for (const e of dateOnly) {
      expect(eventEnd(e) - eventStart(e), e.id).toBe(DAY);
      expect(e.registrationDeadline, e.id).toBe(e.start);
      expect(e.location, e.id).toBe('');
      expect(isOpenToAll(e.eligibleGrades), e.id).toBe(true);
      expect(e.status, e.id).toBe('approved');
      expect(e.organizer, e.id).toBeUndefined();
      expect(e.summary, e.id).toContain('đang được cập nhật');
      expect(e.summary, e.id).toContain(formatDate(eventStart(e)));
    }
  });

  it('are the only events of the student clubs: no sample event is published in a real club’s name', () => {
    for (const e of EVENTS.filter((ev) => clubById.get(ev.clubId)?.kind === 'club')) expect(e.dateOnly, e.id).toBe(true);
    for (const e of EVENTS.filter((ev) => ev.dateOnly === true)) expect(clubById.get(e.clubId)?.kind, e.id).toBe('club');
  });
});

describe('events: external academic competitions', () => {
  const external = EVENTS.filter((e) => isExternalCompetition(e));
  const office = clubById.get('co-van-hoc-tap');

  it('are published only by Phòng Cố vấn Học tập, and every event it publishes names its organiser', () => {
    expect(external.length).toBeGreaterThanOrEqual(3);
    for (const e of external) expect(clubById.get(e.clubId)?.kind, e.id).toBe('office');
    for (const e of EVENTS.filter((ev) => ev.clubId === office?.id)) expect(isExternalCompetition(e), e.id).toBe(true);
    for (const e of EVENTS.filter((ev) => clubById.get(ev.clubId)?.kind !== 'office')) expect(e.organizer, e.id).toBeUndefined();
  });

  it('are approved, upcoming on the demo date and spread from October 2026 to March 2027', () => {
    for (const e of external) {
      expect(e.status, e.id).toBe('approved');
      expect(startsIn(e, '2026-10-08', '2027-04-01'), e.id).toBe(true);
      expect(ms(e.registrationDeadline) > DEMO_TODAY, e.id).toBe(true);
      expect(e.seatsTaken < e.capacity, e.id).toBe(true);
    }
    expect(external.some((e) => startsIn(e, '2026-10-01', '2026-11-01'))).toBe(true);
    expect(external.some((e) => startsIn(e, '2027-01-01', '2027-04-01'))).toBe(true);
    // Mostly upper secondary, with one for lower secondary.
    expect(external.filter((e) => e.eligibleGrades.every((g) => g >= 10)).length).toBeGreaterThanOrEqual(2);
    expect(external.some((e) => e.eligibleGrades.every((g) => g <= 9))).toBe(true);
  });

  it('name a generic organiser (never a real organisation or competition brand)', () => {
    const REAL = /RMIT|Quốc gia|Bộ Giáo dục|Sở Giáo dục|Olympia|ISEF|Business Idea/iu;
    for (const e of external) {
      expect(e.organizer, e.id).toMatch(/đối tác|cấp thành phố/u);
      for (const { path, text } of collectStrings(e, e.id, [])) expect(REAL.test(text), path).toBe(false);
    }
  });

  it('pass the submission rules and say how Phòng Cố vấn Học tập supports the students who register', () => {
    for (const e of external) {
      // An event carries every field of the submission form.
      expect(validateDraft(e, DEMO_TODAY), e.id).toEqual({});
      expect(e.summary.startsWith('Cuộc thi ngoài trường'), e.id).toBe(true);
      for (const words of ['Phòng Cố vấn Học tập cập nhật thông tin cuộc thi trên vsmcclubs', 'sau khi học sinh đăng ký trên vsmcclubs', 'tổng hợp danh sách', 'hướng dẫn học sinh']) {
        expect(e.description, e.id).toContain(words);
      }
      expect(e.description, e.id).toContain(e.organizer === 'Ban tổ chức cuộc thi cấp thành phố' ? 'ban tổ chức cấp thành phố' : e.organizer);
    }
    expect(categoryByCode('HT').description).toContain('cuộc thi học thuật ngoài trường do Phòng Cố vấn Học tập cập nhật');
  });
});

describe('seed profile', () => {
  it('is the grade 11 demo student', () => {
    expect(SEED_PROFILE).toEqual({
      grade: 11,
      className: '11A2',
      interests: ['CN', 'HT', 'TN', 'KN'],
      topInterests: ['CN', 'HT', 'TN'],
      goals: ['technology', 'study_abroad', 'volunteering'],
      availability: { weekdayAfterSchool: true, weekend: true },
      weeklyHourBudget: 6,
      onboardedAt: '2026-09-01T20:00:00+07:00',
    });
    for (const c of SEED_PROFILE.topInterests) expect(SEED_PROFILE.interests).toContain(c);
  });
});

describe('seed registrations', () => {
  const byStatus = (s: string) => SEED_REGISTRATIONS.filter((r) => r.status === s).map((r) => getEvent(r.eventId));

  it('reference approved HĐHS events once each, registered before the deadline and after onboarding', () => {
    expect(isUnique(SEED_REGISTRATIONS.map((r) => r.eventId))).toBe(true);
    for (const r of SEED_REGISTRATIONS) {
      const e = getEvent(r.eventId);
      expect(e.status, r.eventId).toBe('approved');
      // Nobody is shown registered for a real club's event on their behalf.
      expect(e.clubId, r.eventId).toBe('hdhs');
      expect(r.registeredAt, r.eventId).toMatch(ISO_DATE_TIME);
      expect(ms(r.registeredAt) <= ms(e.registrationDeadline), r.eventId).toBe(true);
      expect(ms(r.registeredAt) >= ms(SEED_PROFILE.onboardedAt), r.eventId).toBe(true);
      expect(ms(r.registeredAt) < DEMO_TODAY, r.eventId).toBe(true);
      expect(e.eligibleGrades, r.eventId).toContain(SEED_PROFILE.grade);
    }
  });

  it('has 2 attended September events and 1 upcoming registration after 08/10', () => {
    const attended = byStatus('attended');
    expect(attended.map((e) => e.id)).toEqual(['ev-001', 'ev-003']);
    for (const e of attended) {
      expect(startsIn(e, '2026-09-01', '2026-10-01'), e.id).toBe(true);
      expect(eventEnd(e) < DEMO_TODAY, e.id).toBe(true);
    }
    const registered = byStatus('registered');
    expect(registered.map((e) => e.id)).toEqual(['ev-027']);
    for (const e of registered) expect(eventStart(e) >= ms('2026-10-08'), e.id).toBe(true);
    expect(byStatus('absent')).toHaveLength(0);
  });

  it('forms a plan without conflicts', () => {
    const plan = SEED_REGISTRATIONS.map((r) => getEvent(r.eventId));
    plan.forEach((a, i) => {
      for (const b of plan.slice(i + 1)) {
        expect(overlaps(eventStart(a), eventEnd(a), eventStart(b), eventEnd(b)), `${a.id} × ${b.id}`).toBe(false);
      }
    });
  });

  it('keeps every ISO week of the plan within the weekly hour budget', () => {
    const hours = new Map<string, number>();
    for (const r of SEED_REGISTRATIONS) {
      const e = getEvent(r.eventId);
      const week = isoWeekKey(eventStart(e));
      hours.set(week, (hours.get(week) ?? 0) + eventHours(e));
    }
    for (const [week, h] of hours) expect(h, week).toBeLessThanOrEqual(SEED_PROFILE.weeklyHourBudget);
  });
});

describe('seed portfolio', () => {
  const attendedIds = SEED_REGISTRATIONS.filter((r) => r.status === 'attended').map((r) => r.eventId);

  it('has one entry per attended event with matching category and hours', () => {
    expect(SEED_PORTFOLIO.map((p) => p.id)).toEqual(['pf-001', 'pf-002']);
    expect(SEED_PORTFOLIO.map((p) => p.eventId).sort()).toEqual([...attendedIds].sort());
    for (const p of SEED_PORTFOLIO) {
      const e = getEvent(p.eventId);
      expect(p.category, p.id).toBe(e.category);
      expect(p.hours, p.id).toBe(eventHours(e));
      expect(p.role.length, p.id).toBeGreaterThan(0);
      expect(ms(p.createdAt) >= eventEnd(e), p.id).toBe(true);
      expect(ms(p.updatedAt) >= ms(p.createdAt), p.id).toBe(true);
      expect(ms(p.updatedAt) < DEMO_TODAY, p.id).toBe(true);
      for (const link of p.evidenceLinks) expect(link, p.id).toMatch(/^https:\/\/example\.com\/minh-chung\/[a-z0-9-]+$/);
    }
  });

  it('has exactly one Mochi draft; the others are first-person student reflections of 3–4 sentences', () => {
    expect(SEED_PORTFOLIO.filter((p) => p.reflectionSource === 'mochi_draft')).toHaveLength(1);
    for (const p of SEED_PORTFOLIO) {
      expect(p.reflection.length, p.id).toBeGreaterThan(0);
      expect(p.reflection, p.id).toMatch(/(?<![\p{L}\p{M}])tôi(?![\p{L}\p{M}])/iu);
      if (p.reflectionSource === 'student') {
        const n = sentenceCount(p.reflection);
        expect(n >= 3 && n <= 4, p.id).toBe(true);
      }
    }
  });
});

describe('news', () => {
  const ids = (posts: readonly NewsPost[]) => posts.map((p) => p.id);
  const text = (p: NewsPost) => `${p.title}\n${p.summary}\n${newsBodyText(p.body)}`;
  const departments: readonly string[] = NEWS_DEPARTMENTS;
  const VISIBLE_AT = ms('2026-10-07T09:00:00+07:00');
  const ASCII_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  it('has 6 articles with ids bt-NNN in chronological order of publication (the ids of removed articles are not reused)', () => {
    expect(ids(NEWS)).toEqual(['bt-001', 'bt-002', 'bt-003', 'bt-004', 'bt-005', 'bt-010']);
    for (const p of NEWS) expect(p.publishedAt, p.id).toMatch(ISO_DATE_TIME);
    NEWS.slice(1).forEach((p, i) => {
      const prev = NEWS[i]!;
      expect(ms(prev.publishedAt) < ms(p.publishedAt), `${prev.id} before ${p.id}`).toBe(true);
    });
  });

  it('uses unique ASCII slugs that are never reserved', () => {
    expect(isUnique(NEWS.map((p) => p.slug))).toBe(true);
    for (const p of NEWS) {
      expect(p.slug, p.id).toMatch(ASCII_SLUG);
      expect(p.slug.length, p.id).toBeLessThanOrEqual(60);
      expect(RESERVED_NEWS_SLUGS, p.id).not.toContain(p.slug);
    }
  });

  it('is signed by a council department and covers announcements, activities and guides', () => {
    for (const p of NEWS) {
      expect(departments, p.id).toContain(p.author);
      expect(NEWS_CATEGORIES, p.id).toContain(p.category);
    }
    for (const c of NEWS_CATEGORIES.filter((x) => x !== 'club')) expect(NEWS.some((p) => p.category === c), c).toBe(true);
    // Club introductions are written once the real clubs provide their content.
    expect(NEWS.filter((p) => p.category === 'club')).toEqual([]);
  });

  it('keeps title, summary and body within NEWS_LIMITS, with 150–450 words and at most one quote', () => {
    const L = NEWS_LIMITS;
    for (const p of NEWS) {
      const body = newsBodyText(p.body);
      expect(charCount(p.title) >= L.titleMin && charCount(p.title) <= L.titleMax, `${p.id} title`).toBe(true);
      expect(charCount(p.summary) >= L.summaryMin && charCount(p.summary) <= L.summaryMax, `${p.id} summary`).toBe(true);
      expect(charCount(body) >= L.bodyMin && charCount(body) <= L.bodyMax, `${p.id} body`).toBe(true);
      const words = body.split(/\s+/u).filter((w) => w !== '').length;
      expect(words >= 150 && words <= 450, `${p.id} has ${words} words`).toBe(true);
      const sentences = sentenceCount(p.summary);
      expect(sentences >= 1 && sentences <= 2, `${p.id} summary sentences`).toBe(true);
      expect(p.body.filter((b) => b.kind === 'quote').length, p.id).toBeLessThanOrEqual(1);
      expect(p.eventIds.length, p.id).toBeLessThanOrEqual(L.maxEvents);
    }
  });

  it('attributes every quote to a non-empty source and keeps list items unique', () => {
    for (const p of NEWS) {
      for (const b of p.body) {
        if (b.kind === 'quote') {
          expect(b.text.trim().length, p.id).toBeGreaterThan(0);
          expect(b.source.trim().length, p.id).toBeGreaterThan(0);
        }
        if (b.kind === 'list') {
          expect(b.items.length, p.id).toBeGreaterThan(0);
          expect(isUnique(b.items), p.id).toBe(true);
        }
      }
    }
  });

  it('references approved events and existing clubs, including every organiser', () => {
    for (const p of NEWS) {
      expect(isUnique(p.eventIds), p.id).toBe(true);
      expect(isUnique(p.clubIds), p.id).toBe(true);
      for (const id of p.eventIds) expect(getEvent(id).status, `${p.id} → ${id}`).toBe('approved');
      for (const id of p.clubIds) expect(clubById.has(id), `${p.id} → ${id}`).toBe(true);
      for (const id of p.eventIds) expect(p.clubIds, `${p.id} → ${id}`).toContain(getEvent(id).clubId);
    }
  });

  it('quotes the exact title of every referenced event', () => {
    for (const p of NEWS) {
      for (const id of p.eventIds) expect(text(p), `${p.id} → ${id}`).toContain(getEvent(id).title);
    }
  });

  it('recaps in activity articles only events that ended before publication', () => {
    for (const p of NEWS.filter((post) => post.category === 'activity')) {
      expect(p.eventIds.length, p.id).toBeGreaterThan(0);
      for (const id of p.eventIds) expect(eventEnd(getEvent(id)) < ms(p.publishedAt), `${p.id} → ${id}`).toBe(true);
    }
  });

  it('announces upcoming events before their deadline with the exact date, time, place and deadline', () => {
    for (const p of NEWS.filter((post) => post.category === 'announcement')) {
      const upcoming = p.eventIds.map(getEvent).filter((e) => eventStart(e) > ms(p.publishedAt));
      expect(upcoming.length, p.id).toBeGreaterThan(0);
      const body = newsBodyText(p.body);
      for (const e of upcoming) {
        const deadline = ms(e.registrationDeadline);
        expect(ms(p.publishedAt) < deadline, `${p.id} → ${e.id}`).toBe(true);
        for (const fact of [formatDate(eventStart(e)), formatTime(eventStart(e)), formatTime(eventEnd(e)), e.location, formatDate(deadline), formatTime(deadline)]) {
          expect(body, `${p.id} → ${e.id}`).toContain(fact);
        }
      }
    }
  });

  it('gives exam and holiday periods the dates of the school calendar', () => {
    for (const p of NEWS) {
      for (const period of PERIODS.filter((x) => text(p).includes(x.label))) {
        expect(text(p), `${p.id} → ${period.id}`).toContain(formatDate(ms(period.start)));
        expect(text(p), `${p.id} → ${period.id}`).toContain(formatDate(ms(period.end)));
      }
    }
  });

  it('publishes inside the school year, with one pinned article visible on 07/10 and one scheduled after 08/10', () => {
    const yearStart = ms(SCHOOL_YEAR.start);
    const yearEnd = addDays(ms(SCHOOL_YEAR.end), 1);
    for (const p of NEWS) expect(ms(p.publishedAt) >= yearStart && ms(p.publishedAt) < yearEnd, p.id).toBe(true);

    const visible = publishedPosts(NEWS, VISIBLE_AT);
    expect(visible.filter((p) => p.pinned === true)).toHaveLength(1);
    expect(NEWS.filter((p) => p.pinned === true)).toHaveLength(1);
    for (const p of visible) {
      expect(ms(p.publishedAt) >= ms('2026-09-03') && ms(p.publishedAt) <= ms('2026-10-07T07:00:00+07:00'), p.id).toBe(true);
    }

    const scheduled = NEWS.filter((p) => ms(p.publishedAt) > ms('2026-10-08'));
    expect(scheduled).toHaveLength(1);
    expect(visible.length + scheduled.length).toBe(NEWS.length);
    expect(ms(scheduled[0]!.publishedAt) < ms('2026-11-01')).toBe(true);
  });

  it('uses no banned copy and stores every string NFC-normalised', () => {
    const all = collectStrings(NEWS, 'NEWS', []);
    const violations = all.flatMap(({ path, text: s }) => copyViolations(s).map((label) => `${path}: ${label}`));
    expect(violations).toEqual([]);
    for (const p of NEWS) {
      for (const s of collectStrings(p, p.id, [])) expect(s.text.includes('!'), s.path).toBe(false);
    }
    const raw = JSON.stringify(NEWS);
    expect(raw).toBe(raw.normalize('NFC'));
  });
});

describe('proposals', () => {
  const clubIds = new Set(CLUBS.map((c) => c.id));
  const all = [...ACTIVITY_PROPOSALS, ...COLLABORATIONS];

  it('uses unique, patterned ids', () => {
    expect(new Set(all.map((p) => p.id)).size).toBe(all.length);
    for (const p of ACTIVITY_PROPOSALS) expect(p.id).toMatch(/^dx-\d{3}$/);
    for (const p of COLLABORATIONS) expect(p.id).toMatch(/^ht-\d{3}$/);
  });

  it('holds valid, anonymous student proposals sent before the demo date', () => {
    for (const p of ACTIVITY_PROPOSALS) {
      expect(validateActivityDraft(p, clubIds), p.id).toEqual({});
      expect(p.grades, p.id).toEqual([...new Set(p.grades)].sort((a, b) => a - b));
      expect(GRADES.includes(p.authorGrade), p.id).toBe(true);
      expect(p.supporters, p.id).toBeGreaterThanOrEqual(0);
      expect(ms(p.submittedAt) < DEMO_TODAY && ms(p.submittedAt) >= ms(SCHOOL_YEAR.start), p.id).toBe(true);
      expect(hasContactDetails(`${p.title} ${p.description}`), p.id).toBe(false);
    }
    // Every grade band is represented; no sample proposal names a club, since the clubs are real.
    expect(ACTIVITY_PROPOSALS.some((p) => p.grades.every((g) => g <= 9))).toBe(true);
    expect(ACTIVITY_PROPOSALS.every((p) => p.clubId === null)).toBe(true);
  });

  it('holds no collaboration: nothing is sent or answered in the name of a real club', () => {
    expect(COLLABORATIONS).toEqual([]);
  });

  it('answers each proposal at most once, by the right party, after it was sent', () => {
    for (const [id, r] of Object.entries(PROPOSAL_RESPONSES)) {
      const activity = ACTIVITY_PROPOSALS.find((p) => p.id === id);
      const collab = COLLABORATIONS.find((p) => p.id === id);
      expect(activity ?? collab, id).toBeDefined();
      expect(r.by, id).toBe(activity ? 'hdhs' : collab?.toClubId);
      expect(responseError(r.status, r.note), id).toBeNull();
      expect(ms(r.at) > ms((activity ?? collab)?.submittedAt ?? '') && ms(r.at) < DEMO_TODAY, id).toBe(true);
      expect(r.assignedClubId, id).toBeNull();
    }
    const statuses = new Set(Object.values(PROPOSAL_RESPONSES).map((r) => r.status));
    expect(statuses).toEqual(new Set(['accepted', 'declined']));
    expect(ACTIVITY_PROPOSALS.filter((p) => PROPOSAL_RESPONSES[p.id] === undefined).length).toBeGreaterThanOrEqual(3);
  });
});
