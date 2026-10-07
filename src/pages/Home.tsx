import { useMemo } from 'react';
import { Button } from '../components/atoms/Button';
import { LineBadge } from '../components/atoms/LineBadge';
import { MonoTime } from '../components/atoms/MonoTime';
import { StationCard } from '../components/molecules/StationCard';
import { Mochi } from '../components/organisms/Mochi';
import { RouteMap } from '../components/organisms/RouteMap';
import { useMediaQuery } from '../components/useMediaQuery';
import { CLOSING, DEMO_QUESTION, HERO, MOCHI_INTRO, PARTICIPATION, PILLARS, PROBLEM, SOLUTION } from '../content/landing';
import { CATEGORIES } from '../data/categories';
import { PERIODS } from '../data/calendar';
import { CLUBS } from '../data/clubs';
import { EVENTS } from '../data/events';
import { addDays, formatDayLabel, formatTime, startOfIsoWeek, toMillis } from '../domain/dates';
import { deadlineDaysLeft, isRegistered, registrationState, seatsLeft } from '../domain/events';
import { layoutRoute } from '../domain/route-layout';
import { respondOffline } from '../mochi/offline/engine';
import { CATEGORY_CODES } from '../domain/types';
import { MAIN_HEADING_ID, useNavigate } from '../router';
import { useAppState, useNow } from '../state/hooks';
import { requestMochi } from '../state/mochiBridge';
import './Home.css';

const FRAGMENT_WEEKS = 6;

export function HomePage() {
  const state = useAppState();
  const now = useNow();
  const navigate = useNavigate();
  const wide = useMediaQuery('(min-width: 720px)', true);
  const orientation = wide ? 'horizontal' : 'vertical';

  const events = useMemo(() => EVENTS.filter((e) => e.status === 'approved'), []);
  const byId = useMemo(() => new Map(events.map((e) => [e.id, e])), [events]);
  const clubName = (id: string) => CLUBS.find((c) => c.id === id)?.shortName ?? '';

  const layout = useMemo(() => {
    const from = addDays(startOfIsoWeek(now), -7);
    return layoutRoute({
      events,
      myEventIds: events.filter((e) => isRegistered(e.id, state.registrations)).map((e) => e.id),
      periods: PERIODS,
      range: { from, to: addDays(from, FRAGMENT_WEEKS * 7) },
      orientation,
      pxPerDay: wide ? 12 : 9,
      laneGap: wide ? 34 : 40,
      padding: wide ? { start: 24, end: 24, cross: 56 } : { start: 40, end: 24, cross: 36 },
      categories: [...CATEGORY_CODES],
      now,
    });
  }, [events, state.registrations, orientation, wide, now]);

  /* The landing demo exchange: Mochi's offline engine answering DEMO_QUESTION over the current demo data. */
  const demo = useMemo(() => {
    const reply = respondOffline(DEMO_QUESTION, { state, now });
    const card = reply.cards.find((c) => c.kind === 'events');
    const lead = reply.text.split('\n\n')[0] ?? reply.text;
    const list = card?.kind === 'events' ? card.eventIds.slice(0, 3) : [];
    return {
      lead,
      events: list.flatMap((id) => {
        const event = byId.get(id);
        return event ? [{ event, reason: card?.kind === 'events' ? card.reasons?.[id]?.[0] : undefined }] : [];
      }),
    };
  }, [state, now, byId]);

  const stationLabel = (id: string) => {
    const e = byId.get(id);
    if (!e) return id;
    const start = toMillis(e.start);
    return `${e.category} · ${e.title} · ${formatDayLabel(start)}, ${formatTime(start)}`;
  };

  return (
    <>
      <section className="home-hero">
        <div className="container home-hero__grid">
          <div className="home-hero__copy">
            <p className="home-hero__eyebrow">{HERO.eyebrow}</p>
            <h1 id={MAIN_HEADING_ID} className="home-hero__title" tabIndex={-1}>
              {HERO.headline}
            </h1>
            <p className="home-hero__lead">{SOLUTION}</p>
            <div className="cluster home-hero__actions">
              <Button to="/thiet-lap" variant="primary" size="lg" iconEnd="arrow-right">
                {HERO.primaryCta}
              </Button>
              <Button to="/de-an" variant="secondary" size="lg">
                {HERO.secondaryCta}
              </Button>
            </div>
          </div>
          <figure className="home-hero__map">
            <figcaption className="home-hero__map-caption">
              <span>Lộ trình minh họa</span>
              <span className="home-hero__map-note">Sáu tuần, dữ liệu minh họa</span>
            </figcaption>
            <RouteMap
              layout={layout}
              orientation={orientation}
              lanes={CATEGORIES.map((c) => ({ code: c.code, name: c.name }))}
              label="Lộ trình minh họa trong sáu tuần"
              stationLabel={stationLabel}
              animateIn
              fit
              endMarker={<Mochi state="idle" />}
              onActivate={(id) => {
                const e = byId.get(id);
                if (e) navigate(`/su-kien/${e.slug}`);
              }}
              renderCard={(id) => {
                const e = byId.get(id);
                if (!e) return null;
                return (
                  <StationCard
                    event={e}
                    clubName={clubName(e.clubId)}
                    state={registrationState(e, state.registrations, now)}
                    seatsLeft={seatsLeft(e, state.registrations)}
                    deadlineDays={deadlineDaysLeft(e, now)}
                    variant="compact"
                    linked={false}
                  />
                );
              }}
            />
          </figure>
        </div>
      </section>

      <section className="band band--surface" aria-labelledby="home-problem">
        <div className="container home-split">
          <div className="home-split__item">
            <p className="eyebrow">Vấn đề</p>
            <h2 id="home-problem" className="home-split__title">
              Thông tin hoạt động ngoại khóa đang bị phân tán.
            </h2>
            <p className="home-split__body">{PROBLEM}</p>
          </div>
          <div className="home-split__item">
            <p className="eyebrow">Giải pháp</p>
            <h2 className="home-split__title">Một nền tảng, một lộ trình.</h2>
            <p className="home-split__body">{SOLUTION}</p>
          </div>
        </div>
      </section>

      <section className="band" aria-labelledby="home-pillars">
        <div className="container stack stack--lg">
          <h2 id="home-pillars" className="home-section-title">
            Bốn trụ cột của Rodemap
          </h2>
          <ol className="home-pillars">
            {PILLARS.map((p) => (
              <li key={p.id} className="home-pillars__item" style={{ '--line': `var(--line-${p.line.toLowerCase()})` } as Record<string, string>}>
                <span className="home-pillars__station" aria-hidden="true" />
                <h3 className="home-pillars__title">{p.title}</h3>
                <p className="home-pillars__body">{p.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="band band--surface" aria-labelledby="home-mochi">
        <div className="container home-mochi">
          <div className="home-mochi__figure">
            <Mochi state="idle" title="Mochi, trợ lý đồng hành của Rodemap" />
          </div>
          <div className="stack stack--md">
            <p className="eyebrow">Trợ lý đồng hành</p>
            <h2 id="home-mochi" className="home-section-title">
              Mochi đồng hành trên lộ trình của bạn.
            </h2>
            <p className="home-split__body">{MOCHI_INTRO}</p>
            <ul className="home-mochi__rules">
              <li>Mochi chỉ sử dụng dữ liệu của Rodemap và không tự tạo sự kiện.</li>
              <li>Mọi thao tác đăng ký đều cần bạn nhấn Xác nhận.</li>
              <li>Mochi không yêu cầu thông tin cá nhân nhạy cảm.</li>
            </ul>
          </div>
          <figure className="home-demo" aria-labelledby="home-demo-caption">
            <figcaption id="home-demo-caption" className="home-demo__caption">
              Đoạn trao đổi minh họa · tạo từ dữ liệu minh họa ở chế độ ngoại tuyến
            </figcaption>
            <ol className="home-demo__log">
              <li className="home-demo__entry home-demo__entry--student">
                <p className="home-demo__who">Bạn</p>
                <p>{DEMO_QUESTION}</p>
              </li>
              <li className="home-demo__entry">
                <p className="home-demo__who">Mochi</p>
                <p>{demo.lead}</p>
                {demo.events.length > 0 ? (
                  <ul className="home-demo__events">
                    {demo.events.map(({ event: e, reason }) => (
                      <li key={e.id}>
                        <p className="home-demo__event-meta">
                          <LineBadge code={e.category} size="sm" />
                          <MonoTime dateTime={e.start}>
                            {formatDayLabel(toMillis(e.start))} · {formatTime(toMillis(e.start))}
                          </MonoTime>
                        </p>
                        <p className="home-demo__event-title">{e.title}</p>
                        {reason ? <p className="home-demo__event-reason">{reason}</p> : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            </ol>
            <Button
              variant="secondary"
              size="sm"
              iconEnd="arrow-right"
              className="home-demo__ask"
              onClick={() => {
                requestMochi({ kind: 'prompt', text: DEMO_QUESTION });
              }}
            >
              Gửi câu hỏi này cho Mochi
            </Button>
          </figure>
        </div>
      </section>

      <section className="band" aria-labelledby="home-participation">
        <div className="container stack stack--lg">
          <h2 id="home-participation" className="home-section-title">
            Cách các bên cùng tham gia
          </h2>
          <ol className="home-steps">
            {PARTICIPATION.map((s) => (
              <li key={s.id} className="home-steps__item">
                <p className="home-steps__actor">{s.actor}</p>
                <h3 className="home-steps__title">{s.title}</h3>
                <p className="home-steps__body">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="band band--surface" aria-labelledby="home-closing">
        <div className="container home-closing">
          <div className="stack stack--md">
            <h2 id="home-closing" className="home-section-title">
              {CLOSING.title}
            </h2>
            <p className="home-split__body">{CLOSING.body}</p>
          </div>
          <div className="cluster">
            <Button to="/thiet-lap" variant="primary" size="lg" iconEnd="arrow-right">
              {CLOSING.cta}
            </Button>
          </div>
          <ul className="home-closing__lines" aria-label="Bảy tuyến lĩnh vực">
            {CATEGORIES.map((c) => (
              <li key={c.code}>
                <LineBadge code={c.code} showName />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
