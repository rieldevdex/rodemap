/**
 * Pure selectors over AppState: `(state, now?) → value`. They merge the static sample data
 * (EVENTS, CLUBS, GOALS) with the persisted demo state and never read the clock themselves.
 */
import { CLUBS } from '../data/clubs';
import { EVENTS } from '../data/events';
import { GOALS } from '../data/goals';
import { budgetStatus, DEFAULT_WEEKLY_HOUR_BUDGET, type BudgetStatus } from '../domain/budget';
import { allConflicts } from '../domain/conflicts';
import { addDays, startOfIsoWeek, toMillis } from '../domain/dates';
import { findRegistration, isPast, isRegistered, sortByStart } from '../domain/events';
import { firstRoute, type PlanProposal } from '../domain/planner';
import { pendingAttendance } from '../domain/portfolio';
import { recommendEvents, type RecommendContext, type RecommendOptions } from '../domain/recommend';
import type {
  Club,
  Conflict,
  EventStatus,
  Millis,
  Recommendation,
  Registration,
  SchoolEvent,
  Submission,
} from '../domain/types';
import type { AppState } from './schema';

/* ── Clock ──────────────────────────────────────────────────────────── */

/**
 * The demo clock: demoToday at 09:00 in Vietnam when set, otherwise the real time.
 * An unreadable demoToday (corrupt storage) falls back to the real time instead of throwing.
 */
export function selectNow(state: AppState, realNow: Millis): Millis {
  if (state.demoToday === null) return realNow;
  try {
    return toMillis(`${state.demoToday}T09:00:00+07:00`);
  } catch {
    return realNow;
  }
}

/* ── Events ─────────────────────────────────────────────────────────── */

/**
 * Every known event with its effective status. Seed EVENTS keep their order; a submitted copy
 * with the same id replaces the seed event in place, other submitted events follow in
 * submission order. The status is `state.moderation[id]` when set, else the event's own.
 */
export function selectAllEvents(state: AppState): SchoolEvent[] {
  const submittedById = new Map(state.submittedEvents.map((e) => [e.id, e]));
  const seedIds = new Set(EVENTS.map((e) => e.id));
  const merged = [
    ...EVENTS.map((e) => submittedById.get(e.id) ?? e),
    ...state.submittedEvents.filter((e) => !seedIds.has(e.id)),
  ];
  return merged.map((e) => {
    const status = state.moderation[e.id] ?? e.status;
    return status === e.status ? e : { ...e, status };
  });
}

/** Approved events (visible to students), sorted by start then id. */
export function selectPublicEvents(state: AppState): SchoolEvent[] {
  return sortByStart(selectAllEvents(state).filter((e) => e.status === 'approved'));
}

/**
 * The event behind a URL slug, whatever its status (the page decides what to show).
 * When several events share a slug, the approved one wins, then the first in selectAllEvents order.
 */
export function selectEventBySlug(state: AppState, slug: string): SchoolEvent | undefined {
  const matches = selectAllEvents(state).filter((e) => e.slug === slug);
  return matches.find((e) => e.status === 'approved') ?? matches[0];
}

/** Any event by id, with its effective status. */
export function selectEventById(state: AppState, id: string): SchoolEvent | undefined {
  return selectAllEvents(state).find((e) => e.id === id);
}

/** A club's approved events, sorted by start then id. */
export function selectEventsForClub(state: AppState, clubId: string): SchoolEvent[] {
  return selectPublicEvents(state).filter((e) => e.clubId === clubId);
}

/* ── Clubs ──────────────────────────────────────────────────────────── */

export function selectClub(_state: AppState, id: string): Club | undefined {
  return CLUBS.find((c) => c.id === id);
}

export function selectClubBySlug(_state: AppState, slug: string): Club | undefined {
  return CLUBS.find((c) => c.slug === slug);
}

/* ── The student's plan ─────────────────────────────────────────────── */

export function selectRegistration(state: AppState, eventId: string): Registration | undefined {
  return findRegistration(eventId, state.registrations);
}

/** Approved events the student registered for or attended, sorted by start then id. */
export function selectMyEvents(state: AppState): SchoolEvent[] {
  return selectPublicEvents(state).filter((e) => isRegistered(e.id, state.registrations));
}

/** My events that have not ended yet: the plan used for recommendations, budget and first route. */
export function selectUpcomingMine(state: AppState, now: Millis): SchoolEvent[] {
  return selectMyEvents(state).filter((e) => !isPast(e, now));
}

/** Overlapping pairs among my events (see allConflicts for the order). */
export function selectConflictsInPlan(state: AppState): Conflict[] {
  return allConflicts(selectMyEvents(state));
}

/** Hours used this ISO week by my upcoming events, against the profile budget (6 hours without a profile). */
export function selectPlanBudget(state: AppState, now: Millis): BudgetStatus {
  const budget = state.profile?.weeklyHourBudget ?? DEFAULT_WEEKLY_HOUR_BUDGET;
  return budgetStatus(selectUpcomingMine(state, now), budget, now);
}

function recommendContext(state: AppState, now: Millis): RecommendContext {
  return {
    profile: state.profile,
    plan: selectUpcomingMine(state, now),
    regs: state.registrations,
    now,
    goals: GOALS,
  };
}

/** Mochi's recommendations over approved events, with my upcoming events as the plan. */
export function selectRecommendations(state: AppState, now: Millis, opts: RecommendOptions = {}): Recommendation[] {
  return recommendEvents(selectPublicEvents(state), recommendContext(state, now), opts);
}

/** Onboarding's first route (planner.firstRoute) with my upcoming events as the plan. */
export function selectFirstRoute(state: AppState, now: Millis, size?: number): PlanProposal {
  return firstRoute(selectPublicEvents(state), recommendContext(state, now), size);
}

/**
 * Approved events I have not registered for whose registration deadline falls in
 * [now, Monday 00:00 of next ISO week), sorted by deadline, then start, then id.
 */
export function selectDeadlinesThisWeek(state: AppState, now: Millis): SchoolEvent[] {
  const weekEnd = addDays(startOfIsoWeek(now), 7);
  return selectPublicEvents(state)
    .map((event) => ({ event, deadline: toMillis(event.registrationDeadline) }))
    .filter(
      ({ event, deadline }) => deadline >= now && deadline < weekEnd && !isRegistered(event.id, state.registrations),
    )
    .sort((a, b) => a.deadline - b.deadline)
    .map(({ event }) => event);
}

/** Past events still marked "registered" without a portfolio entry, by start. */
export function selectPendingAttendance(state: AppState, now: Millis): SchoolEvent[] {
  return pendingAttendance(selectAllEvents(state), state.registrations, state.portfolio, now);
}

/* ── Club portal and moderation ─────────────────────────────────────── */

export interface ClubSubmissionRow {
  submission: Submission;
  event: SchoolEvent;
  /** Effective status of the event (moderation override applied). */
  status: EventStatus;
}

export interface ModerationQueueItem {
  submission: Submission;
  event: SchoolEvent;
  /** The submitting club; null when the club id is not in CLUBS. */
  club: Club | null;
}

/** Submissions joined with their event; submissions whose event is unknown are left out. */
function joinSubmissions(state: AppState): { submission: Submission; event: SchoolEvent; submittedAt: Millis }[] {
  const eventById = new Map(selectAllEvents(state).map((e) => [e.id, e]));
  return state.submissions.flatMap((submission) => {
    const event = eventById.get(submission.eventId);
    return event ? [{ submission, event, submittedAt: toMillis(submission.submittedAt) }] : [];
  });
}

/** A club's submissions with their event and effective status, newest submittedAt first (then id). */
export function selectSubmissionsForClub(state: AppState, clubId: string): ClubSubmissionRow[] {
  return joinSubmissions(state)
    .filter(({ submission }) => submission.clubId === clubId)
    .sort((a, b) => b.submittedAt - a.submittedAt || a.submission.id.localeCompare(b.submission.id))
    .map(({ submission, event }) => ({ submission, event, status: event.status }));
}

/** Submissions whose event is pending review, oldest submittedAt first (then id). */
export function selectModerationQueue(state: AppState): ModerationQueueItem[] {
  const clubById = new Map(CLUBS.map((c) => [c.id, c]));
  return joinSubmissions(state)
    .filter(({ event }) => event.status === 'pending')
    .sort((a, b) => a.submittedAt - b.submittedAt || a.submission.id.localeCompare(b.submission.id))
    .map(({ submission, event }) => ({ submission, event, club: clubById.get(submission.clubId) ?? null }));
}
