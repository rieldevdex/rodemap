/** Event-level facts derived from an event, the student's registrations and the clock. Pure. */
import { calendarDaysBetween, durationHours, toMillis, vnParts } from './dates';
import type { Availability, Grade, Millis, Registration, SchoolEvent } from './types';

/** Weekday events starting at or after this minute of the day count as "after school". */
export const AFTER_SCHOOL_MINUTE = 16 * 60 + 30;

export function eventStart(e: SchoolEvent): Millis {
  return toMillis(e.start);
}

export function eventEnd(e: SchoolEvent): Millis {
  return toMillis(e.end);
}

export function eventHours(e: SchoolEvent): number {
  return durationHours(eventStart(e), eventEnd(e));
}

export function findRegistration(eventId: string, regs: Registration[]): Registration | undefined {
  return regs.find((r) => r.eventId === eventId);
}

/** Registered or attended (absent does not hold a seat). */
export function isRegistered(eventId: string, regs: Registration[]): boolean {
  const r = findRegistration(eventId, regs);
  return r !== undefined && r.status !== 'absent';
}

export function seatsLeft(e: SchoolEvent, regs: Registration[]): number {
  const mine = isRegistered(e.id, regs) ? 1 : 0;
  return Math.max(0, e.capacity - e.seatsTaken - mine);
}

export function isFull(e: SchoolEvent, regs: Registration[]): boolean {
  return seatsLeft(e, regs) === 0;
}

export function isDeadlinePassed(e: SchoolEvent, now: Millis): boolean {
  return toMillis(e.registrationDeadline) < now;
}

export function isPast(e: SchoolEvent, now: Millis): boolean {
  return eventEnd(e) <= now;
}

/** A null grade (no profile yet) is treated as eligible. */
export function isEligible(e: SchoolEvent, grade: Grade | null): boolean {
  return grade === null || e.eligibleGrades.includes(grade);
}

/** Calendar days until the registration deadline (0 = today, negative = passed). */
export function deadlineDaysLeft(e: SchoolEvent, now: Millis): number {
  return calendarDaysBetween(now, toMillis(e.registrationDeadline));
}

/**
 * Weekend events need weekend availability; weekday events starting from 16:30 need
 * after-school availability. Weekday events inside school hours are scheduled by the
 * school, so only school-wide events (TS) fit them.
 */
export function fitsAvailability(e: SchoolEvent, a: Availability): boolean {
  const p = vnParts(eventStart(e));
  if (p.weekday === 0 || p.weekday === 6) return a.weekend;
  if (p.hour * 60 + p.minute >= AFTER_SCHOOL_MINUTE) return a.weekdayAfterSchool;
  return e.category === 'TS';
}

export type RegistrationState = 'registered' | 'attended' | 'absent' | 'open' | 'full' | 'closed' | 'past';

/** The single status a student sees for an event. */
export function registrationState(e: SchoolEvent, regs: Registration[], now: Millis): RegistrationState {
  const r = findRegistration(e.id, regs);
  if (r) return r.status;
  if (isPast(e, now)) return 'past';
  if (isDeadlinePassed(e, now)) return 'closed';
  if (isFull(e, regs)) return 'full';
  return 'open';
}

/** Stable sort by start, then id. Returns a new array. */
export function sortByStart(events: readonly SchoolEvent[]): SchoolEvent[] {
  return [...events].sort((a, b) => eventStart(a) - eventStart(b) || a.id.localeCompare(b.id));
}
