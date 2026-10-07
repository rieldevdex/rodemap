import { describe, expect, it } from 'vitest';
import { eventsBetween, eventsOnDay, isInMonth, monthGrid, periodOn, periodsBetween, shiftMonth, shiftWeek, weekDays } from './calendar-view';
import { toIsoDate, toMillis } from './dates';
import { makeEvent } from './test-fixtures';
import type { CalendarPeriod } from './types';

const oct14 = toMillis('2026-10-14T09:00:00+07:00');
const iso = (days: number[]) => days.map((d) => toIsoDate(d));

describe('calendar view', () => {
  it('builds Monday-first month grids', () => {
    const weeks = monthGrid(oct14);
    expect(weeks).toHaveLength(5);
    expect(iso(weeks[0] ?? [])).toEqual(['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']);
    expect(toIsoDate(weeks[4]?.[6] ?? 0)).toBe('2026-11-01');
    // February 2027 starts on a Monday and needs exactly four weeks.
    expect(monthGrid(toMillis('2027-02-10'))).toHaveLength(4);
    // November 2026 starts on a Sunday: six rows.
    expect(monthGrid(toMillis('2026-11-20'))).toHaveLength(6);
  });

  it('lists the days of a week', () => {
    expect(iso(weekDays(oct14))).toEqual(['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18']);
  });

  it('checks month membership', () => {
    expect(isInMonth(toMillis('2026-10-31'), oct14)).toBe(true);
    expect(isInMonth(toMillis('2026-11-01'), oct14)).toBe(false);
    expect(isInMonth(toMillis('2025-10-14'), oct14)).toBe(false);
  });

  it('shifts months and weeks', () => {
    expect(toIsoDate(shiftMonth(oct14, 1))).toBe('2026-11-01');
    expect(toIsoDate(shiftMonth(oct14, 3))).toBe('2027-01-01');
    expect(toIsoDate(shiftMonth(oct14, -10))).toBe('2025-12-01');
    expect(toIsoDate(shiftWeek(oct14, 1))).toBe('2026-10-19');
    expect(toIsoDate(shiftWeek(oct14, -2))).toBe('2026-09-28');
  });

  it('finds events on a day and in a range, including multi-day events', () => {
    const a = makeEvent({ id: 'a', start: '2026-10-14T16:45:00+07:00', end: '2026-10-14T18:15:00+07:00' });
    const b = makeEvent({ id: 'b', start: '2026-10-14T07:00:00+07:00', end: '2026-10-14T09:00:00+07:00' });
    const camp = makeEvent({ id: 'c', start: '2026-10-13T08:00:00+07:00', end: '2026-10-15T17:00:00+07:00' });
    const later = makeEvent({ id: 'd', start: '2026-10-20T16:45:00+07:00', end: '2026-10-20T18:00:00+07:00' });
    expect(eventsOnDay([a, b, camp, later], oct14).map((e) => e.id)).toEqual(['c', 'b', 'a']);
    expect(eventsOnDay([a, later], toMillis('2026-10-16')).map((e) => e.id)).toEqual([]);
    expect(eventsBetween([later, a, camp], toMillis('2026-10-14'), toMillis('2026-10-19')).map((e) => e.id)).toEqual(['c', 'a']);
  });

  it('finds periods by day and range', () => {
    const periods: CalendarPeriod[] = [
      { id: 'x', kind: 'exam', label: 'Kiểm tra', start: '2026-11-02', end: '2026-11-07' },
      { id: 'y', kind: 'holiday', label: 'Nghỉ', start: '2027-02-01', end: '2027-02-14' },
    ];
    expect(periodOn(periods, toMillis('2026-11-07'))?.id).toBe('x');
    expect(periodOn(periods, toMillis('2026-11-08'))).toBeUndefined();
    expect(periodsBetween(periods, toMillis('2026-11-01'), toMillis('2026-12-01')).map((p) => p.id)).toEqual(['x']);
    expect(periodsBetween(periods, toMillis('2026-11-08'), toMillis('2027-02-01'))).toEqual([]);
    expect(periodsBetween(periods, toMillis('2026-10-26'), toMillis('2026-11-02'))).toEqual([]);
  });
});
