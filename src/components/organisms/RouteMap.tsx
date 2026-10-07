import {
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from 'react';
import type { Orientation, RouteLayout, StationGeom } from '../../domain/route-layout';
import type { CategoryCode } from '../../domain/types';
import './RouteMap.css';

export interface RouteMapLane {
  code: CategoryCode;
  name: string;
}

export interface RouteMapHandle {
  /**
   * Brings today into view: a scrolling horizontal map scrolls itself so today sits near the
   * left third; a vertical map scrolls the page to the "Hôm nay" marker. User-initiated only.
   */
  scrollToToday: () => void;
}

export interface RouteMapProps {
  layout: RouteLayout;
  orientation: Orientation;
  lanes: RouteMapLane[];
  /** Accessible name of the whole map, e.g. "Lộ trình năm học 2026–2027". */
  label: string;
  /** Short accessible label for one station: "HT · Tên sự kiện · Th 4 · 14/10, 16:45". */
  stationLabel: (eventId: string) => string;
  /** Station card content shown on hover/focus. */
  renderCard?: ((eventId: string) => ReactNode) | undefined;
  onActivate?: ((eventId: string) => void) | undefined;
  /**
   * When given, stations are real links (`<a href>` inside the SVG): Enter and plain clicks call
   * `onActivate`, modifier clicks open the URL natively.
   */
  stationHref?: ((eventId: string) => string) | undefined;
  /** Draw the lines in and pop the stations on (landing page). */
  animateIn?: boolean | undefined;
  /** Show the "Hôm nay" marker. */
  showToday?: boolean | undefined;
  /** Text of the today marker, e.g. "Hôm nay · 07/10". */
  todayLabel?: string | undefined;
  /** Scale a horizontal map to the container width instead of scrolling (short fragments). */
  fit?: boolean | undefined;
  /**
   * Length of "your route" the student saw last time. Read once, on mount: when it is shorter
   * than the current route, the route grows from it (the product's key moment).
   */
  growFrom?: number | undefined;
  /** Stations that arrive at the end of that growth (newly registered). Read once, on mount. */
  arrivals?: readonly string[] | undefined;
  /** Legend under the map: lines only (default), lines + symbols, or none (the page renders RouteMapLegend). */
  legend?: 'lines' | 'full' | 'none' | undefined;
  /** Pin the line codes to the leading edge while the map scrolls. Defaults to true unless `fit`. */
  laneLabels?: boolean | undefined;
  ref?: Ref<RouteMapHandle> | undefined;
  className?: string | undefined;
}

/** Month zones narrower than this (user units) get no label, so labels never collide. */
const MIN_LABELLED_ZONE = 72;
/** Distance between a station and its card, in CSS pixels. */
const CARD_GAP = 18;
/** Minimum distance between the card and the visible edge of the map, in CSS pixels. */
const CARD_MARGIN = 8;
/** Width of the pinned line-code column of a scrolling horizontal map, in CSS pixels (RouteMap.css: space-7 + space-2). */
const LANE_COLUMN = 56;

type StationElement = HTMLElement | SVGElement;

function laneVar(code: CategoryCode): string {
  return `var(--line-${code.toLowerCase()})`;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function isPlainLeftClick(e: MouseEvent): boolean {
  return e.button === 0 && !e.metaKey && !e.altKey && !e.ctrlKey && !e.shiftKey;
}

/** Station marker: lane ring (normal), ink ring (interchange), signal ring (on your route). */
function StationMark({ station }: { station: StationGeom }) {
  if (station.mine) {
    return (
      <g className="route-map__visual">
        <circle className="route-map__ring" r={station.interchange ? 8.5 : 7} />
        <circle className="route-map__core" r={station.interchange ? 3.5 : 3} />
      </g>
    );
  }
  if (station.interchange) {
    return (
      <g className="route-map__visual">
        <circle className="route-map__interchange-ring" r="8.5" />
        <circle className="route-map__core" r="3" />
      </g>
    );
  }
  return (
    <g className="route-map__visual">
      <circle className="route-map__stop" r="5.5" />
    </g>
  );
}

/** Lane legend: code + name, never color alone; the full variant adds the map symbols. */
export function RouteMapLegend({
  lanes,
  variant = 'lines',
  className,
}: {
  lanes: RouteMapLane[];
  /** lines: codes + names; symbols: stations, zones and markers; full: both. */
  variant?: 'lines' | 'symbols' | 'full';
  className?: string;
}) {
  const id = useId();
  const lines = lanes.map((l) => (
    <li key={l.code} className="route-map__legend-item" style={{ '--lane-color': laneVar(l.code) } as Record<string, string>}>
      <span className="route-map__legend-code">{l.code}</span>
      <span className="route-map__legend-name">{l.name}</span>
    </li>
  ));
  if (variant === 'lines') {
    return (
      <ul className={['route-map__legend', className].filter(Boolean).join(' ')} aria-label="Các tuyến lĩnh vực">
        {lines}
        <li className="route-map__legend-item route-map__legend-item--mine">
          <span className="route-map__legend-swatch" aria-hidden="true" />
          <span className="route-map__legend-name">Lộ trình của bạn</span>
        </li>
      </ul>
    );
  }
  return (
    <div className={['route-map__legend-full', className].filter(Boolean).join(' ')}>
      {variant === 'full' ? (
        <div className="route-map__legend-row">
          <p className="route-map__legend-title" id={`${id}-lines`}>
            Tuyến
          </p>
          <ul className="route-map__legend" aria-labelledby={`${id}-lines`}>
            {lines}
          </ul>
        </div>
      ) : null}
      <div className="route-map__legend-row">
        <p className="route-map__legend-title" id={`${id}-symbols`}>
          Ký hiệu
        </p>
        <ul className="route-map__legend" aria-labelledby={`${id}-symbols`}>
          <li className="route-map__legend-item">
            <svg className="route-map__legend-symbol" viewBox="-12 -12 24 24" aria-hidden="true" focusable="false">
              <circle className="route-map__legend-stop" r="5.5" />
            </svg>
            <span className="route-map__legend-name">Sự kiện</span>
          </li>
          <li className="route-map__legend-item">
            <svg className="route-map__legend-symbol route-map__legend-symbol--wide" viewBox="-24 -12 48 24" aria-hidden="true" focusable="false">
              <line className="route-map__legend-mine" x1="-18" y1="0" x2="18" y2="0" />
              <circle className="route-map__legend-ring" r="7" />
              <circle className="route-map__legend-core" r="3" />
            </svg>
            <span className="route-map__legend-name">Lộ trình của bạn</span>
          </li>
          <li className="route-map__legend-item">
            <svg className="route-map__legend-symbol" viewBox="-12 -12 24 24" aria-hidden="true" focusable="false">
              <circle className="route-map__legend-interchange" r="8.5" />
              <circle className="route-map__legend-core" r="3" />
            </svg>
            <span className="route-map__legend-name">Nhiều sự kiện cùng ngày</span>
          </li>
          <li className="route-map__legend-item">
            <span className="route-map__legend-zone route-map__legend-zone--exam" aria-hidden="true" />
            <span className="route-map__legend-name">Kiểm tra định kỳ</span>
          </li>
          <li className="route-map__legend-item">
            <span className="route-map__legend-zone route-map__legend-zone--holiday" aria-hidden="true" />
            <span className="route-map__legend-name">Nghỉ Tết</span>
          </li>
          <li className="route-map__legend-item">
            <span className="route-map__legend-today" aria-hidden="true" />
            <span className="route-map__legend-name">Hôm nay</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

/**
 * The school year as a route map: category lines in parallel, events as
 * stations, the student's plan as the thicker signal line "your route".
 * Presentational: geometry comes from domain/route-layout.
 */
export function RouteMap({
  layout,
  orientation,
  lanes,
  label,
  stationLabel,
  renderCard,
  onActivate,
  stationHref,
  animateIn = false,
  showToday = true,
  todayLabel = 'Hôm nay',
  fit = false,
  growFrom,
  arrivals,
  legend = 'lines',
  laneLabels = !fit,
  ref,
  className,
}: RouteMapProps) {
  const uid = useId().replace(/:/g, '');
  const hatchId = `hatch-${uid}`;
  const holidayId = `holiday-${uid}`;
  const helpId = `${uid}-help`;
  const scrollRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const todayRef = useRef<SVGLineElement>(null);
  const stationRefs = useRef(new Map<string, StationElement>());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [cardId, setCardId] = useState<string | null>(null);
  const horizontal = orientation === 'horizontal';
  const scrolls = horizontal && !fit;
  const extent = horizontal ? layout.width : layout.height;
  const stations = layout.stations;

  /* ── "Your route" grows when an event is added: the key moment ─────────── */
  const routeRef = useRef<SVGGElement>(null);
  const growFromRef = useRef(growFrom);
  const previousRoute = useRef<{ length: number; mine: Set<string> } | null>(null);
  const [arriving] = useState(() => new Set(growFrom !== undefined && growFrom < layout.myRoute.length ? (arrivals ?? []) : []));
  const mineKey = stations
    .filter((s) => s.mine)
    .map((s) => s.eventId)
    .join('|');

  useLayoutEffect(() => {
    const total = layout.myRoute.length;
    const mine = new Set(mineKey === '' ? [] : mineKey.split('|'));
    const previous = previousRoute.current;
    previousRoute.current = { length: total, mine };
    let from: number | null = null;
    if (previous === null) {
      const initial = growFromRef.current;
      if (initial !== undefined && initial < total) from = initial;
    } else if (total > previous.length && [...mine].some((id) => !previous.mine.has(id))) {
      from = previous.length;
    }
    const group = routeRef.current;
    if (from === null || !group || prefersReducedMotion()) return;
    group.style.setProperty('--route-from', String(total - from));
    group.classList.remove('route-map__mine--grow');
    // Force a reflow so the animation restarts.
    void group.getBoundingClientRect();
    group.classList.add('route-map__mine--grow');
  }, [layout.myRoute.length, mineKey]);

  /* ── Scrolling ─────────────────────────────────────────────────────────── */

  /** Scroll position that puts `pos` (user units) at `fraction` of the visible width. */
  function scrollTarget(scroller: HTMLDivElement, pos: number, fraction: number): number {
    return clamp(pos - scroller.clientWidth * fraction, 0, scroller.scrollWidth - scroller.clientWidth);
  }

  // On load (and when the orientation changes), a scrolling map shows today near the left
  // third, or the newest arrival when it would otherwise be out of view. The page never scrolls.
  const firstArrival = stations.find((s) => arriving.has(s.eventId));
  const arrivalPos = firstArrival ? firstArrival.x : null;
  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    if (!scrolls || !scroller || layout.today === null) return;
    let left = scrollTarget(scroller, layout.today, 1 / 3);
    if (arrivalPos !== null && arrivalPos > left + scroller.clientWidth - LANE_COLUMN) {
      left = scrollTarget(scroller, arrivalPos, 2 / 3);
    }
    scroller.scrollLeft = left;
    // Only on mount and orientation changes: later layout updates keep the reader's position.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrolls]);

  useImperativeHandle(
    ref,
    () => ({
      scrollToToday() {
        const behavior: ScrollBehavior = prefersReducedMotion() ? 'auto' : 'smooth';
        const scroller = scrollRef.current;
        if (scrolls && scroller && layout.today !== null) {
          scroller.scrollTo({ left: scrollTarget(scroller, layout.today, 1 / 3), behavior });
        } else {
          todayRef.current?.scrollIntoView({ block: 'center', behavior });
        }
      },
    }),
    [scrolls, layout.today],
  );

  /** Keeps a keyboard-focused station inside the visible part of the map. */
  function revealStation(station: StationGeom, el: StationElement) {
    const scroller = scrollRef.current;
    if (scrolls && scroller) {
      const min = scroller.scrollLeft + LANE_COLUMN + CARD_GAP;
      const max = scroller.scrollLeft + scroller.clientWidth - CARD_GAP * 2;
      if (station.x < min || station.x > max) {
        scroller.scrollTo({ left: scrollTarget(scroller, station.x, 1 / 2), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      }
    } else if (!horizontal) {
      el.scrollIntoView({ block: 'center', inline: 'nearest' });
    }
  }

  /* ── Keyboard: one roving tab stop; arrows move along the year and across lines ── */

  const firstUpcoming =
    layout.today === null ? undefined : stations.find((s) => (horizontal ? s.x : s.y) >= (layout.today ?? 0));
  const tabStopId =
    activeId !== null && stations.some((s) => s.eventId === activeId)
      ? activeId
      : (firstUpcoming?.eventId ?? stations[0]?.eventId ?? null);
  const indexOf = (id: string) => stations.findIndex((s) => s.eventId === id);

  function focusStation(station: StationGeom | undefined) {
    if (!station) return;
    const el = stationRefs.current.get(station.eventId);
    if (!el) return;
    setActiveId(station.eventId);
    el.focus({ preventScroll: true });
    revealStation(station, el);
  }

  /** Nearest station on the next lane in `direction` that has stations (by time position). */
  function neighbourLane(current: StationGeom, direction: 1 | -1): StationGeom | undefined {
    const timePos = (s: StationGeom) => (horizontal ? s.x : s.y);
    for (let lane = current.lane + direction; lane >= 0 && lane < layout.lanes.length; lane += direction) {
      let best: StationGeom | undefined;
      for (const s of stations) {
        if (s.lane !== lane) continue;
        if (!best || Math.abs(timePos(s) - timePos(current)) < Math.abs(timePos(best) - timePos(current))) best = s;
      }
      if (best) return best;
    }
    return undefined;
  }

  function onKeyDown(e: KeyboardEvent, station: StationGeom) {
    const i = indexOf(station.eventId);
    const along = horizontal ? { next: 'ArrowRight', prev: 'ArrowLeft' } : { next: 'ArrowDown', prev: 'ArrowUp' };
    const across = horizontal ? { next: 'ArrowDown', prev: 'ArrowUp' } : { next: 'ArrowRight', prev: 'ArrowLeft' };
    let handled = true;
    if (e.key === along.next) focusStation(stations[i + 1]);
    else if (e.key === along.prev) focusStation(stations[i - 1]);
    else if (e.key === across.next) focusStation(neighbourLane(station, 1));
    else if (e.key === across.prev) focusStation(neighbourLane(station, -1));
    else if (e.key === 'Home') focusStation(stations[0]);
    else if (e.key === 'End') focusStation(stations.at(-1));
    // A link station activates natively on Enter (its click handler runs).
    else if ((e.key === 'Enter' && !stationHref) || (e.key === ' ' && !stationHref)) onActivate?.(station.eventId);
    else if (e.key === 'Escape') setCardId(null);
    else handled = false;
    if (handled) e.preventDefault();
  }

  /* ── Station card: placed inside the visible part of the map ──────────── */

  const cardStation = cardId === null ? undefined : stations[indexOf(cardId)];
  useLayoutEffect(() => {
    const card = cardRef.current;
    const canvas = canvasRef.current;
    const station = cardId === null ? undefined : stationRefs.current.get(cardId);
    if (!card || !canvas || !station) return;
    const c = canvas.getBoundingClientRect();
    const s = station.getBoundingClientRect();
    const cx = s.left + s.width / 2 - c.left;
    const cy = s.top + s.height / 2 - c.top;
    const w = card.offsetWidth;
    const h = card.offsetHeight;

    // Visible horizontal range, in canvas coordinates.
    let minX = Math.max(0, -c.left) + CARD_MARGIN;
    let maxX = Math.min(c.width, window.innerWidth - c.left) - CARD_MARGIN;
    const scroller = scrollRef.current;
    if (scrolls && scroller) {
      const v = scroller.getBoundingClientRect();
      minX = Math.max(minX, v.left - c.left + CARD_MARGIN + (laneLabels ? LANE_COLUMN : 0));
      maxX = Math.min(maxX, v.right - c.left - CARD_MARGIN);
    }
    const left = clamp(cx - w / 2, minX, maxX - w);

    let top: number;
    if (horizontal) {
      // The map's own height bounds the card: below when it fits, else above, else clamped.
      if (cy + CARD_GAP + h <= c.height - CARD_MARGIN) top = cy + CARD_GAP;
      else if (cy - CARD_GAP - h >= CARD_MARGIN) top = cy - CARD_GAP - h;
      else top = clamp(cy - h / 2, CARD_MARGIN, c.height - h - CARD_MARGIN);
    } else {
      // A tall vertical map scrolls with the page: open towards the roomier half of the window.
      const below = s.top + s.height / 2 < window.innerHeight / 2;
      top = clamp(below ? cy + CARD_GAP : cy - CARD_GAP - h, 0, c.height - h);
    }
    card.style.setProperty('--card-left', String(Math.round(left)));
    card.style.setProperty('--card-top', String(Math.round(top)));
  }, [cardId, horizontal, scrolls, laneLabels]);

  /* ── Render ────────────────────────────────────────────────────────────── */

  const laneName = (code: CategoryCode) => lanes.find((l) => l.code === code)?.name ?? '';
  const fraction = (pos: number) => String(pos / extent);
  const crossFraction = (pos: number) => String(pos / (horizontal ? layout.height : layout.width));
  const firstLane = layout.lanes[0];
  const lastLane = layout.lanes.at(-1);
  // Space between the outer lanes and the map edges (for labels in the vertical gutters).
  const gutterStart = firstLane ? (horizontal ? firstLane.y1 : firstLane.x1) : 0;
  const gutterEnd = lastLane ? (horizontal ? layout.height - lastLane.y1 : layout.width - lastLane.x1) : 0;

  const stationProps = (s: StationGeom, i: number) => ({
    ref: (el: StationElement | null) => {
      if (el) stationRefs.current.set(s.eventId, el);
      else stationRefs.current.delete(s.eventId);
    },
    className: [
      'route-map__station',
      s.mine ? 'route-map__station--mine' : '',
      s.interchange ? 'route-map__station--interchange' : '',
      arriving.has(s.eventId) ? 'route-map__station--arrive' : '',
    ]
      .filter(Boolean)
      .join(' '),
    style: { '--lane-color': laneVar(s.category), '--i': String(i) } as Record<string, string>,
    tabIndex: s.eventId === tabStopId ? 0 : -1,
    'aria-label': stationLabel(s.eventId),
    'aria-describedby': cardId === s.eventId && renderCard ? `${uid}-card` : undefined,
    onFocus: () => {
      setActiveId(s.eventId);
      setCardId(s.eventId);
    },
    onBlur: () => {
      setCardId((c) => (c === s.eventId ? null : c));
    },
    onMouseEnter: () => {
      setCardId(s.eventId);
    },
    onMouseLeave: () => {
      setCardId((c) => (c === s.eventId ? null : c));
    },
    onKeyDown: (e: KeyboardEvent) => {
      onKeyDown(e, s);
    },
  });

  const mark = (s: StationGeom) => (
    <g transform={`translate(${s.x} ${s.y})`}>
      <circle className="route-map__hit" r="14" />
      <StationMark station={s} />
    </g>
  );

  return (
    <div
      className={[
        'route-map',
        `route-map--${orientation}`,
        fit ? 'route-map--fit' : '',
        scrolls ? 'route-map--scrolls' : '',
        animateIn ? 'route-map--animate' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="route-map__scroll" ref={scrollRef} tabIndex={scrolls && stations.length === 0 ? 0 : undefined} role={scrolls && stations.length === 0 ? 'region' : undefined} aria-label={scrolls && stations.length === 0 ? label : undefined}>
        <div className="route-map__track">
          {laneLabels && horizontal && (
            <div className="route-map__lane-column" aria-hidden="true">
              {layout.lanes.map((l) => (
                <span
                  key={l.category}
                  className="route-map__lane-code"
                  title={laneName(l.category)}
                  style={{ '--lane-color': laneVar(l.category), '--pos': crossFraction(l.y1) } as Record<string, string>}
                >
                  {l.category}
                </span>
              ))}
            </div>
          )}
          {laneLabels && !horizontal && (
            <div className="route-map__lane-head" aria-hidden="true">
              {layout.lanes.map((l) => (
                <span
                  key={l.category}
                  className="route-map__lane-code"
                  style={{ '--lane-color': laneVar(l.category), '--pos': crossFraction(l.x1) } as Record<string, string>}
                >
                  {l.category}
                </span>
              ))}
            </div>
          )}
          <div
            className="route-map__canvas"
            ref={canvasRef}
            style={
              {
                '--map-w': String(layout.width),
                '--map-h': String(layout.height),
                '--gutter-start': crossFraction(gutterStart),
                '--gutter-end': crossFraction(gutterEnd),
              } as Record<string, string>
            }
          >
            <svg
              className="route-map__svg"
              viewBox={`0 0 ${layout.width} ${layout.height}`}
              role="group"
              aria-label={label}
              aria-describedby={helpId}
            >
              <defs>
                <pattern id={hatchId} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <line className="route-map__hatch-line" x1="0" y1="0" x2="0" y2="8" />
                </pattern>
                <pattern id={holidayId} width="6" height="6" patternUnits="userSpaceOnUse">
                  <circle className="route-map__holiday-dot" cx="3" cy="3" r="1" />
                </pattern>
              </defs>

              {/* Fare zones: one band per month, alternating, with a hairline at each month start. */}
              <g className="route-map__zones" aria-hidden="true">
                {layout.months.map((m) =>
                  horizontal ? (
                    <rect key={m.index} className={`route-map__zone route-map__zone--${m.index % 2 ? 'odd' : 'even'}`} x={m.from} y={0} width={m.to - m.from} height={layout.height} />
                  ) : (
                    <rect key={m.index} className={`route-map__zone route-map__zone--${m.index % 2 ? 'odd' : 'even'}`} x={0} y={m.from} width={layout.width} height={m.to - m.from} />
                  ),
                )}
                {layout.months.map((m) =>
                  horizontal ? (
                    <line key={`edge-${m.index}`} className="route-map__zone-edge" x1={m.from} y1={0} x2={m.from} y2={layout.height} />
                  ) : (
                    <line key={`edge-${m.index}`} className="route-map__zone-edge" x1={0} y1={m.from} x2={layout.width} y2={m.from} />
                  ),
                )}
                {layout.periods.map((p) => {
                  const fill = `url(#${p.kind === 'exam' ? hatchId : holidayId})`;
                  return horizontal ? (
                    <rect key={p.id} className={`route-map__period route-map__period--${p.kind}`} x={p.from} y={0} width={p.to - p.from} height={layout.height} fill={fill} />
                  ) : (
                    <rect key={p.id} className={`route-map__period route-map__period--${p.kind}`} x={0} y={p.from} width={layout.width} height={p.to - p.from} fill={fill} />
                  );
                })}
                {layout.weekTicks.map((t) =>
                  horizontal ? (
                    <line key={t} className="route-map__tick" x1={t} y1={layout.height - 8} x2={t} y2={layout.height} />
                  ) : (
                    <line key={t} className="route-map__tick" x1={0} y1={t} x2={8} y2={t} />
                  ),
                )}
              </g>

              {/* Category lines. */}
              <g className="route-map__lanes" aria-hidden="true">
                {layout.lanes.map((l) => (
                  <line
                    key={l.category}
                    className="route-map__lane"
                    style={{ '--lane-color': laneVar(l.category) } as Record<string, string>}
                    x1={l.x1}
                    y1={l.y1}
                    x2={l.x2}
                    y2={l.y2}
                    pathLength={1}
                  />
                ))}
              </g>

              {/* Same-day interchanges between lines. */}
              <g className="route-map__interchanges" aria-hidden="true">
                {layout.interchanges.map((ic) => (
                  <line key={ic.eventIds.join('|')} className="route-map__interchange" x1={ic.x1} y1={ic.y1} x2={ic.x2} y2={ic.y2} />
                ))}
              </g>

              {showToday && layout.today !== null && (
                <g className="route-map__today" aria-hidden="true">
                  {horizontal ? (
                    <line ref={todayRef} x1={layout.today} y1={0} x2={layout.today} y2={layout.height} />
                  ) : (
                    <line ref={todayRef} x1={0} y1={layout.today} x2={layout.width} y2={layout.today} />
                  )}
                </g>
              )}

              {/* Your route: a surface casing keeps it legible where it crosses other lines. */}
              {layout.myRoute.d !== '' && (
                <g
                  ref={routeRef}
                  className="route-map__mine"
                  style={{ '--route-total': String(layout.myRoute.length) } as Record<string, string>}
                  aria-hidden="true"
                >
                  <path className="route-map__mine-casing" d={layout.myRoute.d} />
                  <path className="route-map__mine-line" d={layout.myRoute.d} />
                </g>
              )}

              <g className="route-map__stations">
                {stations.map((s, i) => {
                  const props = stationProps(s, i);
                  if (stationHref) {
                    return (
                      <a
                        key={s.eventId}
                        {...props}
                        href={stationHref(s.eventId)}
                        onClick={(e) => {
                          if (!isPlainLeftClick(e)) return;
                          e.preventDefault();
                          onActivate?.(s.eventId);
                        }}
                      >
                        {mark(s)}
                      </a>
                    );
                  }
                  return (
                    <g
                      key={s.eventId}
                      {...props}
                      role="button"
                      onClick={() => onActivate?.(s.eventId)}
                    >
                      {mark(s)}
                    </g>
                  );
                })}
              </g>
            </svg>

            {/* Month labels (HTML, so they stay crisp and wrap-free). */}
            <ol className="route-map__months" aria-hidden="true">
              {layout.months
                .filter((m) => m.to - m.from >= MIN_LABELLED_ZONE)
                .map((m) => (
                  <li key={m.index} className="route-map__month" style={{ '--from': fraction(m.from) } as Record<string, string>}>
                    <span className="route-map__month-long">{m.label}</span>
                    <span className="route-map__month-short">{m.short}</span>
                  </li>
                ))}
            </ol>

            {layout.periods.map((p) => (
              <span
                key={p.id}
                className={`route-map__period-label route-map__period-label--${p.kind}`}
                aria-hidden="true"
                style={{ '--from': fraction(p.from), '--to': fraction(p.to) } as Record<string, string>}
              >
                {p.kind === 'exam' ? 'Kiểm tra định kỳ' : p.label}
              </span>
            ))}

            {showToday && layout.today !== null && (
              <span className="route-map__today-label" aria-hidden="true" style={{ '--from': fraction(layout.today) } as Record<string, string>}>
                {todayLabel}
              </span>
            )}

            {cardStation && renderCard && (
              <div className="route-map__card" id={`${uid}-card`} ref={cardRef} role="tooltip">
                {renderCard(cardStation.eventId)}
              </div>
            )}
          </div>
        </div>
      </div>

      {legend !== 'none' && <RouteMapLegend lanes={lanes} variant={legend} />}
      <span className="visually-hidden" id={helpId}>
        {stations.length === 0
          ? 'Chưa có điểm dừng trên bản đồ.'
          : `Có ${stations.length} điểm dừng. Dùng phím mũi tên để di chuyển giữa các sự kiện, Enter để mở chi tiết, Escape để đóng thẻ thông tin.`}
      </span>
    </div>
  );
}
