import { Button } from '../components/atoms/Button';
import { DemoLabel } from '../components/atoms/DemoLabel';
import { Icon } from '../components/atoms/Icon';
import { LineBadge } from '../components/atoms/LineBadge';
import { MonoTime } from '../components/atoms/MonoTime';
import { StatusTag } from '../components/atoms/StatusTag';
import { MochiNote } from '../components/molecules/MochiNote';
import { PageHead } from '../components/molecules/PageHead';
import { StationCard } from '../components/molecules/StationCard';
import { NewsRelated } from '../components/organisms/NewsRelated';
import { STATUS_LABELS } from '../content/moderation';
import { CATEGORY_LABELS } from '../domain/category-labels';
import { formatDate, formatDayLabel, formatLongDate, formatTime, formatTimeRange, toMillis } from '../domain/dates';
import { deadlineDaysLeft, isPast, registrationState, seatsLeft } from '../domain/events';
import { googleCalendarUrl } from '../domain/gcal';
import { buildIcs, icsFileName } from '../domain/ics';
import { CLUBS } from '../data/clubs';
import { tagLabel } from '../data/tags';
import { Link, useRoute } from '../router';
import { downloadFile } from '../state/effects';
import { requestMochi } from '../state/mochiBridge';
import { selectEventBySlug, selectEventsForClub, selectNewsForEvent } from '../state/selectors';
import { useCatalog } from '../state/useCatalog';
import { useRegistration } from '../state/useRegistration';
import { EventRegistration } from './connected/EventRegistration';
import './EventDetail.css';

function NotPublished({ title, lead }: { title: string; lead: string }) {
  return (
    <PageHead eyebrow="Sự kiện" title={title} lead={lead}>
      <div className="cluster">
        <Button to="/kham-pha" variant="primary">
          Khám phá sự kiện
        </Button>
        <Button to="/lo-trinh" variant="secondary">
          Xem Lộ trình
        </Button>
      </div>
    </PageHead>
  );
}

export function EventDetailPage() {
  const { params } = useRoute();
  const { state, now, clubName } = useCatalog();
  const event = selectEventBySlug(state, params.slug ?? '');
  const { info } = useRegistration(event?.id ?? '');

  if (!event) {
    return (
      <NotPublished
        title="Không tìm thấy sự kiện"
        lead="Đường dẫn không tương ứng với sự kiện nào trong dữ liệu Rodemap. Vui lòng tra cứu tại trang Khám phá sự kiện."
      />
    );
  }
  const staffView = state.role === 'club' || state.role === 'moderator';
  if (event.status !== 'approved' && !staffView) {
    return (
      <NotPublished
        title="Sự kiện chưa được công bố"
        lead="Sự kiện này đang trong quá trình kiểm duyệt của Hội đồng Học sinh và chỉ hiển thị với học sinh sau khi được phê duyệt."
      />
    );
  }

  const start = toMillis(event.start);
  const end = toMillis(event.end);
  const deadline = toMillis(event.registrationDeadline);
  const daysLeft = deadlineDaysLeft(event, now);
  const seats = seatsLeft(event, state.registrations);
  const club = CLUBS.find((c) => c.id === event.clubId);
  const regState = registrationState(event, state.registrations, now);
  const related = selectEventsForClub(state, event.clubId)
    .filter((e) => e.id !== event.id && !isPast(e, now))
    .slice(0, 3);
  const gcal = googleCalendarUrl(event, { clubs: CLUBS, baseUrl: window.location.origin });
  const deadlineNote = daysLeft < 0 ? 'đã kết thúc' : daysLeft === 0 ? 'kết thúc hôm nay' : `còn ${daysLeft} ngày`;

  const downloadOne = () => {
    const ics = buildIcs([event], { now, clubs: CLUBS, calendarName: 'Lịch Rodemap', baseUrl: window.location.origin });
    downloadFile(icsFileName(now).replace('.ics', `-${event.slug.slice(0, 32)}.ics`), ics, 'text/calendar;charset=utf-8');
  };

  return (
    <div className="event-detail" style={{ '--line': `var(--line-${event.category.toLowerCase()})` } as Record<string, string>}>
      <PageHead
        eyebrow={
          <>
            <LineBadge code={event.category} showName size="sm" />
            {club ? (
              <Link className="event-detail__club-link" to={`/cau-lac-bo/${club.slug}`}>
                {club.shortName}
              </Link>
            ) : null}
          </>
        }
        title={event.title}
        lead={
          <>
            <MonoTime dateTime={event.start}>{formatLongDate(start)}</MonoTime> · <MonoTime dateTime={event.start}>{formatTimeRange(start, end)}</MonoTime> ·{' '}
            {event.format === 'online' ? 'Trực tuyến' : event.location}
          </>
        }
      >
        {event.status !== 'approved' ? (
          <p className="event-detail__staff">
            <StatusTag tone={STATUS_LABELS[event.status].tone}>{STATUS_LABELS[event.status].label}</StatusTag>
            Sự kiện chưa hiển thị với học sinh; bạn đang xem với vai trò trình diễn.
          </p>
        ) : null}
        <div className="cluster event-detail__actions">
          {event.status === 'approved' ? <EventRegistration eventId={event.id} /> : null}
          <a className="button button--secondary button--md" href={gcal} target="_blank" rel="noopener noreferrer">
            <Icon name="calendar" />
            <span className="button__label">Thêm vào Google Calendar</span>
            <Icon name="external" size="sm" />
            <span className="visually-hidden"> (mở trong thẻ mới)</span>
          </a>
          <Button variant="quiet" iconStart="download" onClick={downloadOne}>
            Tải tệp .ics
          </Button>
          <Button
            variant="quiet"
            onClick={() => {
              requestMochi({ kind: 'event', eventId: event.id });
            }}
          >
            Hỏi Mochi về sự kiện này
          </Button>
        </div>
      </PageHead>

      <section className="band band--surface" aria-labelledby="event-facts">
        <div className="container event-detail__layout">
          <div className="stack stack--lg">
            <MochiNote label="Mochi tóm tắt" footnote="Tóm tắt dựa trên thông tin do câu lạc bộ cung cấp.">
              <p>{event.summary}</p>
            </MochiNote>

            {info && info.conflicts.length > 0 && regState === 'open' ? (
              <div className="event-detail__warning" role="note">
                <StatusTag tone="stop">Trùng lịch</StatusTag>
                <p>Sự kiện trùng thời gian với các sự kiện bạn đã đăng ký:</p>
                <ul>
                  {info.conflicts.map((c) => (
                    <li key={c.id}>
                      <Link to={`/su-kien/${c.slug}`}>{c.title}</Link> ({formatDayLabel(toMillis(c.start))},{' '}
                      {formatTimeRange(toMillis(c.start), toMillis(c.end))})
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {info?.overBudget ? (
              <div className="event-detail__warning" role="note">
                <StatusTag tone="warn">Vượt quỹ giờ trong tuần</StatusTag>
                <p>Nếu đăng ký sự kiện này, tổng số giờ trong tuần sẽ vượt quỹ giờ mỗi tuần trong hồ sơ của bạn.</p>
              </div>
            ) : null}

            <div className="stack stack--sm">
              <h2 className="event-detail__h2">Nội dung chương trình</h2>
              <p className="event-detail__description">{event.description}</p>
              {event.tags.length > 0 ? (
                <ul className="event-detail__tags" aria-label="Chủ đề">
                  {event.tags.map((t) => (
                    <li key={t}>{tagLabel(t)}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>

          <div className="event-detail__aside">
            <h2 id="event-facts" className="event-detail__h2">
              Thông tin sự kiện
            </h2>
            <dl className="event-detail__facts">
              <div>
                <dt>Thời gian</dt>
                <dd>
                  <MonoTime dateTime={event.start}>{formatLongDate(start)}</MonoTime>
                  <br />
                  <MonoTime dateTime={event.start}>{formatTimeRange(start, end)}</MonoTime>
                </dd>
              </div>
              <div>
                <dt>Địa điểm</dt>
                <dd>{event.location}</dd>
              </div>
              <div>
                <dt>Hình thức</dt>
                <dd>{event.format === 'online' ? 'Trực tuyến' : 'Trực tiếp'}</dd>
              </div>
              <div>
                <dt>Lĩnh vực</dt>
                <dd>
                  {event.category} – {CATEGORY_LABELS[event.category]}
                </dd>
              </div>
              <div>
                <dt>Câu lạc bộ phụ trách</dt>
                <dd>{club ? <Link to={`/cau-lac-bo/${club.slug}`}>{club.name}</Link> : clubName(event.clubId)}</dd>
              </div>
              <div>
                <dt>Khối được phép tham gia</dt>
                <dd>Khối {event.eligibleGrades.join(', ')}</dd>
              </div>
              <div>
                <dt>Số chỗ còn lại</dt>
                <dd>
                  <span className="mono">{seats}</span> / <span className="mono">{event.capacity}</span>
                  {seats > 0 && seats <= 5 ? <StatusTag tone="warn">Còn ít chỗ</StatusTag> : null}
                  {seats === 0 ? <StatusTag tone="stop">Hết chỗ</StatusTag> : null}
                </dd>
              </div>
              <div>
                <dt>Hạn đăng ký</dt>
                <dd>
                  <MonoTime dateTime={event.registrationDeadline}>
                    {formatDate(deadline)} · {formatTime(deadline)}
                  </MonoTime>{' '}
                  ({deadlineNote})
                </dd>
              </div>
            </dl>
            <DemoLabel />
          </div>
        </div>
      </section>

      <NewsRelated posts={selectNewsForEvent(state, event.id, now)} title="Bản tin Hội đồng Học sinh nhắc đến sự kiện này" headingId="event-news" />

      {related.length > 0 ? (
        <section className="band" aria-labelledby="event-related">
          <div className="container stack stack--md">
            <h2 id="event-related" className="event-detail__h2">
              Sự kiện khác của {club?.shortName ?? 'câu lạc bộ'}
            </h2>
            <div className="event-detail__related">
              {related.map((e) => (
                <StationCard
                  key={e.id}
                  event={e}
                  clubName={clubName(e.clubId)}
                  state={registrationState(e, state.registrations, now)}
                  seatsLeft={seatsLeft(e, state.registrations)}
                  deadlineDays={deadlineDaysLeft(e, now)}
                  variant="compact"
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
