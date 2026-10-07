import { describe, expect, it } from 'vitest';
import { toMillis } from './dates';
import { MIN_STATION_GAP, layoutRoute, timeToPos, type RouteLayoutInput } from './route-layout';
import { makeEvent } from './test-fixtures';
import type { CalendarPeriod, CategoryCode, SchoolEvent } from './types';

const ev = (id: string, category: CategoryCode, start: string, end = start): SchoolEvent =>
  makeEvent({ id, category, start, end });

/**
 * September 2026 (1/9 is a Tuesday). pxPerDay 10, padding.start 20: day d of the month sits
 * at 20 + (d − 1) × 10. Lanes HT, CN, TN at cross 24, 64, 104.
 */
const events: SchoolEvent[] = [
  ev('c', 'HT', '2026-09-02T14:00:00+07:00'), // 35.8 → nudged to 59
  ev('a', 'HT', '2026-09-02T12:00:00+07:00'), // 35
  ev('b', 'HT', '2026-09-02T13:00:00+07:00'), // 35.4 → nudged to 47
  ev('d', 'CN', '2026-09-02T18:00:00+07:00'), // 37.5
  ev('e', 'TN', '2026-09-10T09:00:00+07:00'), // 113.75 → 113.8
  ev('f', 'TS', '2026-09-12T09:00:00+07:00'), // category not drawn
  ev('g', 'HT', '2026-08-31T09:00:00+07:00'), // before the range
  ev('h', 'CN', '2026-10-01T00:00:00+07:00'), // range end is exclusive
  ev('i', 'CN', '2026-09-20T10:00:00+07:00'), // 214.17 → 214.2
];

const periods: CalendarPeriod[] = [
  { id: 'kt', kind: 'exam', label: 'Kiểm tra định kỳ', start: '2026-09-14', end: '2026-09-19' },
  { id: 'nghi-truoc', kind: 'holiday', label: 'Nghỉ lễ', start: '2026-08-25', end: '2026-09-02' },
  { id: 'ngoai', kind: 'holiday', label: 'Nghỉ lễ', start: '2026-10-05', end: '2026-10-10' },
  { id: 'cuoi', kind: 'exam', label: 'Kiểm tra định kỳ', start: '2026-09-28', end: '2026-10-03' },
];

const base: RouteLayoutInput = {
  events,
  myEventIds: ['a', 'e', 'i', 'khong-co'],
  periods,
  range: { from: toMillis('2026-09-01'), to: toMillis('2026-10-01') },
  orientation: 'horizontal',
  pxPerDay: 10,
  laneGap: 40,
  padding: { start: 20, end: 30, cross: 24 },
  categories: ['HT', 'CN', 'TN'],
  now: toMillis('2026-09-10T09:00:00+07:00'),
};

const input = (overrides: Partial<RouteLayoutInput> = {}): RouteLayoutInput => ({ ...base, ...overrides });

describe('timeToPos', () => {
  it('maps time linearly from padding.start, unrounded', () => {
    expect(timeToPos(base.range.from, base)).toBe(20);
    expect(timeToPos(toMillis('2026-09-11'), base)).toBe(120);
    expect(timeToPos(toMillis('2026-09-02T13:00:00+07:00'), base)).toBeCloseTo(35.4167, 4);
  });
});

describe('layoutRoute (horizontal)', () => {
  const layout = layoutRoute(base);

  it('sizes the canvas including paddings', () => {
    expect(layout.width).toBe(350); // 20 + 30 days × 10 + 30
    expect(layout.height).toBe(128); // 24 × 2 + 2 lane gaps × 40
  });

  it('draws one lane per category, in input order, along the whole time axis', () => {
    expect(layout.lanes).toEqual([
      { category: 'HT', x1: 20, y1: 24, x2: 320, y2: 24 },
      { category: 'CN', x1: 20, y1: 64, x2: 320, y2: 64 },
      { category: 'TN', x1: 20, y1: 104, x2: 320, y2: 104 },
    ]);
  });

  it('places in-range stations of drawn categories, sorted by start then id', () => {
    expect(layout.stations.map((s) => s.eventId)).toEqual(['a', 'b', 'c', 'd', 'e', 'i']);
    expect(layout.stations.find((s) => s.eventId === 'e')).toEqual({
      eventId: 'e',
      category: 'TN',
      x: 113.8,
      y: 104,
      mine: true,
      interchange: false,
      lane: 2,
    });
    expect(layout.stations.find((s) => s.eventId === 'd')).toMatchObject({ x: 37.5, y: 64, lane: 1, mine: false });
  });

  it(`nudges stations on the same lane at least ${MIN_STATION_GAP} units apart, preserving order`, () => {
    const ht = layout.stations.filter((s) => s.lane === 0).map((s) => [s.eventId, s.x]);
    expect(ht).toEqual([
      ['a', 35],
      ['b', 47],
      ['c', 59],
    ]);
  });

  it('joins same-day stations on different lanes at their mean time position', () => {
    expect(layout.interchanges).toEqual([{ eventIds: ['a', 'b', 'c', 'd'], x1: 44.6, y1: 24, x2: 44.6, y2: 64 }]);
    expect(layout.stations.filter((s) => s.interchange).map((s) => s.eventId)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('draws my route with time-axis runs and 45° bends, straight when the gap is short', () => {
    // a → e: time gap 78.8 < lane change 80 → straight; e → i: run to 174.2, then 45° to (214.2, 64).
    expect(layout.myRoute.d).toBe('M 35 24 L 113.8 104 L 174.2 104 L 214.2 64');
    const expected = Math.hypot(78.8, 80) + 60.4 + 40 * Math.SQRT2;
    expect(layout.myRoute.length).toBe(Math.round(expected * 10) / 10);
  });

  it('builds one fare zone per month and ticks on Mondays', () => {
    expect(layout.months).toEqual([{ label: 'Tháng 9', short: 'T9', from: 20, to: 320, index: 0 }]);
    expect(layout.weekTicks).toEqual([80, 150, 220, 290]); // 7, 14, 21, 28/9
  });

  it('maps periods with inclusive end dates, clipped to the range', () => {
    expect(layout.periods).toEqual([
      { id: 'kt', kind: 'exam', label: 'Kiểm tra định kỳ', from: 150, to: 210 },
      { id: 'nghi-truoc', kind: 'holiday', label: 'Nghỉ lễ', from: 20, to: 40 },
      { id: 'cuoi', kind: 'exam', label: 'Kiểm tra định kỳ', from: 290, to: 320 },
    ]);
  });

  it('places today, or null outside the range', () => {
    expect(layout.today).toBe(113.8);
    expect(layoutRoute(input({ now: toMillis('2026-10-01') })).today).toBeNull();
    expect(layoutRoute(input({ now: toMillis('2026-08-31T23:59:00+07:00') })).today).toBeNull();
  });
});

describe('layoutRoute (vertical)', () => {
  const layout = layoutRoute(input({ orientation: 'vertical' }));

  it('swaps the axes', () => {
    expect(layout.width).toBe(128);
    expect(layout.height).toBe(350);
    expect(layout.lanes[0]).toEqual({ category: 'HT', x1: 24, y1: 20, x2: 24, y2: 320 });
    expect(layout.stations.find((s) => s.eventId === 'b')).toMatchObject({ x: 24, y: 47 });
    expect(layout.interchanges[0]).toMatchObject({ x1: 24, y1: 44.6, x2: 64, y2: 44.6 });
    expect(layout.myRoute.d).toBe('M 24 35 L 104 113.8 L 104 174.2 L 64 214.2');
    expect(layout.myRoute.length).toBe(layoutRoute(base).myRoute.length);
    expect(layout.weekTicks).toEqual([80, 150, 220, 290]);
  });
});

describe('layoutRoute edge cases', () => {
  it('returns an empty map for no events and no categories', () => {
    const layout = layoutRoute(input({ events: [], categories: [], myEventIds: [], periods: [] }));
    expect(layout).toMatchObject({
      width: 350,
      height: 48,
      lanes: [],
      stations: [],
      interchanges: [],
      myRoute: { d: '', length: 0 },
      periods: [],
    });
  });

  it('starts my route with a single move for one station', () => {
    const layout = layoutRoute(input({ myEventIds: ['e'] }));
    expect(layout.myRoute).toEqual({ d: 'M 113.8 104', length: 0 });
  });

  it('draws a straight run between my stations on the same lane', () => {
    const layout = layoutRoute(input({ myEventIds: ['a', 'c'] }));
    expect(layout.myRoute).toEqual({ d: 'M 35 24 L 59 24', length: 24 });
  });

  it('draws a single 45° diagonal when the time gap equals the lane change', () => {
    const layout = layoutRoute(
      input({
        events: [ev('p', 'HT', '2026-09-02T00:00:00+07:00'), ev('q', 'CN', '2026-09-06T00:00:00+07:00')],
        myEventIds: ['p', 'q'],
      }),
    );
    expect(layout.myRoute.d).toBe('M 30 24 L 70 64');
    expect(layout.myRoute.length).toBe(Math.round(40 * Math.SQRT2 * 10) / 10);
  });

  it('breaks ties by id and keeps same-lane, same-day stations out of interchanges', () => {
    const layout = layoutRoute(
      input({
        events: [ev('y', 'HT', '2026-09-05T08:00:00+07:00'), ev('x', 'HT', '2026-09-05T08:00:00+07:00')],
        myEventIds: [],
      }),
    );
    expect(layout.stations.map((s) => [s.eventId, s.x])).toEqual([
      ['x', 63.3],
      ['y', 75.3],
    ]);
    expect(layout.interchanges).toEqual([]);
  });

  it('extends the time axis when nudged stations pass the end of the range', () => {
    const layout = layoutRoute(
      input({
        range: { from: toMillis('2026-09-01'), to: toMillis('2026-09-02') },
        events: [ev('m', 'HT', '2026-09-01T23:00:00+07:00'), ev('n', 'HT', '2026-09-01T23:30:00+07:00')],
        periods: [],
      }),
    );
    expect(layout.stations.map((s) => s.x)).toEqual([29.6, 41.6]);
    expect(layout.lanes[0]).toMatchObject({ x1: 20, x2: 41.6 });
    expect(layout.width).toBe(71.6);
    expect(layout.weekTicks).toEqual([]);
  });

  it('clips month zones to the range and numbers them across the year boundary', () => {
    const layout = layoutRoute(
      input({ range: { from: toMillis('2026-11-20'), to: toMillis('2027-01-11') }, events: [], periods: [] }),
    );
    expect(layout.months).toEqual([
      { label: 'Tháng 11', short: 'T11', from: 20, to: 130, index: 0 },
      { label: 'Tháng 12', short: 'T12', from: 130, to: 440, index: 1 },
      { label: 'Tháng 1', short: 'T1', from: 440, to: 540, index: 2 },
    ]);
    // Mondays: 23/11, 30/11, 7/12, … , 4/1 (no tick on the range start, a Friday).
    expect(layout.weekTicks[0]).toBe(50);
    expect(layout.weekTicks).toHaveLength(7);
  });

  it('includes a Monday that is exactly the range start', () => {
    const layout = layoutRoute(
      input({ range: { from: toMillis('2026-09-07'), to: toMillis('2026-09-15') }, events: [], periods: [] }),
    );
    expect(layout.weekTicks).toEqual([20, 90]);
  });
});
