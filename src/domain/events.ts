/** Event-level facts derived from an event, the student's registrations and the clock. Pure. */
import { calendarDaysBetween, durationHours, formatTime, formatTimeRange, toMillis, vnParts } from './dates';
import { GRADES, type Availability, type Grade, type Millis, type Registration, type SchoolEvent } from './types';

/** Weekday events starting at or after this minute of the day count as "after school". */
export const AFTER_SCHOOL_MINUTE = 16 * 60 + 30;

export function eventStart(e: SchoolEvent): Millis {
  return toMillis(e.start);
}

export function eventEnd(e: SchoolEvent): Millis {
  return toMillis(e.end);
}

/** A date-only event (time not announced) takes no hours. */
export function eventHours(e: SchoolEvent): number {
  return e.dateOnly === true ? 0 : durationHours(eventStart(e), eventEnd(e));
}

/** True while only the date of the event is announced (see SchoolEvent.dateOnly). */
export function isDateOnly(e: SchoolEvent): boolean {
  return e.dateOnly === true;
}

/** What screens show for a detail a date-only event does not have yet. */
export const DETAILS_PENDING = 'Đang cập nhật';

/** "14:30–16:00", or "Đang cập nhật" while only the date is announced. */
export function eventTimeLabel(e: SchoolEvent): string {
  return isDateOnly(e) ? DETAILS_PENDING : formatTimeRange(eventStart(e), eventEnd(e));
}

/** The start time "14:30", or "Đang cập nhật" while only the date is announced. */
export function eventStartTimeLabel(e: SchoolEvent): string {
  return isDateOnly(e) ? DETAILS_PENDING : formatTime(eventStart(e));
}

/** The place in full: "Trực tuyến · Google Meet" or the room, or "Đang cập nhật". */
export function eventPlaceLabel(e: SchoolEvent): string {
  if (isDateOnly(e)) return DETAILS_PENDING;
  return e.format === 'online' ? `Trực tuyến · ${e.location}` : e.location;
}

/** The place in short: "Trực tuyến" or the room, or "Đang cập nhật". */
export function eventVenueLabel(e: SchoolEvent): string {
  if (isDateOnly(e)) return DETAILS_PENDING;
  return e.format === 'online' ? 'Trực tuyến' : e.location;
}

/** "Trực tiếp" or "Trực tuyến", or "Đang cập nhật". */
export function eventFormatLabel(e: SchoolEvent): string {
  if (isDateOnly(e)) return DETAILS_PENDING;
  return e.format === 'online' ? 'Trực tuyến' : 'Trực tiếp';
}

/** The grades the event is for (see gradesLabel), or "Đang cập nhật". */
export function eventGradesLabel(e: SchoolEvent): string {
  return isDateOnly(e) ? DETAILS_PENDING : gradesLabel(e.eligibleGrades);
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

/** Open to every grade of the school (khối 6–12). */
export function isOpenToAll(grades: readonly Grade[]): boolean {
  return GRADES.every((g) => grades.includes(g));
}

/**
 * The grades as Vietnamese text, in order, without "Khối": runs of three or more become a
 * range ("6–12", "8–12"), shorter runs stay a list ("11, 12"; "6, 7, 10").
 */
export function formatGrades(grades: readonly Grade[]): string {
  const sorted = [...new Set(grades)].sort((a, b) => a - b);
  const runs: Grade[][] = [];
  for (const g of sorted) {
    const run = runs.at(-1);
    if (run?.at(-1) === g - 1) run.push(g);
    else runs.push([g]);
  }
  return runs.map((run) => (run.length >= 3 ? `${String(run[0])}–${String(run.at(-1))}` : run.join(', '))).join(', ');
}

/** "Khối 6–12 (toàn trường)", "Khối 10–12", "Khối 11, 12". */
export function gradesLabel(grades: readonly Grade[]): string {
  return isOpenToAll(grades) ? `Khối ${formatGrades(grades)} (toàn trường)` : `Khối ${formatGrades(grades)}`;
}

/** The tag naming an event organised outside the school. */
export const EXTERNAL_COMPETITION_LABEL = 'Cuộc thi ngoài trường';

/**
 * Organised outside the school ("Cuộc thi ngoài trường"): the event names its external
 * organiser. The publisher (`clubId`, e.g. Phòng Cố vấn Học tập) only relays the information.
 */
export function isExternalCompetition<T extends { organizer?: string }>(e: T): e is T & { organizer: string } {
  return e.organizer !== undefined && e.organizer.trim() !== '';
}

/**
 * The publisher as shown next to an event in lists and dialogs: "Vinschool Debate Society", or for an
 * external competition "Phòng Cố vấn Học tập · Đơn vị tổ chức: Trường đại học đối tác".
 */
export function publisherLine(e: { organizer?: string }, publisherName: string): string {
  if (!isExternalCompetition(e)) return publisherName;
  const organizer = `Đơn vị tổ chức: ${e.organizer.trim()}`;
  return publisherName === '' ? organizer : `${publisherName} · ${organizer}`;
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

/** 'not_open': only the date is announced, so registration has not opened yet. */
export type RegistrationState = 'registered' | 'attended' | 'absent' | 'open' | 'full' | 'closed' | 'past' | 'not_open';

/** The single status a student sees for an event. */
export function registrationState(e: SchoolEvent, regs: Registration[], now: Millis): RegistrationState {
  const r = findRegistration(e.id, regs);
  if (r) return r.status;
  if (isPast(e, now)) return 'past';
  if (isDateOnly(e)) return 'not_open';
  if (isDeadlinePassed(e, now)) return 'closed';
  if (isFull(e, regs)) return 'full';
  return 'open';
}

/** Stable sort by start, then id. Returns a new array. */
export function sortByStart(events: readonly SchoolEvent[]): SchoolEvent[] {
  return [...events].sort((a, b) => eventStart(a) - eventStart(b) || a.id.localeCompare(b.id));
}
