/** Mochi's event recommendations: hard filters, transparent scoring, reasons and warnings. Pure. */
import { DEFAULT_WEEKLY_HOUR_BUDGET, wouldExceedBudget } from './budget';
import { findConflicts } from './conflicts';
import {
  deadlineDaysLeft,
  eventStart,
  fitsAvailability,
  isDeadlinePassed,
  isEligible,
  isPast,
  isRegistered,
  seatsLeft,
  sortByStart,
} from './events';
import type {
  CategoryCode,
  Goal,
  GoalId,
  Millis,
  Profile,
  ReasonCode,
  Recommendation,
  Registration,
  SchoolEvent,
  WarningCode,
} from './types';

export interface RecommendContext {
  profile: Profile | null;
  /** The student's current plan (normally the registered events). */
  plan: SchoolEvent[];
  regs: Registration[];
  now: Millis;
  goals: Goal[];
}

export interface RecommendOptions {
  /** Default 5. */
  limit?: number;
  /** Only events starting at or after this time. */
  from?: Millis;
  /** Only events starting before this time. */
  to?: Millis;
  category?: CategoryCode;
}

export const DEFAULT_RECOMMEND_LIMIT = 5;
/** Points for the 1st, 2nd and 3rd ranked top interest. */
export const TOP_INTEREST_POINTS = [6, 4, 3] as const;
export const POINTS = {
  interest: 2,
  goal: 2,
  fitsTime: 1,
  balancesCategories: 1,
  deadlineSoon: 1,
  outsideAvailability: -3,
  conflict: -4,
  overBudget: -2,
} as const;
/** A deadline this many calendar days away (or fewer) is "sắp hết hạn". */
export const DEADLINE_SOON_DAYS = 7;
/** Seats left at or below this count raise the few_seats warning. */
export const FEW_SEATS_THRESHOLD = 5;

interface ProfileFacts {
  topRank: number | undefined;
  topPoints: number;
  interest: boolean;
  matchedGoals: GoalId[];
  /** null without a profile (availability unknown). */
  fitsTime: boolean | null;
}

const NO_PROFILE_FACTS: ProfileFacts = {
  topRank: undefined,
  topPoints: 0,
  interest: false,
  matchedGoals: [],
  fitsTime: null,
};

function profileFacts(e: SchoolEvent, profile: Profile, goals: readonly Goal[]): ProfileFacts {
  const rankIndex = profile.topInterests.slice(0, TOP_INTEREST_POINTS.length).indexOf(e.category);
  const topPoints = TOP_INTEREST_POINTS[rankIndex] ?? 0;
  const matchedGoals = profile.goals.filter((id) => {
    const goal = goals.find((g) => g.id === id);
    return goal?.tags.some((t) => e.tags.includes(t)) === true;
  });
  return {
    topRank: rankIndex >= 0 ? rankIndex + 1 : undefined,
    topPoints,
    interest: rankIndex < 0 && profile.interests.includes(e.category),
    matchedGoals,
    fitsTime: fitsAvailability(e, profile.availability),
  };
}

function passesHardFilters(e: SchoolEvent, ctx: RecommendContext, planIds: ReadonlySet<string>): boolean {
  return (
    e.status === 'approved' &&
    !isPast(e, ctx.now) &&
    !isDeadlinePassed(e, ctx.now) &&
    !isRegistered(e.id, ctx.regs) &&
    !planIds.has(e.id) &&
    isEligible(e, ctx.profile?.grade ?? null) &&
    seatsLeft(e, ctx.regs) > 0
  );
}

function matchesOptions(e: SchoolEvent, opts: RecommendOptions): boolean {
  const start = eventStart(e);
  if (opts.from !== undefined && start < opts.from) return false;
  if (opts.to !== undefined && start >= opts.to) return false;
  return opts.category === undefined || e.category === opts.category;
}

/** Plan events per category. */
function categoryCounts(plan: readonly SchoolEvent[]): Map<CategoryCode, number> {
  const counts = new Map<CategoryCode, number>();
  for (const e of plan) counts.set(e.category, (counts.get(e.category) ?? 0) + 1);
  return counts;
}

/**
 * Recommends upcoming approved events the student can still register for.
 *
 * Hard filters: approved, not past, deadline open, not registered, not already in the plan,
 * eligible for the profile's grade, at least one seat left; then `opts.from`/`opts.to`
 * (start in [from, to)) and `opts.category`.
 *
 * Score: top interest rank 1/2/3 → +6/+4/+3, other interest +2, goal tag match +2 (once),
 * fits availability +1 (else outside_availability −3), category count in the plan ≤ the lowest
 * count among the interests +1, deadline within 7 days +1, conflict with the plan −4, over the
 * weekly budget −2, ≤ 5 seats left → few_seats (no points).
 *
 * Order: score descending, then start, then id. Without a profile, interests, goals and
 * availability are ignored and results are ordered by start, then id.
 */
export function recommendEvents(
  events: readonly SchoolEvent[],
  ctx: RecommendContext,
  opts: RecommendOptions = {},
): Recommendation[] {
  const { profile, plan, regs, now } = ctx;
  const planIds = new Set(plan.map((e) => e.id));
  const counts = categoryCounts(plan);
  const countOf = (c: CategoryCode): number => counts.get(c) ?? 0;
  const interests = profile?.interests ?? [];
  const balanceCeiling = interests.length > 0 ? Math.min(...interests.map(countOf)) : 0;
  const budget = profile?.weeklyHourBudget ?? DEFAULT_WEEKLY_HOUR_BUDGET;

  const candidates = sortByStart(events.filter((e) => passesHardFilters(e, ctx, planIds) && matchesOptions(e, opts)));

  const recommendations = candidates.map((e): Recommendation => {
    const facts = profile ? profileFacts(e, profile, ctx.goals) : NO_PROFILE_FACTS;
    const reasonSignals: [ReasonCode, boolean, number][] = [
      ['top_interest', facts.topRank !== undefined, facts.topPoints],
      ['interest', facts.interest, POINTS.interest],
      ['goal', facts.matchedGoals.length > 0, POINTS.goal],
      ['fits_time', facts.fitsTime === true, POINTS.fitsTime],
      ['balances_categories', countOf(e.category) <= balanceCeiling, POINTS.balancesCategories],
      ['deadline_soon', deadlineDaysLeft(e, now) <= DEADLINE_SOON_DAYS, POINTS.deadlineSoon],
      ['grade_eligible', profile !== null, 0],
    ];
    const warningSignals: [WarningCode, boolean, number][] = [
      ['conflict', findConflicts(e, plan).length > 0, POINTS.conflict],
      ['over_budget', wouldExceedBudget(e, plan, budget), POINTS.overBudget],
      ['outside_availability', facts.fitsTime === false, POINTS.outsideAvailability],
      ['few_seats', seatsLeft(e, regs) <= FEW_SEATS_THRESHOLD, 0],
    ];
    const reasons = reasonSignals.filter(([, on]) => on);
    const warnings = warningSignals.filter(([, on]) => on);
    const score = [...reasons, ...warnings].reduce((sum, [, , points]) => sum + points, 0);
    const rec: Recommendation = {
      event: e,
      score,
      reasons: reasons.map(([code]) => code),
      warnings: warnings.map(([code]) => code),
    };
    if (facts.topRank !== undefined) rec.topRank = facts.topRank;
    if (facts.matchedGoals.length > 0) rec.matchedGoals = facts.matchedGoals;
    return rec;
  });

  // Candidates are already in start-then-id order and Array#sort is stable, so ties keep it.
  if (profile) recommendations.sort((x, y) => y.score - x.score);
  return recommendations.slice(0, Math.max(0, opts.limit ?? DEFAULT_RECOMMEND_LIMIT));
}
