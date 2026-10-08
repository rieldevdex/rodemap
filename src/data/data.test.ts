import { describe, expect, it } from 'vitest';
import { addDays, formatDate, formatTime, isoWeekKey, overlaps, SCHOOL_YEAR, toMillis, vnParts } from '../domain/dates';
import { AFTER_SCHOOL_MINUTE, eventEnd, eventHours, eventStart } from '../domain/events';
import { applyReview, canTransition, charCount } from '../domain/moderation';
import { NEWS_LIMITS, newsBodyText, publishedPosts, RESERVED_NEWS_SLUGS } from '../domain/news';
import { CATEGORY_CODES, NEWS_CATEGORIES, type EventStatus, type NewsPost, type SchoolEvent, type Submission } from '../domain/types';
import { PERIODS } from './calendar';
import { CATEGORIES, categoryByCode } from './categories';
import { CLUBS } from './clubs';
import { EVENTS } from './events';
import { GOALS } from './goals';
import { NEWS, NEWS_DEPARTMENTS } from './news';
import { SCHOOL } from './school';
import { SEED_PORTFOLIO, SEED_PROFILE, SEED_REGISTRATIONS, SEED_SUBMISSIONS } from './seed';
import { TAGS, tagLabel } from './tags';

const ms = toMillis;
/** "Today" in the demo (DEMO_TODAY in tests/support/app.ts). */
const DEMO_TODAY = ms('2026-10-07');
const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\+07:00$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HEADER = '// Dữ liệu minh họa phục vụ bản trình diễn. Thay thế bằng dữ liệu chính thức khi triển khai.';

const approved = EVENTS.filter((e) => e.status === 'approved');
const notApproved = EVENTS.filter((e) => e.status !== 'approved');
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
      ['calendar', 'categories', 'clubs', 'events', 'goals', 'news', 'school', 'seed', 'tags'].map((n) => `./${n}.ts`),
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
    expect(copyViolations('Thư viện, lối đi, sự thực, Rodemap, lộ trình, căn chỉnh.')).toEqual([]);
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
        SEED_SUBMISSIONS,
        NEWS,
      },
      'data',
      [],
    );
    expect(all.length).toBeGreaterThan(500);
    const violations = all.flatMap(({ path, text }) => copyViolations(text).map((label) => `${path}: ${label}`));
    expect(violations).toEqual([]);
  });

  it('stores every string NFC-normalised (precomposed diacritics)', () => {
    const raw = JSON.stringify([CATEGORIES, TAGS, GOALS, CLUBS, EVENTS, PERIODS, SEED_PORTFOLIO, SEED_SUBMISSIONS, NEWS]);
    expect(raw).toBe(raw.normalize('NFC'));
  });
});

describe('school', () => {
  it('uses the placeholder name and the 2026–2027 school year', () => {
    expect(SCHOOL).toEqual({ name: '[Tên trường]', schoolYear: '2026–2027' });
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
  it('has exactly 14 clubs with unique ids and ASCII slugs', () => {
    expect(CLUBS).toHaveLength(14);
    expect(isUnique(CLUBS.map((c) => c.id))).toBe(true);
    expect(isUnique(CLUBS.map((c) => c.slug))).toBe(true);
    for (const c of CLUBS) expect(c.slug, c.id).toMatch(SLUG);
  });

  it('includes Inkstep as the one real club, without invented product features', () => {
    const inkstep = clubById.get('inkstep');
    expect(inkstep).toMatchObject({
      slug: 'inkstep',
      name: 'Inkstep – Câu lạc bộ Phát triển Sản phẩm Học tập',
      shortName: 'Inkstep',
      categories: ['CN', 'KN'],
    });
    expect(inkstep?.description).toContain('sản phẩm học tập Eighthundred');
    expect(inkstep?.description).toContain('chia sẻ');
  });

  it('includes Hội đồng Học sinh, which organises every school-wide event', () => {
    expect(clubById.get('hdhs')).toMatchObject({ name: 'Hội đồng Học sinh', shortName: 'HĐHS', categories: ['TS', 'KN'] });
    for (const e of EVENTS.filter((ev) => ev.category === 'TS')) expect(e.clubId, e.id).toBe('hdhs');
  });

  it('has valid categories, a placeholder contact and a two-sentence description', () => {
    for (const c of CLUBS) {
      expect(c.categories.length, c.id).toBeGreaterThan(0);
      for (const code of c.categories) expect(CATEGORY_CODES, c.id).toContain(code);
      expect(c.contact, c.id).toMatch(/^\[.+\]$/u);
      expect(sentenceCount(c.description), c.id).toBe(2);
    }
  });

  it('every club has at least one approved event', () => {
    for (const c of CLUBS) expect(approved.some((e) => e.clubId === c.id), c.id).toBe(true);
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
  it('has 45 approved events and 5 in moderation (3 pending, 1 changes requested, 1 rejected)', () => {
    expect(EVENTS).toHaveLength(50);
    expect(approved).toHaveLength(45);
    const count = (s: EventStatus) => EVENTS.filter((e) => e.status === s).length;
    expect(count('pending')).toBe(3);
    expect(count('changes_requested')).toBe(1);
    expect(count('rejected')).toBe(1);
    expect(count('draft')).toBe(0);
  });

  it('uses ids ev-001 … ev-050 (approved ones first, in chronological order) and unique ASCII slugs', () => {
    expect(EVENTS.map((e) => e.id)).toEqual(Array.from({ length: 50 }, (_, i) => `ev-${String(i + 1).padStart(3, '0')}`));
    expect(EVENTS.slice(0, 45).every((e) => e.status === 'approved')).toBe(true);
    approved.slice(1).forEach((e, i) => {
      const prev = approved[i]!;
      expect(eventStart(prev) <= eventStart(e), `${prev.id} before ${e.id}`).toBe(true);
    });
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
      expect(eventEnd(e) - eventStart(e) <= 12 * 60 * 60 * 1000, e.id).toBe(true);
      const deadline = ms(e.registrationDeadline);
      expect(deadline <= eventStart(e), e.id).toBe(true);
      expect(eventStart(e) - deadline <= 7 * 24 * 60 * 60 * 1000, e.id).toBe(true);
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

  it('schedules club events on weekdays only after school (school-wide events may use school hours)', () => {
    for (const e of EVENTS.filter((ev) => ev.category !== 'TS')) {
      const p = vnParts(eventStart(e));
      const weekend = p.weekday === 0 || p.weekday === 6;
      if (!weekend) expect(p.hour * 60 + p.minute >= AFTER_SCHOOL_MINUTE, e.id).toBe(true);
    }
  });

  it('has sensible seats: 20–600 capacity, seatsTaken ≤ capacity, no seats taken while in moderation', () => {
    for (const e of EVENTS) {
      expect(e.capacity >= 20 && e.capacity <= 600, e.id).toBe(true);
      expect(e.seatsTaken >= 0 && e.seatsTaken <= e.capacity, e.id).toBe(true);
      expect(Number.isInteger(e.seatsTaken), e.id).toBe(true);
    }
    for (const e of notApproved) expect(e.seatsTaken, e.id).toBe(0);
  });

  it('has formal copy of the expected length', () => {
    for (const e of EVENTS) {
      expect(e.title.length >= 8 && e.title.length <= 120, e.id).toBe(true);
      expect(e.summary.length >= 40 && e.summary.length <= 400, `${e.id} summary ${e.summary.length}`).toBe(true);
      const summarySentences = sentenceCount(e.summary);
      expect(summarySentences >= 2 && summarySentences <= 3, `${e.id} summary sentences`).toBe(true);
      expect(e.description.length, e.id).toBeGreaterThanOrEqual(120);
      expect(sentenceCount(e.description), e.id).toBeGreaterThanOrEqual(2);
      expect(e.location.trim().length, e.id).toBeGreaterThan(0);
      expect(e.eligibleGrades.length, e.id).toBeGreaterThan(0);
    }
  });

  it('describes Eighthundred only as "sản phẩm học tập Eighthundred"', () => {
    for (const { path, text } of collectStrings({ EVENTS, CLUBS }, 'data', [])) {
      const mentions = text.match(/Eighthundred/gu)?.length ?? 0;
      const formal = text.match(/sản phẩm(?: học tập)? Eighthundred/gu)?.length ?? 0;
      expect(formal, path).toBe(mentions);
    }
  });
});

describe('events: distribution for the demo', () => {
  it('has at least 4 approved events per category', () => {
    for (const code of CATEGORY_CODES) {
      expect(approved.filter((e) => e.category === code).length, code).toBeGreaterThanOrEqual(4);
    }
  });

  it('has at least 6 approved events in September 2026', () => {
    expect(approved.filter((e) => startsIn(e, '2026-09-01', '2026-10-01')).length).toBeGreaterThanOrEqual(6);
  });

  it('has at least 10 approved events between 08/10 and 01/11, 4 of them closing registration that week', () => {
    expect(approved.filter((e) => startsIn(e, '2026-10-08', '2026-11-02')).length).toBeGreaterThanOrEqual(10);
    const closing = approved.filter((e) => {
      const d = ms(e.registrationDeadline);
      return d >= ms('2026-10-08') && d < ms('2026-10-15');
    });
    expect(closing.length).toBeGreaterThanOrEqual(4);
  });

  it('includes the school-wide milestones organised by HĐHS', () => {
    const ts = approved.filter((e) => e.category === 'TS');
    const opening = ts.find((e) => e.title.startsWith('Lễ khai giảng'));
    expect(opening?.start).toBe('2026-09-05T07:00:00+07:00');
    expect(opening?.end).toBe('2026-09-05T09:30:00+07:00');
    expect(ts.some((e) => e.title.startsWith('Ngày hội Câu lạc bộ'))).toBe(true);
    expect(ts.some((e) => e.title.startsWith('Hội trại truyền thống') && e.start.startsWith('2027-03-26'))).toBe(true);
    expect(ts.some((e) => e.title.startsWith('Lễ tri ân và trưởng thành') && e.start.startsWith('2027-05'))).toBe(true);
  });

  it('has at least 6 online events', () => {
    const online = approved.filter((e) => e.format === 'online');
    expect(online.length).toBeGreaterThanOrEqual(6);
    for (const e of online) expect(e.location, e.id).toMatch(/^Trực tuyến – /u);
    for (const e of EVENTS.filter((ev) => ev.format === 'in_person')) expect(e.location, e.id).not.toMatch(/Trực tuyến/u);
  });

  it('has at least 3 upcoming events with ≤ 5 seats left and exactly one full event', () => {
    const few = approved.filter((e) => {
      const left = e.capacity - e.seatsTaken;
      return left >= 1 && left <= 5 && eventStart(e) > DEMO_TODAY;
    });
    expect(few.length).toBeGreaterThanOrEqual(3);
    const full = EVENTS.filter((e) => e.seatsTaken === e.capacity);
    expect(full).toHaveLength(1);
    expect(full[0]?.status).toBe('approved');
    expect(eventStart(full[0]!) > DEMO_TODAY).toBe(true);
  });

  it('has a few grade-restricted events', () => {
    const restricted = approved.filter((e) => e.eligibleGrades.length < 3);
    expect(restricted.length).toBeGreaterThanOrEqual(3);
    expect(restricted.some((e) => !e.eligibleGrades.includes(11) && eventStart(e) > DEMO_TODAY)).toBe(true);
  });

  it('has at least 2 pairs of overlapping approved events in October–November 2026', () => {
    const autumn = approved.filter((e) => startsIn(e, '2026-10-01', '2026-12-01'));
    let pairs = 0;
    autumn.forEach((a, i) => {
      for (const b of autumn.slice(i + 1)) {
        if (overlaps(eventStart(a), eventEnd(a), eventStart(b), eventEnd(b))) pairs += 1;
      }
    });
    expect(pairs).toBeGreaterThanOrEqual(2);
  });

  it('gives Inkstep at least 3 approved events, including the Eighthundred sharing session', () => {
    const inkstep = approved.filter((e) => e.clubId === 'inkstep');
    expect(inkstep.length).toBeGreaterThanOrEqual(3);
    expect(inkstep.some((e) => e.title === 'Buổi chia sẻ: Quy trình phát triển sản phẩm Eighthundred')).toBe(true);
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
      onboardedAt: '2026-09-20T20:00:00+07:00',
    });
    for (const c of SEED_PROFILE.topInterests) expect(SEED_PROFILE.interests).toContain(c);
  });
});

describe('seed registrations', () => {
  const byStatus = (s: string) => SEED_REGISTRATIONS.filter((r) => r.status === s).map((r) => getEvent(r.eventId));

  it('reference approved events once each, registered before the deadline and after onboarding', () => {
    expect(isUnique(SEED_REGISTRATIONS.map((r) => r.eventId))).toBe(true);
    for (const r of SEED_REGISTRATIONS) {
      const e = getEvent(r.eventId);
      expect(e.status, r.eventId).toBe('approved');
      expect(r.registeredAt, r.eventId).toMatch(ISO_DATE_TIME);
      expect(ms(r.registeredAt) <= ms(e.registrationDeadline), r.eventId).toBe(true);
      expect(ms(r.registeredAt) >= ms(SEED_PROFILE.onboardedAt), r.eventId).toBe(true);
      expect(ms(r.registeredAt) < DEMO_TODAY, r.eventId).toBe(true);
      expect(e.eligibleGrades, r.eventId).toContain(SEED_PROFILE.grade);
    }
  });

  it('has 3 attended September events in CN, TN and HT', () => {
    const attended = byStatus('attended');
    expect(attended).toHaveLength(3);
    expect(attended.map((e) => e.category).sort()).toEqual(['CN', 'HT', 'TN']);
    for (const e of attended) {
      expect(startsIn(e, '2026-09-01', '2026-10-01'), e.id).toBe(true);
      expect(eventEnd(e) < DEMO_TODAY, e.id).toBe(true);
    }
  });

  it('has 1 past registration awaiting attendance and 2 upcoming ones after 08/10', () => {
    const registered = byStatus('registered');
    expect(registered).toHaveLength(3);
    const past = registered.filter((e) => eventEnd(e) < DEMO_TODAY);
    const upcoming = registered.filter((e) => eventStart(e) >= ms('2026-10-08'));
    expect(past).toHaveLength(1);
    expect(upcoming).toHaveLength(2);
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
    expect(SEED_PORTFOLIO.map((p) => p.id)).toEqual(['pf-001', 'pf-002', 'pf-003']);
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

describe('seed submissions', () => {
  it('back every non-approved event with exactly one submission and nothing else', () => {
    expect(isUnique(SEED_SUBMISSIONS.map((s) => s.id))).toBe(true);
    for (const s of SEED_SUBMISSIONS) expect(getEvent(s.eventId).status, s.id).not.toBe('approved');
    for (const e of notApproved) expect(SEED_SUBMISSIONS.filter((s) => s.eventId === e.id), e.id).toHaveLength(1);
  });

  it('replays to the event status through the moderation workflow', () => {
    for (const e of notApproved) {
      const sub = SEED_SUBMISSIONS.find((s) => s.eventId === e.id)!;
      expect(sub.clubId, sub.id).toBe(e.clubId);
      expect(sub.history[0]?.at, sub.id).toBe(sub.submittedAt);
      expect(ms(sub.submittedAt) < DEMO_TODAY, sub.id).toBe(true);

      let status: EventStatus = 'draft';
      let replay: Submission = { ...sub, history: [] };
      let previousAt = -Infinity;
      for (const note of sub.history) {
        expect(note.at, sub.id).toMatch(ISO_DATE_TIME);
        expect(ms(note.at) >= previousAt, sub.id).toBe(true);
        previousAt = ms(note.at);
        expect(canTransition(status, note.action), `${sub.id}: ${note.action} from ${status}`).toBe(true);
        const result = applyReview(replay, status, note.action, note.at, note.reason);
        replay = result.submission;
        status = result.status;
      }
      expect(status, sub.id).toBe(e.status);
      expect(replay.history, sub.id).toEqual(sub.history);
    }
  });
});

describe('news', () => {
  const ids = (posts: readonly NewsPost[]) => posts.map((p) => p.id);
  const text = (p: NewsPost) => `${p.title}\n${p.summary}\n${newsBodyText(p.body)}`;
  const departments: readonly string[] = NEWS_DEPARTMENTS;
  const VISIBLE_AT = ms('2026-10-07T09:00:00+07:00');
  const ASCII_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  it('has 9–10 articles with ids bt-NNN in chronological order of publication', () => {
    expect(NEWS.length).toBeGreaterThanOrEqual(9);
    expect(NEWS.length).toBeLessThanOrEqual(10);
    expect(ids(NEWS)).toEqual(Array.from({ length: NEWS.length }, (_, i) => `bt-${String(i + 1).padStart(3, '0')}`));
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

  it('is signed by a council department and covers every category', () => {
    for (const p of NEWS) {
      expect(departments, p.id).toContain(p.author);
      expect(NEWS_CATEGORIES, p.id).toContain(p.category);
    }
    for (const c of NEWS_CATEGORIES) expect(NEWS.some((p) => p.category === c), c).toBe(true);
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
      if (p.category === 'club') {
        expect(p.clubIds.length, p.id).toBeGreaterThan(0);
        expect(p.clubIds, p.id).not.toContain('inkstep');
      }
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
