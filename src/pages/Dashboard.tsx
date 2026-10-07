import { useState } from 'react';
import { Button } from '../components/atoms/Button';
import { DemoLabel } from '../components/atoms/DemoLabel';
import { LineBadge } from '../components/atoms/LineBadge';
import { MonoTime } from '../components/atoms/MonoTime';
import { StatusTag } from '../components/atoms/StatusTag';
import { BudgetMeter } from '../components/molecules/BudgetMeter';
import { MochiNote } from '../components/molecules/MochiNote';
import { PageHead } from '../components/molecules/PageHead';
import { StationCard, eventStatus } from '../components/molecules/StationCard';
import { DepartureBoard, type DepartureRow } from '../components/organisms/DepartureBoard';
import { describeReasons, describeWarnings } from '../content/reasons';
import { formatDate, formatDayLabel, formatLongDate, formatTime, isoWeekKey, toMillis } from '../domain/dates';
import { weeklyDigest } from '../domain/digest';
import { deadlineDaysLeft, isPast, isRegistered, registrationState, seatsLeft } from '../domain/events';
import { entryFromEvent } from '../domain/portfolio';
import { CATEGORY_CODES } from '../domain/types';
import { PERIODS } from '../data/calendar';
import { Link } from '../router';
import { newId } from '../state/effects';
import { requestMochi } from '../state/mochiBridge';
import {
  selectConflictsInPlan,
  selectDeadlinesThisWeek,
  selectMyEvents,
  selectPendingAttendance,
  selectPlanBudget,
  selectRecommendations,
  selectUpcomingMine,
} from '../state/selectors';
import { useCatalog } from '../state/useCatalog';
import { EventRegistration } from './connected/EventRegistration';
import './Dashboard.css';

const BOARD_SIZE = 8;

export function DashboardPage() {
  const { state, dispatch, now, publicEvents, clubName, eventById } = useCatalog();
  const [boardScope, setBoardScope] = useState<'all' | 'mine'>('all');
  const profile = state.profile;
  const upcomingMine = selectUpcomingMine(state, now);
  const myEvents = selectMyEvents(state);
  const budget = selectPlanBudget(state, now);
  const conflicts = selectConflictsInPlan(state).filter((c) => upcomingMine.some((e) => e.id === c.a || e.id === c.b));
  const pending = selectPendingAttendance(state, now);
  const deadlines = selectDeadlinesThisWeek(state, now).slice(0, 5);
  const recs = selectRecommendations(state, now, { limit: 3 });
  const digest = weeklyDigest(publicEvents, { now, regs: state.registrations, periods: PERIODS });
  const covered = CATEGORY_CODES.filter((c) => myEvents.some((e) => e.category === c));
  const next = upcomingMine[0];

  const boardEvents = (boardScope === 'mine' ? upcomingMine : publicEvents.filter((e) => !isPast(e, now))).slice(0, BOARD_SIZE);
  const rows: DepartureRow[] = boardEvents.map((e) => ({
    event: e,
    status: eventStatus(registrationState(e, state.registrations, now), seatsLeft(e, state.registrations), deadlineDaysLeft(e, now)),
    mine: isRegistered(e.id, state.registrations),
  }));

  return (
    <div className="dashboard">
      <PageHead
        eyebrow={`Bảng tin cá nhân · Tuần ${Number(isoWeekKey(now).slice(-2))}`}
        title="Tổng quan"
        lead={
          profile
            ? `Xin chào bạn, học sinh lớp ${profile.className}. Hôm nay là ${formatLongDate(now)}.`
            : 'Bạn chưa thiết lập hồ sơ. Sau khi thiết lập, Rodemap sẽ đề xuất sự kiện phù hợp với lĩnh vực quan tâm và thời gian của bạn.'
        }
      >
        <div className="cluster">
          {profile ? null : (
            <Button to="/thiet-lap" variant="primary" iconEnd="arrow-right">
              Bắt đầu thiết lập lộ trình
            </Button>
          )}
          <DemoLabel />
        </div>
      </PageHead>

      <div className="band band--surface">
        <div className="container dashboard__grid">
          <div className="dashboard__main stack stack--xl">
            <section aria-labelledby="dash-board">
              <div className="dashboard__section-head">
                <h2 id="dash-board" className="dashboard__h2">
                  Sắp diễn ra
                </h2>
                <div className="dashboard__toggle" role="group" aria-label="Phạm vi bảng sự kiện">
                  {(['all', 'mine'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={boardScope === s}
                      onClick={() => {
                        setBoardScope(s);
                      }}
                    >
                      {s === 'all' ? 'Toàn trường' : 'Của tôi'}
                    </button>
                  ))}
                </div>
              </div>
              {rows.length > 0 ? (
                <DepartureBoard rows={rows} caption={boardScope === 'all' ? 'Các sự kiện sắp diễn ra' : 'Các sự kiện sắp diễn ra mà bạn đã đăng ký'} />
              ) : (
                <p className="dashboard__muted">
                  {boardScope === 'mine'
                    ? 'Bạn chưa có sự kiện sắp diễn ra. Vui lòng xem đề xuất của Mochi hoặc khám phá sự kiện.'
                    : 'Chưa có sự kiện sắp diễn ra trên Rodemap.'}
                </p>
              )}
              <p className="dashboard__more">
                <Link to="/kham-pha">Xem toàn bộ sự kiện</Link>
              </p>
            </section>

            <section aria-labelledby="dash-recs">
              <div className="dashboard__section-head">
                <h2 id="dash-recs" className="dashboard__h2">
                  Mochi đề xuất
                </h2>
                <Button
                  size="sm"
                  variant="quiet"
                  onClick={() => {
                    requestMochi({ kind: 'open' });
                  }}
                >
                  Hỏi Mochi
                </Button>
              </div>
              {recs.length === 0 ? (
                <p className="dashboard__muted">Hiện chưa có sự kiện phù hợp còn mở đăng ký. Mochi sẽ đề xuất khi có sự kiện mới.</p>
              ) : (
                <ol className="dashboard__recs">
                  {recs.map((r) => (
                    <li key={r.event.id}>
                      <StationCard
                        event={r.event}
                        clubName={clubName(r.event.clubId)}
                        state={registrationState(r.event, state.registrations, now)}
                        seatsLeft={seatsLeft(r.event, state.registrations)}
                        deadlineDays={deadlineDaysLeft(r.event, now)}
                        variant="compact"
                        actions={<EventRegistration eventId={r.event.id} size="sm" />}
                      />
                      <div className="dashboard__why">
                        <p className="dashboard__why-label">Vì sao Mochi đề xuất</p>
                        <ul>
                          {describeReasons(r)
                            .slice(0, 3)
                            .map((line) => (
                              <li key={line}>{line}</li>
                            ))}
                        </ul>
                        {describeWarnings(r).length > 0 ? (
                          <div className="cluster cluster--sm">
                            {describeWarnings(r).map((w) => (
                              <StatusTag key={w} tone="warn">
                                {w}
                              </StatusTag>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section aria-labelledby="dash-digest">
              <h2 id="dash-digest" className="dashboard__h2">
                Bản tin tuần
              </h2>
              <MochiNote label={`Bản tin tuần · ${digest.weekLabel}`} footnote="Do Mochi tổng hợp từ dữ liệu minh họa của Rodemap.">
                {digest.paragraphs.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </MochiNote>
            </section>
          </div>

          <aside className="dashboard__side stack stack--xl" aria-label="Lộ trình và nội dung cần thực hiện">
            <section className="dashboard__panel" aria-labelledby="dash-route">
              <h2 id="dash-route" className="dashboard__h3">
                Lộ trình của bạn
              </h2>
              <p className="dashboard__big">
                <span className="mono">{upcomingMine.length}</span> sự kiện sắp tham gia
              </p>
              {next ? (
                <p className="dashboard__muted">
                  Gần nhất: <Link to={`/su-kien/${next.slug}`}>{next.title}</Link> (
                  <MonoTime dateTime={next.start}>
                    {formatDayLabel(toMillis(next.start))}, {formatTime(toMillis(next.start))}
                  </MonoTime>
                  )
                </p>
              ) : null}
              <BudgetMeter used={budget.used} budget={budget.budget} label="Quỹ giờ tuần này" />
              {covered.length > 0 ? (
                <ul className="dashboard__lines" aria-label="Các tuyến trong lộ trình">
                  {covered.map((c) => (
                    <li key={c}>
                      <LineBadge code={c} size="sm" />
                    </li>
                  ))}
                </ul>
              ) : null}
              {conflicts.length > 0 ? (
                <div className="dashboard__conflicts">
                  <StatusTag tone="stop">Trùng lịch</StatusTag>
                  <ul>
                    {conflicts.map((c) => (
                      <li key={`${c.a}-${c.b}`}>
                        {eventById(c.a)?.title} · {eventById(c.b)?.title}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <StatusTag tone="ok">Không trùng lịch</StatusTag>
              )}
              <Button to="/lo-trinh?pham-vi=cua-toi" variant="secondary" size="sm" iconEnd="arrow-right">
                Xem Lộ trình
              </Button>
            </section>

            {pending.length > 0 ? (
              <section className="dashboard__panel" aria-labelledby="dash-attend">
                <h2 id="dash-attend" className="dashboard__h3">
                  Xác nhận tham gia
                </h2>
                <ul className="dashboard__list">
                  {pending.map((e) => (
                    <li key={e.id}>
                      <p className="dashboard__item-title">{e.title}</p>
                      <p className="dashboard__muted">
                        <MonoTime dateTime={e.start}>{formatDate(toMillis(e.start))}</MonoTime>
                      </p>
                      <div className="cluster cluster--sm">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => {
                            dispatch({ type: 'registration/markAttended', eventId: e.id, entry: entryFromEvent(e, { id: newId('pf'), now }) });
                          }}
                        >
                          Xác nhận đã tham gia
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            dispatch({ type: 'registration/markAbsent', eventId: e.id });
                          }}
                        >
                          Không tham gia
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
                <Link className="dashboard__small-link" to="/ho-so">
                  Xem Hồ sơ năng lực
                </Link>
              </section>
            ) : null}

            <section className="dashboard__panel" aria-labelledby="dash-deadlines">
              <h2 id="dash-deadlines" className="dashboard__h3">
                Hạn đăng ký trong tuần
              </h2>
              {deadlines.length === 0 ? (
                <p className="dashboard__muted">Không có hạn đăng ký nào kết thúc trong tuần này.</p>
              ) : (
                <ul className="dashboard__list">
                  {deadlines.map((e) => {
                    const d = toMillis(e.registrationDeadline);
                    const days = deadlineDaysLeft(e, now);
                    return (
                      <li key={e.id}>
                        <Link className="dashboard__item-title" to={`/su-kien/${e.slug}`}>
                          {e.title}
                        </Link>
                        <p className="dashboard__muted">
                          Hạn:{' '}
                          <MonoTime dateTime={e.registrationDeadline}>
                            {formatTime(d)} · {formatDate(d)}
                          </MonoTime>
                        </p>
                        <div className="cluster cluster--sm">
                          <StatusTag tone="warn">{days <= 0 ? 'Kết thúc hôm nay' : `Còn ${days} ngày`}</StatusTag>
                          <EventRegistration eventId={e.id} size="sm" />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
