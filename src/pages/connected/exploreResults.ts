/** Result shaping for "Khám phá sự kiện": facet counts and month groups. Pure. */
import { formatMonthYear, toMillis, vnParts } from '../../domain/dates';
import { filterEvents, type DateWindow, type DeadlineFilter, type FilterContext } from '../../domain/filters';
import { CATEGORY_CODES, GRADES, type CategoryCode, type EventFormat, type Grade, type SchoolEvent } from '../../domain/types';
import type { ExploreFilterState } from './exploreQuery';

export interface FacetCounts {
  categories: Record<CategoryCode, number>;
  clubs: Record<string, number>;
  grades: Record<Grade, number>;
  windows: Record<DateWindow, number>;
  formats: Record<EventFormat | 'all', number>;
  deadlines: Record<DeadlineFilter, number>;
}

const WINDOWS: DateWindow[] = ['all', 'this_week', 'next_week', 'this_month', 'next_30_days'];
const FORMATS: (EventFormat | 'all')[] = ['all', 'in_person', 'online'];
const DEADLINES: DeadlineFilter[] = ['any', 'open', 'closing_7_days'];

function countBy<K extends string | number>(keys: readonly K[], count: (key: K) => number): Record<K, number> {
  return Object.fromEntries(keys.map((k) => [k, count(k)])) as Record<K, number>;
}

/**
 * How many events each option would show, keeping every other filter as it is.
 * Multi-select facets count the option alone (selecting it adds those events);
 * single-choice facets count the result with that option chosen instead.
 */
export function facetCounts(
  events: readonly SchoolEvent[],
  filter: ExploreFilterState,
  ctx: FilterContext,
  clubIds: readonly string[],
): FacetCounts {
  const count = (patch: Partial<ExploreFilterState>) => filterEvents(events, { ...filter, ...patch }, ctx).length;
  return {
    categories: countBy(CATEGORY_CODES, (code) => count({ categories: [code] })),
    clubs: countBy(clubIds, (id) => count({ clubIds: [id] })),
    grades: countBy(GRADES, (grade) => count({ grades: [grade] })),
    windows: countBy(WINDOWS, (w) => count({ window: w })),
    formats: countBy(FORMATS, (f) => count({ format: f })),
    deadlines: countBy(DEADLINES, (d) => count({ deadline: d })),
  };
}

export interface MonthGroup {
  /** "2026-10" */
  key: string;
  /** "Tháng 10/2026" */
  label: string;
  events: SchoolEvent[];
}

/** Consecutive events of the same Vietnam calendar month, in input order (input sorted by start). */
export function groupByMonth(events: readonly SchoolEvent[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  for (const event of events) {
    const start = toMillis(event.start);
    const { year, month } = vnParts(start);
    const key = `${year}-${String(month).padStart(2, '0')}`;
    const last = groups.at(-1);
    if (last?.key === key) last.events.push(event);
    else groups.push({ key, label: formatMonthYear(start), events: [event] });
  }
  return groups;
}
