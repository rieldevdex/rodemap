/**
 * Geometry for the RouteMap, in unitless SVG user units. Pure.
 *
 * Two axes: the time axis (x when horizontal, y when vertical) maps time linearly
 * from `range.from` at `padding.start`; the cross axis places one lane per category
 * at `padding.cross + laneIndex * laneGap`, in the order of `input.categories`.
 * Every output coordinate is rounded to one decimal.
 */
import {
  DAY_MS,
  addDays,
  monthLabel,
  monthShortLabel,
  startOfIsoWeek,
  startOfNextVnMonth,
  startOfVnDay,
  startOfVnMonth,
  toMillis,
  vnParts,
} from './dates';
import { eventStart, sortByStart } from './events';
import type { CalendarPeriod, CategoryCode, Millis, SchoolEvent } from './types';

export type Orientation = 'horizontal' | 'vertical';

export interface RouteLayoutInput {
  events: SchoolEvent[];
  myEventIds: string[];
  periods: CalendarPeriod[];
  /** Half-open: an instant t is in range when from ≤ t < to. */
  range: { from: Millis; to: Millis };
  orientation: Orientation;
  pxPerDay: number;
  laneGap: number;
  padding: { start: number; end: number; cross: number };
  categories: CategoryCode[];
  now: Millis;
}

export interface StationGeom {
  eventId: string;
  category: CategoryCode;
  x: number;
  y: number;
  mine: boolean;
  interchange: boolean;
  lane: number;
}

export interface RouteLayout {
  width: number;
  height: number;
  lanes: { category: CategoryCode; x1: number; y1: number; x2: number; y2: number }[];
  /** Sorted by start then id (keyboard order). */
  stations: StationGeom[];
  /** Same-day stations on different lanes, joined across the cross axis. */
  interchanges: { eventIds: string[]; x1: number; y1: number; x2: number; y2: number }[];
  /** SVG path: runs along the time axis + 45° bends between my stations. */
  myRoute: { d: string; length: number };
  /** Fare zones along the time axis, one per calendar month; `index` counts from 0 (parity alternates). */
  months: { label: string; short: string; from: number; to: number; index: number }[];
  /** Positions of each Monday 00:00 in range. */
  weekTicks: number[];
  periods: { id: string; kind: CalendarPeriod['kind']; label: string; from: number; to: number }[];
  /** Position of `now`, null if out of range. */
  today: number | null;
}

/** Minimum distance between two stations on the same lane, along the time axis. */
export const MIN_STATION_GAP = 12;

/** Position of an instant on the time axis (unrounded). */
export function timeToPos(t: Millis, input: Pick<RouteLayoutInput, 'range' | 'pxPerDay' | 'padding'>): number {
  return input.padding.start + ((t - input.range.from) / DAY_MS) * input.pxPerDay;
}

/** Rounds to one decimal; adding 0 turns −0 into 0. */
function round1(n: number): number {
  return Math.round(n * 10) / 10 + 0;
}

/** A point in axis space: `time` along the time axis, `cross` across the lanes. */
interface AxisPoint {
  time: number;
  cross: number;
}

interface Placed extends AxisPoint {
  event: SchoolEvent;
  start: Millis;
  lane: number;
}

/**
 * Transit-style polyline through `points` (axis space): run along the time axis, then a
 * 45° diagonal into the next station. When the time gap is smaller than the lane change,
 * a single straight segment is drawn instead.
 */
function routeVertices(points: readonly AxisPoint[]): AxisPoint[] {
  const vertices: AxisPoint[] = [];
  let prev: AxisPoint | undefined;
  for (const p of points) {
    if (prev) {
      const dc = Math.abs(p.cross - prev.cross);
      if (dc > 0 && p.time - prev.time > dc) vertices.push({ time: p.time - dc, cross: prev.cross });
    }
    vertices.push(p);
    prev = p;
  }
  return vertices;
}

export function layoutRoute(input: RouteLayoutInput): RouteLayout {
  const { range, padding, laneGap, categories } = input;
  const horizontal = input.orientation === 'horizontal';
  const pos = (t: Millis): number => round1(timeToPos(t, input));
  const inRange = (t: Millis): boolean => t >= range.from && t < range.to;
  const toXY = (p: AxisPoint): { x: number; y: number } =>
    horizontal ? { x: round1(p.time), y: round1(p.cross) } : { x: round1(p.cross), y: round1(p.time) };

  /* Stations, nudged apart along the time axis on each lane. */
  const laneOf = new Map<CategoryCode, number>(categories.map((c, i) => [c, i]));
  const lastOnLane = new Map<number, number>();
  const placed: Placed[] = [];
  for (const event of sortByStart(input.events)) {
    const lane = laneOf.get(event.category);
    const start = eventStart(event);
    if (lane === undefined || !inRange(start)) continue;
    const prev = lastOnLane.get(lane);
    const time = prev === undefined ? pos(start) : Math.max(pos(start), round1(prev + MIN_STATION_GAP));
    lastOnLane.set(lane, time);
    placed.push({ event, start, lane, time, cross: round1(padding.cross + lane * laneGap) });
  }

  /* Interchanges: stations on the same Vietnam calendar day spanning ≥ 2 lanes. */
  const byDay = new Map<Millis, Placed[]>();
  for (const p of placed) {
    const day = startOfVnDay(p.start);
    const group = byDay.get(day);
    if (group) group.push(p);
    else byDay.set(day, [p]);
  }
  const interchangeIds = new Set<string>();
  const interchanges: RouteLayout['interchanges'] = [];
  for (const group of byDay.values()) {
    if (new Set(group.map((p) => p.lane)).size < 2) continue;
    const time = group.reduce((sum, p) => sum + p.time, 0) / group.length;
    const crosses = group.map((p) => p.cross);
    const a = toXY({ time, cross: Math.min(...crosses) });
    const b = toXY({ time, cross: Math.max(...crosses) });
    const eventIds = group.map((p) => p.event.id);
    for (const id of eventIds) interchangeIds.add(id);
    interchanges.push({ eventIds, x1: a.x, y1: a.y, x2: b.x, y2: b.y });
  }

  const mineIds = new Set(input.myEventIds);
  const stations: StationGeom[] = placed.map((p) => ({
    eventId: p.event.id,
    category: p.event.category,
    ...toXY(p),
    mine: mineIds.has(p.event.id),
    interchange: interchangeIds.has(p.event.id),
    lane: p.lane,
  }));

  /* Your route. */
  const vertices = routeVertices(placed.filter((p) => mineIds.has(p.event.id))).map(toXY);
  let d = '';
  let length = 0;
  let last: { x: number; y: number } | undefined;
  for (const v of vertices) {
    d += last ? ` L ${v.x} ${v.y}` : `M ${v.x} ${v.y}`;
    if (last) length += Math.hypot(v.x - last.x, v.y - last.y);
    last = v;
  }

  /* Extent: the time axis grows if nudged stations pass the end of the range. */
  const timeEnd = Math.max(pos(range.to), ...placed.map((p) => p.time));
  const crossExtent = round1(padding.cross * 2 + Math.max(0, categories.length - 1) * laneGap);
  const timeExtent = round1(timeEnd + padding.end);

  const lanes = categories.map((category, i) => {
    const cross = padding.cross + i * laneGap;
    const a = toXY({ time: padding.start, cross });
    const b = toXY({ time: timeEnd, cross });
    return { category, x1: a.x, y1: a.y, x2: b.x, y2: b.y };
  });

  /* Fare zones, one per calendar month overlapping the range. */
  const months: RouteLayout['months'] = [];
  for (let m = startOfVnMonth(range.from); m < range.to; m = startOfNextVnMonth(m)) {
    const month = vnParts(m).month;
    months.push({
      label: monthLabel(month),
      short: monthShortLabel(month),
      from: pos(Math.max(m, range.from)),
      to: pos(Math.min(startOfNextVnMonth(m), range.to)),
      index: months.length,
    });
  }

  const weekTicks: number[] = [];
  for (let t = startOfIsoWeek(range.from); t < range.to; t = addDays(t, 7)) {
    if (t >= range.from) weekTicks.push(pos(t));
  }

  /* Periods cover their inclusive end date: `to` is the start of the following day. */
  const periods: RouteLayout['periods'] = [];
  for (const p of input.periods) {
    const from = Math.max(toMillis(p.start), range.from);
    const to = Math.min(addDays(toMillis(p.end), 1), range.to);
    if (from < to) periods.push({ id: p.id, kind: p.kind, label: p.label, from: pos(from), to: pos(to) });
  }

  return {
    width: horizontal ? timeExtent : crossExtent,
    height: horizontal ? crossExtent : timeExtent,
    lanes,
    stations,
    interchanges,
    myRoute: { d, length: round1(length) },
    months,
    weekTicks,
    periods,
    today: inRange(input.now) ? pos(input.now) : null,
  };
}
