import { describe, expect, it } from 'vitest';
import { budgetStatus, DEFAULT_WEEKLY_HOUR_BUDGET, hoursByWeek, weekHours, wouldExceedBudget } from './budget';
import { toMillis } from './dates';
import { makeEvent } from './test-fixtures';
import type { SchoolEvent } from './types';

const ev = (id: string, start: string, end: string): SchoolEvent =>
  makeEvent({ id, start: `${start}:00+07:00`, end: `${end}:00+07:00` });

const wed = ev('wed', '2026-10-14T16:45', '2026-10-14T18:15'); // W42, 1.5 h
const sunLate = ev('sun-late', '2026-10-18T23:30', '2026-10-19T01:00'); // W42 (starts Sunday), 1.5 h
const monMidnight = ev('mon', '2026-10-19T00:00', '2026-10-19T02:00'); // W43, 2 h
const newYearSat = ev('nam-moi', '2027-01-02T08:00', '2027-01-02T11:00'); // 2026-W53, 3 h
const firstMonday = ev('t2-dau-nam', '2027-01-04T17:00', '2027-01-04T18:00'); // 2027-W01, 1 h

describe('hoursByWeek', () => {
  it('is empty for no events', () => {
    expect(hoursByWeek([]).size).toBe(0);
  });

  it('sums hours per ISO week of the start, keys in chronological order', () => {
    const weeks = hoursByWeek([firstMonday, monMidnight, newYearSat, sunLate, wed]);
    expect([...weeks.entries()]).toEqual([
      ['2026-W42', 3],
      ['2026-W43', 2],
      ['2026-W53', 3],
      ['2027-W01', 1],
    ]);
  });

  it('rounds each event to quarter hours', () => {
    const odd = ev('le', '2026-10-15T17:00', '2026-10-15T17:50'); // 50 min → 0.75 h
    expect(hoursByWeek([odd, wed]).get('2026-W42')).toBe(2.25);
  });
});

describe('weekHours', () => {
  it('reads one week and defaults to 0', () => {
    const plan = [wed, sunLate, monMidnight];
    expect(weekHours(plan, '2026-W42')).toBe(3);
    expect(weekHours(plan, '2026-W43')).toBe(2);
    expect(weekHours(plan, '2026-W44')).toBe(0);
    expect(weekHours([], '2026-W42')).toBe(0);
  });
});

describe('wouldExceedBudget', () => {
  const plan = [wed, sunLate, ev('thu', '2026-10-15T17:00', '2026-10-15T18:30')]; // W42: 4.5 h

  it('allows reaching the budget exactly', () => {
    const fits = ev('fri', '2026-10-16T17:00', '2026-10-16T18:30'); // +1.5 → 6
    expect(wouldExceedBudget(fits, plan, 6)).toBe(false);
  });

  it('flags going over the budget', () => {
    const tooLong = ev('fri-long', '2026-10-16T17:00', '2026-10-16T18:45'); // +1.75 → 6.25
    expect(wouldExceedBudget(tooLong, plan, 6)).toBe(true);
    expect(wouldExceedBudget(tooLong, [], 1.5)).toBe(true);
    expect(wouldExceedBudget(tooLong, [], 1.75)).toBe(false);
  });

  it('only counts the candidate week', () => {
    expect(wouldExceedBudget(monMidnight, plan, 2)).toBe(false);
    expect(wouldExceedBudget(monMidnight, plan, 1.5)).toBe(true);
    expect(wouldExceedBudget(newYearSat, [firstMonday], 3)).toBe(false);
  });

  it('counts a candidate already in the plan once', () => {
    expect(wouldExceedBudget(wed, plan, 4.5)).toBe(false);
    expect(wouldExceedBudget(wed, [...plan, wed], 4.5)).toBe(false);
    expect(wouldExceedBudget(wed, plan, 4.25)).toBe(true);
  });

  it('treats a zero budget as full', () => {
    expect(wouldExceedBudget(wed, [], 0)).toBe(true);
  });
});

describe('budgetStatus', () => {
  const plan = [wed, sunLate, monMidnight];

  it('reports the week containing now', () => {
    expect(budgetStatus(plan, 6, toMillis('2026-10-14T09:00:00+07:00'))).toEqual({
      weekKey: '2026-W42',
      used: 3,
      budget: 6,
      remaining: 3,
    });
    expect(budgetStatus(plan, 6, toMillis('2026-10-19T00:00:00+07:00'))).toEqual({
      weekKey: '2026-W43',
      used: 2,
      budget: 6,
      remaining: 4,
    });
  });

  it('uses Vietnam time near the week boundary and the ISO year at New Year', () => {
    expect(budgetStatus(plan, 6, toMillis('2026-10-18T23:59:00+07:00')).weekKey).toBe('2026-W42');
    expect(budgetStatus([newYearSat], 6, toMillis('2027-01-01T09:00:00+07:00'))).toEqual({
      weekKey: '2026-W53',
      used: 3,
      budget: 6,
      remaining: 3,
    });
  });

  it('never reports negative remaining hours', () => {
    expect(budgetStatus(plan, 2, toMillis('2026-10-14T09:00:00+07:00'))).toEqual({
      weekKey: '2026-W42',
      used: 3,
      budget: 2,
      remaining: 0,
    });
    expect(budgetStatus([], DEFAULT_WEEKLY_HOUR_BUDGET, toMillis('2026-10-14T09:00:00+07:00')).remaining).toBe(6);
  });
});
