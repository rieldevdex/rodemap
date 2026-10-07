/**
 * Adversarial review of the domain layer: edge cases at time-zone, ISO-week, interval,
 * budget, scoring, planning, geometry, iCalendar, URL, portfolio, validation and slug
 * boundaries. Each block pins a contract from docs/ARCHITECTURE.md.
 */
import { describe, expect, it } from 'vitest';
import { budgetStatus, hoursByWeek, wouldExceedBudget } from './budget';
import { allConflicts, findConflicts } from './conflicts';
import { isoWeekKey, startOfIsoWeek, toIsoDateTime, toMillis } from './dates';
import { deadlineDaysLeft, fitsAvailability, isPast, seatsLeft } from './events';
import { countActiveFilters, filterEvents, windowRange } from './filters';
import { googleCalendarUrl } from './gcal';
import { buildIcs, foldLine, icsFileName } from './ics';
import { slugify, validateDraft } from './moderation';
import { firstRoute, proposePlan, type PlanContext } from './planner';
import { groupByCategory, hoursByCategory, portfolioJson, totalHours } from './portfolio';
import { recommendEvents, type RecommendContext } from './recommend';
import { MIN_STATION_GAP, layoutRoute, type RouteLayoutInput } from './route-layout';
import { makeEvent, makeProfile, reg } from './test-fixtures';
import type { Club, EventDraft, PortfolioEntry, SchoolEvent } from './types';

const vn = (local: string): number => toMillis(`${local}:00+07:00`);
const ids = (events: readonly { id: string }[]): string[] => events.map((e) => e.id);

/* ── dates: ISO weeks in Vietnam time ───────────────────────────────── */

describe('review: ISO weeks', () => {
  it('keeps Sunday late night in the same week, in Vietnam time', () => {
    expect(isoWeekKey(vn('2026-10-18T23:59'))).toBe('2026-W42');
    expect(isoWeekKey(vn('2026-10-19T00:00'))).toBe('2026-W43');
    // 17:30Z on Sunday is already Monday 00:30 in Vietnam.
    expect(isoWeekKey(toMillis('2026-10-18T17:30:00Z'))).toBe('2026-W43');
    expect(isoWeekKey(toMillis('2026-10-18T16:59:00Z'))).toBe('2026-W42');
    expect(startOfIsoWeek(vn('2026-10-18T23:59'))).toBe(vn('2026-10-12T00:00'));
  });

  it('handles the 53-week year 2026 and the boundaries around it', () => {
    expect(isoWeekKey(vn('2025-12-28T23:59'))).toBe('2025-W52');
    expect(isoWeekKey(vn('2025-12-29T00:00'))).toBe('2026-W01');
    expect(isoWeekKey(vn('2026-12-28T00:00'))).toBe('2026-W53');
    expect(isoWeekKey(vn('2027-01-01T12:00'))).toBe('2026-W53');
    expect(isoWeekKey(vn('2027-01-03T23:59'))).toBe('2026-W53');
    expect(isoWeekKey(vn('2027-01-04T00:00'))).toBe('2027-W01');
    expect(isoWeekKey(vn('2027-12-31T12:00'))).toBe('2027-W52');
    expect(isoWeekKey(vn('2028-01-02T23:59'))).toBe('2027-W52');
    expect(isoWeekKey(vn('2028-01-03T00:00'))).toBe('2028-W01');
  });
});

/* ── events ─────────────────────────────────────────────────────────── */

describe('review: events', () => {
  const open = { weekdayAfterSchool: true, weekend: false };

  it('treats 16:30 as after school and 16:29 as school hours', () => {
    expect(fitsAvailability(makeEvent({ start: '2026-10-14T16:30:00+07:00' }), open)).toBe(true);
    expect(fitsAvailability(makeEvent({ start: '2026-10-14T16:29:00+07:00' }), open)).toBe(false);
  });

  it('reads the weekday in Vietnam time (Sunday 17:30Z is Monday morning)', () => {
    const e = makeEvent({ start: '2026-10-18T17:30:00Z', category: 'TS' });
    expect(fitsAvailability(e, { weekdayAfterSchool: false, weekend: false })).toBe(true);
    const sat = makeEvent({ start: '2026-10-17T16:59:00Z' }); // Saturday 23:59
    expect(fitsAvailability(sat, { weekdayAfterSchool: true, weekend: false })).toBe(false);
  });

  it('counts deadline days in calendar days and never returns negative seats', () => {
    const e = makeEvent({ registrationDeadline: '2026-10-12T00:00:00+07:00' });
    expect(deadlineDaysLeft(e, vn('2026-10-11T23:59'))).toBe(1);
    expect(deadlineDaysLeft(e, vn('2026-10-12T00:00'))).toBe(0);
    expect(seatsLeft(makeEvent({ id: 'x', capacity: 5, seatsTaken: 9 }), [reg('x')])).toBe(0);
  });

  it('treats an event ending exactly now as past (end ≤ now)', () => {
    const e = makeEvent({ end: '2026-10-14T18:15:00+07:00' });
    expect(isPast(e, vn('2026-10-14T18:15'))).toBe(true);
    expect(isPast(e, vn('2026-10-14T18:14'))).toBe(false);
  });
});

/* ── filters ────────────────────────────────────────────────────────── */

describe('review: filters', () => {
  it('computes this_week / next_week from Sunday 23:30 in Vietnam', () => {
    const now = vn('2026-10-18T23:30');
    expect(windowRange('this_week', now)).toEqual({ from: vn('2026-10-12T00:00'), to: vn('2026-10-19T00:00') });
    expect(windowRange('next_week', now)).toEqual({ from: vn('2026-10-19T00:00'), to: vn('2026-10-26T00:00') });
  });

  it('computes this_month on the last minute of December', () => {
    expect(windowRange('this_month', vn('2026-12-31T23:59'))).toEqual({
      from: vn('2026-12-01T00:00'),
      to: vn('2027-01-01T00:00'),
    });
  });

  it('keeps an event starting exactly at the window start and drops one at the window end', () => {
    const now = vn('2026-10-14T09:00');
    const atStart = makeEvent({ id: 'a', start: '2026-10-19T00:00:00+07:00', end: '2026-10-19T01:00:00+07:00' });
    const atEnd = makeEvent({ id: 'b', start: '2026-10-26T00:00:00+07:00', end: '2026-10-26T01:00:00+07:00' });
    expect(ids(filterEvents([atStart, atEnd], { window: 'next_week' }, { now, regs: [], clubs: [] }))).toEqual(['a']);
  });

  it('does not count default-valued fields as active filters', () => {
    expect(
      countActiveFilters({ query: '  ', format: 'all', deadline: 'any', window: 'all', hasSeats: false, includePast: false }),
    ).toBe(0);
  });
});

/* ── conflicts: half-open intervals ─────────────────────────────────── */

describe('review: conflicts', () => {
  const a = makeEvent({ id: 'a', start: '2026-10-14T16:00:00+07:00', end: '2026-10-14T17:00:00+07:00' });
  const b = makeEvent({ id: 'b', start: '2026-10-14T17:00:00+07:00', end: '2026-10-14T18:00:00+07:00' });
  const c = makeEvent({ id: 'c', start: '2026-10-14T16:59:00+07:00', end: '2026-10-14T17:30:00+07:00' });
  // Same instant expressed with a different offset.
  const d = makeEvent({ id: 'd', start: '2026-10-14T09:30:00Z', end: '2026-10-14T10:30:00Z' });

  it('does not flag back-to-back events and flags a one-minute overlap', () => {
    expect(findConflicts(a, [b])).toEqual([]);
    expect(findConflicts(a, [c])).toEqual([{ a: 'a', b: 'c', overlapMinutes: 1 }]);
  });

  it('compares instants, not strings', () => {
    expect(findConflicts(a, [d])).toEqual([{ a: 'a', b: 'd', overlapMinutes: 30 }]);
  });

  it('sorts all conflicts by a then b and ignores duplicates', () => {
    expect(allConflicts([c, b, a, a, d])).toEqual([
      { a: 'a', b: 'd', overlapMinutes: 30 },
      { a: 'a', b: 'c', overlapMinutes: 1 },
      { a: 'd', b: 'c', overlapMinutes: 31 },
      { a: 'd', b: 'b', overlapMinutes: 30 },
      { a: 'c', b: 'b', overlapMinutes: 30 },
    ]);
  });
});

/* ── budget ─────────────────────────────────────────────────────────── */

describe('review: budget', () => {
  const sundayLate = makeEvent({ id: 's', start: '2026-10-18T22:00:00+07:00', end: '2026-10-18T23:45:00+07:00' });
  const monday = makeEvent({ id: 'm', start: '2026-10-19T17:00:00+07:00', end: '2026-10-19T21:15:00+07:00' });

  it('files a Sunday 22:00 event under that ISO week', () => {
    expect([...hoursByWeek([monday, sundayLate])]).toEqual([
      ['2026-W42', 1.75],
      ['2026-W43', 4.25],
    ]);
  });

  it('allows reaching the budget exactly and refuses a quarter hour more', () => {
    const plan = [makeEvent({ id: 'p', start: '2026-10-20T17:00:00+07:00', end: '2026-10-20T18:45:00+07:00' })];
    expect(wouldExceedBudget(monday, plan, 6)).toBe(false); // 4.25 + 1.75 = 6
    expect(wouldExceedBudget(monday, plan, 5.75)).toBe(true);
  });

  it('reports the week of now (Sunday night) with remaining never below 0', () => {
    expect(budgetStatus([sundayLate, monday], 1, vn('2026-10-18T23:59'))).toEqual({
      weekKey: '2026-W42',
      used: 1.75,
      budget: 1,
      remaining: 0,
    });
  });

  it('sums across the year boundary in week 2026-W53', () => {
    const dec = makeEvent({ id: 'dec', start: '2026-12-31T17:00:00+07:00', end: '2026-12-31T19:00:00+07:00' });
    const jan = makeEvent({ id: 'jan', start: '2027-01-03T08:00:00+07:00', end: '2027-01-03T11:00:00+07:00' });
    expect(Object.fromEntries(hoursByWeek([jan, dec]))).toEqual({ '2026-W53': 5 });
    expect(wouldExceedBudget(jan, [dec], 5)).toBe(false);
    expect(wouldExceedBudget(jan, [dec], 4.75)).toBe(true);
  });
});

/* ── recommend ──────────────────────────────────────────────────────── */

describe('review: recommendEvents', () => {
  const now = vn('2026-10-01T09:00');
  const ctx = (overrides: Partial<RecommendContext> = {}): RecommendContext => ({
    profile: makeProfile({
      interests: ['CN', 'HT', 'TN', 'NT'],
      topInterests: ['CN', 'HT', 'TN'],
      goals: ['technology'],
      weeklyHourBudget: 6,
    }),
    plan: [],
    regs: [],
    now,
    goals: [{ id: 'technology', label: 'Công nghệ', tags: ['lap-trinh', 'robot'] }],
    ...overrides,
  });

  it('scores exactly per the contract', () => {
    const plan = [
      makeEvent({ id: 'p1', category: 'CN', start: '2026-10-14T17:00:00+07:00', end: '2026-10-14T21:00:00+07:00' }),
    ];
    const events = [
      // top 1 (CN) +6, goal +2 (two tags, counted once), fits +1, deadline 23/10 is far, conflict −4,
      // over budget (4 + 1.5 > 6? no: 5.5) → no; CN count 1 > min 0 → no balance.
      makeEvent({
        id: 'cn',
        category: 'CN',
        tags: ['lap-trinh', 'robot'],
        start: '2026-10-14T16:45:00+07:00',
        end: '2026-10-14T18:15:00+07:00',
        registrationDeadline: '2026-10-13T23:59:00+07:00',
      }),
      // other interest NT +2, outside availability (weekday 09:00) −3, balance +1, deadline 05/10 → +1,
      // few seats (5 left).
      makeEvent({
        id: 'nt',
        category: 'NT',
        start: '2026-10-16T09:00:00+07:00',
        end: '2026-10-16T10:00:00+07:00',
        registrationDeadline: '2026-10-05T23:59:00+07:00',
        capacity: 10,
        seatsTaken: 5,
      }),
      // top 3 (TN) +3, fits +1, balance +1, over budget (4 + 3 > 6) −2 (week W42).
      makeEvent({
        id: 'tn',
        category: 'TN',
        start: '2026-10-17T08:00:00+07:00',
        end: '2026-10-17T11:00:00+07:00',
        registrationDeadline: '2026-10-15T23:59:00+07:00',
      }),
    ];
    const recs = recommendEvents(events, ctx({ plan }));
    expect(recs.map((r) => [r.event.id, r.score, r.reasons, r.warnings])).toEqual([
      ['cn', 5, ['top_interest', 'goal', 'fits_time', 'grade_eligible'], ['conflict']],
      ['tn', 3, ['top_interest', 'fits_time', 'balances_categories', 'grade_eligible'], ['over_budget']],
      ['nt', 1, ['interest', 'balances_categories', 'deadline_soon', 'grade_eligible'], ['outside_availability', 'few_seats']],
    ]);
    expect(recs[0]?.topRank).toBe(1);
    expect(recs[0]?.matchedGoals).toEqual(['technology']);
    expect(recs[1]?.topRank).toBe(3);
  });

  it('is deterministic under input permutation, breaking ties by start then id', () => {
    const same = (id: string, start: string): SchoolEvent =>
      makeEvent({ id, category: 'HT', start: `${start}:00+07:00`, end: `${start.slice(0, 11)}23:00:00+07:00` });
    const events = [
      same('b', '2026-10-20T17:00'),
      same('a', '2026-10-20T17:00'),
      same('c', '2026-10-19T17:00'),
      same('d', '2026-10-21T17:00'),
    ];
    const forward = recommendEvents(events, ctx(), { limit: 10 }).map((r) => r.event.id);
    const backward = recommendEvents([...events].reverse(), ctx(), { limit: 10 }).map((r) => r.event.id);
    expect(forward).toEqual(['c', 'a', 'b', 'd']);
    expect(backward).toEqual(forward);
  });

  it('keeps grade_eligible last and omits it without a profile', () => {
    const e = makeEvent({ id: 'x', category: 'CN', registrationDeadline: '2026-10-02T23:59:00+07:00' });
    const withProfile = recommendEvents([e], ctx())[0];
    expect(withProfile?.reasons.at(-1)).toBe('grade_eligible');
    const noProfile = recommendEvents([e], ctx({ profile: null }))[0];
    expect(noProfile?.reasons).not.toContain('grade_eligible');
    expect(noProfile?.reasons).not.toContain('top_interest');
    expect(noProfile?.warnings).not.toContain('outside_availability');
  });

  it('applies every hard filter', () => {
    const base = { start: '2026-10-14T17:00:00+07:00', end: '2026-10-14T18:00:00+07:00' };
    const events = [
      makeEvent({ ...base, id: 'ok' }),
      makeEvent({ ...base, id: 'pending', status: 'pending' }),
      makeEvent({ ...base, id: 'closed', registrationDeadline: '2026-10-01T08:59:00+07:00' }),
      makeEvent({ ...base, id: 'deadline-now', registrationDeadline: '2026-10-01T09:00:00+07:00' }),
      makeEvent({ ...base, id: 'reg' }),
      makeEvent({ ...base, id: 'absent' }),
      makeEvent({ ...base, id: 'g12', eligibleGrades: [12] }),
      makeEvent({ ...base, id: 'full', capacity: 3, seatsTaken: 3 }),
    ];
    const recs = recommendEvents(events, ctx({ regs: [reg('reg'), reg('absent', 'absent')] }), { limit: 20 });
    expect(recs.map((r) => r.event.id).sort()).toEqual(['absent', 'deadline-now', 'ok']);
  });
});

/* ── planner ────────────────────────────────────────────────────────── */

describe('review: planner', () => {
  const now = vn('2026-10-01T09:00');
  const ev = (id: string, start: string, end: string, extra: Partial<SchoolEvent> = {}): SchoolEvent =>
    makeEvent({ id, category: 'CN', start: `${start}:00+07:00`, end: `${end}:00+07:00`, ...extra });
  const planCtx = (overrides: Partial<PlanContext> = {}): PlanContext => ({
    profile: makeProfile({ weeklyHourBudget: 40 }),
    plan: [],
    regs: [],
    now,
    goals: [],
    allEvents: [],
    budget: 40,
    ...overrides,
  });

  it('picks the nearest alternative within 21 days (inclusive), then the lower id', () => {
    const accepted = ev('acc', '2026-10-14T17:00', '2026-10-14T18:00');
    const clash = ev('clash', '2026-10-14T17:30', '2026-10-14T18:30');
    const day21 = ev('alt-21', '2026-11-04T17:30', '2026-11-04T18:30');
    const day22 = ev('alt-22', '2026-11-05T17:30', '2026-11-05T18:30');
    const sameDistB = ev('alt-b', '2026-10-21T17:30', '2026-10-21T18:30');
    const sameDistA = ev('alt-a', '2026-10-07T17:30', '2026-10-07T18:30');
    const otherCat = ev('alt-cat', '2026-10-15T17:30', '2026-10-15T18:30', { category: 'HT' });
    const all = [accepted, clash, day21, day22, sameDistA, sameDistB, otherCat];
    const p1 = proposePlan([accepted, clash], planCtx({ allEvents: all }));
    expect(p1.dropped.map((d) => [d.event.id, d.reason, d.conflictWith])).toEqual([['clash', 'conflict', 'acc']]);
    expect(p1.alternatives.map((a) => [a.forEventId, a.event.id])).toEqual([['clash', 'alt-a']]);
    const p2 = proposePlan([accepted, clash], planCtx({ allEvents: [accepted, clash, day21, day22] }));
    expect(p2.alternatives.map((a) => a.event.id)).toEqual(['alt-21']);
  });

  it('firstRoute only reports drops that are consistent with the trimmed route', () => {
    // Same category and score: recommendations come in start order a, b, c, d.
    const a = ev('a', '2026-10-12T17:00', '2026-10-12T18:00');
    const b = ev('b', '2026-10-13T17:00', '2026-10-13T18:00');
    const c = ev('c', '2026-10-14T17:00', '2026-10-14T18:00');
    const d = ev('d', '2026-10-14T17:30', '2026-10-14T18:30'); // overlaps c only
    const ctx: RecommendContext = {
      profile: makeProfile({ weeklyHourBudget: 40 }),
      plan: [],
      regs: [],
      now,
      goals: [],
    };
    const route = firstRoute([a, b, c, d], ctx, 2);
    expect(ids(route.accepted)).toEqual(['a', 'b']);
    const kept = new Set([...ids(ctx.plan), ...ids(route.accepted)]);
    for (const drop of route.dropped) {
      if (drop.reason === 'conflict') expect(kept.has(drop.conflictWith ?? '')).toBe(true);
      if (drop.reason === 'over_budget') {
        expect(wouldExceedBudget(drop.event, [...ctx.plan, ...route.accepted], 40)).toBe(true);
      }
    }
  });

  it('firstRoute does not drop for budget against events trimmed from the route', () => {
    // Budget 3 h in week W42: a (1 h), b (1 h) accepted; c (1 h) accepted; d (1 h) over budget.
    const a = ev('a', '2026-10-12T17:00', '2026-10-12T18:00');
    const b = ev('b', '2026-10-13T17:00', '2026-10-13T18:00');
    const c = ev('c', '2026-10-14T17:00', '2026-10-14T18:00');
    const d = ev('d', '2026-10-15T17:00', '2026-10-15T18:00');
    const ctx: RecommendContext = {
      profile: makeProfile({ weeklyHourBudget: 3, interests: ['CN'], topInterests: ['CN'] }),
      plan: [],
      regs: [],
      now,
      goals: [],
    };
    const route = firstRoute([a, b, c, d], ctx, 2);
    expect(ids(route.accepted)).toEqual(['a', 'b']);
    expect(route.dropped.filter((x) => x.reason === 'over_budget').map((x) => x.event.id)).toEqual([]);
  });

  it('firstRoute keeps drops that still hold after trimming, with their alternatives', () => {
    const soon = { registrationDeadline: '2026-10-05T23:59:00+07:00' }; // deadline_soon +1
    const late = { registrationDeadline: '2026-10-25T23:59:00+07:00' };
    const p = ev('p', '2026-10-22T17:30', '2026-10-22T18:30', { category: 'HT' });
    const a = ev('a', '2026-10-12T17:00', '2026-10-12T18:00', soon);
    const b = ev('b', '2026-10-13T17:00', '2026-10-13T18:00', soon);
    const c = ev('c', '2026-10-14T17:00', '2026-10-14T18:00', soon);
    const f = ev('f', '2026-10-20T17:00', '2026-10-20T18:00', soon); // accepted, then trimmed
    const d = ev('d', '2026-10-20T17:30', '2026-10-20T18:30', soon); // clashes with f only
    const e = ev('e', '2026-10-22T17:00', '2026-10-22T18:00', soon); // clashes with the plan (−4)
    // School-hours alternatives rank below every candidate (outside availability).
    const altD = ev('alt-d', '2026-10-27T09:00', '2026-10-27T10:00', late);
    const altE = ev('alt-e', '2026-10-29T09:00', '2026-10-29T10:00', late);
    const ctx: RecommendContext = {
      profile: makeProfile({ weeklyHourBudget: 40 }),
      plan: [p],
      regs: [reg('p')],
      now,
      goals: [],
    };
    const route = firstRoute([altE, altD, e, d, f, c, b, a, p], ctx, 3);
    expect(ids(route.accepted)).toEqual(['a', 'b', 'c']);
    expect(route.dropped).toEqual([{ event: e, reason: 'conflict', conflictWith: 'p' }]);
    expect(route.alternatives).toEqual([{ forEventId: 'e', event: altE }]);
    expect(route.hoursByWeek).toEqual({ '2026-W42': 3, '2026-W43': 1 });
  });
});

/* ── route layout ───────────────────────────────────────────────────── */

describe('review: route layout geometry', () => {
  const ev = (id: string, category: SchoolEvent['category'], start: string): SchoolEvent =>
    makeEvent({ id, category, start: `${start}:00+07:00`, end: `${start}:00+07:00` });
  const base: RouteLayoutInput = {
    events: [
      ev('a', 'HT', '2026-09-03T08:00'),
      ev('b', 'TN', '2026-09-12T08:00'),
      ev('c', 'CN', '2026-09-25T08:00'),
      ev('d', 'HT', '2026-10-05T08:00'),
    ],
    myEventIds: ['a', 'b', 'c', 'd'],
    periods: [],
    range: { from: toMillis('2026-09-15'), to: toMillis('2026-11-10') },
    orientation: 'horizontal',
    pxPerDay: 7.3,
    laneGap: 30,
    padding: { start: 16, end: 16, cross: 20 },
    categories: ['HT', 'CN', 'TN'],
    now: toMillis('2026-09-15'),
  };

  /** Parses "M x y L x y …" into points. */
  const points = (d: string): { x: number; y: number }[] =>
    d
      .split(/\s*[ML]\s*/)
      .filter(Boolean)
      .map((pair) => {
        const [x = Number.NaN, y = Number.NaN] = pair.split(' ').map(Number);
        return { x, y };
      });

  const assertTransitPath = (d: string, timeAxis: 'x' | 'y'): void => {
    const pts = points(d);
    for (let i = 1; i < pts.length; i += 1) {
      const p = pts[i]!;
      const q = pts[i - 1]!;
      const dx = Math.abs(p.x - q.x);
      const dy = Math.abs(p.y - q.y);
      const run = timeAxis === 'x' ? dy < 0.05 : dx < 0.05;
      const diagonal = Math.abs(dx - dy) < 0.15;
      expect(run || diagonal, `segment ${i}: ${JSON.stringify(q)} → ${JSON.stringify(p)}`).toBe(true);
    }
  };

  it('draws runs along the time axis and 45° bends, horizontally and vertically', () => {
    const wide = { ...base, range: { from: toMillis('2026-09-01'), to: toMillis('2026-11-10') } };
    const h = layoutRoute(wide);
    const v = layoutRoute({ ...wide, orientation: 'vertical' });
    expect(points(h.myRoute.d).length).toBeGreaterThan(4);
    assertTransitPath(h.myRoute.d, 'x');
    assertTransitPath(v.myRoute.d, 'y');
    // Vertical is the horizontal layout mirrored across the diagonal.
    expect(v.width).toBe(h.height);
    expect(v.height).toBe(h.width);
    expect(v.stations.map((s) => [s.x, s.y])).toEqual(h.stations.map((s) => [s.y, s.x]));
    expect(v.myRoute.length).toBe(h.myRoute.length);
  });

  it('nudges same-lane stations ≥ 12 apart along the time axis, preserving order', () => {
    const events = ['e', 'b', 'd', 'a', 'c'].map((id) => ev(id, 'HT', '2026-09-20T10:00'));
    for (const orientation of ['horizontal', 'vertical'] as const) {
      const layout = layoutRoute({ ...base, events, myEventIds: [], orientation });
      expect(layout.stations.map((s) => s.eventId)).toEqual(['a', 'b', 'c', 'd', 'e']);
      const times = layout.stations.map((s) => (orientation === 'horizontal' ? s.x : s.y));
      for (let i = 1; i < times.length; i += 1) {
        expect(times[i]! - times[i - 1]!).toBeGreaterThanOrEqual(MIN_STATION_GAP - 1e-9);
      }
    }
  });

  it('clips months to the range and returns null for today outside [from, to)', () => {
    const layout = layoutRoute(base);
    expect(layout.months.map((m) => [m.short, m.from, m.to, m.index])).toEqual([
      ['T9', 16, 132.8], // 16 + 16 days × 7.3
      ['T10', 132.8, 359.1], // + 31 days
      ['T11', 359.1, 424.8], // + 9 days, clipped at 10/11
    ].map(([s, f, t], i) => [s, f, t, i]));
    expect(layout.today).toBe(16);
    expect(layoutRoute({ ...base, now: base.range.to }).today).toBeNull();
    expect(layoutRoute({ ...base, now: base.range.from - 1 }).today).toBeNull();
  });

  it('clips periods and keeps their inclusive end day', () => {
    const layout = layoutRoute({
      ...base,
      periods: [
        { id: 'p1', kind: 'exam', label: 'Kiểm tra định kỳ', start: '2026-09-10', end: '2026-09-15' },
        { id: 'p2', kind: 'holiday', label: 'Nghỉ lễ', start: '2026-11-09', end: '2026-11-20' },
        { id: 'p3', kind: 'holiday', label: 'Nghỉ lễ', start: '2026-09-01', end: '2026-09-14' },
      ],
    });
    expect(layout.periods).toEqual([
      { id: 'p1', kind: 'exam', label: 'Kiểm tra định kỳ', from: 16, to: 23.3 },
      { id: 'p2', kind: 'holiday', label: 'Nghỉ lễ', from: 417.5, to: 424.8 },
    ]);
  });
});

/* ── ics ────────────────────────────────────────────────────────────── */

describe('review: buildIcs (RFC 5545)', () => {
  const encoder = new TextEncoder();
  /** A split code point would leave a lone surrogate behind. */
  const loneSurrogate = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;
  const clubs: Club[] = [
    {
      id: 'tranh-bien',
      slug: 'tranh-bien',
      name: 'Câu lạc bộ Tranh biện và Hùng biện Tiếng Việt, khối Trung học phổ thông',
      shortName: 'CLB Tranh biện',
      description: 'Mô tả.',
      categories: ['HT'],
      contact: '[Email câu lạc bộ]',
    },
  ];
  const long = makeEvent({
    id: 'ev-dai',
    slug: 'hoi-thao-dai',
    title: 'Hội thảo định hướng nghề nghiệp; chủ đề: "Kỹ năng, ước mơ \\ thực tiễn" dành cho học sinh khối 10, 11 và 12',
    location: 'Hội trường tầng 3, nhà Đa năng; cổng số 2',
    summary:
      'Buổi hội thảo nhằm giới thiệu các ngành nghề trọng điểm, đồng thời hướng dẫn học sinh xây dựng kế hoạch học tập.\nNội dung gồm ba phần, qua đó góp phần nâng cao năng lực tự định hướng. 🎓',
    start: '2026-10-18T16:30:00Z', // Sunday 23:30 in Vietnam
    end: '2026-10-18T16:59:00Z',
  });
  const ics = buildIcs([long], { now: Date.UTC(2026, 9, 14, 2, 3, 4, 567), clubs, baseUrl: 'https://rodemap.example/' });
  const physical = ics.split('\r\n');

  it('ends every physical line with CRLF and never emits a bare CR or LF', () => {
    expect(ics.endsWith('\r\n')).toBe(true);
    expect(physical.at(-1)).toBe('');
    for (const line of physical) {
      expect(line.includes('\n')).toBe(false);
      expect(line.includes('\r')).toBe(false);
    }
  });

  it('keeps every physical line within 75 UTF-8 octets and never splits a code point', () => {
    for (const line of physical) {
      expect(encoder.encode(line).length, line).toBeLessThanOrEqual(75);
      expect(loneSurrogate.test(line)).toBe(false);
    }
    expect(physical.filter((l) => l.startsWith(' ')).length).toBeGreaterThan(3);
  });

  it('unfolds back to the escaped logical lines', () => {
    const unfolded = ics.replace(/\r\n /g, '').split('\r\n');
    expect(unfolded).toContain(
      'SUMMARY:Hội thảo định hướng nghề nghiệp\\; chủ đề: "Kỹ năng\\, ước mơ \\\\ thực tiễn" dành cho học sinh khối 10\\, 11 và 12',
    );
    expect(unfolded).toContain('LOCATION:Hội trường tầng 3\\, nhà Đa năng\\; cổng số 2');
    const description = unfolded.find((l) => l.startsWith('DESCRIPTION:')) ?? '';
    expect(description).toContain('kế hoạch học tập.\\nNội dung');
    expect(description).toContain('\\nĐơn vị tổ chức: Câu lạc bộ Tranh biện và Hùng biện Tiếng Việt\\, khối');
    expect(description).toContain('\\nThông tin chi tiết: https://rodemap.example/su-kien/hoi-thao-dai');
    expect(unfolded).toContain('URL:https://rodemap.example/su-kien/hoi-thao-dai');
  });

  it('formats DTSTAMP in UTC and DTSTART/DTEND as Vietnam wall-clock with TZID', () => {
    const unfolded = ics.replace(/\r\n /g, '').split('\r\n');
    expect(unfolded).toContain('DTSTAMP:20261014T020304Z');
    expect(unfolded).toContain('DTSTART;TZID=Asia/Ho_Chi_Minh:20261018T233000');
    expect(unfolded).toContain('DTEND;TZID=Asia/Ho_Chi_Minh:20261018T235900');
    expect(unfolded).toContain('UID:ev-dai@rodemap.app');
    const tz = unfolded.slice(unfolded.indexOf('BEGIN:VTIMEZONE'), unfolded.indexOf('END:VTIMEZONE') + 1);
    expect(tz).toEqual([
      'BEGIN:VTIMEZONE',
      'TZID:Asia/Ho_Chi_Minh',
      'BEGIN:STANDARD',
      'DTSTART:19700101T000000',
      'TZOFFSETFROM:+0700',
      'TZOFFSETTO:+0700',
      'TZNAME:ICT',
      'END:STANDARD',
      'END:VTIMEZONE',
    ]);
  });

  it('folds an all-multibyte line on code-point boundaries at exactly 75 octets', () => {
    const line = `X:${'ệ'.repeat(60)}`; // 2 + 180 octets
    const parts = foldLine(line).split('\r\n');
    expect(parts.map((p) => encoder.encode(p).length)).toEqual([74, 73, 37]);
    expect(parts.join('').replace(/^X:/, '').replace(/ /g, '')).toBe('ệ'.repeat(60));
    const astral = foldLine(`X:${'🎓'.repeat(30)}`).split('\r\n');
    for (const p of astral) {
      expect(encoder.encode(p).length).toBeLessThanOrEqual(75);
      expect(loneSurrogate.test(p)).toBe(false);
    }
  });

  it('names the file after the Vietnam date of now', () => {
    expect(icsFileName(toMillis('2026-10-13T17:00:00Z'))).toBe('rodemap-lich-ca-nhan-2026-10-14.ics');
  });
});

/* ── Google Calendar ────────────────────────────────────────────────── */

describe('review: googleCalendarUrl', () => {
  it('builds a decodable template link in Vietnam wall-clock time', () => {
    const e = makeEvent({
      title: 'Đêm nhạc & giao lưu: "Thu" 100%',
      start: '2026-10-18T16:30:00Z',
      end: '2026-10-18T18:00:00Z',
      location: 'Sân trường, khu A',
      summary: 'Tóm tắt.',
    });
    const url = new URL(googleCalendarUrl(e, { clubs: [], baseUrl: 'https://rodemap.example' }));
    expect(`${url.origin}${url.pathname}`).toBe('https://calendar.google.com/calendar/render');
    expect(url.searchParams.get('action')).toBe('TEMPLATE');
    expect(url.searchParams.get('text')).toBe('Đêm nhạc & giao lưu: "Thu" 100%');
    expect(url.searchParams.get('dates')).toBe('20261018T233000/20261019T010000');
    expect(url.searchParams.get('ctz')).toBe('Asia/Ho_Chi_Minh');
    expect(url.searchParams.get('location')).toBe('Sân trường, khu A');
    expect(url.searchParams.get('details')).toBe(
      `Tóm tắt.\nThông tin chi tiết: https://rodemap.example/su-kien/${e.slug}`,
    );
    expect([...url.searchParams.keys()]).toEqual(['action', 'text', 'dates', 'ctz', 'details', 'location']);
  });
});

/* ── portfolio ──────────────────────────────────────────────────────── */

describe('review: portfolio', () => {
  const entry = (id: string, eventId: string, category: PortfolioEntry['category'], hours: number): PortfolioEntry => ({
    id,
    eventId,
    category,
    role: 'Thành viên tham gia',
    hours,
    reflection: '',
    reflectionSource: 'mochi_draft',
    evidenceLinks: [],
    createdAt: '2026-10-01T09:00:00+07:00',
    updatedAt: '2026-10-01T09:00:00+07:00',
  });

  it('sums decimal hours without floating-point noise and keeps all seven keys', () => {
    const entries = [entry('1', 'x', 'HT', 0.1), entry('2', 'y', 'HT', 0.2), entry('3', 'z', 'TS', 1.15)];
    expect(totalHours(entries)).toBe(1.45);
    expect(hoursByCategory(entries)).toEqual({ HT: 0.3, NT: 0, TT: 0, TN: 0, KN: 0, CN: 0, TS: 1.15 });
    expect(groupByCategory(entries).map((g) => [g.category, g.hours, ids(g.entries)])).toEqual([
      ['HT', 0.3, ['1', '2']],
      ['TS', 1.15, ['3']],
    ]);
  });

  it('exports dates in Vietnam time and sorts unknown events last', () => {
    const late = makeEvent({ id: 'late', start: '2026-10-13T17:30:00Z', end: '2026-10-13T19:00:00Z' });
    const early = makeEvent({ id: 'early', start: '2026-10-10T08:00:00+07:00', end: '2026-10-10T09:00:00+07:00' });
    const json = portfolioJson(
      [entry('b', 'gone', 'HT', 1), entry('a', 'late', 'HT', 1.5), entry('c', 'early', 'HT', 1), entry('0', 'gone2', 'NT', 1)],
      [late, early],
      [],
      null,
      toMillis('2026-10-20T17:30:00Z'),
    );
    expect(json.generatedAt).toBe('2026-10-21T00:30:00+07:00');
    expect(json.entries.map((x) => [x.event.title, x.event.date])).toEqual([
      [early.title, '2026-10-10'],
      [late.title, '2026-10-14'],
      ['gone2', null],
      ['gone', null],
    ]);
    expect(json.student).toBeNull();
    expect(toIsoDateTime(toMillis(json.generatedAt))).toBe(json.generatedAt);
  });
});

/* ── moderation: validateDraft boundaries ───────────────────────────── */

describe('review: validateDraft boundaries', () => {
  const now = vn('2026-10-01T09:00');
  const valid: EventDraft = {
    title: 'Hội thảo A',
    clubId: 'tranh-bien',
    category: 'HT',
    format: 'in_person',
    start: '2026-10-20T08:00:00+07:00',
    end: '2026-10-20T20:00:00+07:00',
    location: 'Phòng 204',
    eligibleGrades: [10],
    capacity: 1,
    registrationDeadline: '2026-10-20T08:00:00+07:00',
    summary: 'a'.repeat(40),
    description: 'b'.repeat(80),
    tags: [],
  };
  const check = (overrides: Partial<EventDraft>, at = now): string[] =>
    Object.keys(validateDraft({ ...valid, ...overrides }, at)).sort();

  it('accepts every inclusive boundary', () => {
    expect(check({})).toEqual([]);
    expect(check({ title: 'x'.repeat(120), summary: 's'.repeat(400), capacity: 2000 })).toEqual([]);
    expect(check({ title: 'Ươm mầm' + 'ạ' })).toEqual([]); // 8 graphemes
    expect(check({ title: 'Ươm mầm ạ'.normalize('NFD').slice(0, -2) + 'ạ'.normalize('NFD') })).toEqual([]);
    expect(check({ start: '2026-09-01T00:00:00+07:00', end: '2026-09-01T01:00:00+07:00', registrationDeadline: '2026-09-01T00:00:00+07:00' }, vn('2026-08-01T00:00'))).toEqual([]);
    expect(check({ start: '2027-05-31T23:00:00+07:00', end: '2027-06-01T01:00:00+07:00', registrationDeadline: '2027-05-30T00:00:00+07:00' })).toEqual([]);
    expect(check({ start: '2026-10-20T08:00:00+07:00', end: '2026-10-23T08:00:00+07:00' })).toEqual([]);
    expect(check({ registrationDeadline: '2026-10-01T09:01:00+07:00' })).toEqual([]);
  });

  it('rejects one step past every boundary', () => {
    expect(check({ title: '  ' + 'x'.repeat(7) + '  ' })).toEqual(['title']);
    expect(check({ title: 'x'.repeat(121) })).toEqual(['title']);
    expect(check({ summary: 's'.repeat(39) })).toEqual(['summary']);
    expect(check({ summary: 's'.repeat(401) })).toEqual(['summary']);
    expect(check({ description: 'd'.repeat(79) })).toEqual(['description']);
    expect(check({ capacity: 0 })).toEqual(['capacity']);
    expect(check({ capacity: 2001 })).toEqual(['capacity']);
    expect(check({ capacity: 1.5 })).toEqual(['capacity']);
    expect(check({ location: '   ' })).toEqual(['location']);
    expect(check({ eligibleGrades: [] })).toEqual(['eligibleGrades']);
    expect(check({ start: '2026-08-31T23:59:00+07:00', end: '2026-09-01T01:00:00+07:00', registrationDeadline: '2026-08-31T00:00:00+07:00' }, vn('2026-08-01T00:00'))).toEqual(['start']);
    expect(check({ start: '2027-06-01T00:00:00+07:00', end: '2027-06-01T01:00:00+07:00', registrationDeadline: '2027-05-30T00:00:00+07:00' })).toEqual(['start']);
    expect(check({ end: '2026-10-20T20:01:00+07:00' })).toEqual(['end']);
    expect(check({ end: '2026-10-20T08:00:00+07:00' })).toEqual(['end']);
    expect(check({ end: '2026-10-23T08:01:00+07:00' })).toEqual(['end']);
    expect(check({ registrationDeadline: '2026-10-20T08:01:00+07:00' })).toEqual(['registrationDeadline']);
    expect(check({ registrationDeadline: '2026-10-01T09:00:00+07:00' })).toEqual(['registrationDeadline']);
    expect(check({ start: 'không hợp lệ' })).toEqual(['start']);
  });
});

/* ── slugify ────────────────────────────────────────────────────────── */

describe('review: slugify', () => {
  it('folds Vietnamese letters, punctuation and whitespace', () => {
    expect(slugify('Đêm nhạc Hội trường')).toBe('dem-nhac-hoi-truong');
    expect(slugify('  Ươm   mầm   ý tưởng!!!  ')).toBe('uom-mam-y-tuong');
    expect(slugify('ĐỊNH HƯỚNG — Nghề nghiệp, 2026: “Thử thách”')).toBe('dinh-huong-nghe-nghiep-2026-thu-thach');
    expect(slugify('Ơn nghĩa – Ước mơ – Ưu tú')).toBe('on-nghia-uoc-mo-uu-tu');
    expect(slugify('Hội thảo'.normalize('NFD'))).toBe('hoi-thao');
    expect(slugify('...')).toBe('su-kien');
    expect(slugify('🎓 🎉')).toBe('su-kien');
  });

  it('caps at 60 characters without a trailing hyphen', () => {
    const title = 'Hội thảo định hướng nghề nghiệp dành cho học sinh khối mười một năm học';
    const slug = slugify(title);
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith('-')).toBe(false);
    expect(slug).toBe('hoi-thao-dinh-huong-nghe-nghiep-danh-cho-hoc-sinh-khoi-muoi');
    // A word ending exactly at 60 is kept whole.
    const exact = `${'a'.repeat(59)}b c`;
    expect(slugify(exact)).toBe(`${'a'.repeat(59)}b`);
    // A hyphen at position 60 (index 59) is dropped.
    expect(slugify(`${'a'.repeat(59)} bcd`)).toBe('a'.repeat(59));
    // One long word is hard-cut.
    expect(slugify('x'.repeat(70))).toBe('x'.repeat(60));
    for (let n = 50; n < 75; n += 1) {
      const s = slugify(`${'ư'.repeat(n % 7 + 1)} ${'đ'.repeat(n)} ơ`);
      expect(s.length).toBeLessThanOrEqual(60);
      expect(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s)).toBe(true);
    }
  });
});

