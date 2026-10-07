import { describe, expect, it } from 'vitest';
import { allConflicts, conflictIdsFor, findConflicts } from './conflicts';
import { makeEvent } from './test-fixtures';
import type { SchoolEvent } from './types';

const on = (id: string, from: string, to: string, day = '2026-10-14'): SchoolEvent =>
  makeEvent({ id, start: `${day}T${from}:00+07:00`, end: `${day}T${to}:00+07:00` });

const a = on('a', '16:00', '18:00');
const b = on('b', '17:00', '19:00'); // overlaps a by 60, c by 60
const c = on('c', '18:00', '19:00'); // back to back with a
const d = on('d', '16:00', '17:00'); // same start as a, back to back with b
const e = on('e', '20:00', '21:00'); // free

describe('findConflicts', () => {
  it('returns nothing for empty or non-overlapping input', () => {
    expect(findConflicts(a, [])).toEqual([]);
    expect(findConflicts(e, [a, b, c, d])).toEqual([]);
  });

  it('treats intervals as half-open: back-to-back events do not clash', () => {
    expect(findConflicts(a, [c])).toEqual([]);
    expect(findConflicts(c, [a])).toEqual([]);
    expect(findConflicts(d, [b])).toEqual([]);
  });

  it('excludes the same id and duplicates, ordered by the other event', () => {
    const copyOfA = { ...a, title: 'Bản sao' };
    expect(findConflicts(a, [e, c, b, d, copyOfA, b])).toEqual([
      { a: 'a', b: 'd', overlapMinutes: 60 },
      { a: 'a', b: 'b', overlapMinutes: 60 },
    ]);
  });

  it('keeps a/b in start-then-id order whichever side the target is on', () => {
    expect(findConflicts(b, [a])).toEqual([{ a: 'a', b: 'b', overlapMinutes: 60 }]);
    expect(findConflicts(d, [a])).toEqual([{ a: 'a', b: 'd', overlapMinutes: 60 }]);
    expect(findConflicts(b, [c, a])).toEqual([
      { a: 'a', b: 'b', overlapMinutes: 60 },
      { a: 'b', b: 'c', overlapMinutes: 60 },
    ]);
  });

  it('measures containment and multi-day overlaps', () => {
    const allDay = makeEvent({ id: 'trai', start: '2026-10-17T07:00:00+07:00', end: '2026-10-18T17:00:00+07:00' });
    const inside = on('workshop', '09:00', '10:30', '2026-10-18');
    expect(findConflicts(inside, [allDay])).toEqual([{ a: 'trai', b: 'workshop', overlapMinutes: 90 }]);
    const straddling = makeEvent({ id: 'dem', start: '2026-10-16T22:00:00+07:00', end: '2026-10-17T08:00:00+07:00' });
    expect(findConflicts(straddling, [allDay])).toEqual([{ a: 'dem', b: 'trai', overlapMinutes: 60 }]);
  });
});

describe('allConflicts', () => {
  it('returns nothing for empty, single or non-overlapping input', () => {
    expect(allConflicts([])).toEqual([]);
    expect(allConflicts([a])).toEqual([]);
    expect(allConflicts([a, c, e])).toEqual([]);
  });

  it('lists every overlapping pair once, sorted by a then b', () => {
    expect(allConflicts([e, c, b, d, a, { ...a }])).toEqual([
      { a: 'a', b: 'd', overlapMinutes: 60 },
      { a: 'a', b: 'b', overlapMinutes: 60 },
      { a: 'b', b: 'c', overlapMinutes: 60 },
    ]);
  });

  it('is independent of input order and does not mutate it', () => {
    const input = [a, b, c, d, e];
    const snapshot = structuredClone(input);
    expect(allConflicts(Object.freeze([...input].reverse()))).toEqual(allConflicts(input));
    expect(input).toEqual(snapshot);
  });

  it('handles events on different days and identical intervals', () => {
    const twin1 = on('twin-1', '08:00', '09:00', '2026-11-02');
    const twin2 = on('twin-2', '08:00', '09:00', '2026-11-02');
    expect(allConflicts([twin2, a, twin1])).toEqual([{ a: 'twin-1', b: 'twin-2', overlapMinutes: 60 }]);
  });
});

describe('conflictIdsFor', () => {
  const conflicts = allConflicts([a, b, c, d, e]);

  it('returns the other side of each conflict in order', () => {
    expect(conflictIdsFor('a', conflicts)).toEqual(['d', 'b']);
    expect(conflictIdsFor('b', conflicts)).toEqual(['a', 'c']);
    expect(conflictIdsFor('c', conflicts)).toEqual(['b']);
  });

  it('returns nothing for a free or unknown event', () => {
    expect(conflictIdsFor('e', conflicts)).toEqual([]);
    expect(conflictIdsFor('khong-co', [])).toEqual([]);
  });

  it('drops duplicate ids', () => {
    const repeated = [...conflicts, { a: 'a', b: 'b', overlapMinutes: 60 }, { a: 'b', b: 'a', overlapMinutes: 60 }];
    expect(conflictIdsFor('a', repeated)).toEqual(['d', 'b']);
  });
});
