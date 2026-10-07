import { useId } from 'react';
import {
  formatDate,
  formatDayLabel,
  formatLongDate,
  formatMonthYear,
  formatShortDate,
  formatTimeRange,
  startOfVnMonth,
  toIsoDate,
  toMillis,
} from '../../domain/dates';
import type { CalendarPeriod, Millis, SchoolEvent } from '../../domain/types';
import { Link } from '../../router';
import { LineBadge } from '../atoms/LineBadge';
import { MonoTime } from '../atoms/MonoTime';
import { Station } from '../atoms/Station';
import { StatusTag, type StatusTone } from '../atoms/StatusTag';
import { VisuallyHidden } from '../atoms/VisuallyHidden';
import './RouteList.css';

export interface RouteListRow {
  event: SchoolEvent;
  clubName: string;
  /** Status word for the event (icon + word), e.g. from StationCard's eventStatus. */
  status: { tone: StatusTone; label: string };
  /** On the student's own route (registered or attended). */
  mine: boolean;
  /** Overlaps another event on the student's route. */
  conflict: boolean;
}

export interface RouteListProps {
  /** Rows to show, in any order (sorted by start here). */
  rows: RouteListRow[];
  /** Exam periods and holidays, shown as separators in the month they start. */
  periods: CalendarPeriod[];
  /** Today, shown as a separator when it falls in a listed month. */
  now: Millis;
  /** Heading level of the month headings (event titles use the next level). */
  headingLevel?: 2 | 3;
  className?: string;
}

type Item =
  | { kind: 'event'; at: Millis; row: RouteListRow }
  | { kind: 'period'; at: Millis; period: CalendarPeriod }
  | { kind: 'today'; at: Millis };

interface MonthGroup {
  month: Millis;
  items: Item[];
  events: number;
  mine: number;
}

/** Same order as a day on the map: separators that start the day first, then events by start. */
const KIND_ORDER: Record<Item['kind'], number> = { period: 0, today: 1, event: 2 };

function groupByMonth(rows: RouteListRow[], periods: CalendarPeriod[], now: Millis): MonthGroup[] {
  const groups = new Map<Millis, MonthGroup>();
  for (const row of rows) {
    const at = toMillis(row.event.start);
    const month = startOfVnMonth(at);
    const group = groups.get(month) ?? { month, items: [], events: 0, mine: 0 };
    group.items.push({ kind: 'event', at, row });
    group.events += 1;
    if (row.mine) group.mine += 1;
    groups.set(month, group);
  }
  for (const period of periods) {
    const at = toMillis(period.start);
    groups.get(startOfVnMonth(at))?.items.push({ kind: 'period', at, period });
  }
  groups.get(startOfVnMonth(now))?.items.push({ kind: 'today', at: now });
  const sorted = [...groups.values()].sort((a, b) => a.month - b.month);
  for (const g of sorted) {
    g.items.sort((a, b) => {
      const byKind = KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
      const byId = a.kind === 'event' && b.kind === 'event' ? a.row.event.id.localeCompare(b.row.event.id) : 0;
      return a.at - b.at || byKind || byId;
    });
  }
  return sorted;
}

function PeriodItem({ period }: { period: CalendarPeriod }) {
  const start = toMillis(period.start);
  const end = toMillis(period.end);
  const sameYear = toIsoDate(start).slice(0, 4) === toIsoDate(end).slice(0, 4);
  return (
    <li className={`route-list__separator route-list__separator--${period.kind}`}>
      <span className="route-list__separator-label">{period.label}</span>
      <span className="route-list__separator-when">
        <MonoTime dateTime={period.start}>{sameYear ? formatShortDate(start) : formatDate(start)}</MonoTime>
        <span aria-hidden="true">–</span>
        <VisuallyHidden>đến</VisuallyHidden>
        <MonoTime dateTime={period.end}>{formatDate(end)}</MonoTime>
      </span>
      <span className="route-list__swatch" aria-hidden="true" />
    </li>
  );
}

function EventItem({ row, titleLevel }: { row: RouteListRow; titleLevel: 3 | 4 }) {
  const { event } = row;
  const start = toMillis(event.start);
  const end = toMillis(event.end);
  const Title = titleLevel === 3 ? 'h3' : 'h4';
  return (
    <li className={['route-list__row', row.mine ? 'route-list__row--mine' : ''].filter(Boolean).join(' ')}>
      <p className="route-list__when">
        <MonoTime className="route-list__date" dateTime={event.start}>
          {formatDayLabel(start)}
        </MonoTime>
        <MonoTime className="route-list__time" dateTime={event.start}>
          {formatTimeRange(start, end)}
        </MonoTime>
      </p>
      <span className="route-list__station" aria-hidden="true">
        <Station variant={row.mine ? 'mine' : 'normal'} code={event.category} />
      </span>
      <div className="route-list__main">
        <LineBadge code={event.category} showName size="sm" />
        <Title className="route-list__title">
          <Link className="route-list__link" to={`/su-kien/${event.slug}`}>
            {event.title}
          </Link>
        </Title>
        <p className="route-list__meta">
          <span>{row.clubName}</span>
          <span aria-hidden="true"> · </span>
          <span>{event.format === 'online' ? `Trực tuyến · ${event.location}` : event.location}</span>
        </p>
      </div>
      <div className="route-list__status">
        <StatusTag tone={row.status.tone}>{row.status.label}</StatusTag>
        {row.conflict ? <StatusTag tone="stop">Trùng lịch</StatusTag> : null}
      </div>
    </li>
  );
}

/**
 * The RouteMap as an accessible list: one section per month, events in time order with their
 * line, club, place and status, exam periods and holidays as separators, and a "Hôm nay" marker.
 */
export function RouteList({ rows, periods, now, headingLevel = 3, className }: RouteListProps) {
  const uid = useId();
  const groups = groupByMonth(rows, periods, now);
  const MonthHeading = headingLevel === 2 ? 'h2' : 'h3';
  const titleLevel = headingLevel === 2 ? 3 : 4;
  return (
    <div className={['route-list', className].filter(Boolean).join(' ')}>
      {groups.map((g) => {
        const headingId = `${uid}-${String(g.month)}`;
        return (
          <section key={g.month} className="route-list__month" aria-labelledby={headingId}>
            <header className="route-list__month-head">
              <MonthHeading id={headingId} className="route-list__month-title">
                {formatMonthYear(g.month)}
              </MonthHeading>
              <p className="route-list__month-count">
                <span>{`${g.events} sự kiện`}</span>
                {g.mine > 0 ? (
                  <span className="route-list__month-mine">
                    <Station variant="mine" />
                    {`${g.mine} trong lộ trình của bạn`}
                  </span>
                ) : null}
              </p>
            </header>
            <ol className="route-list__items">
              {g.items.map((item) => {
                if (item.kind === 'event') return <EventItem key={item.row.event.id} row={item.row} titleLevel={titleLevel} />;
                if (item.kind === 'period') return <PeriodItem key={item.period.id} period={item.period} />;
                return (
                  <li key="today" className="route-list__separator route-list__separator--today">
                    <span className="route-list__separator-label">Hôm nay</span>
                    <span className="route-list__separator-when">
                      <MonoTime dateTime={toIsoDate(item.at)}>{formatLongDate(item.at)}</MonoTime>
                    </span>
                    <span className="route-list__swatch" aria-hidden="true" />
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
