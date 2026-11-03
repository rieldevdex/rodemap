import { describe, expect, it } from 'vitest';
import { CLUBS } from '../data/clubs';
import { EVENTS } from '../data/events';
import { GOALS } from '../data/goals';
import { toMillis } from '../domain/dates';
import { sortByStart } from '../domain/events';
import { firstRoute } from '../domain/planner';
import { recommendEvents } from '../domain/recommend';
import { NEWS } from '../data/news';
import { makeEvent, makePost, makeProfile, reg } from '../domain/test-fixtures';
import type { Grade, SchoolEvent, Submission } from '../domain/types';
import { reducer } from './reducer';
import { createDemoState, createSeedState, type AppState } from './schema';
import {
  selectActivityProposals,
  selectAllEvents,
  selectClubCollaborations,
  selectCollaborations,
  selectClub,
  selectClubBySlug,
  selectConflictsInPlan,
  selectDeadlinesThisWeek,
  selectEventById,
  selectEventBySlug,
  selectEventsForClub,
  selectFirstRoute,
  selectModerationQueue,
  selectMyEvents,
  selectNews,
  selectNewsBySlug,
  selectNewsForClub,
  selectNewsForEvent,
  selectNewsSlugs,
  selectNow,
  selectPendingActivityCount,
  selectPendingAttendance,
  selectProposalResponses,
  selectProposalsForClub,
  selectPlanBudget,
  selectPublicEvents,
  selectGuestRecommendations,
  selectRecommendations,
  selectRegistration,
  selectSubmissionsForClub,
  selectUpcomingMine,
} from './selectors';

/** Wednesday 07/10/2026 09:00, the demo date used by the browser tests (ISO week 2026-W41). */
const NOW = toMillis('2026-10-07T09:00:00+07:00');
const AT = '2026-10-07T09:00:00+07:00';
const REASON = 'Đề nghị câu lạc bộ bổ sung địa điểm tổ chức cụ thể trước khi gửi lại.';

const ids = (events: readonly SchoolEvent[]): string[] => events.map((e) => e.id);

function seedEvent(id: string): SchoolEvent {
  const e = EVENTS.find((x) => x.id === id);
  if (!e) throw new Error(`Unknown seed event ${id}`);
  return e;
}

function stateWith(overrides: Partial<AppState>): AppState {
  return { ...createDemoState(), ...overrides };
}

function submission(id: string, eventId: string, overrides: Partial<Submission> = {}): Submission {
  return {
    id,
    eventId,
    clubId: 'bot-va-bo',
    submittedAt: AT,
    history: [{ at: AT, actor: 'club', action: 'submit' }],
    ...overrides,
  };
}

const approvedSeed = EVENTS.filter((e) => e.status === 'approved');

/** A club event waiting for moderation (the sample data has none: the clubs are real). */
const pendingEvent = makeEvent({ id: 'ev-p', slug: 'su-kien-cho-duyet', clubId: 'young-business-creators', status: 'pending', seatsTaken: 0 });

/** Club submissions in every moderation state, as the clubs would send them through Cổng câu lạc bộ. */
const SUBMITTED: SchoolEvent[] = [
  makeEvent({ id: 'ev-s1', clubId: 'novaris-project', status: 'pending', seatsTaken: 0 }),
  makeEvent({ id: 'ev-s2', clubId: 'kat-music-club', status: 'pending', seatsTaken: 0 }),
  makeEvent({ id: 'ev-s3', clubId: 'bot-va-bo', status: 'pending', seatsTaken: 0 }),
  makeEvent({ id: 'ev-s4', clubId: 'bot-va-bo', status: 'changes_requested', seatsTaken: 0 }),
  makeEvent({ id: 'ev-s5', clubId: 'charite', status: 'rejected', seatsTaken: 0 }),
];
const SUBMISSIONS: Submission[] = [
  submission('sub-001', 'ev-s1', { clubId: 'novaris-project', submittedAt: '2026-10-05T15:20:00+07:00', history: [{ at: '2026-10-05T15:20:00+07:00', actor: 'club', action: 'submit' }] }),
  submission('sub-002', 'ev-s2', { clubId: 'kat-music-club', submittedAt: '2026-10-06T10:05:00+07:00', history: [{ at: '2026-10-06T10:05:00+07:00', actor: 'club', action: 'submit' }] }),
  submission('sub-003', 'ev-s3', { submittedAt: '2026-10-06T16:40:00+07:00', history: [{ at: '2026-10-06T16:40:00+07:00', actor: 'club', action: 'submit' }] }),
  submission('sub-004', 'ev-s4', {
    submittedAt: '2026-10-02T14:00:00+07:00',
    history: [
      { at: '2026-10-02T14:00:00+07:00', actor: 'club', action: 'submit' },
      { at: '2026-10-04T09:30:00+07:00', actor: 'hdhs', action: 'request_changes', reason: REASON },
    ],
  }),
  submission('sub-005', 'ev-s5', {
    clubId: 'charite',
    submittedAt: '2026-10-03T08:45:00+07:00',
    history: [
      { at: '2026-10-03T08:45:00+07:00', actor: 'club', action: 'submit' },
      { at: '2026-10-05T10:15:00+07:00', actor: 'hdhs', action: 'reject', reason: REASON },
    ],
  }),
];

function withSubmissions(overrides: Partial<AppState> = {}): AppState {
  return stateWith({ submittedEvents: SUBMITTED, submissions: SUBMISSIONS, ...overrides });
}

function submitted(id: string): SchoolEvent {
  const e = SUBMITTED.find((x) => x.id === id);
  if (!e) throw new Error(`Unknown submitted event ${id}`);
  return e;
}

describe('selectNow', () => {
  it('follows the real clock without a demo date', () => {
    expect(selectNow(createDemoState(), 1_234_567)).toBe(1_234_567);
  });

  it('pins the clock to 09:00 in Vietnam on the demo date', () => {
    const s = stateWith({ demoToday: '2026-10-07' });
    expect(selectNow(s, 0)).toBe(NOW);
    expect(selectNow(s, Date.UTC(2027, 0, 1))).toBe(NOW);
  });

  it('falls back to the real clock when the stored demo date cannot be read', () => {
    expect(selectNow(stateWith({ demoToday: 'ngày không hợp lệ' }), 42)).toBe(42);
    expect(selectNow(stateWith({ demoToday: '2026-13-45' }), 42)).toBe(42);
  });
});

describe('selectAllEvents', () => {
  it('returns the seed events untouched without submissions or overrides', () => {
    const all = selectAllEvents(createDemoState());
    expect(all).toHaveLength(EVENTS.length);
    all.forEach((e, i) => {
      expect(e).toBe(EVENTS[i]);
    });
  });

  it('applies moderation overrides without mutating the seed data', () => {
    const s = stateWith({ moderation: { 'ev-027': 'rejected', 'ev-001': 'approved', 'ev-ghost': 'rejected' } });
    const all = selectAllEvents(s);
    expect(all).toHaveLength(EVENTS.length);
    const ev027 = all.find((e) => e.id === 'ev-027');
    expect(ev027).toEqual({ ...seedEvent('ev-027'), status: 'rejected' });
    expect(ev027).not.toBe(seedEvent('ev-027'));
    expect(seedEvent('ev-027').status).toBe('approved');
    // An override equal to the current status keeps the original object.
    expect(all.find((e) => e.id === 'ev-001')).toBe(seedEvent('ev-001'));
  });

  it('replaces a seed event in place with its submitted copy, then appends new submitted events', () => {
    const copy: SchoolEvent = { ...seedEvent('ev-027'), location: 'Nhà thi đấu đa năng', status: 'pending' };
    const created = makeEvent({ id: 'ev-created', status: 'pending' });
    const created2 = makeEvent({ id: 'ev-created-2', status: 'approved' });
    const s = stateWith({ submittedEvents: [created, copy, created2] });
    const all = selectAllEvents(s);
    expect(all).toHaveLength(EVENTS.length + 2);
    const index = EVENTS.findIndex((e) => e.id === 'ev-027');
    expect(all[index]).toBe(copy);
    expect(ids(all.slice(-2))).toEqual(['ev-created', 'ev-created-2']);
    expect(all.filter((e) => e.id === 'ev-027')).toHaveLength(1);
  });

  it('lets the moderation override win over the submitted copy status', () => {
    const copy: SchoolEvent = { ...seedEvent('ev-027'), status: 'pending' };
    const s = stateWith({ submittedEvents: [copy], moderation: { 'ev-027': 'approved' } });
    expect(selectEventById(s, 'ev-027')).toEqual({ ...copy, status: 'approved' });
  });
});

describe('selectPublicEvents', () => {
  it('lists approved events only, sorted by start', () => {
    const pub = selectPublicEvents(createDemoState());
    expect(ids(pub)).toEqual(ids(sortByStart(approvedSeed)));
    expect(pub.every((e) => e.status === 'approved')).toBe(true);
    expect(ids(selectPublicEvents(stateWith({ submittedEvents: [pendingEvent] })))).not.toContain('ev-p');
  });

  it('honours moderation overrides and submitted events', () => {
    const created = makeEvent({ id: 'ev-created', start: '2026-09-01T16:45:00+07:00', end: '2026-09-01T18:00:00+07:00' });
    const s = stateWith({
      moderation: { 'ev-p': 'approved', 'ev-001': 'rejected', 'ev-created': 'approved' },
      submittedEvents: [{ ...created, status: 'pending' }, pendingEvent],
    });
    const pubIds = ids(selectPublicEvents(s));
    expect(pubIds).toContain('ev-p');
    expect(pubIds).not.toContain('ev-001');
    expect(pubIds[0]).toBe('ev-created');
  });
});

describe('selectEventBySlug / selectEventById', () => {
  it('finds events by slug or id, whatever their status', () => {
    const s = withSubmissions({ submittedEvents: [...SUBMITTED, pendingEvent] });
    const ev027 = seedEvent('ev-027');
    expect(selectEventBySlug(s, ev027.slug)).toBe(ev027);
    expect(selectEventBySlug(s, 'su-kien-cho-duyet')?.status).toBe('pending');
    expect(selectEventById(s, 'ev-027')).toBe(ev027);
    expect(selectEventById(s, 'ev-s5')?.status).toBe('rejected');
  });

  it('returns undefined for unknown slugs and ids', () => {
    const s = createDemoState();
    expect(selectEventBySlug(s, 'khong-ton-tai')).toBeUndefined();
    expect(selectEventById(s, 'ev-404')).toBeUndefined();
  });

  it('prefers the approved event when slugs collide, else the first one', () => {
    const slug = seedEvent('ev-027').slug;
    const pendingTwin = makeEvent({ id: 'ev-twin', slug, status: 'pending' });
    const s = stateWith({ submittedEvents: [pendingTwin] });
    expect(selectEventBySlug(s, slug)?.id).toBe('ev-027');

    const a = makeEvent({ id: 'ev-a', slug: 'trung-ten', status: 'pending' });
    const b = makeEvent({ id: 'ev-b', slug: 'trung-ten', status: 'approved' });
    const c = makeEvent({ id: 'ev-c', slug: 'trung-ten', status: 'rejected' });
    expect(selectEventBySlug(stateWith({ submittedEvents: [a, b, c] }), 'trung-ten')?.id).toBe('ev-b');
    expect(selectEventBySlug(stateWith({ submittedEvents: [a, c] }), 'trung-ten')?.id).toBe('ev-a');
  });

  it('reflects the moderation override', () => {
    const s = stateWith({ submittedEvents: [pendingEvent], moderation: { 'ev-p': 'approved' } });
    expect(selectEventById(s, 'ev-p')?.status).toBe('approved');
    expect(selectEventBySlug(s, 'su-kien-cho-duyet')?.status).toBe('approved');
  });
});

describe('selectEventsForClub', () => {
  it('lists the club approved events sorted by start', () => {
    const s = stateWith({ submittedEvents: [pendingEvent] });
    const council = selectEventsForClub(s, 'hdhs');
    expect(ids(council)).toEqual(ids(sortByStart(approvedSeed.filter((e) => e.clubId === 'hdhs'))));
    expect(ids(council)).toContain('ev-027');
    expect(ids(selectEventsForClub(s, 'young-business-creators'))).toEqual(['ev-056']);
  });

  it('includes events approved through moderation and returns [] for an unknown club', () => {
    const s = stateWith({ submittedEvents: [pendingEvent], moderation: { 'ev-p': 'approved' } });
    expect(ids(selectEventsForClub(s, 'young-business-creators'))).toContain('ev-p');
    expect(selectEventsForClub(s, 'clb-khong-ton-tai')).toEqual([]);
  });
});

describe('selectClub / selectClubBySlug', () => {
  it('finds clubs by id and slug', () => {
    const s = createDemoState();
    const club = CLUBS.find((c) => c.id === 'bot-va-bo');
    expect(club).toBeDefined();
    expect(selectClub(s, 'bot-va-bo')).toBe(club);
    expect(selectClubBySlug(s, 'bot-va-bo')).toBe(club);
    const office = CLUBS.find((c) => c.id === 'co-van-hoc-tap');
    expect(selectClubBySlug(s, 'phong-co-van-hoc-tap')).toBe(office);
  });

  it('returns undefined for unknown clubs', () => {
    const s = createDemoState();
    expect(selectClub(s, 'khong-ton-tai')).toBeUndefined();
    expect(selectClubBySlug(s, 'khong-ton-tai')).toBeUndefined();
  });
});

describe('selectRegistration', () => {
  it('returns the registration for an event, or undefined', () => {
    const s = createDemoState();
    expect(selectRegistration(s, 'ev-027')?.status).toBe('registered');
    expect(selectRegistration(s, 'ev-001')?.status).toBe('attended');
    expect(selectRegistration(s, 'ev-051')).toBeUndefined();
  });
});

describe('selectMyEvents / selectUpcomingMine', () => {
  it('lists registered and attended approved events, sorted by start', () => {
    expect(ids(selectMyEvents(createDemoState()))).toEqual(['ev-001', 'ev-003', 'ev-027']);
  });

  it('leaves out absences, unknown events and events that are not approved', () => {
    const s = stateWith({
      submittedEvents: [pendingEvent],
      registrations: [reg('ev-027'), reg('ev-003', 'absent'), reg('ev-404'), reg('ev-p'), reg('ev-001', 'attended')],
    });
    expect(ids(selectMyEvents(s))).toEqual(['ev-001', 'ev-027']);
  });

  it('keeps upcoming events only (an event in progress is still upcoming)', () => {
    const s = createDemoState();
    expect(ids(selectUpcomingMine(s, NOW))).toEqual(['ev-027']);
    // ev-027 runs 07:00–09:30 on 20/11/2026.
    expect(ids(selectUpcomingMine(s, toMillis('2026-11-20T08:00:00+07:00')))).toEqual(['ev-027']);
    expect(selectUpcomingMine(s, toMillis('2026-11-20T10:00:00+07:00'))).toEqual([]);
    expect(selectUpcomingMine(s, toMillis('2027-06-01T00:00:00+07:00'))).toEqual([]);
  });
});

describe('selectConflictsInPlan', () => {
  it('is empty for the seed plan', () => {
    expect(selectConflictsInPlan(createDemoState())).toEqual([]);
  });

  it('reports overlapping registrations', () => {
    const clash = makeEvent({ id: 'ev-clash', start: '2026-11-20T08:00:00+07:00', end: '2026-11-20T10:00:00+07:00', registrationDeadline: '2026-11-18T23:59:00+07:00' });
    const s = reducer(stateWith({ submittedEvents: [clash] }), { type: 'registration/register', eventId: 'ev-clash', at: AT });
    expect(selectConflictsInPlan(s)).toEqual([{ a: 'ev-027', b: 'ev-clash', overlapMinutes: 90 }]);
  });

  it('never reports a date-only event, whose time is not announced', () => {
    const s = stateWith({ registrations: [...createDemoState().registrations, reg('ev-055')] });
    expect(selectConflictsInPlan(s)).toEqual([]);
  });
});

describe('selectPlanBudget', () => {
  /** Tuesday of the week of ev-027 (2.5 hours on Friday 20/11/2026, ISO week 2026-W47). */
  const tuesday = toMillis('2026-11-17T09:00:00+07:00');

  it('counts my upcoming events in the current ISO week against the profile budget', () => {
    const s = createDemoState();
    expect(selectPlanBudget(s, NOW)).toEqual({ weekKey: '2026-W41', used: 0, budget: 6, remaining: 6 });
    expect(selectPlanBudget(s, tuesday)).toEqual({ weekKey: '2026-W47', used: 2.5, budget: 6, remaining: 3.5 });
  });

  it('stops counting an event once it has ended', () => {
    const after = toMillis('2026-11-20T10:00:00+07:00');
    expect(selectPlanBudget(createDemoState(), after).used).toBe(0);
  });

  it('uses the profile budget, or 6 hours without a profile', () => {
    const custom = stateWith({ profile: makeProfile({ weeklyHourBudget: 1 }) });
    expect(selectPlanBudget(custom, tuesday)).toEqual({ weekKey: '2026-W47', used: 2.5, budget: 1, remaining: 0 });
    expect(selectPlanBudget(stateWith({ profile: null }), tuesday).budget).toBe(6);
  });
});

describe('selectGuestRecommendations', () => {
  it('lists open events by date until a grade is picked, then ranks by the picked fields', () => {
    const visitor = createSeedState();
    const byDate = selectGuestRecommendations(visitor, NOW, { limit: 10 });
    expect(byDate).toEqual(recommendEvents(selectPublicEvents(visitor), { profile: null, plan: [], regs: [], now: NOW, goals: GOALS, availabilityKnown: false }, { limit: 10 }));
    expect(byDate.every((r) => r.reasons.every((c) => c === 'deadline_soon'))).toBe(true);

    const picked = { ...visitor, guestPicks: { grade: 7 as Grade, interests: ['HT' as const] } };
    const recs = selectGuestRecommendations(picked, NOW, { limit: 5 });
    expect(recs.length).toBeGreaterThan(0);
    for (const r of recs) {
      expect(r.event.eligibleGrades).toContain(7);
      expect(r.reasons).not.toContain('fits_time');
      expect(r.reasons).not.toContain('goal');
    }
    expect(recs[0]?.event.category).toBe('HT');
  });
});

describe('selectRecommendations', () => {
  it('wires recommendEvents with the public events, my upcoming plan and GOALS', () => {
    const s = createDemoState();
    const plan = selectUpcomingMine(s, NOW);
    const expected = recommendEvents(selectPublicEvents(s), {
      profile: s.profile,
      plan,
      regs: s.registrations,
      now: NOW,
      goals: GOALS,
    });
    const recs = selectRecommendations(s, NOW);
    expect(recs).toEqual(expected);
    expect(recs).toHaveLength(5);
    expect(recs.some((r) => r.reasons.includes('goal'))).toBe(true);
    for (const r of recs) {
      expect(r.event.status).toBe('approved');
      expect(selectRegistration(s, r.event.id)).toBeUndefined();
    }
  });

  it('passes options through', () => {
    const s = createDemoState();
    expect(selectRecommendations(s, NOW, { limit: 2 })).toHaveLength(2);
    const ht = selectRecommendations(s, NOW, { category: 'HT', limit: 50 });
    expect(ht.length).toBeGreaterThan(0);
    expect(ht.every((r) => r.event.category === 'HT')).toBe(true);
  });

  it('warns about clashes with my upcoming events', () => {
    const clash = makeEvent({
      id: 'ev-clash',
      start: '2026-11-20T08:00:00+07:00',
      end: '2026-11-20T10:00:00+07:00',
      registrationDeadline: '2026-11-18T23:59:00+07:00',
    });
    const s = stateWith({ submittedEvents: [clash] });
    const from = toMillis('2026-11-20T00:00:00+07:00');
    const to = toMillis('2026-11-21T00:00:00+07:00');
    const rec = selectRecommendations(s, NOW, { from, to, limit: 50 }).find((r) => r.event.id === 'ev-clash');
    expect(rec?.warnings).toContain('conflict');
  });

  it('only recommends events approved through moderation', () => {
    const range = { from: toMillis('2026-10-14T00:00:00+07:00'), to: toMillis('2026-10-15T00:00:00+07:00'), limit: 50 };
    const club = { ...pendingEvent, eligibleGrades: [11 as Grade] };
    expect(ids(selectRecommendations(stateWith({ submittedEvents: [club] }), NOW, range).map((r) => r.event))).not.toContain('ev-p');
    const approved = stateWith({ submittedEvents: [club], moderation: { 'ev-p': 'approved' } });
    expect(ids(selectRecommendations(approved, NOW, range).map((r) => r.event))).toContain('ev-p');
  });

  it('never recommends a date-only event: its registration has not opened', () => {
    const recs = selectRecommendations(createDemoState(), NOW, { limit: 50 });
    expect(recs.some((r) => r.event.dateOnly === true)).toBe(false);
  });
});

describe('selectFirstRoute', () => {
  it('wires planner.firstRoute with my upcoming plan and GOALS', () => {
    const s = createDemoState();
    const ctx = { profile: s.profile, plan: selectUpcomingMine(s, NOW), regs: s.registrations, now: NOW, goals: GOALS };
    const route = selectFirstRoute(s, NOW);
    expect(route).toEqual(firstRoute(selectPublicEvents(s), ctx));
    expect(route.accepted.length).toBeGreaterThan(0);
    expect(route.accepted.length).toBeLessThanOrEqual(4);
    for (const e of route.accepted) expect(selectRegistration(s, e.id)).toBeUndefined();
  });

  it('accepts a route size', () => {
    const s = createDemoState();
    expect(selectFirstRoute(s, NOW, 1).accepted).toHaveLength(1);
  });

  it('works without a profile', () => {
    const route = selectFirstRoute(stateWith({ profile: null, registrations: [] }), NOW);
    expect(route.accepted.length).toBeGreaterThan(0);
  });
});

describe('selectDeadlinesThisWeek', () => {
  const closing = makeEvent({ id: 'ev-d1', start: '2026-10-10T08:00:00+07:00', end: '2026-10-10T10:00:00+07:00', registrationDeadline: '2026-10-08T23:59:00+07:00' });
  const closingLater = makeEvent({ id: 'ev-d2', start: '2026-10-10T14:00:00+07:00', end: '2026-10-10T16:00:00+07:00', registrationDeadline: '2026-10-08T23:59:00+07:00' });
  const nextWeek = makeEvent({ id: 'ev-d3', start: '2026-10-14T16:45:00+07:00', end: '2026-10-14T18:15:00+07:00', registrationDeadline: '2026-10-12T23:59:00+07:00' });
  const withDeadlines = (extra: SchoolEvent[] = []) => stateWith({ submittedEvents: [closing, closingLater, nextWeek, ...extra] });

  it('lists unregistered approved events closing before next Monday, by deadline', () => {
    expect(ids(selectDeadlinesThisWeek(withDeadlines(), NOW))).toEqual(['ev-d1', 'ev-d2']);
    // No seed event closes registration in the demo week.
    expect(selectDeadlinesThisWeek(createDemoState(), NOW)).toEqual([]);
  });

  it('leaves out registered events and date-only events', () => {
    const s = reducer(withDeadlines(), { type: 'registration/register', eventId: 'ev-d2', at: AT });
    expect(ids(selectDeadlinesThisWeek(s, NOW))).toEqual(['ev-d1']);
    const day = makeEvent({ id: 'ev-day', dateOnly: true, start: '2026-10-09T00:00:00+07:00', end: '2026-10-10T00:00:00+07:00', registrationDeadline: '2026-10-09T00:00:00+07:00' });
    expect(ids(selectDeadlinesThisWeek(withDeadlines([day]), NOW))).toEqual(['ev-d1', 'ev-d2']);
  });

  it('includes a deadline at now, excludes next Monday 00:00, and orders by deadline before start', () => {
    const atNow = makeEvent({
      id: 'ev-at-now',
      start: '2026-10-20T16:45:00+07:00',
      end: '2026-10-20T18:00:00+07:00',
      registrationDeadline: AT,
    });
    const sunday = makeEvent({
      id: 'ev-sunday',
      start: '2026-10-09T16:45:00+07:00',
      end: '2026-10-09T18:00:00+07:00',
      registrationDeadline: '2026-10-11T23:59:00+07:00',
    });
    const monday = makeEvent({ id: 'ev-monday', registrationDeadline: '2026-10-12T00:00:00+07:00' });
    const passed = makeEvent({ id: 'ev-passed', registrationDeadline: '2026-10-07T08:59:00+07:00' });
    const pending = makeEvent({ id: 'ev-pending', registrationDeadline: '2026-10-09T12:00:00+07:00', status: 'pending' });
    const s = withDeadlines([sunday, monday, passed, pending, atNow]);
    expect(ids(selectDeadlinesThisWeek(s, NOW))).toEqual(['ev-at-now', 'ev-d1', 'ev-d2', 'ev-sunday']);
  });

  it('keeps the start order for equal deadlines and is empty late on Sunday', () => {
    const lateSunday = toMillis('2026-10-11T23:00:00+07:00');
    expect(selectDeadlinesThisWeek(withDeadlines(), lateSunday)).toEqual([]);
    // Same deadline as ev-d1/ev-d2 but a later start: start order wins over the id order.
    const twin = makeEvent({
      id: 'ev-000',
      start: '2026-10-10T15:00:00+07:00',
      end: '2026-10-10T16:00:00+07:00',
      registrationDeadline: '2026-10-08T23:59:00+07:00',
    });
    expect(ids(selectDeadlinesThisWeek(withDeadlines([twin]), NOW))).toEqual(['ev-d1', 'ev-d2', 'ev-000']);
  });
});

describe('selectPendingAttendance', () => {
  /** The demo student before confirming attendance at ev-003 (Ngày hội Câu lạc bộ). */
  const awaiting = () => {
    const demo = createDemoState();
    return stateWith({ registrations: [reg('ev-001', 'attended'), reg('ev-003'), reg('ev-027')], portfolio: demo.portfolio.filter((p) => p.eventId !== 'ev-003') });
  };

  it('lists past registered events without an entry', () => {
    expect(ids(selectPendingAttendance(awaiting(), NOW))).toEqual(['ev-003']);
    expect(selectPendingAttendance(createDemoState(), NOW)).toEqual([]);
  });

  it('drops events once attendance is confirmed, marked absent or already in the portfolio', () => {
    const s = awaiting();
    const attended = reducer(s, {
      type: 'registration/markAttended',
      eventId: 'ev-003',
      entry: {
        id: 'pf-003',
        eventId: 'ev-003',
        category: 'TS',
        role: 'Học sinh tham dự',
        hours: 3.5,
        reflection: '',
        reflectionSource: 'mochi_draft',
        evidenceLinks: [],
        createdAt: AT,
        updatedAt: AT,
      },
    });
    expect(selectPendingAttendance(attended, NOW)).toEqual([]);
    expect(selectPendingAttendance(reducer(s, { type: 'registration/markAbsent', eventId: 'ev-003' }), NOW)).toEqual([]);
    expect(selectPendingAttendance(stateWith({ registrations: s.registrations, portfolio: attended.portfolio }), NOW)).toEqual([]);
  });

  it('adds upcoming registrations once they have ended', () => {
    const later = toMillis('2026-11-21T09:00:00+07:00');
    expect(ids(selectPendingAttendance(awaiting(), later))).toEqual(['ev-003', 'ev-027']);
  });
});

describe('selectSubmissionsForClub', () => {
  it('joins each submission with its event and effective status, newest first', () => {
    const rows = selectSubmissionsForClub(withSubmissions(), 'bot-va-bo');
    expect(rows.map((r) => [r.submission.id, r.event.id, r.status])).toEqual([
      ['sub-003', 'ev-s3', 'pending'],
      ['sub-004', 'ev-s4', 'changes_requested'],
    ]);
    expect(rows[0]?.event).toBe(submitted('ev-s3'));
    expect(selectSubmissionsForClub(createDemoState(), 'bot-va-bo')).toEqual([]);
  });

  it('reflects reviews, resubmitted copies and new submissions', () => {
    let s = reducer(withSubmissions(), { type: 'moderation/review', submissionId: 'sub-003', action: 'approve', at: AT });
    const edited = { ...submitted('ev-s4'), location: 'Phòng đa năng tầng 3' };
    s = reducer(s, { type: 'submission/resubmit', submissionId: 'sub-004', event: edited, at: AT });
    const created = makeEvent({ id: 'ev-created', clubId: 'bot-va-bo' });
    s = reducer(s, {
      type: 'submission/create',
      event: created,
      submission: submission('sub-created', 'ev-created', { submittedAt: '2026-10-07T10:00:00+07:00' }),
    });
    const rows = selectSubmissionsForClub(s, 'bot-va-bo');
    expect(rows.map((r) => [r.submission.id, r.status])).toEqual([
      ['sub-created', 'pending'],
      ['sub-003', 'approved'],
      ['sub-004', 'pending'],
    ]);
    expect(rows[2]?.event.location).toBe('Phòng đa năng tầng 3');
    expect(rows[1]?.event.status).toBe('approved');
  });

  it('breaks ties by id, leaves out unknown events and other clubs', () => {
    const s = stateWith({
      submittedEvents: [makeEvent({ id: 'ev-x', status: 'pending' }), makeEvent({ id: 'ev-y', status: 'pending' })],
      submissions: [
        submission('sub-b', 'ev-x'),
        submission('sub-a', 'ev-y'),
        submission('sub-ghost', 'ev-ghost'),
        submission('sub-other', 'ev-x', { clubId: 'charite' }),
      ],
    });
    expect(selectSubmissionsForClub(s, 'bot-va-bo').map((r) => r.submission.id)).toEqual(['sub-a', 'sub-b']);
    expect(selectSubmissionsForClub(s, 'charite').map((r) => r.submission.id)).toEqual(['sub-other']);
    expect(selectSubmissionsForClub(s, 'khong-ton-tai')).toEqual([]);
  });
});

describe('selectModerationQueue', () => {
  it('lists pending submissions oldest first, joined with event and club', () => {
    const queue = selectModerationQueue(withSubmissions());
    expect(queue.map((q) => [q.submission.id, q.event.id, q.club?.id])).toEqual([
      ['sub-001', 'ev-s1', 'novaris-project'],
      ['sub-002', 'ev-s2', 'kat-music-club'],
      ['sub-003', 'ev-s3', 'bot-va-bo'],
    ]);
    expect(queue[0]?.club).toBe(CLUBS.find((c) => c.id === 'novaris-project'));
    expect(queue.every((q) => q.event.status === 'pending')).toBe(true);
    // Nothing waits for moderation in the sample data.
    expect(selectModerationQueue(createDemoState())).toEqual([]);
  });

  it('follows reviews and resubmissions', () => {
    let s = reducer(withSubmissions(), { type: 'moderation/review', submissionId: 'sub-001', action: 'approve', at: AT });
    s = reducer(s, { type: 'moderation/review', submissionId: 'sub-002', action: 'reject', reason: REASON, at: AT });
    expect(selectModerationQueue(s).map((q) => q.submission.id)).toEqual(['sub-003']);

    const edited = { ...submitted('ev-s4'), capacity: 30 };
    s = reducer(s, { type: 'submission/resubmit', submissionId: 'sub-004', event: edited, at: AT });
    const queue = selectModerationQueue(s);
    // sub-004 was first submitted on 02/10, before sub-003.
    expect(queue.map((q) => q.submission.id)).toEqual(['sub-004', 'sub-003']);
    expect(queue[0]?.event.capacity).toBe(30);
    expect(queue[0]?.submission.history.at(-1)?.action).toBe('resubmit');
  });

  it('includes new club submissions, with a null club when the club is unknown, and skips unknown events', () => {
    const s = stateWith({
      submittedEvents: [makeEvent({ id: 'ev-x', status: 'pending' }), makeEvent({ id: 'ev-y', status: 'pending' })],
      submissions: [
        submission('sub-b', 'ev-x', { clubId: 'clb-moi' }),
        submission('sub-a', 'ev-y'),
        submission('sub-ghost', 'ev-ghost'),
      ],
    });
    const queue = selectModerationQueue(s);
    expect(queue.map((q) => [q.submission.id, q.club?.id ?? null])).toEqual([
      ['sub-a', 'bot-va-bo'],
      ['sub-b', null],
    ]);
  });

  it('is empty when nothing is pending', () => {
    const s = withSubmissions({ moderation: { 'ev-s1': 'approved', 'ev-s2': 'approved', 'ev-s3': 'rejected' } });
    expect(selectModerationQueue(s)).toEqual([]);
  });
});

describe('newsletter selectors', () => {
  const published = makePost({ id: 'bt-demo-a', slug: 'bai-a', publishedAt: '2026-10-06T08:00:00+07:00', eventIds: ['ev-018'], clubIds: ['tranh-bien'] });
  // Published in the demo by the real clock later on the demo day (the demo clock reads 09:00).
  const laterToday = makePost({ id: 'bt-demo-b', slug: 'bai-b', publishedAt: '2026-10-07T13:51:00+07:00', eventIds: ['ev-018'] });
  const state: AppState = { ...createDemoState(), newsPosts: [published, laterToday] };
  const scheduledSeed = NEWS.filter((p) => toMillis(p.publishedAt) > NOW);

  it('merges seed articles published by now with every council article, newest first', () => {
    const news = selectNews(state, NOW);
    expect(news.map((p) => p.id)).toEqual(expect.arrayContaining(['bt-demo-a', 'bt-demo-b']));
    expect(scheduledSeed.length).toBeGreaterThan(0);
    for (const p of scheduledSeed) expect(news.map((x) => x.id)).not.toContain(p.id);
    expect(news.length).toBe(NEWS.length - scheduledSeed.length + 2);
    const times = news.map((p) => toMillis(p.publishedAt));
    expect([...times].sort((a, b) => b - a)).toEqual(times);
  });

  it('puts the later of two articles published at the same instant first', () => {
    const first = makePost({ id: 'bt-zzzz', slug: 'bai-mot', publishedAt: AT });
    const second = makePost({ id: 'bt-0000', slug: 'bai-hai', publishedAt: AT });
    const news = selectNews({ ...createDemoState(), newsPosts: [first, second] }, NOW);
    expect(news.slice(0, 2).map((p) => p.id)).toEqual(['bt-0000', 'bt-zzzz']);
  });

  it('finds visible articles by slug only', () => {
    expect(selectNewsBySlug(state, 'bai-a', NOW)?.id).toBe('bt-demo-a');
    expect(selectNewsBySlug(state, 'bai-b', NOW)?.id).toBe('bt-demo-b');
    const seed = scheduledSeed[0];
    if (seed) expect(selectNewsBySlug(state, seed.slug, NOW)).toBeUndefined();
  });

  it('lists every slug in use, scheduled included', () => {
    const slugs = selectNewsSlugs(state);
    expect(slugs.has('bai-a')).toBe(true);
    expect(slugs.has('bai-b')).toBe(true);
    for (const p of scheduledSeed) expect(slugs.has(p.slug)).toBe(true);
    expect(slugs.size).toBe(NEWS.length + 2);
  });

  it('finds visible articles about an event or a club', () => {
    expect(selectNewsForEvent(state, 'ev-018', NOW).map((p) => p.id)).toEqual(expect.arrayContaining(['bt-demo-a', 'bt-demo-b']));
    expect(selectNewsForClub(state, 'tranh-bien', NOW).map((p) => p.id)).toContain('bt-demo-a');
    expect(selectNewsForClub(state, 'tranh-bien', NOW).map((p) => p.id)).not.toContain('bt-demo-b');
  });
});

describe('proposal selectors', () => {
  const sent = {
    id: 'dx-demo-1',
    title: 'Giải Cờ tướng học sinh',
    category: 'TT' as const,
    description: 'Đề xuất tổ chức giải Cờ tướng dành cho học sinh toàn trường vào buổi chiều thứ Bảy.',
    grades: [6, 7, 8] as Grade[],
    clubId: 'bot-va-bo',
    authorGrade: 7 as const,
    submittedAt: AT,
    supporters: 0,
  };

  it('lists pending proposals first, most supported first, with my support and my own proposals', () => {
    const state = stateWith({ proposals: [sent], supportedProposals: ['dx-006'] });
    const views = selectActivityProposals(state);
    const statuses = views.map((v) => v.status);
    expect(statuses.indexOf('accepted')).toBeGreaterThan(statuses.lastIndexOf('pending'));
    expect(statuses.indexOf('declined')).toBeGreaterThan(statuses.lastIndexOf('accepted'));
    const pending = views.filter((v) => v.status === 'pending').map((v) => v.support);
    expect([...pending].sort((a, b) => b - a)).toEqual(pending);
    expect(views.find((v) => v.proposal.id === 'dx-006')).toMatchObject({ supportedByMe: true, support: 13, mine: false });
    expect(views.find((v) => v.proposal.id === 'dx-demo-1')).toMatchObject({ mine: true, status: 'pending', response: null });
    expect(views.find((v) => v.proposal.id === 'dx-001')?.response).toMatchObject({ status: 'accepted', assignedClubId: null });
    expect(selectPendingActivityCount(state)).toBe(views.filter((v) => v.status === 'pending').length);
  });

  it('applies answers given in the demo over the sample ones', () => {
    const state = stateWith({ proposalResponses: { 'dx-002': { status: 'declined', at: AT, by: 'hdhs', note: 'Chưa phù hợp với kế hoạch.', assignedClubId: null } } });
    expect(selectProposalResponses(state)['dx-001']?.status).toBe('accepted');
    expect(selectActivityProposals(state).find((v) => v.proposal.id === 'dx-002')?.status).toBe('declined');
  });

  it("splits a club's collaborations into received and sent", () => {
    const base = { category: 'TN' as const, description: 'Hai câu lạc bộ phối hợp tổ chức hoạt động gây quỹ thiện nguyện.', month: '2026-12', submittedAt: AT };
    const received = { ...base, id: 'ht-901', fromClubId: 'charite', toClubId: 'bot-va-bo', title: 'Hội chợ bánh gây quỹ' };
    const sent = { ...base, id: 'ht-902', fromClubId: 'bot-va-bo', toClubId: 'green-guardian', title: 'Ngày hội sống xanh' };
    const state = stateWith({
      collaborations: [received, sent],
      proposalResponses: { 'ht-902': { status: 'accepted', at: AT, by: 'green-guardian', note: 'Câu lạc bộ đồng ý phối hợp.', assignedClubId: null } },
    });
    const { incoming, outgoing } = selectClubCollaborations(state, 'bot-va-bo');
    expect(incoming.map((v) => v.proposal.id)).toEqual(['ht-901']);
    expect(outgoing.find((v) => v.proposal.id === 'ht-902')?.status).toBe('accepted');
    expect(selectCollaborations(state)).toHaveLength(2);
    // The sample data sends nothing in a real club's name.
    expect(selectCollaborations(createDemoState())).toEqual([]);
  });

  it('finds the student proposals that name a club or were handed to it', () => {
    const state = stateWith({
      proposals: [sent],
      proposalResponses: { 'dx-002': { status: 'accepted', at: AT, by: 'hdhs', note: 'Đề xuất được chuyển tới câu lạc bộ phù hợp.', assignedClubId: 'humans-of-vinschool-smart-city' } },
    });
    expect(selectProposalsForClub(state, 'bot-va-bo').map((v) => v.proposal.id)).toEqual(['dx-demo-1']);
    expect(selectProposalsForClub(state, 'humans-of-vinschool-smart-city').map((v) => v.proposal.id)).toEqual(['dx-002']);
  });
});
