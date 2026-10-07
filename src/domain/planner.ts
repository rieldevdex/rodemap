/** Calendar planning: greedy plan proposals with drop reasons and alternatives. Powers onboarding's
 * first route and Mochi's propose_calendar_plan. Pure; never mutates its inputs. */
import { DEFAULT_WEEKLY_HOUR_BUDGET, hoursByWeek, wouldExceedBudget } from './budget';
import { findConflicts } from './conflicts';
import { DAY_MS } from './dates';
import { eventStart, isDeadlinePassed, isEligible, isFull, isPast, isRegistered, sortByStart } from './events';
import { recommendEvents, type RecommendContext } from './recommend';
import type { CategoryCode, SchoolEvent } from './types';

export type DropReason = 'conflict' | 'over_budget' | 'full' | 'closed' | 'ineligible';

export interface DroppedCandidate {
  event: SchoolEvent;
  reason: DropReason;
  /** For 'conflict': the id of the plan or accepted event it overlaps. */
  conflictWith?: string;
}

export interface PlanAlternative {
  forEventId: string;
  event: SchoolEvent;
}

export interface PlanProposal {
  accepted: SchoolEvent[];
  dropped: DroppedCandidate[];
  /** Same category, fits the plan and budget, ≤ 21 days away; at most one per dropped event. */
  alternatives: PlanAlternative[];
  /** ISO week key → hours over plan + accepted. */
  hoursByWeek: Record<string, number>;
}

export type PlanContext = RecommendContext & { allEvents: SchoolEvent[]; budget: number };

/** An alternative must start within this many days of the event it replaces. */
export const ALTERNATIVE_WINDOW_DAYS = 21;
export const DEFAULT_FIRST_ROUTE_SIZE = 4;

/** Drop reasons that get an alternative suggestion. */
const REPLACEABLE: ReadonlySet<DropReason> = new Set<DropReason>(['conflict', 'over_budget', 'full']);

function dropReason(e: SchoolEvent, ctx: PlanContext, committed: readonly SchoolEvent[]): DroppedCandidate | null {
  if (isPast(e, ctx.now) || isDeadlinePassed(e, ctx.now)) return { event: e, reason: 'closed' };
  if (isFull(e, ctx.regs)) return { event: e, reason: 'full' };
  if (!isEligible(e, ctx.profile?.grade ?? null)) return { event: e, reason: 'ineligible' };
  const conflict = findConflicts(e, committed)[0];
  if (conflict) return { event: e, reason: 'conflict', conflictWith: conflict.a === e.id ? conflict.b : conflict.a };
  if (wouldExceedBudget(e, committed, ctx.budget)) return { event: e, reason: 'over_budget' };
  return null;
}

function bestAlternative(
  target: SchoolEvent,
  ctx: PlanContext,
  committed: readonly SchoolEvent[],
  excluded: ReadonlySet<string>,
): SchoolEvent | undefined {
  const targetStart = eventStart(target);
  const grade = ctx.profile?.grade ?? null;
  const options = ctx.allEvents
    .map((e) => ({ event: e, distance: Math.abs(eventStart(e) - targetStart) }))
    .filter(
      ({ event: e, distance }) =>
        e.category === target.category &&
        e.status === 'approved' &&
        !excluded.has(e.id) &&
        distance <= ALTERNATIVE_WINDOW_DAYS * DAY_MS &&
        !isPast(e, ctx.now) &&
        !isDeadlinePassed(e, ctx.now) &&
        isEligible(e, grade) &&
        !isFull(e, ctx.regs) &&
        !isRegistered(e.id, ctx.regs) &&
        findConflicts(e, committed).length === 0 &&
        !wouldExceedBudget(e, committed, ctx.budget),
    )
    .sort((x, y) => x.distance - y.distance || x.event.id.localeCompare(y.event.id));
  return options[0]?.event;
}

/**
 * Walks `candidates` in order and accepts each one that fits. A candidate is dropped as
 * 'closed' (past or deadline passed), 'full', 'ineligible', 'conflict' (overlaps a plan event
 * or an accepted one; `conflictWith` names it) or 'over_budget' (its week would exceed
 * `ctx.budget`). Candidates already in the plan, already registered or repeated are skipped.
 *
 * Each 'conflict' / 'over_budget' / 'full' drop gets at most one alternative from
 * `ctx.allEvents`: same category, approved, open, eligible, seats left, not registered, not a
 * candidate, in the plan or already suggested, no conflict with plan + accepted, within budget,
 * starting ≤ 21 days from the dropped event. The nearest in time wins, then the lower id.
 */
export function proposePlan(candidates: readonly SchoolEvent[], ctx: PlanContext): PlanProposal {
  const planIds = new Set(ctx.plan.map((e) => e.id));
  const seen = new Set<string>();
  const accepted: SchoolEvent[] = [];
  const dropped: DroppedCandidate[] = [];

  for (const e of candidates) {
    if (seen.has(e.id) || planIds.has(e.id) || isRegistered(e.id, ctx.regs)) continue;
    seen.add(e.id);
    const drop = dropReason(e, ctx, [...ctx.plan, ...accepted]);
    if (drop) dropped.push(drop);
    else accepted.push(e);
  }

  const committed = [...ctx.plan, ...accepted];
  const excluded = new Set([...planIds, ...candidates.map((e) => e.id)]);
  const alternatives: PlanAlternative[] = [];
  for (const d of dropped) {
    if (!REPLACEABLE.has(d.reason)) continue;
    const alternative = bestAlternative(d.event, ctx, committed, excluded);
    if (alternative) {
      alternatives.push({ forEventId: d.event.id, event: alternative });
      excluded.add(alternative.id);
    }
  }

  return { accepted, dropped, alternatives, hoursByWeek: Object.fromEntries(hoursByWeek(committed)) };
}

/**
 * Moves the best (first) event of each top interest, in rank order, to the front; the other
 * events keep their order. A first route then covers every priority area before repeating one.
 */
function coverTopInterests(ranked: readonly SchoolEvent[], topInterests: readonly CategoryCode[]): SchoolEvent[] {
  const leaders = topInterests.flatMap((code) => ranked.find((e) => e.category === code) ?? []);
  const leaderIds = new Set(leaders.map((e) => e.id));
  return [...leaders, ...ranked.filter((e) => !leaderIds.has(e.id))];
}

/**
 * Onboarding's first route. All recommendations are ranked, the best event of each top interest
 * moves to the front (so the route covers every priority area), and the first `size * 2` go
 * through proposePlan with the profile's weekly budget (6 hours without a profile). Accepted is
 * trimmed to `size` (default 4) and returned in start order. Drops are checked again against
 * the trimmed route (a candidate that only clashed with, or only went over budget because of, a
 * trimmed event is no longer dropped), and the weekly hours are recomputed for it.
 */
export function firstRoute(
  events: readonly SchoolEvent[],
  ctx: RecommendContext,
  size: number = DEFAULT_FIRST_ROUTE_SIZE,
): PlanProposal {
  const ranked = recommendEvents(events, ctx, { limit: events.length }).map((r) => r.event);
  const candidates = coverTopInterests(ranked, ctx.profile?.topInterests ?? []).slice(0, Math.max(0, size * 2));
  const budget = ctx.profile?.weeklyHourBudget ?? DEFAULT_WEEKLY_HOUR_BUDGET;
  const planCtx: PlanContext = { ...ctx, allEvents: [...events], budget };
  const proposal = proposePlan(candidates, planCtx);
  const accepted = proposal.accepted.slice(0, Math.max(0, size));
  if (accepted.length === proposal.accepted.length) return { ...proposal, accepted: sortByStart(accepted) };
  const committed = [...ctx.plan, ...accepted];
  const dropped = proposal.dropped.flatMap((d) => dropReason(d.event, planCtx, committed) ?? []);
  const droppedIds = new Set(dropped.map((d) => d.event.id));
  const alternatives = proposal.alternatives.filter((a) => droppedIds.has(a.forEventId));
  return { accepted: sortByStart(accepted), dropped, alternatives, hoursByWeek: Object.fromEntries(hoursByWeek(committed)) };
}
