import { CATEGORY_LABELS } from '../../domain/category-labels';
import { formatDayLabel, formatTime, toMillis } from '../../domain/dates';
import type { SchoolEvent } from '../../domain/types';
import { Link } from '../../router';
import { StatusTag, type StatusTone } from '../atoms/StatusTag';
import './DepartureBoard.css';

export interface DepartureRow {
  event: SchoolEvent;
  status: { tone: StatusTone; label: string };
  mine: boolean;
}

export interface DepartureBoardProps {
  rows: DepartureRow[];
  caption: string;
}

/** "Sắp diễn ra" as a station departure board: time, date, line, event, place, status. */
export function DepartureBoard({ rows, caption }: DepartureBoardProps) {
  return (
    <div className="departures">
      <table className="departures__table">
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Giờ</th>
            <th scope="col">Ngày</th>
            <th scope="col">Tuyến</th>
            <th scope="col">Sự kiện</th>
            <th scope="col">Địa điểm</th>
            <th scope="col">Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ event, status, mine }) => {
            const start = toMillis(event.start);
            return (
              <tr key={event.id} className={mine ? 'departures__row departures__row--mine' : 'departures__row'}>
                <td className="departures__time">
                  <time dateTime={event.start}>{formatTime(start)}</time>
                </td>
                <td className="departures__date">
                  <time dateTime={event.start}>{formatDayLabel(start)}</time>
                </td>
                <td className="departures__line">
                  <span
                    className="departures__code"
                    style={{ '--line': `var(--line-${event.category.toLowerCase()})` } as Record<string, string>}
                  >
                    {event.category}
                  </span>
                  <span className="visually-hidden">{CATEGORY_LABELS[event.category]}</span>
                </td>
                <th scope="row" className="departures__event">
                  <Link to={`/su-kien/${event.slug}`}>{event.title}</Link>
                </th>
                <td className="departures__place">{event.format === 'online' ? 'Trực tuyến' : event.location}</td>
                <td className="departures__status">
                  <StatusTag tone={status.tone}>{status.label}</StatusTag>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
