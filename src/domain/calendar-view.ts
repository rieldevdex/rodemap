/** "Lịch của tôi": month grids, week days and per-day lookups in Vietnam time. Pure. */
import { addDays, DAY_MS, overlaps, startOfIsoWeek, startOfNextVnMonth, startOfVnDay, startOfVnMonth, toIsoDate, toMillis, vnParts } from './dates';
import { eventEnd, eventStart, sortByStart } from './events';
import type { CalendarPeriod, Millis, SchoolEvent } from './types';

export type CalendarView = 'month' | 'week';

/** Monday-first weeks (7 day starts each) covering the month that contains `ms`. */
export function monthGrid(ms: Millis): Millis[][] {
  const first = startOfVnMonth(ms);
  const next = startOfNextVnMonth(ms);
  const weeks: Millis[][] = [];
  for (let monday = startOfIsoWeek(first); monday < next; monday = addDays(monday, 7)) {
    weeks.push(weekDays(monday));
  }
  return weeks;
}

/** The seven day starts (Monday → Sunday) of the ISO week containing `ms`. */
export function weekDays(ms: Millis): Millis[] {
  const monday = startOfIsoWeek(ms);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function isInMonth(day: Millis, monthMs: Millis): boolean {
  const a = vnParts(day);
  const b = vnParts(monthMs);
  return a.year === b.year && a.month === b.month;
}

/** First day of the month `delta` months away from the month containing `ms`. */
export function shiftMonth(ms: Millis, delta: number): Millis {
  const p = vnParts(ms);
  const index = p.year * 12 + (p.month - 1) + delta;
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return toMillis(`${String(year)}-${String(month).padStart(2, '0')}-01`);
}

/** Monday of the week `delta` weeks away from the week containing `ms`. */
export function shiftWeek(ms: Millis, delta: number): Millis {
  return addDays(startOfIsoWeek(ms), delta * 7);
}

/** Events that take place (even partly) on the Vietnam day containing `day`, by start. */
export function eventsOnDay(events: readonly SchoolEvent[], day: Millis): SchoolEvent[] {
  const start = startOfVnDay(day);
  return sortByStart(events.filter((e) => overlaps(start, start + DAY_MS, eventStart(e), eventEnd(e))));
}

/** Events that take place (even partly) in [from, to), by start. */
export function eventsBetween(events: readonly SchoolEvent[], from: Millis, to: Millis): SchoolEvent[] {
  return sortByStart(events.filter((e) => overlaps(from, to, eventStart(e), eventEnd(e))));
}

/** The exam zone or holiday covering the day (end dates are inclusive). */
export function periodOn(periods: readonly CalendarPeriod[], day: Millis): CalendarPeriod | undefined {
  const date = toIsoDate(day);
  return periods.find((p) => p.start <= date && date <= p.end);
}

/** Periods overlapping [from, to), in their given order. */
export function periodsBetween(periods: readonly CalendarPeriod[], from: Millis, to: Millis): CalendarPeriod[] {
  const first = toIsoDate(from);
  const last = toIsoDate(to - 1);
  return periods.filter((p) => p.start <= last && first <= p.end);
}
