import { describe, expect, it } from 'vitest';
import { toMillis } from './dates';
import { CLOSING_SOON_DAYS, countActiveFilters, filterEvents, windowRange, type EventFilter } from './filters';
import { makeEvent, reg } from './test-fixtures';
import type { Club, SchoolEvent } from './types';

/** Wednesday 14/10/2026 09:00 in Vietnam (ISO week 2026-W42). */
const now = toMillis('2026-10-14T09:00:00+07:00');

const clubs: Club[] = [
  {
    id: 'tranh-bien',
    slug: 'tranh-bien',
    name: 'Câu lạc bộ Tranh biện',
    shortName: 'CLB Tranh biện',
    description: 'Câu lạc bộ phụ trách các hoạt động tranh biện.',
    categories: ['HT'],
    contact: '[Email câu lạc bộ]',
  },
  {
    id: 'robot',
    slug: 'robot',
    name: 'Câu lạc bộ Kỹ thuật Robot',
    shortName: 'CLB Robot',
    description: 'Câu lạc bộ phụ trách các hoạt động công nghệ.',
    categories: ['CN'],
    contact: '[Email câu lạc bộ]',
  },
];

const ctx = { now, regs: [], clubs };
const ids = (events: SchoolEvent[]): string[] => events.map((e) => e.id);
const at = (iso: string, endIso: string, id: string, extra: Partial<SchoolEvent> = {}): SchoolEvent =>
  makeEvent({ id, start: iso, end: endIso, registrationDeadline: '2026-11-30T23:59:00+07:00', ...extra });

describe('windowRange', () => {
  it('returns null for all', () => {
    expect(windowRange('all', now)).toBeNull();
  });

  it('spans Monday 00:00 to the next Monday 00:00 for this and next week', () => {
    expect(windowRange('this_week', now)).toEqual({
      from: toMillis('2026-10-12T00:00:00+07:00'),
      to: toMillis('2026-10-19T00:00:00+07:00'),
    });
    expect(windowRange('next_week', now)).toEqual({
      from: toMillis('2026-10-19T00:00:00+07:00'),
      to: toMillis('2026-10-26T00:00:00+07:00'),
    });
  });

  it('uses Vietnam time on Sunday night and Monday midnight', () => {
    const sundayNight = toMillis('2026-10-18T23:59:00+07:00');
    expect(windowRange('this_week', sundayNight)?.from).toBe(toMillis('2026-10-12T00:00:00+07:00'));
    const mondayMidnight = toMillis('2026-10-19T00:00:00+07:00');
    expect(windowRange('this_week', mondayMidnight)?.from).toBe(mondayMidnight);
  });

  it('spans the calendar month and a rolling 30 days', () => {
    expect(windowRange('this_month', now)).toEqual({
      from: toMillis('2026-10-01T00:00:00+07:00'),
      to: toMillis('2026-11-01T00:00:00+07:00'),
    });
    expect(windowRange('next_30_days', now)).toEqual({ from: now, to: toMillis('2026-11-13T09:00:00+07:00') });
  });

  it('crosses the year boundary', () => {
    const dec30 = toMillis('2026-12-30T10:00:00+07:00');
    expect(windowRange('this_week', dec30)).toEqual({
      from: toMillis('2026-12-28T00:00:00+07:00'),
      to: toMillis('2027-01-04T00:00:00+07:00'),
    });
    expect(windowRange('next_week', dec30)).toEqual({
      from: toMillis('2027-01-04T00:00:00+07:00'),
      to: toMillis('2027-01-11T00:00:00+07:00'),
    });
    expect(windowRange('this_month', dec30)).toEqual({
      from: toMillis('2026-12-01T00:00:00+07:00'),
      to: toMillis('2027-01-01T00:00:00+07:00'),
    });
  });
});

describe('filterEvents: windows and past events', () => {
  const pastMonday = at('2026-10-12T08:00:00+07:00', '2026-10-12T10:00:00+07:00', 'w-past-mon');
  const ongoing = at('2026-10-12T08:00:00+07:00', '2026-10-16T17:00:00+07:00', 'w-ongoing');
  const endsNow = at('2026-10-14T07:00:00+07:00', '2026-10-14T09:00:00+07:00', 'w-ends-now');
  const startsNow = at('2026-10-14T09:00:00+07:00', '2026-10-14T10:00:00+07:00', 'w-starts-now');
  const sundayLate = at('2026-10-18T23:30:00+07:00', '2026-10-19T01:00:00+07:00', 'w-sun-late');
  const nextMonday = at('2026-10-19T00:00:00+07:00', '2026-10-19T02:00:00+07:00', 'w-next-mon');
  const nextSunday = at('2026-10-25T23:59:00+07:00', '2026-10-26T01:00:00+07:00', 'w-next-sun');
  const mondayAfter = at('2026-10-26T00:00:00+07:00', '2026-10-26T02:00:00+07:00', 'w-mon-after');
  const oct31 = at('2026-10-31T23:00:00+07:00', '2026-10-31T23:30:00+07:00', 'w-oct-31');
  const nov1 = at('2026-11-01T00:00:00+07:00', '2026-11-01T02:00:00+07:00', 'w-nov-1');
  const justInside30 = at('2026-11-13T08:59:00+07:00', '2026-11-13T10:00:00+07:00', 'w-30-in');
  const exactly30 = at('2026-11-13T09:00:00+07:00', '2026-11-13T10:00:00+07:00', 'w-30-out');
  const all = [
    exactly30,
    justInside30,
    nov1,
    oct31,
    mondayAfter,
    nextSunday,
    nextMonday,
    sundayLate,
    startsNow,
    endsNow,
    ongoing,
    pastMonday,
  ];

  it('excludes past events (end ≤ now) by default and sorts by start then id', () => {
    expect(ids(filterEvents(all, {}, ctx))).toEqual([
      'w-ongoing',
      'w-starts-now',
      'w-sun-late',
      'w-next-mon',
      'w-next-sun',
      'w-mon-after',
      'w-oct-31',
      'w-nov-1',
      'w-30-in',
      'w-30-out',
    ]);
  });

  it('includes past events on request', () => {
    const result = ids(filterEvents(all, { includePast: true, window: 'this_week' }, ctx));
    expect(result).toEqual(['w-ongoing', 'w-past-mon', 'w-ends-now', 'w-starts-now', 'w-sun-late']);
    expect(ids(filterEvents(all, { includePast: false, window: 'this_week' }, ctx))).toEqual([
      'w-ongoing',
      'w-starts-now',
      'w-sun-late',
    ]);
  });

  it('keeps events whose start is in [from, to)', () => {
    expect(ids(filterEvents(all, { window: 'next_week' }, ctx))).toEqual(['w-next-mon', 'w-next-sun']);
    expect(ids(filterEvents(all, { window: 'this_month' }, ctx))).toEqual([
      'w-ongoing',
      'w-starts-now',
      'w-sun-late',
      'w-next-mon',
      'w-next-sun',
      'w-mon-after',
      'w-oct-31',
    ]);
    expect(ids(filterEvents(all, { window: 'next_30_days' }, ctx))).toEqual([
      'w-starts-now',
      'w-sun-late',
      'w-next-mon',
      'w-next-sun',
      'w-mon-after',
      'w-oct-31',
      'w-nov-1',
      'w-30-in',
    ]);
    expect(filterEvents(all, { window: 'all' }, ctx)).toHaveLength(10);
  });

  it('handles empty input', () => {
    expect(filterEvents([], { window: 'this_week', query: 'robot' }, ctx)).toEqual([]);
  });

  it('never mutates its inputs', () => {
    const input = [nextMonday, startsNow];
    const filter: EventFilter = { categories: ['HT'], grades: [11] };
    const snapshot = structuredClone({ input, filter });
    const result = filterEvents(Object.freeze(input), Object.freeze(filter), ctx);
    expect(ids(result)).toEqual(['w-starts-now', 'w-next-mon']);
    expect(result).not.toBe(input);
    expect({ input, filter }).toEqual(snapshot);
  });
});

describe('filterEvents: query', () => {
  const speaking = makeEvent({
    id: 'q-speaking',
    title: 'Hội thảo Kỹ năng thuyết trình',
    summary: 'Rèn luyện kỹ năng trình bày trước đám đông.',
    location: 'Hội trường A',
    clubId: 'tranh-bien',
    tags: ['lanh-dao'],
    start: '2026-10-15T17:00:00+07:00',
    end: '2026-10-15T18:30:00+07:00',
  });
  const coding = makeEvent({
    id: 'q-coding',
    title: 'Cuộc thi Lập trình',
    summary: 'Học sinh giải các bài toán thuật toán theo nhóm.',
    location: 'Phòng máy 2',
    clubId: 'robot',
    tags: ['lap-trinh'],
    start: '2026-10-16T17:00:00+07:00',
    end: '2026-10-16T19:00:00+07:00',
  });
  const reading = makeEvent({
    id: 'q-reading',
    title: 'Ngày hội Đọc sách',
    summary: 'Giới thiệu các đầu sách mới của thư viện.',
    location: 'Thư viện',
    clubId: 'khong-ton-tai',
    tags: [],
    start: '2026-10-17T08:00:00+07:00',
    end: '2026-10-17T10:00:00+07:00',
  });
  const events = [reading, coding, speaking];
  const search = (query: string): string[] => ids(filterEvents(events, { query }, ctx));

  it('matches the club name and short name without diacritics or case', () => {
    expect(search('tranh bien')).toEqual(['q-speaking']);
    expect(search('TRANH BIỆN')).toEqual(['q-speaking']);
    expect(search('clb robot')).toEqual(['q-coding']);
    expect(search('kỹ thuật robot')).toEqual(['q-coding']);
  });

  it('matches title, summary, location and tag ids', () => {
    expect(search('thuyết trình')).toEqual(['q-speaking']);
    expect(search('dam dong')).toEqual(['q-speaking']);
    expect(search('phòng máy')).toEqual(['q-coding']);
    expect(search('lanh-dao')).toEqual(['q-speaking']);
    expect(search('lap trinh')).toEqual(['q-coding']);
  });

  it('requires every token, across fields', () => {
    expect(search('thuyết trình hội trường')).toEqual(['q-speaking']);
    expect(search('thuyết trình phòng máy')).toEqual([]);
  });

  it('searches events whose club is unknown by their own fields', () => {
    expect(search('doc sach')).toEqual(['q-reading']);
    expect(search('khong ton tai')).toEqual([]);
  });

  it('ignores a blank query and returns nothing for no match', () => {
    expect(search('   ')).toEqual(['q-speaking', 'q-coding', 'q-reading']);
    expect(search('thiên văn')).toEqual([]);
  });
});

describe('filterEvents: facets', () => {
  const ht = makeEvent({ id: 'f-ht', category: 'HT', clubId: 'tranh-bien', eligibleGrades: [12] });
  const cn = makeEvent({ id: 'f-cn', category: 'CN', clubId: 'robot', eligibleGrades: [10, 11], format: 'online' });
  const tn = makeEvent({ id: 'f-tn', category: 'TN', clubId: 'tinh-nguyen', eligibleGrades: [10] });
  const events = [tn, cn, ht];
  const run = (filter: EventFilter): string[] => ids(filterEvents(events, filter, ctx));

  it('filters by categories and clubs (empty arrays mean no filter)', () => {
    expect(run({ categories: ['HT', 'CN'] })).toEqual(['f-cn', 'f-ht']);
    expect(run({ categories: [] })).toEqual(['f-cn', 'f-ht', 'f-tn']);
    expect(run({ clubIds: ['robot', 'tinh-nguyen'] })).toEqual(['f-cn', 'f-tn']);
    expect(run({ clubIds: [] })).toHaveLength(3);
  });

  it('keeps events eligible for ANY selected grade', () => {
    expect(run({ grades: [11] })).toEqual(['f-cn']);
    expect(run({ grades: [11, 12] })).toEqual(['f-cn', 'f-ht']);
    expect(run({ grades: [10] })).toEqual(['f-cn', 'f-tn']);
    expect(run({ grades: [] })).toHaveLength(3);
  });

  it('filters by format', () => {
    expect(run({ format: 'online' })).toEqual(['f-cn']);
    expect(run({ format: 'in_person' })).toEqual(['f-ht', 'f-tn']);
    expect(run({ format: 'all' })).toHaveLength(3);
  });

  it('combines facets with AND', () => {
    expect(run({ categories: ['CN', 'TN'], grades: [10], format: 'in_person' })).toEqual(['f-tn']);
  });

  it('keeps only events with seats left when hasSeats is set', () => {
    const packed = makeEvent({ id: 's-packed', capacity: 10, seatsTaken: 10 });
    const lastSeatMine = makeEvent({ id: 's-mine', capacity: 11, seatsTaken: 10 });
    const roomy = makeEvent({ id: 's-roomy', capacity: 11, seatsTaken: 10 });
    const list = [packed, lastSeatMine, roomy];
    const withRegs = { ...ctx, regs: [reg('s-mine')] };
    expect(ids(filterEvents(list, { hasSeats: true }, withRegs))).toEqual(['s-roomy']);
    expect(ids(filterEvents(list, { hasSeats: false }, withRegs))).toEqual(['s-mine', 's-packed', 's-roomy']);
  });
});

describe('filterEvents: deadline', () => {
  const passed = makeEvent({ id: 'd-passed', registrationDeadline: '2026-10-14T08:00:00+07:00' });
  const today = makeEvent({ id: 'd-today', registrationDeadline: '2026-10-14T23:59:00+07:00' });
  const sevenDays = makeEvent({ id: 'd-7', registrationDeadline: '2026-10-21T23:59:00+07:00' });
  const eightDays = makeEvent({ id: 'd-8', registrationDeadline: '2026-10-22T00:00:00+07:00' });
  const events = [eightDays, sevenDays, today, passed];
  const run = (deadline: EventFilter['deadline']): string[] =>
    ids(filterEvents(events, deadline === undefined ? {} : { deadline }, ctx));

  it('keeps everything for any or unset', () => {
    expect(run('any')).toEqual(['d-7', 'd-8', 'd-passed', 'd-today']);
    expect(run(undefined)).toHaveLength(4);
  });

  it('keeps open deadlines', () => {
    expect(run('open')).toEqual(['d-7', 'd-8', 'd-today']);
  });

  it('keeps open deadlines closing within 7 calendar days', () => {
    expect(CLOSING_SOON_DAYS).toBe(7);
    expect(run('closing_7_days')).toEqual(['d-7', 'd-today']);
  });
});

describe('countActiveFilters', () => {
  it('counts nothing for an empty or default filter', () => {
    expect(countActiveFilters({})).toBe(0);
    expect(
      countActiveFilters({
        query: '   ',
        categories: [],
        clubIds: [],
        grades: [],
        window: 'all',
        format: 'all',
        hasSeats: false,
        deadline: 'any',
        includePast: false,
      }),
    ).toBe(0);
  });

  it('counts each non-default field once', () => {
    expect(
      countActiveFilters({
        query: 'robot',
        categories: ['CN', 'HT'],
        clubIds: ['robot'],
        grades: [10, 11],
        window: 'this_week',
        format: 'online',
        hasSeats: true,
        deadline: 'open',
        includePast: true,
      }),
    ).toBe(9);
    expect(countActiveFilters({ window: 'next_30_days', deadline: 'closing_7_days' })).toBe(2);
    expect(countActiveFilters({ format: 'in_person' })).toBe(1);
  });
});
