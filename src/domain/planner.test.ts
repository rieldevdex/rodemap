import { describe, expect, it } from 'vitest';
import { toMillis } from './dates';
import { ALTERNATIVE_WINDOW_DAYS, DEFAULT_FIRST_ROUTE_SIZE, firstRoute, proposePlan, type PlanContext } from './planner';
import type { RecommendContext } from './recommend';
import { makeEvent, makeProfile, reg } from './test-fixtures';
import type { SchoolEvent } from './types';

/** Thursday 01/10/2026 09:00; the fixture deadline (12/10 23:59) is still open. */
const now = toMillis('2026-10-01T09:00:00+07:00');

const ev = (id: string, start: string, end: string, extra: Partial<SchoolEvent> = {}): SchoolEvent =>
  makeEvent({ id, start: `${start}:00+07:00`, end: `${end}:00+07:00`, ...extra });

const planCtx = (overrides: Partial<PlanContext> = {}): PlanContext => ({
  profile: makeProfile(),
  plan: [],
  regs: [],
  now,
  goals: [],
  allEvents: [],
  budget: 6,
  ...overrides,
});

const ids = (events: SchoolEvent[]): string[] => events.map((e) => e.id);

describe('proposePlan: greedy walk', () => {
  const planned = ev('p-plan', '2026-10-15T17:00', '2026-10-15T19:00'); // 2 h, week 42
  const ok = ev('c-ok', '2026-10-14T16:45', '2026-10-14T18:15'); // 1.5 h
  const clashAccepted = ev('c-clash-accepted', '2026-10-14T17:00', '2026-10-14T18:00');
  const clashPlan = ev('c-clash-plan', '2026-10-15T16:30', '2026-10-15T17:30', { category: 'CN' });
  const closed = ev('c-closed', '2026-10-20T17:00', '2026-10-20T18:00', {
    registrationDeadline: '2026-09-30T23:59:00+07:00',
  });
  const past = ev('c-past', '2026-09-30T08:00', '2026-09-30T10:00');
  const full = ev('c-full', '2026-10-21T17:00', '2026-10-21T18:00', { capacity: 10, seatsTaken: 10 });
  const ineligible = ev('c-inelig', '2026-10-22T17:00', '2026-10-22T18:00', { eligibleGrades: [12] });
  const over = ev('c-over', '2026-10-16T17:00', '2026-10-16T20:00', { category: 'TN' }); // 3 h → 6.5
  const exact = ev('c-exact', '2026-10-17T08:00', '2026-10-17T10:30', { category: 'KN' }); // 2.5 h → 6
  const registered = ev('c-registered', '2026-10-27T17:00', '2026-10-27T18:00');
  const candidates = [ok, clashAccepted, clashPlan, closed, past, full, ineligible, over, exact, ok, planned, registered];
  const proposal = proposePlan(candidates, planCtx({ plan: [planned], regs: [reg('c-registered')] }));

  it('accepts what fits, in candidate order', () => {
    expect(ids(proposal.accepted)).toEqual(['c-ok', 'c-exact']);
  });

  it('drops with a reason, naming the conflicting event', () => {
    expect(proposal.dropped.map((d) => [d.event.id, d.reason, d.conflictWith])).toEqual([
      ['c-clash-accepted', 'conflict', 'c-ok'],
      ['c-clash-plan', 'conflict', 'p-plan'],
      ['c-closed', 'closed', undefined],
      ['c-past', 'closed', undefined],
      ['c-full', 'full', undefined],
      ['c-inelig', 'ineligible', undefined],
      ['c-over', 'over_budget', undefined],
    ]);
    expect('conflictWith' in (proposal.dropped[2] ?? {})).toBe(false);
  });

  it('skips duplicates, plan events and registered events', () => {
    const seen = [...ids(proposal.accepted), ...proposal.dropped.map((d) => d.event.id)];
    expect(seen.filter((id) => id === 'c-ok')).toHaveLength(1);
    expect(seen).not.toContain('p-plan');
    expect(seen).not.toContain('c-registered');
  });

  it('sums hours per week over plan and accepted', () => {
    expect(proposal.hoursByWeek).toEqual({ '2026-W42': 6 });
    expect(proposal.alternatives).toEqual([]);
  });

  it('handles empty input and never mutates', () => {
    expect(proposePlan([], planCtx({ plan: [planned] }))).toEqual({
      accepted: [],
      dropped: [],
      alternatives: [],
      hoursByWeek: { '2026-W42': 2 },
    });
    const snapshot = structuredClone(candidates);
    proposePlan(Object.freeze([...candidates]), planCtx({ plan: Object.freeze([planned]) as SchoolEvent[] }));
    expect(candidates).toEqual(snapshot);
  });
});

describe('proposePlan: reason priority', () => {
  const ctx = planCtx();

  it('checks closed, full, ineligible, conflict, then budget', () => {
    const closedAndFull = ev('x1', '2026-10-14T17:00', '2026-10-14T18:00', {
      registrationDeadline: '2026-09-30T23:59:00+07:00',
      capacity: 5,
      seatsTaken: 5,
    });
    const fullAndIneligible = ev('x2', '2026-10-14T17:00', '2026-10-14T18:00', {
      capacity: 5,
      seatsTaken: 5,
      eligibleGrades: [12],
    });
    const ineligibleAndClash = ev('x3', '2026-10-14T17:00', '2026-10-14T18:00', { eligibleGrades: [10] });
    const anchor = ev('x0', '2026-10-14T17:00', '2026-10-14T21:00'); // 4 h
    const clashAndOver = ev('x4', '2026-10-14T20:00', '2026-10-14T23:00'); // overlaps, 7 h total
    const result = proposePlan([anchor, closedAndFull, fullAndIneligible, ineligibleAndClash, clashAndOver], ctx);
    expect(result.dropped.map((d) => [d.event.id, d.reason])).toEqual([
      ['x1', 'closed'],
      ['x2', 'full'],
      ['x3', 'ineligible'],
      ['x4', 'conflict'],
    ]);
  });

  it('names the earliest conflicting event', () => {
    const first = ev('k-first', '2026-10-14T16:00', '2026-10-14T17:00');
    const second = ev('k-second', '2026-10-14T16:30', '2026-10-14T18:00');
    const late = ev('k-late', '2026-10-14T16:45', '2026-10-14T17:30');
    const result = proposePlan([late], planCtx({ plan: [second, first] }));
    expect(result.dropped).toEqual([{ event: late, reason: 'conflict', conflictWith: 'k-first' }]);
  });

  it('treats every grade as eligible without a profile', () => {
    const senior = ev('senior', '2026-10-14T17:00', '2026-10-14T18:00', { eligibleGrades: [12] });
    expect(ids(proposePlan([senior], planCtx({ profile: null })).accepted)).toEqual(['senior']);
    expect(proposePlan([senior], ctx).dropped[0]?.reason).toBe('ineligible');
  });

  it('allows back-to-back events and the exact budget', () => {
    const morning = ev('m', '2026-10-17T08:00', '2026-10-17T11:00');
    const noon = ev('n', '2026-10-17T11:00', '2026-10-17T14:00');
    const result = proposePlan([morning, noon], ctx);
    expect(ids(result.accepted)).toEqual(['m', 'n']);
    expect(result.hoursByWeek).toEqual({ '2026-W42': 6 });
    const tighter = proposePlan([morning, noon], planCtx({ budget: 5.75 }));
    expect(tighter.dropped).toEqual([{ event: noon, reason: 'over_budget' }]);
  });
});

describe('proposePlan: alternatives', () => {
  const planned = ev('p-plan', '2026-10-15T17:00', '2026-10-15T19:00'); // 2 h
  const ok = ev('c-ok', '2026-10-14T16:45', '2026-10-14T18:15'); // 1.5 h, accepted
  const clash = ev('c-clash', '2026-10-14T17:00', '2026-10-14T18:00');
  const full = ev('c-full', '2026-10-16T17:00', '2026-10-16T18:00', { capacity: 3, seatsTaken: 3 });
  const closed = ev('c-closed', '2026-10-16T19:00', '2026-10-16T20:00', {
    registrationDeadline: '2026-09-30T23:59:00+07:00',
  });
  const ineligible = ev('c-inelig', '2026-10-16T19:00', '2026-10-16T20:00', { eligibleGrades: [12] });
  const candidates = [ok, clash, full, closed, ineligible];

  const best = ev('alt-best', '2026-10-20T17:00', '2026-10-20T18:00'); // 6 days from c-clash
  const day21 = ev('alt-21', '2026-11-04T17:00', '2026-11-04T18:00'); // 21 days from c-clash, 19 from c-full
  const tooFar = ev('alt-far', '2026-11-08T17:00', '2026-11-08T18:00'); // 23 days from c-full
  const noise = [
    ev('alt-pending', '2026-10-14T19:00', '2026-10-14T20:00', { status: 'pending' }),
    ev('alt-other-cat', '2026-10-14T19:00', '2026-10-14T20:00', { category: 'CN' }),
    ev('alt-past', '2026-09-28T17:00', '2026-09-28T18:00'),
    ev('alt-closed', '2026-10-13T17:00', '2026-10-13T18:00', { registrationDeadline: '2026-09-30T23:59:00+07:00' }),
    ev('alt-inelig', '2026-10-13T18:30', '2026-10-13T19:30', { eligibleGrades: [12] }),
    ev('alt-full', '2026-10-13T19:00', '2026-10-13T20:00', { capacity: 1, seatsTaken: 1 }),
    ev('alt-registered', '2026-10-12T17:00', '2026-10-12T18:00'),
    ev('alt-conflict', '2026-10-15T18:00', '2026-10-15T19:00'),
    ev('alt-budget', '2026-10-17T08:00', '2026-10-17T11:00'), // week 42 would reach 6.5 h
  ];
  const ctx = planCtx({
    plan: [planned],
    regs: [reg('alt-registered')],
    allEvents: [...candidates, planned, ...noise, tooFar, day21, best],
  });
  const proposal = proposePlan(candidates, ctx);

  it('suggests one distinct alternative per conflict, over-budget or full drop', () => {
    expect(ALTERNATIVE_WINDOW_DAYS).toBe(21);
    expect(proposal.alternatives.map((a) => [a.forEventId, a.event.id])).toEqual([
      ['c-clash', 'alt-best'],
      ['c-full', 'alt-21'],
    ]);
  });

  it('suggests nothing for closed or ineligible drops, or when nothing fits', () => {
    expect(proposal.dropped.map((d) => d.reason)).toEqual(['conflict', 'full', 'closed', 'ineligible']);
    const sparse = proposePlan(candidates, { ...ctx, allEvents: [...noise, tooFar] });
    expect(sparse.alternatives).toEqual([]);
  });

  it('suggests for over-budget drops within the budget', () => {
    const heavy = ev('h-heavy', '2026-10-17T08:00', '2026-10-17T12:30'); // 4.5 h
    const extra = ev('h-extra', '2026-10-14T17:00', '2026-10-14T19:00'); // 2 h → 6.5
    const sameWeek = ev('h-same-week', '2026-10-15T17:00', '2026-10-15T19:00');
    const nextWeek = ev('h-next-week', '2026-10-22T17:00', '2026-10-22T19:00');
    const result = proposePlan([heavy, extra], planCtx({ allEvents: [sameWeek, nextWeek] }));
    expect(result.dropped).toEqual([{ event: extra, reason: 'over_budget' }]);
    expect(result.alternatives).toEqual([{ forEventId: 'h-extra', event: nextWeek }]);
  });

  it('breaks distance ties by id and ignores grades without a profile', () => {
    const anchor = ev('t-anchor', '2026-10-14T17:00', '2026-10-14T18:00');
    const dropped = ev('t-dropped', '2026-10-14T17:30', '2026-10-14T18:30');
    const before = ev('t-b', '2026-10-13T17:30', '2026-10-13T18:30', { eligibleGrades: [12] });
    const after = ev('t-a', '2026-10-15T17:30', '2026-10-15T18:30', { eligibleGrades: [12] });
    const result = proposePlan([anchor, dropped], planCtx({ profile: null, allEvents: [before, after] }));
    expect(result.alternatives).toEqual([{ forEventId: 't-dropped', event: after }]);
    const withProfile = proposePlan([anchor, dropped], planCtx({ allEvents: [before, after] }));
    expect(withProfile.alternatives).toEqual([]);
  });
});

describe('firstRoute', () => {
  const profile = makeProfile(); // top interests CN, HT, TN; budget 6; grade 11
  const ctxFor = (overrides: Partial<RecommendContext> = {}): RecommendContext => ({
    profile,
    plan: [],
    regs: [],
    now,
    goals: [],
    ...overrides,
  });
  const weekly = ['13', '20', '27'].map((day, i) =>
    ev(`fr-${String(i + 1)}`, `2026-10-${day}T17:00`, `2026-10-${day}T18:00`, { category: 'CN' }),
  );
  const november = ['03', '10', '17'].map((day, i) =>
    ev(`fr-${String(i + 4)}`, `2026-11-${day}T17:00`, `2026-11-${day}T18:00`, { category: 'CN' }),
  );
  const series = [...weekly, ...november];

  it('takes the top recommendations and trims accepted to the size', () => {
    const route = firstRoute(series, ctxFor(), 2);
    expect(ids(route.accepted)).toEqual(['fr-1', 'fr-2']);
    expect(route.hoursByWeek).toEqual({ '2026-W42': 1, '2026-W43': 1 });
    expect(route.dropped).toEqual([]);
    expect(route.alternatives).toEqual([]);
  });

  it('defaults to 4 accepted events', () => {
    expect(DEFAULT_FIRST_ROUTE_SIZE).toBe(4);
    expect(ids(firstRoute(series, ctxFor()).accepted)).toEqual(['fr-1', 'fr-2', 'fr-3', 'fr-4']);
    expect(firstRoute(series, ctxFor(), 0).accepted).toEqual([]);
    expect(firstRoute([], ctxFor())).toEqual({ accepted: [], dropped: [], alternatives: [], hoursByWeek: {} });
  });

  it('drops clashing recommendations and proposes alternatives from all events', () => {
    const topA = ev('top-a', '2026-10-14T17:00', '2026-10-14T18:00', { category: 'CN' });
    const topB = ev('top-b', '2026-10-14T17:30', '2026-10-14T18:30', { category: 'CN' });
    const later = ev('later-cn', '2026-10-21T17:00', '2026-10-21T18:00', { category: 'CN' });
    const route = firstRoute([later, topB, topA], ctxFor(), 1);
    expect(ids(route.accepted)).toEqual(['top-a']);
    expect(route.dropped).toEqual([{ event: topB, reason: 'conflict', conflictWith: 'top-a' }]);
    expect(route.alternatives).toEqual([{ forEventId: 'top-b', event: later }]);
    expect(route.hoursByWeek).toEqual({ '2026-W42': 1 });
  });

  it('respects the existing plan', () => {
    const planned = ev('p', '2026-10-13T17:30', '2026-10-13T19:00', { category: 'HT' });
    // fr-1 clashes with the plan (−4), so it ranks last among the six recommendations.
    const route = firstRoute(series, ctxFor({ plan: [planned], regs: [reg('p')] }), 3);
    expect(route.dropped).toEqual([{ event: weekly[0], reason: 'conflict', conflictWith: 'p' }]);
    expect(ids(route.accepted)).toEqual(['fr-2', 'fr-3', 'fr-4']);
    expect(route.alternatives).toEqual([]);
    expect(route.hoursByWeek).toEqual({ '2026-W42': 1.5, '2026-W43': 1, '2026-W44': 1, '2026-W45': 1 });
  });

  it("uses the profile's weekly budget", () => {
    const tight = makeProfile({ weeklyHourBudget: 2 });
    const second = ev('fr-1b', '2026-10-15T17:00', '2026-10-15T18:30', { category: 'CN' });
    const route = firstRoute([weekly[0]!, second], ctxFor({ profile: tight }));
    expect(ids(route.accepted)).toEqual(['fr-1']);
    expect(route.dropped).toEqual([{ event: second, reason: 'over_budget' }]);
  });

  it('uses a 6-hour budget without a profile', () => {
    const saturday = ev('nb-1', '2026-10-17T08:00', '2026-10-17T12:00', { category: 'HT' }); // 4 h
    const sunday = ev('nb-2', '2026-10-18T08:00', '2026-10-18T11:00', { category: 'CN' }); // 3 h → 7
    const route = firstRoute([sunday, saturday], ctxFor({ profile: null }));
    expect(ids(route.accepted)).toEqual(['nb-1']);
    expect(route.dropped).toEqual([{ event: sunday, reason: 'over_budget' }]);
    expect(route.hoursByWeek).toEqual({ '2026-W42': 4 });
  });
});
