import { describe, expect, it } from 'vitest';
import { toMillis } from './dates';
import {
  DEADLINE_SOON_DAYS,
  DEFAULT_RECOMMEND_LIMIT,
  FEW_SEATS_THRESHOLD,
  recommendEvents,
  type RecommendContext,
} from './recommend';
import { makeEvent, makeProfile, reg } from './test-fixtures';
import type { Goal, Recommendation, SchoolEvent } from './types';

/** Thursday 01/10/2026 09:00; the fixture deadline (12/10 23:59) is 11 days away. */
const now = toMillis('2026-10-01T09:00:00+07:00');

const GOALS: Goal[] = [
  { id: 'technology', label: 'Phát triển năng lực công nghệ', tags: ['lap-trinh', 'robot'] },
  { id: 'leadership', label: 'Phát triển kỹ năng lãnh đạo', tags: ['lanh-dao'] },
  { id: 'volunteering', label: 'Tham gia hoạt động tình nguyện', tags: ['tinh-nguyen'] },
];

const ctxWith = (overrides: Partial<RecommendContext> = {}): RecommendContext => ({
  profile: makeProfile(),
  plan: [],
  regs: [],
  now,
  goals: GOALS,
  ...overrides,
});

const ev = (id: string, start: string, end: string, extra: Partial<SchoolEvent> = {}): SchoolEvent =>
  makeEvent({ id, start: `${start}:00+07:00`, end: `${end}:00+07:00`, ...extra });

const ids = (recs: Recommendation[]): string[] => recs.map((r) => r.event.id);
const byId = (recs: Recommendation[], id: string): Recommendation => {
  const rec = recs.find((r) => r.event.id === id);
  if (!rec) throw new Error(`missing ${id}`);
  return rec;
};

describe('recommendEvents: hard filters', () => {
  const ok = ev('h-ok', '2026-10-14T16:45', '2026-10-14T18:15');
  const pending = ev('h-pending', '2026-10-14T16:45', '2026-10-14T18:15', { status: 'pending' });
  const rejected = ev('h-rejected', '2026-10-14T16:45', '2026-10-14T18:15', { status: 'rejected' });
  const past = ev('h-past', '2026-09-30T08:00', '2026-09-30T10:00');
  const closed = ev('h-closed', '2026-10-14T16:45', '2026-10-14T18:15', {
    registrationDeadline: '2026-10-01T08:59:00+07:00',
  });
  const registered = ev('h-registered', '2026-10-14T16:45', '2026-10-14T18:15');
  const attended = ev('h-attended', '2026-10-14T16:45', '2026-10-14T18:15');
  const absent = ev('h-absent', '2026-10-14T16:45', '2026-10-14T18:15');
  const planned = ev('h-planned', '2026-10-21T16:45', '2026-10-21T18:15');
  const ineligible = ev('h-ineligible', '2026-10-14T16:45', '2026-10-14T18:15', { eligibleGrades: [12] });
  const full = ev('h-full', '2026-10-14T16:45', '2026-10-14T18:15', { capacity: 10, seatsTaken: 10 });
  const all = [full, ineligible, planned, absent, attended, registered, closed, past, rejected, pending, ok];
  const regs = [reg('h-registered'), reg('h-attended', 'attended'), reg('h-absent', 'absent')];

  it('keeps only approved, upcoming, open, unregistered, unplanned, eligible events with seats', () => {
    const recs = recommendEvents(all, ctxWith({ regs, plan: [planned] }), { limit: 20 });
    expect(ids(recs).sort()).toEqual(['h-absent', 'h-ok']);
  });

  it('ignores grade eligibility without a profile', () => {
    const recs = recommendEvents(all, ctxWith({ profile: null, regs, plan: [planned] }), { limit: 20 });
    expect(ids(recs)).toEqual(['h-absent', 'h-ineligible', 'h-ok']);
  });

  it('returns nothing for empty input', () => {
    expect(recommendEvents([], ctxWith())).toEqual([]);
    expect(recommendEvents([], ctxWith({ profile: null }))).toEqual([]);
  });
});

describe('recommendEvents: scoring and reasons', () => {
  const profile = makeProfile({
    interests: ['CN', 'HT', 'TN', 'NT'],
    topInterests: ['CN', 'HT', 'TN'],
    goals: ['technology'],
  });
  // One plan event in CN, HT and TN (week 43): NT has the lowest count (0) among the interests.
  const plan = [
    ev('p-cn', '2026-10-20T17:00', '2026-10-20T18:00', { category: 'CN' }),
    ev('p-ht', '2026-10-21T17:00', '2026-10-21T18:00', { category: 'HT' }),
    ev('p-tn', '2026-10-22T17:00', '2026-10-22T18:00', { category: 'TN' }),
  ];
  const events = [
    ev('r-other', '2026-10-15T17:00', '2026-10-15T18:30', { category: 'TT' }),
    ev('r-top3', '2026-10-14T16:45', '2026-10-14T18:15', { category: 'TN' }),
    ev('r-interest', '2026-10-14T16:45', '2026-10-14T18:15', { category: 'NT' }),
    ev('r-goal', '2026-10-13T17:00', '2026-10-13T18:30', { category: 'KN', tags: ['lap-trinh'] }),
    ev('r-top2', '2026-10-14T16:45', '2026-10-14T18:15', { category: 'HT' }),
    ev('r-top1', '2026-10-14T16:45', '2026-10-14T18:15', { category: 'CN' }),
  ];
  const recs = recommendEvents(events, ctxWith({ profile, plan }), { limit: 10 });

  it('orders by score, then start, then id', () => {
    expect(recs.map((r) => [r.event.id, r.score])).toEqual([
      ['r-top1', 7],
      ['r-top2', 5],
      ['r-goal', 4],
      ['r-interest', 4],
      ['r-top3', 4],
      ['r-other', 2],
    ]);
  });

  it('scores top interests by rank and records topRank', () => {
    expect(byId(recs, 'r-top1')).toStrictEqual({
      event: events[5],
      score: 7,
      reasons: ['top_interest', 'fits_time', 'grade_eligible'],
      warnings: [],
      topRank: 1,
    });
    expect(byId(recs, 'r-top2').topRank).toBe(2);
    expect(byId(recs, 'r-top3').topRank).toBe(3);
    expect(byId(recs, 'r-top3').reasons).toEqual(['top_interest', 'fits_time', 'grade_eligible']);
  });

  it('scores other interests, goals and category balance', () => {
    expect(byId(recs, 'r-interest')).toStrictEqual({
      event: events[2],
      score: 4,
      reasons: ['interest', 'fits_time', 'balances_categories', 'grade_eligible'],
      warnings: [],
    });
    expect(byId(recs, 'r-goal')).toStrictEqual({
      event: events[3],
      score: 4,
      reasons: ['goal', 'fits_time', 'balances_categories', 'grade_eligible'],
      warnings: [],
      matchedGoals: ['technology'],
    });
    expect(byId(recs, 'r-other').reasons).toEqual(['fits_time', 'balances_categories', 'grade_eligible']);
  });

  it('applies the default limit of 5', () => {
    expect(DEFAULT_RECOMMEND_LIMIT).toBe(5);
    expect(ids(recommendEvents(events, ctxWith({ profile, plan })))).toEqual([
      'r-top1',
      'r-top2',
      'r-goal',
      'r-interest',
      'r-top3',
    ]);
  });

  it('is deterministic regardless of input order and never mutates', () => {
    const snapshot = structuredClone(events);
    const reversed = recommendEvents(Object.freeze([...events].reverse()), ctxWith({ profile, plan }), { limit: 10 });
    expect(reversed).toEqual(recs);
    expect(events).toEqual(snapshot);
  });
});

describe('recommendEvents: goals', () => {
  it('matches every goal with a shared tag, in profile order, counting points once', () => {
    const profile = makeProfile({ interests: [], topInterests: [], goals: ['leadership', 'arts', 'technology'] });
    const both = ev('g-both', '2026-10-14T16:45', '2026-10-14T18:15', { tags: ['robot', 'lanh-dao'] });
    const none = ev('g-none', '2026-10-15T16:45', '2026-10-15T18:15', { tags: ['tinh-nguyen'] });
    const recs = recommendEvents([none, both], ctxWith({ profile }));
    expect(byId(recs, 'g-both')).toMatchObject({
      score: 4,
      reasons: ['goal', 'fits_time', 'balances_categories', 'grade_eligible'],
      matchedGoals: ['leadership', 'technology'],
    });
    expect('matchedGoals' in byId(recs, 'g-none')).toBe(false);
    expect(byId(recs, 'g-none').reasons).toEqual(['fits_time', 'balances_categories', 'grade_eligible']);
  });
});

describe('recommendEvents: profile edge cases', () => {
  it('treats a top interest beyond rank 3 as a plain interest', () => {
    const profile = makeProfile({ interests: ['CN', 'HT', 'TN', 'NT'], topInterests: ['CN', 'HT', 'TN', 'NT'] });
    const [rec] = recommendEvents([ev('nt', '2026-10-14T16:45', '2026-10-14T18:15', { category: 'NT' })], ctxWith({ profile }));
    expect(rec?.reasons).toEqual(['interest', 'fits_time', 'balances_categories', 'grade_eligible']);
    expect(rec && 'topRank' in rec).toBe(false);
  });

  it('balances against categories missing from the plan when there are no interests', () => {
    const profile = makeProfile({ interests: [], topInterests: [], goals: [] });
    const plan = [ev('p-ht', '2026-10-20T17:00', '2026-10-20T18:00', { category: 'HT' })];
    const events = [
      ev('b-ht', '2026-10-14T16:45', '2026-10-14T18:15', { category: 'HT' }),
      ev('b-cn', '2026-10-15T16:45', '2026-10-15T18:15', { category: 'CN' }),
    ];
    const recs = recommendEvents(events, ctxWith({ profile, plan }));
    expect(byId(recs, 'b-ht').reasons).toEqual(['fits_time', 'grade_eligible']);
    expect(byId(recs, 'b-cn').reasons).toEqual(['fits_time', 'balances_categories', 'grade_eligible']);
  });

  it('uses the lowest interest count as the balance ceiling', () => {
    const profile = makeProfile({ interests: ['CN', 'HT'], topInterests: ['CN'], goals: [] });
    const plan = [
      ev('p-cn-1', '2026-10-20T17:00', '2026-10-20T18:00', { category: 'CN' }),
      ev('p-cn-2', '2026-10-21T17:00', '2026-10-21T18:00', { category: 'CN' }),
      ev('p-ht', '2026-10-22T17:00', '2026-10-22T18:00', { category: 'HT' }),
      ev('p-tt', '2026-10-23T17:00', '2026-10-23T18:00', { category: 'TT' }),
    ];
    const events = [
      ev('x-cn', '2026-10-14T16:45', '2026-10-14T18:15', { category: 'CN' }),
      ev('x-ht', '2026-10-14T16:45', '2026-10-14T18:15', { category: 'HT' }),
      ev('x-tt', '2026-10-14T16:45', '2026-10-14T18:15', { category: 'TT' }),
      ev('x-kn', '2026-10-14T16:45', '2026-10-14T18:15', { category: 'KN' }),
    ];
    const recs = recommendEvents(events, ctxWith({ profile, plan }));
    expect(byId(recs, 'x-cn').reasons).not.toContain('balances_categories');
    expect(byId(recs, 'x-ht').reasons).toContain('balances_categories');
    expect(byId(recs, 'x-tt').reasons).toContain('balances_categories');
    expect(byId(recs, 'x-kn').reasons).toContain('balances_categories');
  });
});

describe('recommendEvents: availability, deadlines and warnings', () => {
  const profile = makeProfile({ interests: ['CN'], topInterests: ['CN'], goals: [] });

  it('flags events outside availability (−3) and school-hours events except TS', () => {
    const weekdayOnly = makeProfile({
      interests: [],
      topInterests: [],
      goals: [],
      availability: { weekdayAfterSchool: true, weekend: false },
    });
    const events = [
      ev('a-sat', '2026-10-17T08:00', '2026-10-17T10:00', { category: 'TT' }),
      ev('a-school', '2026-10-14T08:00', '2026-10-14T10:00', { category: 'HT' }),
      ev('a-ts', '2026-10-14T08:00', '2026-10-14T10:00', { category: 'TS' }),
      ev('a-evening', '2026-10-14T16:30', '2026-10-14T18:30', { category: 'KN' }),
    ];
    const recs = recommendEvents(events, ctxWith({ profile: weekdayOnly }));
    expect(byId(recs, 'a-sat')).toMatchObject({
      score: -2,
      reasons: ['balances_categories', 'grade_eligible'],
      warnings: ['outside_availability'],
    });
    expect(byId(recs, 'a-school').warnings).toEqual(['outside_availability']);
    expect(byId(recs, 'a-ts')).toMatchObject({ score: 2, warnings: [] });
    expect(byId(recs, 'a-ts').reasons).toContain('fits_time');
    expect(byId(recs, 'a-evening').reasons).toContain('fits_time');
  });

  it('adds deadline_soon for deadlines within 7 calendar days', () => {
    expect(DEADLINE_SOON_DAYS).toBe(7);
    const events = [
      ev('d-today', '2026-10-14T16:45', '2026-10-14T18:15', { registrationDeadline: '2026-10-01T23:59:00+07:00' }),
      ev('d-7', '2026-10-14T16:45', '2026-10-14T18:15', { registrationDeadline: '2026-10-08T23:59:00+07:00' }),
      ev('d-8', '2026-10-14T16:45', '2026-10-14T18:15', { registrationDeadline: '2026-10-09T00:00:00+07:00' }),
    ];
    const recs = recommendEvents(events, ctxWith({ profile }));
    expect(byId(recs, 'd-today').reasons).toEqual([
      'fits_time',
      'balances_categories',
      'deadline_soon',
      'grade_eligible',
    ]);
    expect(byId(recs, 'd-7').score).toBe(3);
    expect(byId(recs, 'd-8').reasons).not.toContain('deadline_soon');
    expect(byId(recs, 'd-8').score).toBe(2);
  });

  it('warns about conflicts with the plan (−4)', () => {
    const plan = [ev('p', '2026-10-14T17:00', '2026-10-14T18:00', { category: 'HT' })];
    const clash = ev('c', '2026-10-14T16:45', '2026-10-14T18:15', { category: 'CN' });
    const backToBack = ev('n', '2026-10-14T18:00', '2026-10-14T19:00', { category: 'CN' });
    const recs = recommendEvents([clash, backToBack], ctxWith({ profile, plan }));
    expect(byId(recs, 'c')).toMatchObject({ score: 4, warnings: ['conflict'] });
    expect(byId(recs, 'n')).toMatchObject({ score: 8, warnings: [] });
  });

  it('warns when the weekly budget would be exceeded (−2), exact budget allowed', () => {
    const plan = [ev('p', '2026-10-17T08:00', '2026-10-17T12:30', { category: 'HT' })]; // 4.5 h in week 42
    const fits = ev('fits', '2026-10-14T16:45', '2026-10-14T18:15', { category: 'CN' }); // +1.5 → 6
    const over = ev('over', '2026-10-15T16:45', '2026-10-15T18:30', { category: 'CN' }); // +1.75 → 6.25
    const recs = recommendEvents([fits, over], ctxWith({ profile, plan }));
    expect(byId(recs, 'fits').warnings).toEqual([]);
    expect(byId(recs, 'over')).toMatchObject({ score: 6, warnings: ['over_budget'] });
    const roomy = makeProfile({ ...profile, weeklyHourBudget: 6.25 });
    expect(byId(recommendEvents([over], ctxWith({ profile: roomy, plan })), 'over').warnings).toEqual([]);
  });

  it('warns about few seats at 5 or fewer', () => {
    expect(FEW_SEATS_THRESHOLD).toBe(5);
    const five = ev('five', '2026-10-14T16:45', '2026-10-14T18:15', { capacity: 40, seatsTaken: 35 });
    const six = ev('six', '2026-10-14T16:45', '2026-10-14T18:15', { capacity: 40, seatsTaken: 34 });
    const recs = recommendEvents([five, six], ctxWith({ profile }));
    expect(byId(recs, 'five')).toMatchObject({ warnings: ['few_seats'], score: 2 });
    expect(byId(recs, 'six').warnings).toEqual([]);
  });

  it('orders warnings conflict, over_budget, outside_availability, few_seats', () => {
    const weekdayOnly = makeProfile({ availability: { weekdayAfterSchool: true, weekend: false } });
    const plan = [ev('p-sat', '2026-10-17T08:00', '2026-10-17T12:00', { category: 'HT' })];
    const worst = ev('worst', '2026-10-17T10:00', '2026-10-17T13:00', {
      category: 'TT',
      capacity: 40,
      seatsTaken: 37,
    });
    const [rec] = recommendEvents([worst], ctxWith({ profile: weekdayOnly, plan }));
    expect(rec).toStrictEqual({
      event: worst,
      score: 1 - 4 - 2 - 3,
      reasons: ['balances_categories', 'grade_eligible'],
      warnings: ['conflict', 'over_budget', 'outside_availability', 'few_seats'],
    });
  });
});

describe('recommendEvents: without a profile', () => {
  const plan = [ev('p-ht', '2026-10-20T17:00', '2026-10-20T18:00', { category: 'HT' })];
  const events = [
    ev('n-late', '2026-10-16T17:00', '2026-10-16T18:00', {
      category: 'TN',
      registrationDeadline: '2026-10-05T23:59:00+07:00',
    }),
    ev('n-school', '2026-10-14T08:00', '2026-10-14T10:00', { category: 'HT' }),
    ev('n-clash', '2026-10-20T17:30', '2026-10-20T18:30', { category: 'HT', capacity: 12, seatsTaken: 10 }),
    ev('n-long', '2026-10-24T08:00', '2026-10-24T15:00', { category: 'HT' }),
  ];
  const recs = recommendEvents(events, ctxWith({ profile: null, plan }));

  it('sorts by start, ignoring the score', () => {
    expect(ids(recs)).toEqual(['n-school', 'n-late', 'n-clash', 'n-long']);
    expect(byId(recs, 'n-late').score).toBeGreaterThan(byId(recs, 'n-school').score);
  });

  it('lists no interest, goal, time or grade reasons and no availability warning', () => {
    expect(byId(recs, 'n-school')).toStrictEqual({ event: events[1], score: 0, reasons: [], warnings: [] });
    expect(byId(recs, 'n-late').reasons).toEqual(['balances_categories', 'deadline_soon']);
  });

  it('still warns about conflicts, seats and the default 6-hour budget', () => {
    expect(byId(recs, 'n-clash').warnings).toEqual(['conflict', 'few_seats']);
    expect(byId(recs, 'n-long').warnings).toEqual(['over_budget']);
  });
});

describe('recommendEvents: options', () => {
  const days = ['12', '13', '14', '15', '16', '19', '20'];
  const events = days.map((day, i) =>
    ev(`o-${String(i + 1)}`, `2026-10-${day}T17:00`, `2026-10-${day}T18:00`, { category: i % 2 === 0 ? 'CN' : 'HT' }),
  );
  const ctx = ctxWith({ profile: null });

  it('limits the result (default 5, never negative)', () => {
    expect(recommendEvents(events, ctx)).toHaveLength(5);
    expect(ids(recommendEvents(events, ctx, { limit: 2 }))).toEqual(['o-1', 'o-2']);
    expect(recommendEvents(events, ctx, { limit: 0 })).toEqual([]);
    expect(recommendEvents(events, ctx, { limit: -3 })).toEqual([]);
    expect(recommendEvents(events, ctx, { limit: 50 })).toHaveLength(7);
  });

  it('keeps events starting in [from, to)', () => {
    const from = toMillis('2026-10-14T17:00:00+07:00');
    const to = toMillis('2026-10-19T17:00:00+07:00');
    expect(ids(recommendEvents(events, ctx, { from, to, limit: 10 }))).toEqual(['o-3', 'o-4', 'o-5']);
    expect(ids(recommendEvents(events, ctx, { from, limit: 10 }))).toEqual(['o-3', 'o-4', 'o-5', 'o-6', 'o-7']);
    expect(ids(recommendEvents(events, ctx, { to, limit: 10 }))).toEqual(['o-1', 'o-2', 'o-3', 'o-4', 'o-5']);
  });

  it('filters by category', () => {
    expect(ids(recommendEvents(events, ctx, { category: 'HT', limit: 10 }))).toEqual(['o-2', 'o-4', 'o-6']);
    expect(recommendEvents(events, ctx, { category: 'TS' })).toEqual([]);
  });
});
