import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { Button } from '../components/atoms/Button';
import { DemoLabel } from '../components/atoms/DemoLabel';
import { MonoTime } from '../components/atoms/MonoTime';
import { StatusTag } from '../components/atoms/StatusTag';
import { PageHead } from '../components/molecules/PageHead';
import { StationCard } from '../components/molecules/StationCard';
import { QuickPicks } from '../components/organisms/QuickPicks';
import { describeReasons, describeWarnings } from '../content/reasons';
import { formatDate, formatTime, isoWeekKey, toMillis } from '../domain/dates';
import { deadlineDaysLeft, registrationState, seatsLeft } from '../domain/events';
import { Link } from '../router';
import { useSetupHref } from '../router/Router';
import { selectDeadlinesThisWeek, selectGuestRecommendations } from '../state/selectors';
import { useCatalog } from '../state/useCatalog';
import { EventRegistration } from './connected/EventRegistration';
import './Dashboard.css';

const SUGGESTION_LIMIT = 6;

/**
 * Tổng quan for a visitor without a profile ("Dùng thử", DESIGN.md §7.2): quick picks in a
 * colour block, suggestions that follow each pick, and this week's deadlines. Suggestion rows
 * slide to their new place when a pick changes (framer-motion layout, reduced motion respected).
 */
export function GuestDashboard() {
  const { state, dispatch, now, clubName } = useCatalog();
  const setupHref = useSetupHref();
  const picks = state.guestPicks;
  const recs = selectGuestRecommendations(state, now, { limit: SUGGESTION_LIMIT });
  const deadlines = selectDeadlinesThisWeek(state, now).slice(0, 5);

  return (
    <div className="dashboard">
      <PageHead
        eyebrow={`Dùng thử · Tuần ${String(Number(isoWeekKey(now).slice(-2)))}`}
        title="Dùng thử Rodemap"
        lead="Bạn có thể xem sự kiện và gợi ý của Rodemap trước khi thiết lập hồ sơ. Khối và lĩnh vực bạn chọn dưới đây chỉ được lưu trên trình duyệt này và được điền sẵn khi bạn thiết lập hồ sơ."
        leadShort="Chọn khối và lĩnh vực để xem gợi ý sự kiện dành cho bạn."
      >
        <div className="cluster">
          <Button to={setupHref} variant="primary" iconEnd="arrow-right">
            Thiết lập hồ sơ
          </Button>
          <DemoLabel />
        </div>
      </PageHead>

      <section className="band band--block" aria-labelledby="guest-picks">
        <div className="container stack stack--md">
          <h2 id="guest-picks" className="dashboard__h2">
            Gợi ý nhanh
          </h2>
          <QuickPicks
            picks={picks}
            onChange={(next) => {
              dispatch({ type: 'guest/setPicks', picks: next });
            }}
          />
        </div>
      </section>

      <div className="band band--surface">
        <div className="container dashboard__grid">
          <section className="dashboard__main" aria-labelledby="guest-recs">
            <div className="dashboard__section-head">
              <h2 id="guest-recs" className="dashboard__h2">
                Gợi ý cho bạn
              </h2>
              <Link className="dashboard__small-link" to="/kham-pha">
                Xem toàn bộ sự kiện
              </Link>
            </div>
            <p className="dashboard__muted" role="status">
              {picks.grade === null
                ? 'Chọn khối để xem các sự kiện dành cho bạn.'
                : `Các sự kiện còn mở đăng ký dành cho khối ${String(picks.grade)}${picks.interests.length > 0 ? ', ưu tiên lĩnh vực bạn đã chọn' : ''}.`}
            </p>
            {recs.length === 0 ? (
              <p className="dashboard__muted">Hiện chưa có sự kiện phù hợp còn mở đăng ký.</p>
            ) : (
              <MotionConfig reducedMotion="user">
                <ol className="dashboard__recs">
                  <AnimatePresence initial={false}>
                    {recs.map((r) => (
                      <motion.li
                        key={r.event.id}
                        layout="position"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <StationCard
                          event={r.event}
                          clubName={clubName(r.event.clubId)}
                          state={registrationState(r.event, state.registrations, now)}
                          seatsLeft={seatsLeft(r.event, state.registrations)}
                          deadlineDays={deadlineDaysLeft(r.event, now)}
                          variant="compact"
                          actions={<EventRegistration eventId={r.event.id} size="sm" />}
                        />
                        {r.reasons.length + r.warnings.length > 0 ? (
                          <div className="dashboard__why density-detail">
                            <p className="dashboard__why-label">Vì sao Rodemap gợi ý</p>
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
                        ) : null}
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ol>
              </MotionConfig>
            )}
          </section>

          <aside className="dashboard__side stack stack--xl" aria-label="Hạn đăng ký và hồ sơ">
            <section className="dashboard__panel" aria-labelledby="guest-deadlines">
              <h2 id="guest-deadlines" className="dashboard__h3">
                Hạn đăng ký tuần này
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
                        <StatusTag tone="warn">{days <= 0 ? 'Kết thúc hôm nay' : `Còn ${String(days)} ngày`}</StatusTag>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="dashboard__panel density-detail" aria-labelledby="guest-profile">
              <h2 id="guest-profile" className="dashboard__h3">
                Sau khi thiết lập hồ sơ
              </h2>
              <ul className="dashboard__plain-list">
                <li>Đăng ký sự kiện và theo dõi lộ trình của bạn.</li>
                <li>Nhận gợi ý theo mục tiêu và thời gian có thể tham gia.</li>
                <li className="density-full-only">Lưu hồ sơ năng lực và trao đổi với Mochi.</li>
              </ul>
              <Button to={setupHref} variant="secondary" size="sm" iconEnd="arrow-right">
                Thiết lập hồ sơ
              </Button>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
