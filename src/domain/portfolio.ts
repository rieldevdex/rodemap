/** Portfolio (Hồ sơ năng lực) aggregation and export. Pure. */
import { toIsoDate, toIsoDateTime } from './dates';
import { eventHours, eventStart, isPast, sortByStart } from './events';
import {
  CATEGORY_CODES,
  type CategoryCode,
  type Club,
  type Grade,
  type IsoDate,
  type IsoDateTime,
  type Millis,
  type PortfolioEntry,
  type Profile,
  type Registration,
  type SchoolEvent,
} from './types';

export const DEFAULT_PORTFOLIO_ROLE = 'Thành viên tham gia';
export const REFLECTION_STATUS_LABELS = {
  mochi_draft: 'Bản nháp do Mochi đề xuất',
  student: 'Do học sinh biên soạn',
} as const;

export type ReflectionStatusLabel = (typeof REFLECTION_STATUS_LABELS)[keyof typeof REFLECTION_STATUS_LABELS];

export interface PortfolioExportEntry {
  /** When the event is no longer known: title falls back to the event id, `date` is null. `club` is null when unknown. */
  event: { title: string; club: string | null; category: CategoryCode; date: IsoDate | null };
  role: string;
  hours: number;
  reflection: string;
  reflectionStatus: ReflectionStatusLabel;
  evidenceLinks: string[];
}

/** JSON export shape, version 1. No personal data beyond grade and class. */
export interface PortfolioExport {
  version: 1;
  generatedAt: IsoDateTime;
  student: { grade: Grade; className: string } | null;
  totals: { hours: number; byCategory: Record<CategoryCode, number> };
  /** Chronological by event start (unknown events last), then entry id. */
  entries: PortfolioExportEntry[];
}

/** Rounds to two decimals to keep sums of hours free of floating-point noise. */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function sumHours(entries: readonly PortfolioEntry[]): number {
  return round2(entries.reduce((sum, e) => sum + e.hours, 0));
}

/** Hours per category; all seven keys are present (0 when empty). */
export function hoursByCategory(entries: readonly PortfolioEntry[]): Record<CategoryCode, number> {
  const totals: Record<CategoryCode, number> = { HT: 0, NT: 0, TT: 0, TN: 0, KN: 0, CN: 0, TS: 0 };
  for (const code of CATEGORY_CODES) totals[code] = sumHours(entries.filter((e) => e.category === code));
  return totals;
}

export function totalHours(entries: readonly PortfolioEntry[]): number {
  return sumHours(entries);
}

/** Non-empty groups in CATEGORY_CODES order; entries keep their input order. */
export function groupByCategory(
  entries: readonly PortfolioEntry[],
): { category: CategoryCode; entries: PortfolioEntry[]; hours: number }[] {
  return CATEGORY_CODES.map((category) => {
    const inCategory = entries.filter((e) => e.category === category);
    return { category, entries: inCategory, hours: sumHours(inCategory) };
  }).filter((g) => g.entries.length > 0);
}

/** A new entry for an attended event: default role, event hours, empty reflection by the student. */
export function entryFromEvent(e: SchoolEvent, opts: { id: string; now: Millis }): PortfolioEntry {
  const at = toIsoDateTime(opts.now);
  return {
    id: opts.id,
    eventId: e.id,
    category: e.category,
    role: DEFAULT_PORTFOLIO_ROLE,
    hours: eventHours(e),
    reflection: '',
    reflectionSource: 'student',
    evidenceLinks: [],
    createdAt: at,
    updatedAt: at,
  };
}

function hasEntry(eventId: string, entries: readonly PortfolioEntry[]): boolean {
  return entries.some((x) => x.eventId === eventId);
}

function registrationStatus(eventId: string, regs: readonly Registration[]): Registration['status'] | undefined {
  return regs.find((r) => r.eventId === eventId)?.status;
}

/** Past events still marked "registered" (attendance not yet confirmed) and without an entry, by start. */
export function pendingAttendance(
  events: readonly SchoolEvent[],
  regs: readonly Registration[],
  entries: readonly PortfolioEntry[],
  now: Millis,
): SchoolEvent[] {
  return sortByStart(
    events.filter(
      (e) => isPast(e, now) && registrationStatus(e.id, regs) === 'registered' && !hasEntry(e.id, entries),
    ),
  );
}

/** Attended events that have no portfolio entry yet, by start. */
export function attendedWithoutEntry(
  events: readonly SchoolEvent[],
  regs: readonly Registration[],
  entries: readonly PortfolioEntry[],
): SchoolEvent[] {
  return sortByStart(
    events.filter((e) => registrationStatus(e.id, regs) === 'attended' && !hasEntry(e.id, entries)),
  );
}

export function portfolioJson(
  entries: readonly PortfolioEntry[],
  events: readonly SchoolEvent[],
  clubs: readonly Club[],
  profile: Profile | null,
  now: Millis,
): PortfolioExport {
  const eventById = new Map(events.map((e) => [e.id, e]));
  const clubById = new Map(clubs.map((c) => [c.id, c]));
  const rows = entries.map((entry) => {
    const event = eventById.get(entry.eventId);
    const club = event ? clubById.get(event.clubId) : undefined;
    return { entry, event, club, start: event ? eventStart(event) : Number.POSITIVE_INFINITY };
  });
  // Infinity − Infinity is NaN (falsy), so unknown events fall through to the id order.
  rows.sort((a, b) => a.start - b.start || a.entry.id.localeCompare(b.entry.id));
  return {
    version: 1,
    generatedAt: toIsoDateTime(now),
    student: profile ? { grade: profile.grade, className: profile.className } : null,
    totals: { hours: totalHours(entries), byCategory: hoursByCategory(entries) },
    entries: rows.map(({ entry, event, club, start }) => ({
      event: {
        title: event?.title ?? entry.eventId,
        club: club?.name ?? null,
        category: entry.category,
        date: event ? toIsoDate(start) : null,
      },
      role: entry.role,
      hours: entry.hours,
      reflection: entry.reflection,
      reflectionStatus: REFLECTION_STATUS_LABELS[entry.reflectionSource],
      evidenceLinks: [...entry.evidenceLinks],
    })),
  };
}
