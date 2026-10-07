/** Event list filtering for "Khám phá sự kiện". Pure: the clock comes in as `now`. */
import { addDays, startOfIsoWeek, startOfNextVnMonth, startOfVnMonth } from './dates';
import { deadlineDaysLeft, eventStart, isDeadlinePassed, isEligible, isFull, isPast, sortByStart } from './events';
import { matchesQuery } from './text';
import type { CategoryCode, Club, EventFormat, Grade, Millis, Registration, SchoolEvent } from './types';

export type DateWindow = 'all' | 'this_week' | 'next_week' | 'this_month' | 'next_30_days';
export type DeadlineFilter = 'any' | 'open' | 'closing_7_days';

export interface EventFilter {
  query?: string;
  categories?: CategoryCode[];
  clubIds?: string[];
  grades?: Grade[];
  window?: DateWindow;
  format?: EventFormat | 'all';
  hasSeats?: boolean;
  deadline?: DeadlineFilter;
  includePast?: boolean;
}

export interface FilterContext {
  now: Millis;
  regs: Registration[];
  clubs: Club[];
}

/** Registration deadlines within this many calendar days count as "closing soon". */
export const CLOSING_SOON_DAYS = 7;

/** Length of the rolling `next_30_days` window. */
export const ROLLING_WINDOW_DAYS = 30;

/**
 * Half-open range [from, to) for a date window, in Vietnam time. Weeks run Monday 00:00 to the
 * next Monday 00:00; months run from the first day to the first day of the next month.
 * `all` has no range.
 */
export function windowRange(dateWindow: DateWindow, now: Millis): { from: Millis; to: Millis } | null {
  switch (dateWindow) {
    case 'all':
      return null;
    case 'this_week': {
      const from = startOfIsoWeek(now);
      return { from, to: addDays(from, 7) };
    }
    case 'next_week': {
      const from = addDays(startOfIsoWeek(now), 7);
      return { from, to: addDays(from, 7) };
    }
    case 'this_month':
      return { from: startOfVnMonth(now), to: startOfNextVnMonth(now) };
    case 'next_30_days':
      return { from: now, to: addDays(now, ROLLING_WINDOW_DAYS) };
  }
}

/** Title, summary, location, tag ids and the club's full and short names. */
function searchText(e: SchoolEvent, clubs: readonly Club[]): string {
  const parts = [e.title, e.summary, e.location, ...e.tags];
  const club = clubs.find((c) => c.id === e.clubId);
  if (club) parts.push(club.name, club.shortName);
  return parts.join(' ');
}

function matchesDeadline(e: SchoolEvent, deadline: DeadlineFilter, now: Millis): boolean {
  if (deadline === 'any') return true;
  if (isDeadlinePassed(e, now)) return false;
  return deadline === 'open' || deadlineDaysLeft(e, now) <= CLOSING_SOON_DAYS;
}

/**
 * Applies every set field (logical AND) and returns a new array sorted by start, then id.
 * Grades match when the event is open to ANY selected grade. Past events (end ≤ now) are
 * excluded unless `includePast` is true. Never mutates its inputs.
 */
export function filterEvents(events: readonly SchoolEvent[], filter: EventFilter, ctx: FilterContext): SchoolEvent[] {
  const { now, regs, clubs } = ctx;
  const query = filter.query?.trim() ?? '';
  const categories = filter.categories ?? [];
  const clubIds = filter.clubIds ?? [];
  const grades = filter.grades ?? [];
  const format = filter.format ?? 'all';
  const deadline = filter.deadline ?? 'any';
  const range = windowRange(filter.window ?? 'all', now);

  const kept = events.filter((e) => {
    const start = eventStart(e);
    if (filter.includePast !== true && isPast(e, now)) return false;
    if (categories.length > 0 && !categories.includes(e.category)) return false;
    if (clubIds.length > 0 && !clubIds.includes(e.clubId)) return false;
    if (grades.length > 0 && !grades.some((g) => isEligible(e, g))) return false;
    if (range && (start < range.from || start >= range.to)) return false;
    if (format !== 'all' && e.format !== format) return false;
    if (filter.hasSeats === true && isFull(e, regs)) return false;
    if (!matchesDeadline(e, deadline, now)) return false;
    return query === '' || matchesQuery(searchText(e, clubs), query);
  });
  return sortByStart(kept);
}

/** Number of fields that differ from their defaults (drives the "Bộ lọc (n)" badge). */
export function countActiveFilters(filter: EventFilter): number {
  const active = [
    (filter.query?.trim() ?? '') !== '',
    (filter.categories?.length ?? 0) > 0,
    (filter.clubIds?.length ?? 0) > 0,
    (filter.grades?.length ?? 0) > 0,
    (filter.window ?? 'all') !== 'all',
    (filter.format ?? 'all') !== 'all',
    filter.hasSeats === true,
    (filter.deadline ?? 'any') !== 'any',
    filter.includePast === true,
  ];
  return active.filter(Boolean).length;
}
