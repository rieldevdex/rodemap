import { useCallback, useEffect, useMemo, useRef, useState, type RefCallback } from 'react';
import { Button } from '../components/atoms/Button';
import { Icon } from '../components/atoms/Icon';
import { LineBadge } from '../components/atoms/LineBadge';
import { MonoTime } from '../components/atoms/MonoTime';
import { StatusTag } from '../components/atoms/StatusTag';
import { PageHead } from '../components/molecules/PageHead';
import { eventStatus, StationCard } from '../components/molecules/StationCard';
import { RouteList, type RouteListRow } from '../components/organisms/RouteList';
import { RouteMap, RouteMapLegend, type RouteMapHandle } from '../components/organisms/RouteMap';
import { useMediaQuery } from '../components/useMediaQuery';
import { CATEGORIES } from '../data/categories';
import { PERIODS } from '../data/calendar';
import { SCHOOL } from '../data/school';
import {
  addDays,
  formatDayLabel,
  formatShortDate,
  formatTime,
  isoWeekKey,
  SCHOOL_YEAR,
  startOfIsoWeek,
  toIsoDate,
  toMillis,
} from '../domain/dates';
import { deadlineDaysLeft, isPast, registrationState, seatsLeft } from '../domain/events';
import { layoutRoute, type Orientation, type RouteLayoutInput } from '../domain/route-layout';
import { formatHours } from '../domain/text';
import { CATEGORY_CODES, type CalendarPeriod, type CategoryCode, type SchoolEvent } from '../domain/types';
import { useNavigate, useRoute } from '../router';
import { selectConflictsInPlan, selectMyEvents, selectPlanBudget, selectUpcomingMine } from '../state/selectors';
import { useCatalog } from '../state/useCatalog';
import { routeMemory } from '../state/routeMemory';
import './Route.css';

type Scope = 'all' | 'mine';
type View = 'map' | 'list';

/** URL state: /lo-trinh?pham-vi=cua-toi&xem=danh-sach (defaults are left out of the URL). */
const SCOPE_PARAM = 'pham-vi';
const SCOPE_MINE = 'cua-toi';
const VIEW_PARAM = 'xem';
const VIEW_LIST = 'danh-sach';

/** Half-open range of the school year: 01/09/2026 00:00 up to 01/06/2027 00:00. */
const RANGE = { from: toMillis(SCHOOL_YEAR.start), to: addDays(toMillis(SCHOOL_YEAR.end), 1) };

/**
 * Horizontal geometry. 14 units per day keeps the two closest stations on one line (21 and
 * 22/10, 1.1 days apart) clear of each other, and a week (98 units) wide enough to read.
 * The 72-unit lead leaves room for the pinned line codes; 72 units across holds the month
 * and today labels above the first line, and the period labels and week ticks below the last.
 */
const HORIZONTAL = { pxPerDay: 14, laneGap: 40, padding: { start: 72, end: 56, cross: 72 } };

/** Vertical (phones): 13 units per day; the lanes share the measured width between two label gutters. */
const VERTICAL_PX_PER_DAY = 13;
const VERTICAL_GUTTER = 72;
const VERTICAL_LANE_GAP = { min: 30, max: 56 };
const VERTICAL_FALLBACK_WIDTH = 390;

const LANES = CATEGORIES.map((c) => ({ code: c.code, name: c.name }));
const LANE_NAMES = new Map(CATEGORIES.map((c) => [c.code, c.name]));

function verticalGeometry(width: number): Pick<RouteLayoutInput, 'pxPerDay' | 'laneGap' | 'padding'> {
  const gaps = CATEGORY_CODES.length - 1;
  const laneGap = Math.min(VERTICAL_LANE_GAP.max, Math.max(VERTICAL_LANE_GAP.min, (width - 2 * VERTICAL_GUTTER) / gaps));
  const cross = Math.max(VERTICAL_GUTTER / 2, (width - gaps * laneGap) / 2);
  return { pxPerDay: VERTICAL_PX_PER_DAY, laneGap, padding: { start: 28, end: 28, cross } };
}

/** Phones label the holiday zone briefly; the gutter beside the lines is narrow. */
const VERTICAL_PERIODS: CalendarPeriod[] = PERIODS.map((p) => (p.kind === 'holiday' ? { ...p, label: 'Nghỉ Tết' } : p));

/** Measures an element's inline size (and follows resizes). */
function useElementWidth(): [RefCallback<HTMLElement>, number | null] {
  const [width, setWidth] = useState<number | null>(null);
  const ref = useCallback((el: HTMLElement | null) => {
    if (!el) return undefined;
    setWidth(Math.round(el.getBoundingClientRect().width));
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.round(entry.contentRect.width));
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);
  return [ref, width];
}

/* ── Summary strip ─────────────────────────────────────────────────────── */

interface SummaryProps {
  upcoming: SchoolEvent[];
  weekLabel: string;
  used: number;
  budget: number;
  remaining: number;
  hasProfile: boolean;
  covered: CategoryCode[];
  conflicts: number;
}

function RouteSummary({ upcoming, weekLabel, used, budget, remaining, hasProfile, covered, conflicts }: SummaryProps) {
  const next = upcoming[0];
  const nextStart = next ? toMillis(next.start) : null;
  const over = used > budget;
  const share = budget > 0 ? Math.min(1, used / budget) : 0;
  return (
    <section className="route-summary" aria-labelledby="route-summary-title">
      <h2 id="route-summary-title" className="route-summary__title">
        Lộ trình của bạn
      </h2>
      <dl className="route-summary__grid">
        <div className="route-summary__item">
          <dt className="route-summary__label">Sắp tham gia</dt>
          <dd className="route-summary__value">
            <span className="route-summary__figure">
              <span className="route-summary__number">{upcoming.length}</span>
              <span className="route-summary__unit">sự kiện</span>
            </span>
            <span className="route-summary__note">
              {next && nextStart !== null ? (
                <>
                  Gần nhất:{' '}
                  <MonoTime dateTime={next.start}>{formatDayLabel(nextStart)}</MonoTime> · <MonoTime dateTime={next.start}>{formatTime(nextStart)}</MonoTime>
                </>
              ) : (
                'Chưa có sự kiện sắp diễn ra'
              )}
            </span>
          </dd>
        </div>

        <div className="route-summary__item">
          <dt className="route-summary__label">{`Quỹ giờ ${weekLabel}`}</dt>
          <dd className="route-summary__value">
            <span className="route-summary__figure">
              <span className="route-summary__number">{formatHours(used)}</span>
              <span className="route-summary__unit">{`/ ${formatHours(budget)} giờ`}</span>
            </span>
            <span
              className={['route-summary__meter', over ? 'route-summary__meter--over' : ''].filter(Boolean).join(' ')}
              style={{ '--share': String(share) } as Record<string, string>}
              aria-hidden="true"
            />
            <span className="route-summary__note">
              {over ? (
                <StatusTag tone="stop">{`Vượt ${formatHours(used - budget)} giờ`}</StatusTag>
              ) : (
                <>{`Còn ${formatHours(remaining)} giờ${hasProfile ? '' : ' (quỹ giờ mặc định)'}`}</>
              )}
            </span>
          </dd>
        </div>

        <div className="route-summary__item">
          <dt className="route-summary__label">Lĩnh vực trong lộ trình</dt>
          <dd className="route-summary__value">
            <span className="route-summary__figure">
              <span className="route-summary__number">{covered.length}</span>
              <span className="route-summary__unit">{`/ ${CATEGORY_CODES.length} tuyến`}</span>
            </span>
            {covered.length > 0 ? (
              <ul className="route-summary__lines" aria-label="Các tuyến đã có trong lộ trình">
                {covered.map((code) => (
                  <li key={code}>
                    <LineBadge code={code} size="sm" />
                  </li>
                ))}
              </ul>
            ) : (
              <span className="route-summary__note">Chưa có tuyến nào</span>
            )}
          </dd>
        </div>

        <div className="route-summary__item">
          <dt className="route-summary__label">Trùng lịch</dt>
          <dd className="route-summary__value">
            <span className="route-summary__figure">
              <span className="route-summary__number">{conflicts}</span>
              <span className="route-summary__unit">trường hợp</span>
            </span>
            <span className="route-summary__note">
              {conflicts > 0 ? <StatusTag tone="stop">Cần điều chỉnh</StatusTag> : <StatusTag tone="ok">Không trùng lịch</StatusTag>}
            </span>
          </dd>
        </div>
      </dl>
    </section>
  );
}

/* ── Segmented control ─────────────────────────────────────────────────── */

interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: 'map' | 'list';
}

function Segmented<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="route-toolbar__group" role="group" aria-labelledby={id}>
      <span id={id} className="route-toolbar__label">
        {label}
      </span>
      <div className="route-segmented">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            className="route-segmented__button"
            aria-pressed={o.value === value}
            onClick={() => {
              if (o.value !== value) onChange(o.value);
            }}
          >
            {o.icon ? <Icon name={o.icon} size="sm" className="route-segmented__icon" /> : null}
            <span>{o.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────── */

export function RoutePage() {
  const { state, now, publicEvents, clubName } = useCatalog();
  const { search } = useRoute();
  const navigate = useNavigate();
  const wide = useMediaQuery('(min-width: 720px)', true);
  const orientation: Orientation = wide ? 'horizontal' : 'vertical';
  const scope: Scope = search.get(SCOPE_PARAM) === SCOPE_MINE ? 'mine' : 'all';
  const view: View = search.get(VIEW_PARAM) === VIEW_LIST ? 'list' : 'map';
  const mapRef = useRef<RouteMapHandle>(null);
  const [measureRef, measuredWidth] = useElementWidth();

  /* Data. */
  const myEvents = useMemo(() => selectMyEvents(state), [state]);
  const myIds = useMemo(() => myEvents.map((e) => e.id), [myEvents]);
  const upcoming = useMemo(() => selectUpcomingMine(state, now), [state, now]);
  const budget = useMemo(() => selectPlanBudget(state, now), [state, now]);
  const conflicts = useMemo(() => selectConflictsInPlan(state), [state]);
  const conflictIds = useMemo(() => new Set(conflicts.flatMap((c) => [c.a, c.b])), [conflicts]);
  const covered = useMemo(() => CATEGORY_CODES.filter((code) => myEvents.some((e) => e.category === code)), [myEvents]);
  const shown = scope === 'mine' ? myEvents : publicEvents;
  const byId = useMemo(() => new Map(publicEvents.map((e) => [e.id, e])), [publicEvents]);
  const mineSet = useMemo(() => new Set(myIds), [myIds]);

  const weekStart = startOfIsoWeek(now);
  const weekNumber = Number(isoWeekKey(now).slice(-2));
  const weekLabel = `tuần ${weekNumber}`;

  /* Geometry. */
  const geometry = orientation === 'horizontal' ? HORIZONTAL : verticalGeometry(measuredWidth ?? VERTICAL_FALLBACK_WIDTH);
  const input = useMemo<RouteLayoutInput>(
    () => ({
      events: shown,
      myEventIds: myIds,
      periods: orientation === 'horizontal' ? PERIODS : VERTICAL_PERIODS,
      range: RANGE,
      orientation,
      pxPerDay: geometry.pxPerDay,
      laneGap: geometry.laneGap,
      padding: geometry.padding,
      categories: [...CATEGORY_CODES],
      now,
    }),
    // geometry is derived from orientation and the measured width.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shown, myIds, orientation, measuredWidth, now],
  );
  const layout = useMemo(() => layoutRoute(input), [input]);

  /* Growth of "your route" since the last visit in this session (the key moment). */
  const [growth] = useState(() => {
    const seen = routeMemory.seen;
    if (seen === null) return null;
    const seenSet = new Set(seen);
    const arrivals = myIds.filter((id) => !seenSet.has(id));
    return arrivals.length > 0 ? { kept: myIds.filter((id) => seenSet.has(id)), arrivals } : null;
  });
  const growFrom = useMemo(
    () => (growth ? layoutRoute({ ...input, myEventIds: growth.kept }).myRoute.length : undefined),
    [growth, input],
  );
  useEffect(() => {
    if (view === 'map') routeMemory.seen = myIds;
  }, [myIds, view]);

  /* URL state. */
  const setParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(search);
    if (value === null) params.delete(key);
    else params.set(key, value);
    const query = params.toString();
    navigate(query === '' ? '/lo-trinh' : `/lo-trinh?${query}`, { replace: true });
  };

  /* Per-event facts for labels, cards and list rows. */
  const facts = (e: SchoolEvent) => {
    const regState = registrationState(e, state.registrations, now);
    const seats = seatsLeft(e, state.registrations);
    const deadlineDays = deadlineDaysLeft(e, now);
    const status =
      regState === 'registered' && isPast(e, now)
        ? { tone: 'warn' as const, label: 'Chờ xác nhận tham gia' }
        : eventStatus(regState, seats, deadlineDays);
    return { regState, seats, deadlineDays, status };
  };

  const stationLabel = (id: string) => {
    const e = byId.get(id);
    if (!e) return id;
    const start = toMillis(e.start);
    const mine = mineSet.has(id) ? ' · thuộc lộ trình của bạn' : '';
    return `${e.category} ${LANE_NAMES.get(e.category) ?? ''} · ${e.title} · ${formatDayLabel(start)}, ${formatTime(start)}${mine}`;
  };

  const rows: RouteListRow[] = shown.map((e) => ({
    event: e,
    clubName: clubName(e.clubId),
    status: facts(e).status,
    mine: mineSet.has(e.id),
    conflict: conflictIds.has(e.id),
  }));

  const emptyMine = scope === 'mine' && myEvents.length === 0;
  const emptyAll = scope === 'all' && publicEvents.length === 0;
  const todayLabel = orientation === 'horizontal' ? `Hôm nay · ${formatShortDate(now)}` : 'Hôm nay';
  const countText =
    scope === 'mine'
      ? `${myEvents.length} sự kiện trong lộ trình của bạn, trên ${covered.length} tuyến`
      : `${publicEvents.length} sự kiện trên ${CATEGORY_CODES.length} tuyến, trong đó ${myEvents.length} sự kiện thuộc lộ trình của bạn`;

  return (
    <div className="route-page">
      <PageHead
        eyebrow={
          <>
            <span>{`Năm học ${SCHOOL.schoolYear}`}</span>
            <span aria-hidden="true">·</span>
            <span>
              {`Tuần ${weekNumber} `}
              <MonoTime dateTime={toIsoDate(weekStart)}>
                {`${formatShortDate(weekStart)}–${formatShortDate(addDays(weekStart, 6))}`}
              </MonoTime>
            </span>
          </>
        }
        title="Lộ trình"
        lead="Toàn bộ năm học được trình bày như một bản đồ lộ trình: mỗi lĩnh vực là một tuyến, mỗi sự kiện là một điểm dừng, và các sự kiện bạn đã đăng ký được nối thành lộ trình của bạn."
      >
        <RouteSummary
          upcoming={upcoming}
          weekLabel={weekLabel}
          used={budget.used}
          budget={budget.budget}
          remaining={budget.remaining}
          hasProfile={state.profile !== null}
          covered={covered}
          conflicts={conflicts.length}
        />
      </PageHead>

      <section className="route-stage" aria-labelledby="route-stage-title">
        <div className="container route-stage__head">
          <h2 id="route-stage-title" className="visually-hidden">
            {view === 'map' ? 'Bản đồ lộ trình năm học' : 'Danh sách sự kiện theo tháng'}
          </h2>
          <div className="route-toolbar">
            <Segmented<Scope>
              id="route-scope-label"
              label="Phạm vi"
              value={scope}
              options={[
                { value: 'all', label: 'Toàn trường' },
                { value: 'mine', label: 'Của tôi' },
              ]}
              onChange={(v) => {
                setParam(SCOPE_PARAM, v === 'mine' ? SCOPE_MINE : null);
              }}
            />
            <Segmented<View>
              id="route-view-label"
              label="Hiển thị"
              value={view}
              options={[
                { value: 'map', label: 'Xem dạng bản đồ', icon: 'map' },
                { value: 'list', label: 'Xem dạng danh sách', icon: 'list' },
              ]}
              onChange={(v) => {
                setParam(VIEW_PARAM, v === 'list' ? VIEW_LIST : null);
              }}
            />
            <div className="route-toolbar__end">
              <p className="route-toolbar__count" role="status">
                {countText}
              </p>
              {view === 'map' && layout.today !== null && !emptyMine && !emptyAll ? (
                <Button
                  variant="secondary"
                  size="sm"
                  iconStart="calendar"
                  onClick={() => {
                    mapRef.current?.scrollToToday();
                  }}
                >
                  Chuyển đến hôm nay
                </Button>
              ) : null}
            </div>
          </div>

          {emptyMine ? (
            <div className="route-empty">
              <h3 className="route-empty__title">Lộ trình của bạn chưa có sự kiện</h3>
              <p className="route-empty__body">
                Bạn chưa đăng ký sự kiện nào trong năm học. Vui lòng khám phá các sự kiện đang mở đăng ký, hoặc thiết lập hồ sơ
                để Mochi đề xuất những sự kiện phù hợp với lĩnh vực quan tâm và thời gian của bạn. Các sự kiện đã đăng ký sẽ được
                nối thành lộ trình trên bản đồ.
              </p>
              <div className="cluster">
                <Button to="/kham-pha" variant="primary" iconEnd="arrow-right">
                  Khám phá sự kiện
                </Button>
                <Button to="/thiet-lap" variant="secondary">
                  Thiết lập hồ sơ
                </Button>
              </div>
            </div>
          ) : null}
          {emptyAll ? (
            <div className="route-empty">
              <h3 className="route-empty__title">Chưa có sự kiện được phê duyệt</h3>
              <p className="route-empty__body">
                Hội đồng Học sinh chưa phê duyệt sự kiện nào trong năm học này. Vui lòng xem danh sách câu lạc bộ để theo dõi các hoạt
                động sắp được công bố.
              </p>
              <div className="cluster">
                <Button to="/cau-lac-bo" variant="secondary" iconEnd="arrow-right">
                  Xem danh sách câu lạc bộ
                </Button>
              </div>
            </div>
          ) : null}

          {view === 'map' && !wide ? <RouteMapLegend lanes={LANES} variant="full" className="route-stage__legend" /> : null}
        </div>

        {view === 'map' ? (
          <div className="route-stage__map" ref={measureRef}>
            {orientation === 'horizontal' || measuredWidth !== null ? (
              <RouteMap
                ref={mapRef}
                layout={layout}
                orientation={orientation}
                lanes={LANES}
                label={`Bản đồ lộ trình năm học ${SCHOOL.schoolYear}${scope === 'mine' ? ', các sự kiện của bạn' : ', toàn trường'}`}
                stationLabel={stationLabel}
                stationHref={(id) => {
                  const e = byId.get(id);
                  return e ? `/su-kien/${e.slug}` : '/kham-pha';
                }}
                onActivate={(id) => {
                  const e = byId.get(id);
                  if (e) navigate(`/su-kien/${e.slug}`);
                }}
                renderCard={(id) => {
                  const e = byId.get(id);
                  if (!e) return null;
                  const f = facts(e);
                  return (
                    <StationCard
                      event={e}
                      clubName={clubName(e.clubId)}
                      state={f.regState}
                      seatsLeft={f.seats}
                      deadlineDays={f.deadlineDays}
                      conflict={conflictIds.has(e.id)}
                      variant="compact"
                      linked={false}
                    />
                  );
                }}
                todayLabel={todayLabel}
                growFrom={growFrom}
                arrivals={growth?.arrivals}
                legend="none"
              />
            ) : null}
            <p className="container route-stage__hint">
              {wide
                ? 'Cuộn ngang để xem toàn bộ năm học. Di chuột hoặc sử dụng phím Tab để xem thông tin điểm dừng; phím mũi tên chuyển giữa các điểm dừng, phím Enter mở trang sự kiện.'
                : 'Chạm vào một điểm dừng để mở trang sự kiện. Dạng danh sách trình bày đầy đủ thông tin của từng sự kiện.'}
            </p>
            {wide ? (
              <div className="container">
                <RouteMapLegend lanes={LANES} variant="full" className="route-stage__legend" />
              </div>
            ) : null}
          </div>
        ) : (
          <div className="container route-stage__list">
            {rows.length > 0 ? <RouteList rows={rows} periods={PERIODS} now={now} headingLevel={3} /> : null}
          </div>
        )}
      </section>
    </div>
  );
}
