import { Button } from '../components/atoms/Button';
import { LineBadge } from '../components/atoms/LineBadge';
import { MonoTime } from '../components/atoms/MonoTime';
import { PageHead } from '../components/molecules/PageHead';
import { StationCard } from '../components/molecules/StationCard';
import { formatDate, toMillis } from '../domain/dates';
import { deadlineDaysLeft, isPast, registrationState, seatsLeft } from '../domain/events';
import { Link, useRoute } from '../router';
import { selectClubBySlug, selectEventsForClub } from '../state/selectors';
import { useCatalog } from '../state/useCatalog';
import { EventRegistration } from './connected/EventRegistration';
import './Clubs.css';

export function ClubDetailPage() {
  const { params } = useRoute();
  const { state, now, clubName } = useCatalog();
  const club = selectClubBySlug(state, params.slug ?? '');

  if (!club) {
    return (
      <PageHead
        eyebrow="Câu lạc bộ"
        title="Không tìm thấy câu lạc bộ"
        lead="Đường dẫn không tương ứng với câu lạc bộ nào trong danh bạ Rodemap."
      >
        <div className="cluster">
          <Button to="/cau-lac-bo" variant="primary">
            Xem danh bạ câu lạc bộ
          </Button>
        </div>
      </PageHead>
    );
  }

  const events = selectEventsForClub(state, club.id);
  const upcoming = events.filter((e) => !isPast(e, now));
  const past = events.filter((e) => isPast(e, now)).reverse();

  return (
    <>
      <PageHead
        eyebrow={
          <>
            Câu lạc bộ
            {club.categories.map((c) => (
              <LineBadge key={c} code={c} showName size="sm" />
            ))}
          </>
        }
        title={club.shortName}
        lead={club.description}
      >
        <p className="clubs__full">
          {club.name} · Liên hệ: {club.contact}
        </p>
        {state.role === 'club' ? (
          <div className="cluster">
            <Button to="/cong-cau-lac-bo" variant="secondary" iconEnd="arrow-right">
              Gửi sự kiện qua Cổng câu lạc bộ
            </Button>
          </div>
        ) : null}
      </PageHead>

      <section className="band band--surface" aria-labelledby="club-upcoming">
        <div className="container stack stack--md">
          <h2 id="club-upcoming" className="clubs__name">
            Sự kiện sắp diễn ra
          </h2>
          {upcoming.length === 0 ? (
            <p className="clubs__full">
              Câu lạc bộ chưa có sự kiện sắp diễn ra. Vui lòng theo dõi Lộ trình hoặc khám phá sự kiện của các câu lạc bộ khác.
            </p>
          ) : (
            <div className="club-detail__events">
              {upcoming.map((e) => {
                const st = registrationState(e, state.registrations, now);
                return (
                  <StationCard
                    key={e.id}
                    event={e}
                    clubName={clubName(e.clubId)}
                    state={st}
                    seatsLeft={seatsLeft(e, state.registrations)}
                    deadlineDays={deadlineDaysLeft(e, now)}
                    actions={st === 'open' || st === 'registered' ? <EventRegistration eventId={e.id} size="sm" /> : null}
                  />
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="band" aria-labelledby="club-past">
        <div className="container stack stack--md">
          <h2 id="club-past" className="clubs__name">
            Sự kiện đã tổ chức
          </h2>
          {past.length === 0 ? (
            <p className="clubs__full">Câu lạc bộ chưa tổ chức sự kiện nào trong năm học này.</p>
          ) : (
            <ul className="club-detail__past">
              {past.map((e) => (
                <li key={e.id}>
                  <MonoTime dateTime={e.start}>{formatDate(toMillis(e.start))}</MonoTime>
                  <LineBadge code={e.category} size="sm" />
                  <Link to={`/su-kien/${e.slug}`}>{e.title}</Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
