/**
 * Date helpers fixed to Asia/Ho_Chi_Minh (UTC+7, no daylight saving).
 * Pure: every function takes explicit inputs; nothing reads the clock.
 */
import type { IsoDate, IsoDateTime, Millis } from './types';

export const TIME_ZONE = 'Asia/Ho_Chi_Minh';
export const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
export const MINUTE_MS = 60 * 1000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

/** The school year shown on the RouteMap. */
export const SCHOOL_YEAR: { start: IsoDate; end: IsoDate } = { start: '2026-09-01', end: '2027-05-31' };

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface VnParts {
  year: number;
  /** 1–12 */
  month: number;
  day: number;
  hour: number;
  minute: number;
  /** 0 = Sunday … 6 = Saturday */
  weekday: Weekday;
}

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const pad2 = (n: number): string => String(n).padStart(2, '0');

/** Parses an IsoDateTime (any offset) or an IsoDate (midnight in Vietnam). Throws on invalid input. */
export function toMillis(value: IsoDateTime): Millis {
  const ms = ISO_DATE_RE.test(value) ? Date.parse(`${value}T00:00:00+07:00`) : Date.parse(value);
  if (Number.isNaN(ms)) throw new RangeError(`Invalid date: ${value}`);
  return ms;
}

export function vnParts(ms: Millis): VnParts {
  const d = new Date(ms + VN_OFFSET_MS);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    weekday: d.getUTCDay() as Weekday,
  };
}

/** "2026-10-14T14:30:00+07:00" */
export function toIsoDateTime(ms: Millis): IsoDateTime {
  const p = vnParts(ms);
  return `${toIsoDate(ms)}T${pad2(p.hour)}:${pad2(p.minute)}:00+07:00`;
}

/** "2026-10-14" */
export function toIsoDate(ms: Millis): IsoDate {
  const p = vnParts(ms);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`;
}

export function startOfVnDay(ms: Millis): Millis {
  return Math.floor((ms + VN_OFFSET_MS) / DAY_MS) * DAY_MS - VN_OFFSET_MS;
}

export function addDays(ms: Millis, days: number): Millis {
  return ms + days * DAY_MS;
}

/** Monday 00:00 of the ISO week containing `ms`, in Vietnam time. */
export function startOfIsoWeek(ms: Millis): Millis {
  const day = startOfVnDay(ms);
  const weekday = vnParts(day).weekday;
  const sinceMonday = (weekday + 6) % 7;
  return addDays(day, -sinceMonday);
}

/** ISO 8601 week key, e.g. "2026-W42". */
export function isoWeekKey(ms: Millis): string {
  const monday = startOfIsoWeek(ms);
  const thursday = addDays(monday, 3);
  const year = vnParts(thursday).year;
  const jan4 = toMillis(`${year}-01-04`);
  const week1Monday = startOfIsoWeek(jan4);
  const week = Math.round((monday - week1Monday) / (7 * DAY_MS)) + 1;
  return `${year}-W${pad2(week)}`;
}

/** First day (00:00) of the month containing `ms`. */
export function startOfVnMonth(ms: Millis): Millis {
  const p = vnParts(ms);
  return toMillis(`${p.year}-${pad2(p.month)}-01`);
}

/** First day of the month after the one containing `ms`. */
export function startOfNextVnMonth(ms: Millis): Millis {
  const p = vnParts(ms);
  const year = p.month === 12 ? p.year + 1 : p.year;
  const month = p.month === 12 ? 1 : p.month + 1;
  return toMillis(`${year}-${pad2(month)}-01`);
}

export function isSameVnDay(a: Millis, b: Millis): boolean {
  return startOfVnDay(a) === startOfVnDay(b);
}

/** Whole calendar days from `from` to `to` in Vietnam (negative if `to` is earlier). */
export function calendarDaysBetween(from: Millis, to: Millis): number {
  return Math.round((startOfVnDay(to) - startOfVnDay(from)) / DAY_MS);
}

/** Half-open interval overlap: [aStart, aEnd) ∩ [bStart, bEnd) ≠ ∅. */
export function overlaps(aStart: Millis, aEnd: Millis, bStart: Millis, bEnd: Millis): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function overlapMinutes(aStart: Millis, aEnd: Millis, bStart: Millis, bEnd: Millis): number {
  return Math.max(0, Math.round((Math.min(aEnd, bEnd) - Math.max(aStart, bStart)) / MINUTE_MS));
}

/** Duration in hours, rounded to the nearest quarter hour. */
export function durationHours(start: Millis, end: Millis): number {
  return Math.round(((end - start) / HOUR_MS) * 4) / 4;
}

/* ── Vietnamese formatting ──────────────────────────────────────────── */

const WEEKDAY_LONG = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'] as const;
const WEEKDAY_SHORT = ['CN', 'Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7'] as const;

/** "07:30" */
export function formatTime(ms: Millis): string {
  const p = vnParts(ms);
  return `${pad2(p.hour)}:${pad2(p.minute)}`;
}

/** "14/10/2026" */
export function formatDate(ms: Millis): string {
  const p = vnParts(ms);
  return `${pad2(p.day)}/${pad2(p.month)}/${p.year}`;
}

/** "14/10" */
export function formatShortDate(ms: Millis): string {
  const p = vnParts(ms);
  return `${pad2(p.day)}/${pad2(p.month)}`;
}

/** "Thứ Tư", "Chủ nhật" */
export function weekdayLong(ms: Millis): string {
  return WEEKDAY_LONG[vnParts(ms).weekday];
}

/** "Th 4", "CN" */
export function weekdayShort(ms: Millis): string {
  return WEEKDAY_SHORT[vnParts(ms).weekday];
}

/** "Th 4 · 14/10" */
export function formatDayLabel(ms: Millis): string {
  return `${weekdayShort(ms)} · ${formatShortDate(ms)}`;
}

/** "Thứ Tư, 14/10/2026" */
export function formatLongDate(ms: Millis): string {
  return `${weekdayLong(ms)}, ${formatDate(ms)}`;
}

/** Same day: "14:30–16:30". Different days: "14/10 08:00 – 15/10 17:00". */
export function formatTimeRange(start: Millis, end: Millis): string {
  if (isSameVnDay(start, end)) return `${formatTime(start)}–${formatTime(end)}`;
  return `${formatShortDate(start)} ${formatTime(start)} – ${formatShortDate(end)} ${formatTime(end)}`;
}

/** "Tháng 9" for month 9. */
export function monthLabel(month: number): string {
  return `Tháng ${month}`;
}

/** "T9" for month 9 (compact axis label). */
export function monthShortLabel(month: number): string {
  return `T${month}`;
}

/** "Tháng 10/2026" */
export function formatMonthYear(ms: Millis): string {
  const p = vnParts(ms);
  return `${monthLabel(p.month)}/${p.year}`;
}
