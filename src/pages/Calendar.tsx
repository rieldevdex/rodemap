import { useMemo, useState } from 'react';
import { Button } from '../components/atoms/Button';
import { DemoLabel } from '../components/atoms/DemoLabel';
import { Icon } from '../components/atoms/Icon';
import { LineBadge } from '../components/atoms/LineBadge';
import { MonoTime } from '../components/atoms/MonoTime';
import { StatusTag } from '../components/atoms/StatusTag';
import { VisuallyHidden } from '../components/atoms/VisuallyHidden';
import { lineVar } from '../components/atoms/lineVar';
import { PageHead } from '../components/molecules/PageHead';
import { CLUBS } from '../data/clubs';
import { PERIODS } from '../data/calendar';
import {
  eventsBetween,
  eventsOnDay,
  isInMonth,
  monthGrid,
  periodOn,
  periodsBetween,
  shiftMonth,
  shiftWeek,
  weekDays,
  type CalendarView,
} from '../domain/calendar-view';
import { allConflicts, conflictIdsFor } from '../domain/conflicts';
import {
  addDays,
  formatDate,
  formatMonthYear,
  formatShortDate,
  formatTime,
  formatTimeRange,
  isSameVnDay,
  SCHOOL_YEAR,
  startOfIsoWeek,
  startOfVnMonth,
  toIsoDate,
  toMillis,
  vnParts,
  weekdayLong,
} from '../domain/dates';
import { findRegistration, isPast } from '../domain/events';
import { googleCalendarUrl } from '../domain/gcal';
import { buildIcs, icsFileName } from '../domain/ics';
import type { CalendarPeriod, Millis, SchoolEvent } from '../domain/types';
import { Link } from '../router';
import { downloadFile } from '../state/effects';
import { selectMyEvents } from '../state/selectors';
import { useCatalog } from '../state/useCatalog';
import './Calendar.css';

const WEEKDAY_HEADERS = [
  { short: 'T2', long: 'Thứ Hai' },
  { short: 'T3', long: 'Thứ Ba' },
  { short: 'T4', long: 'Thứ Tư' },
  { short: 'T5', long: 'Thứ Năm' },
  { short: 'T6', long: 'Thứ Sáu' },
  { short: 'T7', long: 'Thứ Bảy' },
  { short: 'CN', long: 'Chủ nhật' },
];
/** Events listed in a month cell before "+N sự kiện". */
const CELL_LIMIT = 3;

const FIRST_MONTH = toMillis(SCHOOL_YEAR.start);
const LAST_MONTH = startOfVnMonth(toMillis(SCHOOL_YEAR.end));
const FIRST_WEEK = startOfIsoWeek(FIRST_MONTH);
const LAST_WEEK = startOfIsoWeek(toMillis(SCHOOL_YEAR.end));

function clamp(ms: Millis, min: Millis, max: Millis): Millis {
  return Math.min(max, Math.max(min, ms));
}

function periodShort(p: CalendarPeriod): string {
  return p.kind === 'exam' ? 'Kiểm tra định kỳ' : p.label;
}

function periodRange(p: CalendarPeriod): string {
  return `${formatShortDate(toMillis(p.start))} – ${formatShortDate(toMillis(p.end))}`;
}

function weekLabel(monday: Millis): string {
  return `Tuần ${formatShortDate(monday)} – ${formatDate(addDays(monday, 6))}`;
}

interface EventItemProps {
  event: SchoolEvent;
  now: Millis;
  attended: boolean;
  conflictTitles: string[];
  onIcs: (e: SchoolEvent) => void;
}

function CalendarEventItem({ event: e, now, attended, conflictTitles, onIcs }: EventItemProps) {
  const start = toMillis(e.start);
  const past = isPast(e, now);
  return (
    <article
      className={conflictTitles.length > 0 ? 'cal-event cal-event--conflict' : 'cal-event'}
      style={{ '--line': lineVar(e.category) } as Record<string, string>}
    >
      <p className="cal-event__meta">
        <LineBadge code={e.category} size="sm" />
        <MonoTime dateTime={e.start}>{formatTimeRange(start, toMillis(e.end))}</MonoTime>
      </p>
      <h4 className="cal-event__title">
        <Link to={`/su-kien/${e.slug}`}>{e.title}</Link>
      </h4>
      <p className="cal-event__place">{e.location}</p>
      {conflictTitles.length > 0 || attended || past ? (
        <div className="cluster cluster--sm">
          {conflictTitles.length > 0 ? <StatusTag tone="stop">Trùng lịch</StatusTag> : null}
          {attended ? <StatusTag tone="ok">Đã tham gia</StatusTag> : past ? <StatusTag tone="neutral">Đã diễn ra</StatusTag> : null}
        </div>
      ) : null}
      {conflictTitles.length > 0 ? <p className="cal-event__conflict">Trùng thời gian với: {conflictTitles.join('; ')}.</p> : null}
      {past ? null : (
        <p className="cal-event__actions">
          <a
            className="cal-event__link"
            href={googleCalendarUrl(e, {
              clubs: CLUBS,
              baseUrl: window.location.origin,
            })}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>
              Thêm vào <span lang="en">Google Calendar</span>
              <VisuallyHidden>{`: ${e.title} (mở trong thẻ mới)`}</VisuallyHidden>
            </span>
            <Icon name="external" size="sm" />
          </a>
          <button
            type="button"
            className="cal-event__link"
            onClick={() => {
              onIcs(e);
            }}
          >
            <span>
              Tải tệp .ics<VisuallyHidden>{`: ${e.title}`}</VisuallyHidden>
            </span>
          </button>
        </p>
      )}
    </article>
  );
}

export function CalendarPage() {
  const { state, now } = useCatalog();
  const [view, setView] = useState<CalendarView>('month');
  const [cursor, setCursor] = useState<Millis>(() => clamp(now, FIRST_MONTH, toMillis(SCHOOL_YEAR.end)));
  const [status, setStatus] = useState('');

  const myEvents = useMemo(() => selectMyEvents(state), [state]);
  const conflicts = useMemo(() => allConflicts(myEvents), [myEvents]);
  const titleById = useMemo(() => new Map(myEvents.map((e) => [e.id, e.title])), [myEvents]);
  const upcomingConflicts = conflicts.filter((c) => myEvents.some((e) => (e.id === c.a || e.id === c.b) && !isPast(e, now)));

  const conflictTitles = (id: string) => conflictIdsFor(id, conflicts).map((other) => titleById.get(other) ?? other);
  const attended = (id: string) => findRegistration(id, state.registrations)?.status === 'attended';

  const monthStart = clamp(startOfVnMonth(cursor), FIRST_MONTH, LAST_MONTH);
  const weekStart = clamp(startOfIsoWeek(cursor), FIRST_WEEK, LAST_WEEK);
  const rangeStart = view === 'month' ? monthStart : weekStart;
  const rangeEnd = view === 'month' ? shiftMonth(monthStart, 1) : addDays(weekStart, 7);
  const inRange = eventsBetween(myEvents, rangeStart, rangeEnd);
  const periods = periodsBetween(PERIODS, rangeStart, rangeEnd);
  const canPrev = view === 'month' ? monthStart > FIRST_MONTH : weekStart > FIRST_WEEK;
  const canNext = view === 'month' ? monthStart < LAST_MONTH : weekStart < LAST_WEEK;
  const label = view === 'month' ? formatMonthYear(monthStart) : weekLabel(weekStart);

  const shift = (delta: -1 | 1) => {
    setCursor(view === 'month' ? shiftMonth(monthStart, delta) : shiftWeek(weekStart, delta));
  };

  const exportAll = () => {
    const ics = buildIcs(myEvents, {
      now,
      clubs: CLUBS,
      baseUrl: window.location.origin,
    });
    const fileName = icsFileName(now);
    downloadFile(fileName, ics, 'text/calendar;charset=utf-8');
    setStatus(`Đã tạo tệp ${fileName} gồm ${String(myEvents.length)} sự kiện. Bạn có thể nhập tệp này vào ứng dụng lịch trên điện thoại hoặc máy tính.`);
  };

  const exportOne = (e: SchoolEvent) => {
    const ics = buildIcs([e], {
      now,
      clubs: CLUBS,
      calendarName: 'Lịch Rodemap',
      baseUrl: window.location.origin,
    });
    downloadFile(icsFileName(now).replace('.ics', `-${e.slug.slice(0, 32)}.ics`), ics, 'text/calendar;charset=utf-8');
    setStatus(`Đã tạo tệp .ics cho sự kiện “${e.title}”.`);
  };

  const itemProps = (e: SchoolEvent) => ({
    event: e,
    now,
    attended: attended(e.id),
    conflictTitles: conflictTitles(e.id),
    onIcs: exportOne,
  });

  /* Month agenda: days in the month with at least one event. */
  const agendaDays =
    view === 'month'
      ? monthGrid(monthStart)
          .flat()
          .filter((d) => isInMonth(d, monthStart))
          .map((d) => ({ day: d, events: eventsOnDay(inRange, d) }))
          .filter((d) => d.events.length > 0)
      : [];

  return (
    <div className="calendar">
      <PageHead
        eyebrow="Lịch cá nhân"
        title="Lịch của tôi"
        lead="Các sự kiện bạn đã đăng ký, trình bày theo tháng và theo tuần, kèm cảnh báo trùng lịch và các đợt kiểm tra định kỳ."
      >
        <div className="cluster">
          <Button variant="primary" iconStart="download" onClick={exportAll} disabled={myEvents.length === 0}>
            Xuất toàn bộ lịch
          </Button>
          <DemoLabel />
        </div>
        <p className="calendar__status" role="status">
          {status}
        </p>
      </PageHead>

      <div className="band band--surface">
        <div className="container calendar__inner">
          {myEvents.length === 0 ? (
            <div className="calendar__empty">
              <p>Bạn chưa đăng ký sự kiện nào. Vui lòng khám phá sự kiện hoặc thiết lập lộ trình để Mochi đề xuất sự kiện phù hợp.</p>
              <div className="cluster">
                <Button to="/kham-pha" variant="secondary" size="sm">
                  Khám phá sự kiện
                </Button>
                <Button to="/thiet-lap" variant="quiet" size="sm" iconEnd="arrow-right">
                  Thiết lập hồ sơ
                </Button>
              </div>
            </div>
          ) : null}

          {upcomingConflicts.length > 0 ? (
            <section className="calendar__conflicts" aria-labelledby="cal-conflicts">
              <h2 id="cal-conflicts" className="calendar__conflicts-title">
                <StatusTag tone="stop">Trùng lịch</StatusTag>
                <span>
                  {upcomingConflicts.length === 1
                    ? 'Có một cặp sự kiện trùng thời gian trong lịch của bạn.'
                    : `Có ${String(upcomingConflicts.length)} cặp sự kiện trùng thời gian trong lịch của bạn.`}
                </span>
              </h2>
              <ul>
                {upcomingConflicts.map((c) => (
                  <li key={`${c.a}-${c.b}`}>
                    {titleById.get(c.a)} · {titleById.get(c.b)} (trùng {c.overlapMinutes} phút)
                  </li>
                ))}
              </ul>
              <p className="calendar__muted">Vui lòng hủy đăng ký một trong hai sự kiện, hoặc hỏi Mochi để được đề xuất phương án thay thế.</p>
            </section>
          ) : null}

          <div className="calendar__toolbar">
            <div className="calendar__nav">
              <Button
                variant="secondary"
                size="sm"
                iconStart="chevron-left"
                aria-label={view === 'month' ? 'Tháng trước' : 'Tuần trước'}
                disabled={!canPrev}
                onClick={() => {
                  shift(-1);
                }}
              />
              <h2 className="calendar__period" aria-live="polite">
                {label}
              </h2>
              <Button
                variant="secondary"
                size="sm"
                iconStart="chevron-right"
                aria-label={view === 'month' ? 'Tháng sau' : 'Tuần sau'}
                disabled={!canNext}
                onClick={() => {
                  shift(1);
                }}
              />
            </div>
            <div className="calendar__view">
              <Button
                variant="quiet"
                size="sm"
                onClick={() => {
                  setCursor(clamp(now, FIRST_MONTH, toMillis(SCHOOL_YEAR.end)));
                }}
              >
                Chuyển đến hôm nay
              </Button>
              <div className="calendar__toggle" role="group" aria-label="Chế độ xem lịch">
                {(['month', 'week'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={view === v}
                    onClick={() => {
                      if (v === view) return;
                      setCursor(rangeStart);
                      setView(v);
                    }}
                  >
                    {v === 'month' ? 'Tháng' : 'Tuần'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {periods.length > 0 ? (
            <ul className="calendar__periods" aria-label="Kiểm tra định kỳ và kỳ nghỉ trong khoảng thời gian này">
              {periods.map((p) => (
                <li key={p.id} className={`calendar__period-note calendar__period-note--${p.kind}`}>
                  <span className="calendar__swatch" aria-hidden="true" />
                  <span>
                    {p.label} (<MonoTime dateTime={p.start}>{periodRange(p)}</MonoTime>)
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          {view === 'month' ? (
            <>
              <table className="cal-month">
                <caption className="visually-hidden">Lịch {label.toLocaleLowerCase('vi')}</caption>
                <thead>
                  <tr>
                    {WEEKDAY_HEADERS.map((w) => (
                      <th key={w.short} scope="col">
                        <abbr title={w.long}>{w.short}</abbr>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {monthGrid(monthStart).map((week) => (
                    <tr key={week[0]}>
                      {week.map((day, col) => {
                        const events = eventsOnDay(inRange, day);
                        const period = periodOn(PERIODS, day);
                        const outside = !isInMonth(day, monthStart);
                        const today = isSameVnDay(day, now);
                        const showPeriod = period !== undefined && !outside && (toIsoDate(day) === period.start || col === 0 || vnParts(day).day === 1);
                        const classes = [
                          'cal-month__cell',
                          outside ? 'cal-month__cell--outside' : null,
                          today ? 'cal-month__cell--today' : null,
                          period ? `cal-month__cell--${period.kind}` : null,
                        ]
                          .filter(Boolean)
                          .join(' ');
                        return (
                          <td key={day} className={classes}>
                            <span className="cal-month__num">
                              <time dateTime={toIsoDate(day)}>{vnParts(day).day}</time>
                              {today ? <VisuallyHidden>, hôm nay</VisuallyHidden> : null}
                            </span>
                            {showPeriod ? <span className="cal-month__period">{periodShort(period)}</span> : null}
                            {events.length > 0 && !outside ? (
                              <>
                                <ul className="cal-month__events">
                                  {events.slice(0, CELL_LIMIT).map((e) => (
                                    <li key={e.id}>
                                      <Link
                                        className={conflictTitles(e.id).length > 0 ? 'cal-chip cal-chip--conflict' : 'cal-chip'}
                                        to={`/su-kien/${e.slug}`}
                                        style={
                                          {
                                            '--line': lineVar(e.category),
                                          } as Record<string, string>
                                        }
                                      >
                                        <span className="cal-chip__time">{formatTime(toMillis(e.start))}</span>
                                        <span className="cal-chip__title">{e.title}</span>
                                        {conflictTitles(e.id).length > 0 ? <VisuallyHidden>, trùng lịch</VisuallyHidden> : null}
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                                {events.length > CELL_LIMIT ? <span className="cal-month__more">+{events.length - CELL_LIMIT} sự kiện</span> : null}
                                <span className="cal-month__dots" aria-hidden="true">
                                  {events.map((e) => (
                                    <span
                                      key={e.id}
                                      className={conflictTitles(e.id).length > 0 ? 'cal-dot cal-dot--conflict' : 'cal-dot'}
                                      style={
                                        {
                                          '--line': lineVar(e.category),
                                        } as Record<string, string>
                                      }
                                    />
                                  ))}
                                </span>
                              </>
                            ) : null}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>

              <section className="calendar__agenda" aria-labelledby="cal-agenda">
                <h3 id="cal-agenda" className="calendar__h3">
                  Sự kiện trong {label.toLocaleLowerCase('vi')}
                </h3>
                {agendaDays.length === 0 ? (
                  <p className="calendar__muted">Bạn không có sự kiện nào trong tháng này.</p>
                ) : (
                  <ol className="calendar__days">
                    {agendaDays.map(({ day, events }) => (
                      <li key={day} className={isSameVnDay(day, now) ? 'calendar__day calendar__day--today' : 'calendar__day'}>
                        <p className="calendar__day-label">
                          <MonoTime dateTime={toIsoDate(day)}>
                            {weekdayLong(day)}, {formatDate(day)}
                          </MonoTime>
                          {isSameVnDay(day, now) ? <StatusTag tone="signal">Hôm nay</StatusTag> : null}
                        </p>
                        <div className="calendar__day-events">
                          {events.map((e) => (
                            <CalendarEventItem key={e.id} {...itemProps(e)} />
                          ))}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </>
          ) : (
            <ol className="cal-week" aria-label={`Lịch ${label.toLocaleLowerCase('vi')}`}>
              {weekDays(weekStart).map((day) => {
                const events = eventsOnDay(inRange, day);
                const period = periodOn(PERIODS, day);
                const today = isSameVnDay(day, now);
                const classes = [
                  'cal-week__day',
                  today ? 'cal-week__day--today' : null,
                  period ? `cal-week__day--${period.kind}` : null,
                  events.length === 0 ? 'cal-week__day--empty' : null,
                ]
                  .filter(Boolean)
                  .join(' ');
                return (
                  <li key={day} className={classes}>
                    <h3 className="cal-week__head">
                      <span className="cal-week__weekday">{weekdayLong(day)}</span>
                      <MonoTime dateTime={toIsoDate(day)} className="cal-week__date">
                        {formatShortDate(day)}
                      </MonoTime>
                      {today ? <StatusTag tone="signal">Hôm nay</StatusTag> : null}
                    </h3>
                    {period ? <p className="cal-week__period">{periodShort(period)}</p> : null}
                    {events.length === 0 ? (
                      <p className="calendar__muted">Không có sự kiện.</p>
                    ) : (
                      <div className="cal-week__events">
                        {events.map((e) => (
                          <CalendarEventItem key={e.id} {...itemProps(e)} />
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
