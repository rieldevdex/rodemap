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
import type { SchoolEvent, Submission } from '../domain/types';
import { reducer } from './reducer';
import { createSeedState, type AppState } from './schema';
import {
  selectAllEvents,
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
  selectPendingAttendance,
  selectPlanBudget,
  selectPublicEvents,
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
  return { ...createSeedState(), ...overrides };
}

function submission(id: string, eventId: string, overrides: Partial<Submission> = {}): Submission {
  return {
    id,
    eventId,
    clubId: 'inkstep',
    submittedAt: AT,
    history: [{ at: AT, actor: 'club', action: 'submit' }],
    ...overrides,
  };
}

const approvedSeed = EVENTS.filter((e) => e.status === 'approved');

describe('selectNow', () => {
  it('follows the real clock without a demo date', () => {
    expect(selectNow(createSeedState(), 1_234_567)).toBe(1_234_567);
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
    const all = selectAllEvents(createSeedState());
    expect(all).toHaveLength(EVENTS.length);
    all.forEach((e, i) => {
      expect(e).toBe(EVENTS[i]);
    });
  });

  it('applies moderation overrides without mutating the seed data', () => {
    const s = stateWith({ moderation: { 'ev-046': 'approved', 'ev-001': 'approved', 'ev-ghost': 'rejected' } });
    const all = selectAllEvents(s);
    expect(all).toHaveLength(EVENTS.length);
    const ev046 = all.find((e) => e.id === 'ev-046');
    expect(ev046).toEqual({ ...seedEvent('ev-046'), status: 'approved' });
    expect(ev046).not.toBe(seedEvent('ev-046'));
    expect(seedEvent('ev-046').status).toBe('pending');
    // An override equal to the current status keeps the original object.
    expect(all.find((e) => e.id === 'ev-001')).toBe(seedEvent('ev-001'));
  });

  it('replaces a seed event in place with its submitted copy, then appends new submitted events', () => {
    const copy: SchoolEvent = { ...seedEvent('ev-049'), location: 'Phòng Tin học 2', status: 'pending' };
    const created = makeEvent({ id: 'ev-created', status: 'pending' });
    const created2 = makeEvent({ id: 'ev-created-2', status: 'approved' });
    const s = stateWith({ submittedEvents: [created, copy, created2] });
    const all = selectAllEvents(s);
    expect(all).toHaveLength(EVENTS.length + 2);
    const index = EVENTS.findIndex((e) => e.id === 'ev-049');
    expect(all[index]).toBe(copy);
    expect(ids(all.slice(-2))).toEqual(['ev-created', 'ev-created-2']);
    expect(all.filter((e) => e.id === 'ev-049')).toHaveLength(1);
  });

  it('lets the moderation override win over the submitted copy status', () => {
    const copy: SchoolEvent = { ...seedEvent('ev-049'), status: 'pending' };
    const s = stateWith({ submittedEvents: [copy], moderation: { 'ev-049': 'approved' } });
    expect(selectEventById(s, 'ev-049')).toEqual({ ...copy, status: 'approved' });
  });
});

describe('selectPublicEvents', () => {
  it('lists approved events only, sorted by start', () => {
    const pub = selectPublicEvents(createSeedState());
    expect(ids(pub)).toEqual(ids(sortByStart(approvedSeed)));
    expect(pub.every((e) => e.status === 'approved')).toBe(true);
    expect(ids(pub)).not.toContain('ev-046');
  });

  it('honours moderation overrides and submitted events', () => {
    const created = makeEvent({ id: 'ev-created', start: '2026-09-01T16:45:00+07:00', end: '2026-09-01T18:00:00+07:00' });
    const s = stateWith({
      moderation: { 'ev-046': 'approved', 'ev-001': 'rejected', 'ev-created': 'approved' },
      submittedEvents: [{ ...created, status: 'pending' }],
    });
    const pubIds = ids(selectPublicEvents(s));
    expect(pubIds).toContain('ev-046');
    expect(pubIds).not.toContain('ev-001');
    expect(pubIds[0]).toBe('ev-created');
  });
});

describe('selectEventBySlug / selectEventById', () => {
  it('finds events by slug or id, whatever their status', () => {
    const s = createSeedState();
    const ev014 = seedEvent('ev-014');
    expect(selectEventBySlug(s, ev014.slug)).toBe(ev014);
    expect(selectEventBySlug(s, seedEvent('ev-046').slug)?.status).toBe('pending');
    expect(selectEventById(s, 'ev-014')).toBe(ev014);
    expect(selectEventById(s, 'ev-050')?.status).toBe('rejected');
  });

  it('returns undefined for unknown slugs and ids', () => {
    const s = createSeedState();
    expect(selectEventBySlug(s, 'khong-ton-tai')).toBeUndefined();
    expect(selectEventById(s, 'ev-404')).toBeUndefined();
  });

  it('prefers the approved event when slugs collide, else the first one', () => {
    const slug = seedEvent('ev-014').slug;
    const pendingTwin = makeEvent({ id: 'ev-twin', slug, status: 'pending' });
    const s = stateWith({ submittedEvents: [pendingTwin] });
    expect(selectEventBySlug(s, slug)?.id).toBe('ev-014');

    const a = makeEvent({ id: 'ev-a', slug: 'trung-ten', status: 'pending' });
    const b = makeEvent({ id: 'ev-b', slug: 'trung-ten', status: 'approved' });
    const c = makeEvent({ id: 'ev-c', slug: 'trung-ten', status: 'rejected' });
    expect(selectEventBySlug(stateWith({ submittedEvents: [a, b, c] }), 'trung-ten')?.id).toBe('ev-b');
    expect(selectEventBySlug(stateWith({ submittedEvents: [a, c] }), 'trung-ten')?.id).toBe('ev-a');
  });

  it('reflects the moderation override', () => {
    const s = stateWith({ moderation: { 'ev-046': 'approved' } });
    expect(selectEventById(s, 'ev-046')?.status).toBe('approved');
    expect(selectEventBySlug(s, seedEvent('ev-046').slug)?.status).toBe('approved');
  });
});

describe('selectEventsForClub', () => {
  it('lists the club approved events sorted by start', () => {
    const s = createSeedState();
    const inkstep = selectEventsForClub(s, 'inkstep');
    expect(ids(inkstep)).toEqual(ids(sortByStart(approvedSeed.filter((e) => e.clubId === 'inkstep'))));
    expect(ids(inkstep)).toContain('ev-014');
    expect(ids(inkstep)).not.toContain('ev-048');
    expect(ids(inkstep)).not.toContain('ev-049');
  });

  it('includes events approved through moderation and returns [] for an unknown club', () => {
    const s = stateWith({ moderation: { 'ev-048': 'approved' } });
    expect(ids(selectEventsForClub(s, 'inkstep'))).toContain('ev-048');
    expect(selectEventsForClub(s, 'clb-khong-ton-tai')).toEqual([]);
  });
});

describe('selectClub / selectClubBySlug', () => {
  it('finds clubs by id and slug', () => {
    const s = createSeedState();
    const inkstep = CLUBS.find((c) => c.id === 'inkstep');
    expect(inkstep).toBeDefined();
    expect(selectClub(s, 'inkstep')).toBe(inkstep);
    expect(selectClubBySlug(s, 'inkstep')).toBe(inkstep);
    const robotics = CLUBS.find((c) => c.id === 'robotics');
    expect(selectClubBySlug(s, robotics?.slug ?? '')).toBe(robotics);
  });

  it('returns undefined for unknown clubs', () => {
    const s = createSeedState();
    expect(selectClub(s, 'khong-ton-tai')).toBeUndefined();
    expect(selectClubBySlug(s, 'khong-ton-tai')).toBeUndefined();
  });
});

describe('selectRegistration', () => {
  it('returns the registration for an event, or undefined', () => {
    const s = createSeedState();
    expect(selectRegistration(s, 'ev-014')?.status).toBe('registered');
    expect(selectRegistration(s, 'ev-005')?.status).toBe('attended');
    expect(selectRegistration(s, 'ev-016')).toBeUndefined();
  });
});

describe('selectMyEvents / selectUpcomingMine', () => {
  it('lists registered and attended approved events, sorted by start', () => {
    expect(ids(selectMyEvents(createSeedState()))).toEqual(['ev-005', 'ev-006', 'ev-007', 'ev-009', 'ev-014', 'ev-020']);
  });

  it('leaves out absences, unknown events and events that are not approved', () => {
    const s = stateWith({
      registrations: [reg('ev-014'), reg('ev-009', 'absent'), reg('ev-404'), reg('ev-046'), reg('ev-005', 'attended')],
    });
    expect(ids(selectMyEvents(s))).toEqual(['ev-005', 'ev-014']);
  });

  it('keeps upcoming events only (an event in progress is still upcoming)', () => {
    const s = createSeedState();
    expect(ids(selectUpcomingMine(s, NOW))).toEqual(['ev-014', 'ev-020']);
    expect(ids(selectUpcomingMine(s, toMillis('2026-10-15T17:00:00+07:00')))).toEqual(['ev-014', 'ev-020']);
    expect(ids(selectUpcomingMine(s, toMillis('2026-10-15T18:30:00+07:00')))).toEqual(['ev-020']);
    expect(selectUpcomingMine(s, toMillis('2027-06-01T00:00:00+07:00'))).toEqual([]);
  });
});

describe('selectConflictsInPlan', () => {
  it('is empty for the seed plan', () => {
    expect(selectConflictsInPlan(createSeedState())).toEqual([]);
  });

  it('reports overlapping registrations', () => {
    const s = reducer(createSeedState(), { type: 'registration/register', eventId: 'ev-015', at: AT });
    expect(selectConflictsInPlan(s)).toEqual([{ a: 'ev-014', b: 'ev-015', overlapMinutes: 90 }]);
  });
});

describe('selectPlanBudget', () => {
  it('counts my upcoming events in the current ISO week against the profile budget', () => {
    const s = createSeedState();
    expect(selectPlanBudget(s, NOW)).toEqual({ weekKey: '2026-W41', used: 0, budget: 6, remaining: 6 });
    // ev-014 (16:45–18:30) falls in 2026-W42.
    const tuesday = toMillis('2026-10-13T09:00:00+07:00');
    expect(selectPlanBudget(s, tuesday)).toEqual({ weekKey: '2026-W42', used: 1.75, budget: 6, remaining: 4.25 });
  });

  it('stops counting an event once it has ended', () => {
    const after = toMillis('2026-10-15T19:00:00+07:00');
    expect(selectPlanBudget(createSeedState(), after).used).toBe(0);
  });

  it('uses the profile budget, or 6 hours without a profile', () => {
    const tuesday = toMillis('2026-10-13T09:00:00+07:00');
    const custom = stateWith({ profile: makeProfile({ weeklyHourBudget: 1 }) });
    expect(selectPlanBudget(custom, tuesday)).toEqual({ weekKey: '2026-W42', used: 1.75, budget: 1, remaining: 0 });
    expect(selectPlanBudget(stateWith({ profile: null }), tuesday).budget).toBe(6);
  });
});

describe('selectRecommendations', () => {
  it('wires recommendEvents with the public events, my upcoming plan and GOALS', () => {
    const s = createSeedState();
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
    const s = createSeedState();
    expect(selectRecommendations(s, NOW, { limit: 2 })).toHaveLength(2);
    const tn = selectRecommendations(s, NOW, { category: 'TN', limit: 50 });
    expect(tn.length).toBeGreaterThan(0);
    expect(tn.every((r) => r.event.category === 'TN')).toBe(true);
  });

  it('warns about clashes with my upcoming events', () => {
    const clash = makeEvent({
      id: 'ev-clash',
      start: '2026-10-15T17:30:00+07:00',
      end: '2026-10-15T19:00:00+07:00',
      registrationDeadline: '2026-10-14T23:59:00+07:00',
    });
    const s = stateWith({ submittedEvents: [clash] });
    const from = toMillis('2026-10-15T00:00:00+07:00');
    const to = toMillis('2026-10-16T00:00:00+07:00');
    const rec = selectRecommendations(s, NOW, { from, to, limit: 50 }).find((r) => r.event.id === 'ev-clash');
    expect(rec?.warnings).toContain('conflict');
  });

  it('only recommends events approved through moderation', () => {
    const range = { from: toMillis('2026-11-26T00:00:00+07:00'), to: toMillis('2026-11-27T00:00:00+07:00'), limit: 50 };
    expect(ids(selectRecommendations(createSeedState(), NOW, range).map((r) => r.event))).not.toContain('ev-046');
    const approved = stateWith({ moderation: { 'ev-046': 'approved' } });
    expect(ids(selectRecommendations(approved, NOW, range).map((r) => r.event))).toContain('ev-046');
  });
});

describe('selectFirstRoute', () => {
  it('wires planner.firstRoute with my upcoming plan and GOALS', () => {
    const s = createSeedState();
    const ctx = { profile: s.profile, plan: selectUpcomingMine(s, NOW), regs: s.registrations, now: NOW, goals: GOALS };
    const route = selectFirstRoute(s, NOW);
    expect(route).toEqual(firstRoute(selectPublicEvents(s), ctx));
    expect(route.accepted.length).toBeGreaterThan(0);
    expect(route.accepted.length).toBeLessThanOrEqual(4);
    for (const e of route.accepted) expect(selectRegistration(s, e.id)).toBeUndefined();
  });

  it('accepts a route size', () => {
    const s = createSeedState();
    expect(selectFirstRoute(s, NOW, 1).accepted).toHaveLength(1);
  });

  it('works without a profile', () => {
    const route = selectFirstRoute(stateWith({ profile: null, registrations: [] }), NOW);
    expect(route.accepted.length).toBeGreaterThan(0);
  });
});

describe('selectDeadlinesThisWeek', () => {
  it('lists unregistered approved events closing before next Monday, by deadline', () => {
    // ev-011 and ev-012 close 08/10 23:59; ev-013 closes 12/10 23:59 (next week).
    expect(ids(selectDeadlinesThisWeek(createSeedState(), NOW))).toEqual(['ev-011', 'ev-012']);
  });

  it('leaves out registered events', () => {
    const s = reducer(createSeedState(), { type: 'registration/register', eventId: 'ev-012', at: AT });
    expect(ids(selectDeadlinesThisWeek(s, NOW))).toEqual(['ev-011']);
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
    const s = stateWith({ submittedEvents: [sunday, monday, passed, pending, atNow] });
    expect(ids(selectDeadlinesThisWeek(s, NOW))).toEqual(['ev-at-now', 'ev-011', 'ev-012', 'ev-sunday']);
  });

  it('keeps the start order for equal deadlines and is empty late on Sunday', () => {
    const lateSunday = toMillis('2026-10-11T23:00:00+07:00');
    expect(selectDeadlinesThisWeek(createSeedState(), lateSunday)).toEqual([]);
    // Same deadline as ev-011/ev-012 but a later start: start order wins over the id order.
    const twin = makeEvent({
      id: 'ev-000',
      start: '2026-10-10T09:00:00+07:00',
      end: '2026-10-10T10:00:00+07:00',
      registrationDeadline: '2026-10-08T23:59:00+07:00',
    });
    expect(ids(selectDeadlinesThisWeek(stateWith({ submittedEvents: [twin] }), NOW))).toEqual(['ev-011', 'ev-012', 'ev-000']);
  });
});

describe('selectPendingAttendance', () => {
  it('lists past registered events without an entry', () => {
    expect(ids(selectPendingAttendance(createSeedState(), NOW))).toEqual(['ev-009']);
  });

  it('drops events once attendance is confirmed, marked absent or already in the portfolio', () => {
    const s = createSeedState();
    const attended = reducer(s, {
      type: 'registration/markAttended',
      eventId: 'ev-009',
      entry: {
        id: 'pf-009',
        eventId: 'ev-009',
        category: 'KN',
        role: 'Thành viên tham gia',
        hours: 3.5,
        reflection: '',
        reflectionSource: 'mochi_draft',
        evidenceLinks: [],
        createdAt: AT,
        updatedAt: AT,
      },
    });
    expect(selectPendingAttendance(attended, NOW)).toEqual([]);
    expect(selectPendingAttendance(reducer(s, { type: 'registration/markAbsent', eventId: 'ev-009' }), NOW)).toEqual([]);
    expect(selectPendingAttendance(stateWith({ portfolio: attended.portfolio }), NOW)).toEqual([]);
  });

  it('adds upcoming registrations once they have ended', () => {
    const later = toMillis('2026-10-16T09:00:00+07:00');
    expect(ids(selectPendingAttendance(createSeedState(), later))).toEqual(['ev-009', 'ev-014']);
  });
});

describe('selectSubmissionsForClub', () => {
  it('joins each submission with its event and effective status, newest first', () => {
    const rows = selectSubmissionsForClub(createSeedState(), 'inkstep');
    expect(rows.map((r) => [r.submission.id, r.event.id, r.status])).toEqual([
      ['sub-003', 'ev-048', 'pending'],
      ['sub-004', 'ev-049', 'changes_requested'],
    ]);
    expect(rows[0]?.event).toBe(seedEvent('ev-048'));
  });

  it('reflects reviews, resubmitted copies and new submissions', () => {
    let s = reducer(createSeedState(), { type: 'moderation/review', submissionId: 'sub-003', action: 'approve', at: AT });
    const edited = { ...seedEvent('ev-049'), location: 'Phòng Tin học 2' };
    s = reducer(s, { type: 'submission/resubmit', submissionId: 'sub-004', event: edited, at: AT });
    const created = makeEvent({ id: 'ev-created', clubId: 'inkstep' });
    s = reducer(s, {
      type: 'submission/create',
      event: created,
      submission: submission('sub-created', 'ev-created', { submittedAt: '2026-10-07T10:00:00+07:00' }),
    });
    const rows = selectSubmissionsForClub(s, 'inkstep');
    expect(rows.map((r) => [r.submission.id, r.status])).toEqual([
      ['sub-created', 'pending'],
      ['sub-003', 'approved'],
      ['sub-004', 'pending'],
    ]);
    expect(rows[2]?.event.location).toBe('Phòng Tin học 2');
    expect(rows[1]?.event.status).toBe('approved');
  });

  it('breaks ties by id, leaves out unknown events and other clubs', () => {
    const s = stateWith({
      submittedEvents: [makeEvent({ id: 'ev-x', status: 'pending' }), makeEvent({ id: 'ev-y', status: 'pending' })],
      submissions: [
        submission('sub-b', 'ev-x'),
        submission('sub-a', 'ev-y'),
        submission('sub-ghost', 'ev-ghost'),
        submission('sub-other', 'ev-x', { clubId: 'robotics' }),
      ],
    });
    expect(selectSubmissionsForClub(s, 'inkstep').map((r) => r.submission.id)).toEqual(['sub-a', 'sub-b']);
    expect(selectSubmissionsForClub(s, 'robotics').map((r) => r.submission.id)).toEqual(['sub-other']);
    expect(selectSubmissionsForClub(s, 'khong-ton-tai')).toEqual([]);
  });
});

describe('selectModerationQueue', () => {
  it('lists pending submissions oldest first, joined with event and club', () => {
    const queue = selectModerationQueue(createSeedState());
    expect(queue.map((q) => [q.submission.id, q.event.id, q.club?.id])).toEqual([
      ['sub-001', 'ev-046', 'robotics'],
      ['sub-002', 'ev-047', 'am-nhac'],
      ['sub-003', 'ev-048', 'inkstep'],
    ]);
    expect(queue[0]?.club).toBe(CLUBS.find((c) => c.id === 'robotics'));
    expect(queue.every((q) => q.event.status === 'pending')).toBe(true);
  });

  it('follows reviews and resubmissions', () => {
    let s = reducer(createSeedState(), { type: 'moderation/review', submissionId: 'sub-001', action: 'approve', at: AT });
    s = reducer(s, { type: 'moderation/review', submissionId: 'sub-002', action: 'reject', reason: REASON, at: AT });
    expect(selectModerationQueue(s).map((q) => q.submission.id)).toEqual(['sub-003']);

    const edited = { ...seedEvent('ev-049'), capacity: 30 };
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
      ['sub-a', 'inkstep'],
      ['sub-b', null],
    ]);
  });

  it('is empty when nothing is pending', () => {
    const s = stateWith({ moderation: { 'ev-046': 'approved', 'ev-047': 'approved', 'ev-048': 'rejected' } });
    expect(selectModerationQueue(s)).toEqual([]);
  });
});

describe('newsletter selectors', () => {
  const published = makePost({ id: 'bt-demo-a', slug: 'bai-a', publishedAt: '2026-10-06T08:00:00+07:00', eventIds: ['ev-018'], clubIds: ['tranh-bien'] });
  // Published in the demo by the real clock later on the demo day (the demo clock reads 09:00).
  const laterToday = makePost({ id: 'bt-demo-b', slug: 'bai-b', publishedAt: '2026-10-07T13:51:00+07:00', eventIds: ['ev-018'] });
  const state: AppState = { ...createSeedState(), newsPosts: [published, laterToday] };
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
    const news = selectNews({ ...createSeedState(), newsPosts: [first, second] }, NOW);
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
