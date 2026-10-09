import { describe, expect, it } from 'vitest';
import { toMillis } from './dates';
import {
  deadlineDaysLeft,
  eventEnd,
  eventHours,
  eventStart,
  findRegistration,
  fitsAvailability,
  isDeadlinePassed,
  formatGrades,
  gradesLabel,
  isEligible,
  isFull,
  isOpenToAll,
  isPast,
  isRegistered,
  registrationState,
  seatsLeft,
  sortByStart,
} from './events';
import { makeEvent, reg } from './test-fixtures';

const now = toMillis('2026-10-10T09:00:00+07:00');

describe('basic facts', () => {
  const e = makeEvent({ id: 'a', start: '2026-10-14T16:45:00+07:00', end: '2026-10-14T18:15:00+07:00' });
  it('reads start, end and hours', () => {
    expect(eventStart(e)).toBe(toMillis('2026-10-14T16:45:00+07:00'));
    expect(eventEnd(e)).toBe(toMillis('2026-10-14T18:15:00+07:00'));
    expect(eventHours(e)).toBe(1.5);
  });
  it('knows registration, seats and fullness', () => {
    expect(findRegistration('a', [reg('a')])?.status).toBe('registered');
    expect(isRegistered('a', [reg('a', 'attended')])).toBe(true);
    expect(isRegistered('a', [reg('a', 'absent')])).toBe(false);
    expect(isRegistered('a', [])).toBe(false);
    expect(seatsLeft(e, [])).toBe(30);
    expect(seatsLeft(e, [reg('a')])).toBe(29);
    const packed = makeEvent({ capacity: 10, seatsTaken: 10 });
    expect(seatsLeft(packed, [])).toBe(0);
    expect(isFull(packed, [])).toBe(true);
    expect(isFull(e, [])).toBe(false);
    expect(seatsLeft(makeEvent({ capacity: 5, seatsTaken: 9 }), [])).toBe(0);
  });
  it('knows deadlines, past events and eligibility', () => {
    expect(isDeadlinePassed(makeEvent({ registrationDeadline: '2026-10-09T23:59:00+07:00' }), now)).toBe(true);
    expect(isDeadlinePassed(makeEvent({ registrationDeadline: '2026-10-12T23:59:00+07:00' }), now)).toBe(false);
    expect(isPast(makeEvent({ end: '2026-10-10T09:00:00+07:00' }), now)).toBe(true);
    expect(isPast(e, now)).toBe(false);
    expect(isEligible(makeEvent({ eligibleGrades: [12] }), 11)).toBe(false);
    expect(isEligible(makeEvent({ eligibleGrades: [12] }), null)).toBe(true);
    expect(isEligible(makeEvent({ eligibleGrades: [6, 7] }), 6)).toBe(true);
    expect(deadlineDaysLeft(makeEvent({ registrationDeadline: '2026-10-12T23:59:00+07:00' }), now)).toBe(2);
  });
});

describe('grade labels', () => {
  it('writes runs of three or more as ranges and marks the whole school', () => {
    expect(formatGrades([6, 7, 8, 9, 10, 11, 12])).toBe('6–12');
    expect(formatGrades([12, 10, 11, 10])).toBe('10–12');
    expect(formatGrades([11, 12])).toBe('11, 12');
    expect(formatGrades([6, 7, 10])).toBe('6, 7, 10');
    expect(formatGrades([6, 7, 8, 10, 12])).toBe('6–8, 10, 12');
    expect(formatGrades([])).toBe('');
    expect(isOpenToAll([6, 7, 8, 9, 10, 11, 12])).toBe(true);
    expect(isOpenToAll([10, 11, 12])).toBe(false);
    expect(gradesLabel([6, 7, 8, 9, 10, 11, 12])).toBe('Khối 6–12 (toàn trường)');
    expect(gradesLabel([8, 9, 10, 11, 12])).toBe('Khối 8–12');
    expect(gradesLabel([12])).toBe('Khối 12');
  });
});

describe('fitsAvailability', () => {
  const weekendOnly = { weekdayAfterSchool: false, weekend: true };
  const weekdayOnly = { weekdayAfterSchool: true, weekend: false };
  it('checks weekends, after-school weekdays and school hours', () => {
    const saturday = makeEvent({ start: '2026-10-17T08:00:00+07:00', end: '2026-10-17T11:00:00+07:00' });
    const sunday = makeEvent({ start: '2026-10-18T08:00:00+07:00', end: '2026-10-18T11:00:00+07:00' });
    const afterSchool = makeEvent({ start: '2026-10-14T16:30:00+07:00' });
    const schoolHours = makeEvent({ start: '2026-10-14T09:00:00+07:00', end: '2026-10-14T10:30:00+07:00' });
    const schoolWide = makeEvent({ category: 'TS', start: '2026-10-14T07:30:00+07:00', end: '2026-10-14T09:30:00+07:00' });
    expect(fitsAvailability(saturday, weekendOnly)).toBe(true);
    expect(fitsAvailability(sunday, weekdayOnly)).toBe(false);
    expect(fitsAvailability(afterSchool, weekdayOnly)).toBe(true);
    expect(fitsAvailability(afterSchool, weekendOnly)).toBe(false);
    expect(fitsAvailability(schoolHours, weekdayOnly)).toBe(false);
    expect(fitsAvailability(schoolWide, weekendOnly)).toBe(true);
  });
});

describe('registrationState', () => {
  it('prefers the student registration, then past, closed, full, open', () => {
    const open = makeEvent({ id: 'o' });
    expect(registrationState(open, [reg('o', 'attended')], now)).toBe('attended');
    expect(registrationState(makeEvent({ end: '2026-10-09T18:00:00+07:00', start: '2026-10-09T16:00:00+07:00' }), [], now)).toBe('past');
    expect(registrationState(makeEvent({ registrationDeadline: '2026-10-09T23:59:00+07:00' }), [], now)).toBe('closed');
    expect(registrationState(makeEvent({ capacity: 3, seatsTaken: 3 }), [], now)).toBe('full');
    expect(registrationState(open, [], now)).toBe('open');
  });
});

describe('sortByStart', () => {
  it('sorts by start then id without mutating the input', () => {
    const b = makeEvent({ id: 'b', start: '2026-10-14T16:45:00+07:00' });
    const a = makeEvent({ id: 'a', start: '2026-10-14T16:45:00+07:00' });
    const early = makeEvent({ id: 'z', start: '2026-10-13T16:45:00+07:00' });
    const input = [b, a, early];
    expect(sortByStart(input).map((e) => e.id)).toEqual(['z', 'a', 'b']);
    expect(input.map((e) => e.id)).toEqual(['b', 'a', 'z']);
  });
});
