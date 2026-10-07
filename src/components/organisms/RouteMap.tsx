import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { Orientation, RouteLayout, StationGeom } from '../../domain/route-layout';
import type { CategoryCode } from '../../domain/types';
import './RouteMap.css';

export interface RouteMapLane {
  code: CategoryCode;
  name: string;
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
  renderCard?: (eventId: string) => ReactNode;
  onActivate?: (eventId: string) => void;
  /** Draw the lines in and pop the stations on (landing page). */
  animateIn?: boolean;
  /** Show the "Hôm nay" marker. */
  showToday?: boolean;
  /** Scale a horizontal map to the container width instead of scrolling (short fragments). */
  fit?: boolean;
  className?: string;
}

/** Month zones narrower than this (user units) get no label, so labels never collide. */
const MIN_LABELLED_ZONE = 72;

function laneVar(code: CategoryCode): string {
  return `var(--line-${code.toLowerCase()})`;
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
  animateIn = false,
  showToday = true,
  fit = false,
  className,
}: RouteMapProps) {
  const uid = useId().replace(/:/g, '');
  const hatchId = `hatch-${uid}`;
  const scrollRef = useRef<HTMLDivElement>(null);
  const stationRefs = useRef(new Map<string, SVGGElement>());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [cardId, setCardId] = useState<string | null>(null);
  const horizontal = orientation === 'horizontal';

  // "Your route" grows to its new length when an event is added: the key moment.
  const routeRef = useRef<SVGPathElement>(null);
  const lengthRef = useRef(layout.myRoute.length);
  useLayoutEffect(() => {
    const previousLength = lengthRef.current;
    const total = layout.myRoute.length;
    lengthRef.current = total;
    const path = routeRef.current;
    if (!path || previousLength >= total) return;
    path.style.setProperty('--route-from', String(total - previousLength));
    path.style.setProperty('--route-total', String(total));
    path.classList.remove('route-map__mine--grow');
    // Force a reflow so the animation restarts.
    void path.getBoundingClientRect();
    path.classList.add('route-map__mine--grow');
  }, [layout.myRoute.length]);

  const stations = layout.stations;
  // The roving tab stop falls back to the first station when the active one disappears.
  const tabStopId =
    activeId !== null && stations.some((s) => s.eventId === activeId) ? activeId : (stations[0]?.eventId ?? null);
  const indexOf = (id: string) => stations.findIndex((s) => s.eventId === id);

  function focusStation(station: StationGeom | undefined) {
    if (!station) return;
    setActiveId(station.eventId);
    stationRefs.current.get(station.eventId)?.focus();
  }

  /** Nearest station on the neighbouring lane (by time position). */
  function neighbourLane(current: StationGeom, direction: 1 | -1): StationGeom | undefined {
    const timePos = (s: StationGeom) => (horizontal ? s.x : s.y);
    const candidates = stations.filter((s) => s.lane === current.lane + direction);
    let best: StationGeom | undefined;
    for (const s of candidates) {
      if (!best || Math.abs(timePos(s) - timePos(current)) < Math.abs(timePos(best) - timePos(current))) best = s;
    }
    return best;
  }

  function onKeyDown(e: KeyboardEvent<SVGGElement>, station: StationGeom) {
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
    else if (e.key === 'Enter' || e.key === ' ') onActivate?.(station.eventId);
    else if (e.key === 'Escape') setCardId(null);
    else handled = false;
    if (handled) e.preventDefault();
  }

  // Keep the focused station visible inside the scroll container.
  useEffect(() => {
    if (cardId === null) return;
    stationRefs.current.get(cardId)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [cardId]);

  const cardStation = cardId === null ? undefined : stations[indexOf(cardId)];
  const cardX = cardStation ? cardStation.x / layout.width : 0;
  const cardY = cardStation ? cardStation.y / layout.height : 0;
  const cardAnchor = cardX < 0.25 ? 'start' : cardX > 0.75 ? 'end' : 'center';
  const cardStyle = { '--card-x': String(cardX), '--card-y': String(cardY) } as Record<string, string>;

  return (
    <div
      className={['route-map', `route-map--${orientation}`, fit ? 'route-map--fit' : '', animateIn ? 'route-map--animate' : '', className]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="route-map__scroll" ref={scrollRef}>
        <div className="route-map__canvas" style={{ '--map-w': String(layout.width), '--map-h': String(layout.height) } as Record<string, string>}>
          <svg
            className="route-map__svg"
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            role="group"
            aria-label={label}
          >
            <defs>
              <pattern id={hatchId} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line className="route-map__hatch-line" x1="0" y1="0" x2="0" y2="8" />
              </pattern>
            </defs>

            {/* Fare zones: one band per month, alternating. */}
            <g className="route-map__zones" aria-hidden="true">
              {layout.months.map((m) =>
                horizontal ? (
                  <rect key={m.index} className={`route-map__zone route-map__zone--${m.index % 2 ? 'odd' : 'even'}`} x={m.from} y={0} width={m.to - m.from} height={layout.height} />
                ) : (
                  <rect key={m.index} className={`route-map__zone route-map__zone--${m.index % 2 ? 'odd' : 'even'}`} x={0} y={m.from} width={layout.width} height={m.to - m.from} />
                ),
              )}
              {layout.periods.map((p) =>
                horizontal ? (
                  <rect key={p.id} className={`route-map__period route-map__period--${p.kind}`} x={p.from} y={0} width={p.to - p.from} height={layout.height} fill={`url(#${hatchId})`} />
                ) : (
                  <rect key={p.id} className={`route-map__period route-map__period--${p.kind}`} x={0} y={p.from} width={layout.width} height={p.to - p.from} fill={`url(#${hatchId})`} />
                ),
              )}
              {layout.weekTicks.map((t) =>
                horizontal ? (
                  <line key={t} className="route-map__tick" x1={t} y1={layout.height - 10} x2={t} y2={layout.height} />
                ) : (
                  <line key={t} className="route-map__tick" x1={0} y1={t} x2={10} y2={t} />
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

            {/* Your route. */}
            {layout.myRoute.d !== '' && (
              <path
                ref={routeRef}
                className="route-map__mine"
                d={layout.myRoute.d}
                style={{ '--route-total': String(layout.myRoute.length) } as Record<string, string>}
                aria-hidden="true"
              />
            )}

            {showToday && layout.today !== null && (
              <g className="route-map__today" aria-hidden="true">
                {horizontal ? (
                  <line x1={layout.today} y1={0} x2={layout.today} y2={layout.height} />
                ) : (
                  <line x1={0} y1={layout.today} x2={layout.width} y2={layout.today} />
                )}
              </g>
            )}

            {/* Stations: one roving tab stop; arrows move along the year and across lines. */}
            <g className="route-map__stations">
              {stations.map((s, i) => (
                <g
                  key={s.eventId}
                  ref={(el) => {
                    if (el) stationRefs.current.set(s.eventId, el);
                    else stationRefs.current.delete(s.eventId);
                  }}
                  className={['route-map__station', s.mine ? 'route-map__station--mine' : '', s.interchange ? 'route-map__station--interchange' : ''].filter(Boolean).join(' ')}
                  style={{ '--lane-color': laneVar(s.category), '--i': String(i) } as Record<string, string>}
                  transform={`translate(${s.x} ${s.y})`}
                  role="button"
                  tabIndex={s.eventId === tabStopId ? 0 : -1}
                  aria-label={stationLabel(s.eventId)}
                  aria-describedby={cardId === s.eventId ? `${uid}-card` : undefined}
                  onFocus={() => {
                    setActiveId(s.eventId);
                    setCardId(s.eventId);
                  }}
                  onBlur={() => {
                    setCardId((c) => (c === s.eventId ? null : c));
                  }}
                  onMouseEnter={() => {
                    setCardId(s.eventId);
                  }}
                  onMouseLeave={() => {
                    setCardId((c) => (c === s.eventId ? null : c));
                  }}
                  onClick={() => onActivate?.(s.eventId)}
                  onKeyDown={(e) => {
                    onKeyDown(e, s);
                  }}
                >
                  <circle className="route-map__hit" r="16" />
                  {s.mine ? (
                    <>
                      <circle className="route-map__ring" r="10" />
                      <circle className="route-map__dot" r="4" />
                    </>
                  ) : (
                    <circle className="route-map__stop" r="7" />
                  )}
                </g>
              ))}
            </g>
          </svg>

          {/* Month labels (HTML, so they stay crisp and wrap-free). */}
          <ol className="route-map__months" aria-hidden="true">
            {layout.months.filter((m) => m.to - m.from >= MIN_LABELLED_ZONE).map((m) => (
              <li
                key={m.index}
                className="route-map__month"
                style={{ '--from': String(m.from / (horizontal ? layout.width : layout.height)) } as Record<string, string>}
              >
                <span className="route-map__month-long">{m.label}</span>
                <span className="route-map__month-short">{m.short}</span>
              </li>
            ))}
          </ol>

          {layout.periods
            .filter((p) => p.kind === 'exam')
            .map((p) => (
              <span
                key={p.id}
                className="route-map__period-label"
                aria-hidden="true"
                style={
                  {
                    '--from': String(p.from / (horizontal ? layout.width : layout.height)),
                    '--to': String(p.to / (horizontal ? layout.width : layout.height)),
                  } as Record<string, string>
                }
              >
                Kiểm tra định kỳ
              </span>
            ))}

          {showToday && layout.today !== null && (
            <span
              className="route-map__today-label"
              aria-hidden="true"
              style={{ '--from': String(layout.today / (horizontal ? layout.width : layout.height)) } as Record<string, string>}
            >
              Hôm nay
            </span>
          )}

          {cardStation && renderCard && (
            <div
              className="route-map__card"
              id={`${uid}-card`}
              style={cardStyle}
              data-anchor={cardAnchor}
              data-below={cardY < 0.5 ? 'true' : 'false'}
              role="tooltip"
            >
              {renderCard(cardStation.eventId)}
            </div>
          )}
        </div>
      </div>

      {/* Lane legend: code + name, never color alone. */}
      <ul className="route-map__legend" aria-label="Các tuyến lĩnh vực">
        {lanes.map((l) => (
          <li key={l.code} className="route-map__legend-item" style={{ '--lane-color': laneVar(l.code) } as Record<string, string>}>
            <span className="route-map__legend-code">{l.code}</span>
            <span className="route-map__legend-name">{l.name}</span>
          </li>
        ))}
        <li className="route-map__legend-item route-map__legend-item--mine">
          <span className="route-map__legend-swatch" aria-hidden="true" />
          <span className="route-map__legend-name">Lộ trình của bạn</span>
        </li>
      </ul>
      <span className="visually-hidden">{`Có ${stations.length} điểm dừng. Dùng phím mũi tên để di chuyển giữa các sự kiện, Enter để mở chi tiết.`}</span>
    </div>
  );
}
