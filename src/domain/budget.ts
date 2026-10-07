/** Weekly hour budgeting over ISO weeks (Monday–Sunday, Vietnam time). Pure. */
import { isoWeekKey } from './dates';
import { eventHours, eventStart, sortByStart } from './events';
import type { Millis, SchoolEvent } from './types';

/** Weekly budget used when the student has no profile yet. */
export const DEFAULT_WEEKLY_HOUR_BUDGET = 6;

export interface BudgetStatus {
  weekKey: string;
  used: number;
  budget: number;
  /** Hours left this week, never below 0. */
  remaining: number;
}

/** Hours per ISO week key of each event's start ("2026-W42" → 4.5). Keys are in chronological order. */
export function hoursByWeek(events: readonly SchoolEvent[]): Map<string, number> {
  const weeks = new Map<string, number>();
  for (const e of sortByStart(events)) {
    const key = isoWeekKey(eventStart(e));
    weeks.set(key, (weeks.get(key) ?? 0) + eventHours(e));
  }
  return weeks;
}

/** Hours planned in one ISO week (0 when none). */
export function weekHours(events: readonly SchoolEvent[], weekKey: string): number {
  return hoursByWeek(events).get(weekKey) ?? 0;
}

/**
 * True when the candidate's week, counting the candidate once (even if it is already in the
 * plan), goes over the budget. Reaching the budget exactly is allowed.
 */
export function wouldExceedBudget(candidate: SchoolEvent, plan: readonly SchoolEvent[], budget: number): boolean {
  const others = plan.filter((e) => e.id !== candidate.id);
  const total = weekHours(others, isoWeekKey(eventStart(candidate))) + eventHours(candidate);
  return total > budget;
}

/** Usage of the ISO week containing `now`. */
export function budgetStatus(plan: readonly SchoolEvent[], budget: number, now: Millis): BudgetStatus {
  const weekKey = isoWeekKey(now);
  const used = weekHours(plan, weekKey);
  return { weekKey, used, budget, remaining: Math.max(0, budget - used) };
}
