/**
 * "Khám phá sự kiện" filters <-> URL query string. Pure: no React, no DOM, no clock.
 *
 * Readable ASCII keys and values, e.g.
 *   /kham-pha?q=tranh+bien&linh-vuc=HT,CN&clb=tranh-bien&khoi=11&thoi-gian=tuan-nay
 *            &hinh-thuc=truc-tiep&con-cho=1&han=sap-het-han&da-dien-ra=1&xem=danh-sach
 * `tim=1` asks the page to focus the search field (Ctrl K / ⌘K); it is never written back.
 * Parsing also accepts the domain values (`han=closing_7_days`, `thoi-gian=this_week`…).
 */
import type { DateWindow, DeadlineFilter } from '../../domain/filters';
import { CATEGORY_CODES, GRADES, type CategoryCode, type EventFormat, type Grade } from '../../domain/types';

/** Every filter field with its value spelled out (an EventFilter without optional fields). */
export interface ExploreFilterState {
  query: string;
  categories: CategoryCode[];
  clubIds: string[];
  grades: Grade[];
  window: DateWindow;
  format: EventFormat | 'all';
  hasSeats: boolean;
  deadline: DeadlineFilter;
  includePast: boolean;
}

export type ExploreView = 'grid' | 'list';

export interface ExploreQuery {
  filter: ExploreFilterState;
  view: ExploreView;
  /** `tim=1`: focus the search field once. */
  focusSearch: boolean;
}

export const DEFAULT_EXPLORE_FILTER: ExploreFilterState = {
  query: '',
  categories: [],
  clubIds: [],
  grades: [],
  window: 'all',
  format: 'all',
  hasSeats: false,
  deadline: 'any',
  includePast: false,
};

/** Longest search text kept from the URL (the field has the same maxLength). */
export const QUERY_MAX_LENGTH = 120;

export const QUERY_KEYS = {
  query: 'q',
  categories: 'linh-vuc',
  clubIds: 'clb',
  grades: 'khoi',
  window: 'thoi-gian',
  format: 'hinh-thuc',
  hasSeats: 'con-cho',
  deadline: 'han',
  includePast: 'da-dien-ra',
  view: 'xem',
  focusSearch: 'tim',
} as const;

/* ── Options and their labels (shared by the filter rail and the active-filter chips) ── */

export interface Choice<T extends string> {
  value: T;
  label: string;
  /** URL value; the default choice has none (it is omitted from the URL). */
  slug: string | null;
}

export const WINDOW_CHOICES: Choice<DateWindow>[] = [
  { value: 'all', label: 'Tất cả', slug: null },
  { value: 'this_week', label: 'Tuần này', slug: 'tuan-nay' },
  { value: 'next_week', label: 'Tuần sau', slug: 'tuan-sau' },
  { value: 'this_month', label: 'Tháng này', slug: 'thang-nay' },
  { value: 'next_30_days', label: '30 ngày tới', slug: '30-ngay-toi' },
];

export const FORMAT_CHOICES: Choice<EventFormat | 'all'>[] = [
  { value: 'all', label: 'Tất cả', slug: null },
  { value: 'in_person', label: 'Trực tiếp', slug: 'truc-tiep' },
  { value: 'online', label: 'Trực tuyến', slug: 'truc-tuyen' },
];

export const DEADLINE_CHOICES: Choice<DeadlineFilter>[] = [
  { value: 'any', label: 'Tất cả', slug: null },
  { value: 'open', label: 'Còn hạn', slug: 'con-han' },
  { value: 'closing_7_days', label: 'Sắp hết hạn trong 7 ngày', slug: 'sap-het-han' },
];

export const VIEW_SLUGS: Record<ExploreView, string | null> = { grid: null, list: 'danh-sach' };

/* ── Parsing ───────────────────────────────────────────────────────── */

const TRUE_VALUES = new Set(['1', 'true', 'co']);

function listValues(raw: string | null): string[] {
  if (raw === null) return [];
  return raw
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v !== '');
}

/** Keeps the values that appear in `known`, in `known` order, without duplicates. */
function pickKnown<T>(values: readonly unknown[], known: readonly T[]): T[] {
  return known.filter((k) => values.includes(k));
}

function parseChoice<T extends string>(raw: string | null, choices: readonly Choice<T>[], fallback: T): T {
  if (raw === null) return fallback;
  const value = raw.trim().toLowerCase();
  const match = choices.find((c) => c.slug === value || c.value === value);
  return match ? match.value : fallback;
}

function parseFlag(raw: string | null): boolean {
  return raw !== null && TRUE_VALUES.has(raw.trim().toLowerCase());
}

/**
 * Reads the filters from a query string. Unknown keys and values fall back to the defaults;
 * `knownClubIds` (in display order) drops club ids that do not exist.
 */
export function parseExploreQuery(params: URLSearchParams, knownClubIds: readonly string[]): ExploreQuery {
  const query = (params.get(QUERY_KEYS.query) ?? '').slice(0, QUERY_MAX_LENGTH);
  const categories = pickKnown(
    listValues(params.get(QUERY_KEYS.categories)).map((v) => v.toUpperCase()),
    CATEGORY_CODES,
  );
  const clubIds = pickKnown(listValues(params.get(QUERY_KEYS.clubIds)), knownClubIds);
  const grades = pickKnown(listValues(params.get(QUERY_KEYS.grades)).map(Number), GRADES);
  const viewRaw = params.get(QUERY_KEYS.view)?.trim().toLowerCase();
  return {
    filter: {
      query: query.trim() === '' ? '' : query,
      categories,
      clubIds,
      grades,
      window: parseChoice(params.get(QUERY_KEYS.window), WINDOW_CHOICES, 'all'),
      format: parseChoice(params.get(QUERY_KEYS.format), FORMAT_CHOICES, 'all'),
      hasSeats: parseFlag(params.get(QUERY_KEYS.hasSeats)),
      deadline: parseChoice(params.get(QUERY_KEYS.deadline), DEADLINE_CHOICES, 'any'),
      includePast: parseFlag(params.get(QUERY_KEYS.includePast)),
    },
    view: viewRaw === VIEW_SLUGS.list || viewRaw === 'list' ? 'list' : 'grid',
    focusSearch: parseFlag(params.get(QUERY_KEYS.focusSearch)),
  };
}

/* ── Serialising ───────────────────────────────────────────────────── */

/** encodeURIComponent, but keeps commas and writes spaces as "+" so URLs stay readable. */
function encodeValue(value: string): string {
  return encodeURIComponent(value).replace(/%20/g, '+').replace(/%2C/gi, ',');
}

function slugOf<T extends string>(value: T, choices: readonly Choice<T>[]): string | null {
  return choices.find((c) => c.value === value)?.slug ?? null;
}

/** The search text as it is stored: whitespace-only text counts as no search. */
export function canonicalQuery(query: string): string {
  const capped = query.slice(0, QUERY_MAX_LENGTH);
  return capped.trim() === '' ? '' : capped;
}

/**
 * Query string without the leading "?" (empty for the defaults). Keys always come in the
 * same order and lists in display order, so equal filters give equal URLs.
 */
export function serializeExploreQuery(filter: ExploreFilterState, view: ExploreView): string {
  const pairs: [string, string | null][] = [
    [QUERY_KEYS.query, canonicalQuery(filter.query) || null],
    [QUERY_KEYS.categories, pickKnown(filter.categories, CATEGORY_CODES).join(',') || null],
    [QUERY_KEYS.clubIds, [...new Set(filter.clubIds)].join(',') || null],
    [QUERY_KEYS.grades, pickKnown(filter.grades, GRADES).join(',') || null],
    [QUERY_KEYS.window, slugOf(filter.window, WINDOW_CHOICES)],
    [QUERY_KEYS.format, slugOf(filter.format, FORMAT_CHOICES)],
    [QUERY_KEYS.hasSeats, filter.hasSeats ? '1' : null],
    [QUERY_KEYS.deadline, slugOf(filter.deadline, DEADLINE_CHOICES)],
    [QUERY_KEYS.includePast, filter.includePast ? '1' : null],
    [QUERY_KEYS.view, VIEW_SLUGS[view]],
  ];
  return pairs
    .flatMap(([key, value]) => (value === null ? [] : [`${key}=${encodeValue(value)}`]))
    .join('&');
}

/** "/kham-pha" plus the query string, if any. */
export function explorePath(base: string, filter: ExploreFilterState, view: ExploreView): string {
  const qs = serializeExploreQuery(filter, view);
  return qs === '' ? base : `${base}?${qs}`;
}

/* ── Active filters ────────────────────────────────────────────────── */

export interface ActiveFilter {
  /** Stable React key, e.g. "category:HT". */
  id: string;
  /** Visible text; for a category, its name (the code is shown next to it). */
  label: string;
  /** Category code for the chip edge and the mono code label. */
  code?: CategoryCode;
  /** The filter with this one removed. */
  without: ExploreFilterState;
}

/**
 * One removable entry per active value, in rail order. `categoryName` and `clubName`
 * supply the labels ("Học thuật", "CLB Tranh biện").
 */
export function activeFilters(
  filter: ExploreFilterState,
  names: { categoryName: (code: CategoryCode) => string; clubName: (id: string) => string },
): ActiveFilter[] {
  const items: ActiveFilter[] = [];
  const query = filter.query.trim();
  if (query !== '') {
    items.push({ id: 'query', label: `Từ khóa “${query}”`, without: { ...filter, query: '' } });
  }
  for (const code of filter.categories) {
    items.push({
      id: `category:${code}`,
      label: names.categoryName(code),
      code,
      without: { ...filter, categories: filter.categories.filter((c) => c !== code) },
    });
  }
  for (const id of filter.clubIds) {
    items.push({
      id: `club:${id}`,
      label: names.clubName(id) || id,
      without: { ...filter, clubIds: filter.clubIds.filter((c) => c !== id) },
    });
  }
  for (const grade of filter.grades) {
    items.push({
      id: `grade:${grade}`,
      label: `Khối ${grade}`,
      without: { ...filter, grades: filter.grades.filter((g) => g !== grade) },
    });
  }
  const windowChoice = WINDOW_CHOICES.find((c) => c.value === filter.window);
  if (filter.window !== 'all' && windowChoice) {
    items.push({ id: 'window', label: windowChoice.label, without: { ...filter, window: 'all' } });
  }
  const formatChoice = FORMAT_CHOICES.find((c) => c.value === filter.format);
  if (filter.format !== 'all' && formatChoice) {
    items.push({ id: 'format', label: formatChoice.label, without: { ...filter, format: 'all' } });
  }
  if (filter.hasSeats) {
    items.push({ id: 'seats', label: 'Còn chỗ', without: { ...filter, hasSeats: false } });
  }
  if (filter.deadline !== 'any') {
    items.push({
      id: 'deadline',
      label: filter.deadline === 'open' ? 'Còn hạn đăng ký' : 'Sắp hết hạn trong 7 ngày',
      without: { ...filter, deadline: 'any' },
    });
  }
  if (filter.includePast) {
    items.push({ id: 'past', label: 'Gồm sự kiện đã diễn ra', without: { ...filter, includePast: false } });
  }
  return items;
}
