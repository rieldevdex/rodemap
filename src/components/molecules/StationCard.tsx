import type { ReactNode } from 'react';
import { formatDayLabel, formatTimeRange, toMillis } from '../../domain/dates';
import type { RegistrationState } from '../../domain/events';
import type { SchoolEvent } from '../../domain/types';
import { Link } from '../../router';
import { LineBadge } from '../atoms/LineBadge';
import { MonoTime } from '../atoms/MonoTime';
import { StatusTag, type StatusTone } from '../atoms/StatusTag';
import './StationCard.css';

export interface StationCardProps {
  event: SchoolEvent;
  clubName: string;
  state: RegistrationState;
  seatsLeft: number;
  /** Calendar days until the registration deadline. */
  deadlineDays: number;
  /** The event overlaps another event in the student's plan. */
  conflict?: boolean;
  variant?: 'compact' | 'full';
  /** Link the title to the event page. */
  linked?: boolean;
  headingLevel?: 2 | 3;
  /** One-line summary by Mochi (full variant). */
  showSummary?: boolean;
  actions?: ReactNode;
}

/** The status word shown for an event (icon + word, never color alone). */
export function eventStatus(
  state: RegistrationState,
  seatsLeft: number,
  deadlineDays: number,
): { tone: StatusTone; label: string } {
  switch (state) {
    case 'registered':
      return { tone: 'ok', label: 'Đã đăng ký' };
    case 'attended':
      return { tone: 'ok', label: 'Đã tham gia' };
    case 'absent':
      return { tone: 'neutral', label: 'Không tham gia' };
    case 'full':
      return { tone: 'stop', label: 'Hết chỗ' };
    case 'closed':
      return { tone: 'stop', label: 'Hết hạn đăng ký' };
    case 'past':
      return { tone: 'neutral', label: 'Đã diễn ra' };
    case 'open':
      if (deadlineDays <= 2) return { tone: 'warn', label: deadlineDays <= 0 ? 'Hạn đăng ký hôm nay' : `Còn ${deadlineDays} ngày để đăng ký` };
      if (seatsLeft <= 5) return { tone: 'warn', label: `Còn ${seatsLeft} chỗ` };
      return { tone: 'neutral', label: `Còn ${seatsLeft} chỗ` };
  }
}

/** Event summary: code badge + category, title, club, mono date/time, place, status. */
export function StationCard({
  event,
  clubName,
  state,
  seatsLeft,
  deadlineDays,
  conflict = false,
  variant = 'full',
  linked = true,
  headingLevel = 3,
  showSummary = variant === 'full',
  actions,
}: StationCardProps) {
  const start = toMillis(event.start);
  const end = toMillis(event.end);
  const status = eventStatus(state, seatsLeft, deadlineDays);
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const href = `/su-kien/${event.slug}`;
  return (
    <article className={`station-card station-card--${variant}`} style={{ '--line': `var(--line-${event.category.toLowerCase()})` } as Record<string, string>}>
      <div className="station-card__top">
        <LineBadge code={event.category} showName={variant === 'full'} size="sm" />
        <MonoTime className="station-card__when" dateTime={event.start}>
          {formatDayLabel(start)} · {formatTimeRange(start, end)}
        </MonoTime>
      </div>
      <Heading className="station-card__title">
        {linked ? (
          <Link className="station-card__link" to={href}>
            {event.title}
          </Link>
        ) : (
          event.title
        )}
      </Heading>
      <p className="station-card__meta">
        <span>{clubName}</span>
        <span aria-hidden="true"> · </span>
        <span>{event.format === 'online' ? `Trực tuyến · ${event.location}` : event.location}</span>
      </p>
      {showSummary ? <p className="station-card__summary">{event.summary}</p> : null}
      <div className="station-card__status">
        <StatusTag tone={status.tone}>{status.label}</StatusTag>
        {conflict ? <StatusTag tone="stop">Trùng lịch</StatusTag> : null}
      </div>
      {actions ? <div className="station-card__actions">{actions}</div> : null}
    </article>
  );
}
