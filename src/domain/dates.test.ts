import { describe, expect, it } from 'vitest';
import {
  addDays,
  calendarDaysBetween,
  durationHours,
  formatDate,
  formatDayLabel,
  formatLongDate,
  formatMonthYear,
  formatShortDate,
  formatTime,
  formatTimeRange,
  isSameVnDay,
  isoWeekKey,
  monthLabel,
  monthShortLabel,
  overlapMinutes,
  overlaps,
  startOfIsoWeek,
  startOfNextVnMonth,
  startOfVnDay,
  startOfVnMonth,
  toIsoDate,
  toIsoDateTime,
  toMillis,
  vnParts,
  weekdayLong,
  weekdayShort,
} from './dates';

const at = (s: string) => toMillis(s);

describe('parsing', () => {
  it('parses date-times with offset and plain dates as Vietnam midnight', () => {
    expect(at('2026-10-14T14:30:00+07:00')).toBe(Date.UTC(2026, 9, 14, 7, 30));
    expect(at('2026-10-14')).toBe(Date.UTC(2026, 9, 13, 17, 0));
  });
  it('throws on invalid input', () => {
    expect(() => toMillis('not a date')).toThrow(RangeError);
  });
});

describe('parts and round trips', () => {
  it('reads wall-clock parts in Vietnam regardless of host timezone', () => {
    expect(vnParts(at('2026-10-14T23:30:00+07:00'))).toEqual({ year: 2026, month: 10, day: 14, hour: 23, minute: 30, weekday: 3 });
    expect(vnParts(at('2026-10-14T17:30:00Z')).day).toBe(15);
  });
  it('round-trips ISO strings', () => {
    expect(toIsoDateTime(at('2026-10-14T07:05:00+07:00'))).toBe('2026-10-14T07:05:00+07:00');
    expect(toIsoDate(at('2027-01-02T00:00:00+07:00'))).toBe('2027-01-02');
  });
});

describe('calendar arithmetic', () => {
  it('finds the start of the day, ISO week and month', () => {
    const wed = at('2026-10-14T14:30:00+07:00');
    expect(startOfVnDay(wed)).toBe(at('2026-10-14'));
    expect(startOfIsoWeek(wed)).toBe(at('2026-10-12'));
    expect(startOfIsoWeek(at('2026-10-18T20:00:00+07:00'))).toBe(at('2026-10-12'));
    expect(startOfVnMonth(wed)).toBe(at('2026-10-01'));
    expect(startOfNextVnMonth(wed)).toBe(at('2026-11-01'));
    expect(startOfNextVnMonth(at('2026-12-20'))).toBe(at('2027-01-01'));
  });
  it('computes ISO week keys across year boundaries', () => {
    expect(isoWeekKey(at('2026-10-14'))).toBe('2026-W42');
    expect(isoWeekKey(at('2027-01-01'))).toBe('2026-W53');
    expect(isoWeekKey(at('2027-01-04'))).toBe('2027-W01');
  });
  it('compares days and counts calendar days', () => {
    expect(isSameVnDay(at('2026-10-14T00:10:00+07:00'), at('2026-10-14T23:50:00+07:00'))).toBe(true);
    expect(isSameVnDay(at('2026-10-14T23:50:00+07:00'), at('2026-10-15T00:10:00+07:00'))).toBe(false);
    expect(calendarDaysBetween(at('2026-10-14T23:00:00+07:00'), at('2026-10-15T01:00:00+07:00'))).toBe(1);
    expect(calendarDaysBetween(at('2026-10-15'), at('2026-10-12'))).toBe(-3);
    expect(addDays(at('2026-10-14'), 2)).toBe(at('2026-10-16'));
  });
  it('detects half-open overlaps and measures them', () => {
    const a = [at('2026-10-14T14:00:00+07:00'), at('2026-10-14T16:00:00+07:00')] as const;
    const b = [at('2026-10-14T15:30:00+07:00'), at('2026-10-14T17:00:00+07:00')] as const;
    const c = [at('2026-10-14T16:00:00+07:00'), at('2026-10-14T17:00:00+07:00')] as const;
    expect(overlaps(...a, ...b)).toBe(true);
    expect(overlaps(...a, ...c)).toBe(false);
    expect(overlapMinutes(...a, ...b)).toBe(30);
    expect(overlapMinutes(...a, ...c)).toBe(0);
  });
  it('rounds durations to the quarter hour', () => {
    expect(durationHours(at('2026-10-14T14:00:00+07:00'), at('2026-10-14T16:10:00+07:00'))).toBe(2.25);
  });
});

describe('Vietnamese formatting', () => {
  const wed = at('2026-10-14T07:30:00+07:00');
  it('formats times and dates with Vietnamese conventions', () => {
    expect(formatTime(wed)).toBe('07:30');
    expect(formatDate(wed)).toBe('14/10/2026');
    expect(formatShortDate(wed)).toBe('14/10');
    expect(weekdayLong(wed)).toBe('Thứ Tư');
    expect(weekdayShort(wed)).toBe('Th 4');
    expect(weekdayShort(at('2026-10-18'))).toBe('CN');
    expect(weekdayLong(at('2026-10-18'))).toBe('Chủ nhật');
    expect(formatDayLabel(wed)).toBe('Th 4 · 14/10');
    expect(formatLongDate(wed)).toBe('Thứ Tư, 14/10/2026');
    expect(monthLabel(9)).toBe('Tháng 9');
    expect(monthShortLabel(9)).toBe('T9');
    expect(formatMonthYear(wed)).toBe('Tháng 10/2026');
  });
  it('formats time ranges on one or several days', () => {
    expect(formatTimeRange(at('2026-10-14T14:30:00+07:00'), at('2026-10-14T16:30:00+07:00'))).toBe('14:30–16:30');
    expect(formatTimeRange(at('2026-10-14T08:00:00+07:00'), at('2026-10-15T17:00:00+07:00'))).toBe('14/10 08:00 – 15/10 17:00');
  });
});
