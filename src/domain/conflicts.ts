/** Schedule conflicts between events (half-open intervals: back-to-back events do not clash). Pure. */
import { overlapMinutes, overlaps } from './dates';
import { eventEnd, eventStart, sortByStart } from './events';
import type { Conflict, SchoolEvent } from './types';

/** Keeps the first event for each id. */
function uniqueById(events: readonly SchoolEvent[]): SchoolEvent[] {
  const seen = new Set<string>();
  return events.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });
}

/** Conflict for two events already in start-then-id order, or null when they do not overlap. */
function orderedConflict(a: SchoolEvent, b: SchoolEvent): Conflict | null {
  const aStart = eventStart(a);
  const aEnd = eventEnd(a);
  const bStart = eventStart(b);
  const bEnd = eventEnd(b);
  if (!overlaps(aStart, aEnd, bStart, bEnd)) return null;
  return { a: a.id, b: b.id, overlapMinutes: overlapMinutes(aStart, aEnd, bStart, bEnd) };
}

/** Pairs two events so that `a` comes first by start, then id. */
function inOrder(x: SchoolEvent, y: SchoolEvent): [SchoolEvent, SchoolEvent] {
  const order = eventStart(x) - eventStart(y) || x.id.localeCompare(y.id);
  return order <= 0 ? [x, y] : [y, x];
}

/**
 * Conflicts between `target` and each other event (same id excluded, duplicates ignored).
 * Ordered by the other event's start, then id; each pair keeps a/b in start-then-id order.
 */
export function findConflicts(target: SchoolEvent, others: readonly SchoolEvent[]): Conflict[] {
  const conflicts: Conflict[] = [];
  for (const other of sortByStart(uniqueById(others.filter((o) => o.id !== target.id)))) {
    const conflict = orderedConflict(...inOrder(target, other));
    if (conflict) conflicts.push(conflict);
  }
  return conflicts;
}

/** Every overlapping pair, sorted by a's start then b's start (ids break ties). */
export function allConflicts(events: readonly SchoolEvent[]): Conflict[] {
  const sorted = sortByStart(uniqueById(events));
  const conflicts: Conflict[] = [];
  sorted.forEach((a, i) => {
    for (const b of sorted.slice(i + 1)) {
      const conflict = orderedConflict(a, b);
      if (conflict) conflicts.push(conflict);
    }
  });
  return conflicts;
}

/** Ids of the events that clash with `eventId`, in the order of `conflicts`, without duplicates. */
export function conflictIdsFor(eventId: string, conflicts: readonly Conflict[]): string[] {
  const ids: string[] = [];
  for (const c of conflicts) {
    const other = c.a === eventId ? c.b : c.b === eventId ? c.a : null;
    if (other !== null && !ids.includes(other)) ids.push(other);
  }
  return ids;
}
