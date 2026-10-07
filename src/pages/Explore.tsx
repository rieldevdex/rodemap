import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../components/atoms/Button';
import { Icon } from '../components/atoms/Icon';
import { lineVar } from '../components/atoms/lineVar';
import { VisuallyHidden } from '../components/atoms/VisuallyHidden';
import { PageHead } from '../components/molecules/PageHead';
import { SearchField } from '../components/molecules/SearchField';
import { StationCard } from '../components/molecules/StationCard';
import { FilterRail, type FilterRailOptions } from '../components/organisms/FilterRail';
import { FilterSheet } from '../components/organisms/FilterSheet';
import { useMediaQuery } from '../components/useMediaQuery';
import { CATEGORIES, categoryByCode } from '../data/categories';
import { CLUBS } from '../data/clubs';
import { SCHOOL } from '../data/school';
import { findConflicts } from '../domain/conflicts';
import { deadlineDaysLeft, registrationState, seatsLeft } from '../domain/events';
import { countActiveFilters, filterEvents, type FilterContext } from '../domain/filters';
import { GRADES, type SchoolEvent } from '../domain/types';
import { pathFor } from '../router';
import { selectUpcomingMine } from '../state/selectors';
import { useCatalog } from '../state/useCatalog';
import { EventRegistration } from './connected/EventRegistration';
import {
  activeFilters,
  DEADLINE_CHOICES,
  DEFAULT_EXPLORE_FILTER,
  FORMAT_CHOICES,
  QUERY_MAX_LENGTH,
  WINDOW_CHOICES,
  type ExploreFilterState,
  type ExploreView,
} from './connected/exploreQuery';
import { facetCounts, groupByMonth, type FacetCounts } from './connected/exploreResults';
import { EXPLORE_CLUB_IDS, useExploreFilters } from './connected/useExploreFilters';
import './Explore.css';

/** Facet counts → the option lists of the filter rail (labels from the sample data). */
function railOptions(counts: FacetCounts): FilterRailOptions {
  return {
    categories: CATEGORIES.map((c) => ({ value: c.code, label: c.name, count: counts.categories[c.code] })),
    clubs: CLUBS.map((c) => ({ value: c.id, label: c.shortName, count: counts.clubs[c.id] ?? 0 })),
    grades: GRADES.map((g) => ({ value: g, label: `Khối ${g}`, count: counts.grades[g] })),
    windows: WINDOW_CHOICES.map((c) => ({ value: c.value, label: c.label, count: counts.windows[c.value] })),
    formats: FORMAT_CHOICES.map((c) => ({ value: c.value, label: c.label, count: counts.formats[c.value] })),
    deadlines: DEADLINE_CHOICES.map((c) => ({ value: c.value, label: c.label, count: counts.deadlines[c.value] })),
  };
}

/** Four squares: the "Dạng lưới" glyph (the shared icon set has no grid icon). */
function GridGlyph() {
  return (
    <svg className="explore-view__glyph" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path d="M3.5 3.5h5v5h-5z" />
      <path d="M11.5 3.5h5v5h-5z" />
      <path d="M3.5 11.5h5v5h-5z" />
      <path d="M11.5 11.5h5v5h-5z" />
    </svg>
  );
}

/** A route that stops at an open station: the empty-state mark. */
function OpenRoute() {
  return (
    <svg className="explore-empty__route" viewBox="0 0 160 24" aria-hidden="true" focusable="false">
      <path className="explore-empty__line" d="M2 12H100" />
      <path className="explore-empty__gap" d="M124 12H158" strokeDasharray="4 6" />
      <circle className="explore-empty__station" cx="112" cy="12" r="7" />
    </svg>
  );
}

const VIEW_LABELS: Record<ExploreView, { full: string; short: string }> = {
  grid: { full: 'Dạng lưới', short: 'Lưới' },
  list: { full: 'Dạng danh sách', short: 'Danh sách' },
};

export function ExplorePage() {
  const { state, now, publicEvents, clubName } = useCatalog();
  const explore = useExploreFilters();
  const { filter, view, focusSearch, clearFocusRequest, apply, reset } = explore;
  const isDesktop = useMediaQuery('(min-width: 1080px)', true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState<ExploreFilterState>(filter);
  if (isDesktop && sheetOpen) setSheetOpen(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const countRef = useRef<HTMLParagraphElement>(null);
  const chipListRef = useRef<HTMLUListElement>(null);
  /** After removing a chip: index of the chip to focus next (-1 = the result count). */
  const pendingChipFocus = useRef<number | null>(null);

  const ctx = useMemo<FilterContext>(() => ({ now, regs: state.registrations, clubs: CLUBS }), [now, state.registrations]);
  const results = useMemo(() => filterEvents(publicEvents, filter, ctx), [publicEvents, filter, ctx]);
  const withPast = useMemo(
    () => (filter.includePast ? results.length : filterEvents(publicEvents, { ...filter, includePast: true }, ctx).length),
    [publicEvents, filter, ctx, results],
  );
  const hiddenPast = withPast - results.length;
  const groups = useMemo(() => groupByMonth(results), [results]);
  const myUpcoming = useMemo(() => selectUpcomingMine(state, now), [state, now]);
  const options = useMemo(
    () => (isDesktop ? railOptions(facetCounts(publicEvents, filter, ctx, EXPLORE_CLUB_IDS)) : null),
    [isDesktop, publicEvents, filter, ctx],
  );
  const draftCounts = useMemo(
    () => (sheetOpen ? facetCounts(publicEvents, draft, ctx, EXPLORE_CLUB_IDS) : null),
    [sheetOpen, publicEvents, draft, ctx],
  );

  const chips = activeFilters(filter, { categoryName: (code) => categoryByCode(code).name, clubName });
  const railActive = countActiveFilters({ ...filter, query: '' });
  const anyActive = chips.length > 0;

  // ?tim=1 (Ctrl K / ⌘K, header search): focus the field after the router has placed focus
  // on the page heading, then drop the flag from the URL.
  useEffect(() => {
    if (!focusSearch) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const input = searchRef.current;
      if (input) {
        input.focus();
        input.select();
      }
      clearFocusRequest();
    });
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [focusSearch, clearFocusRequest]);

  // Keep keyboard focus in place when a removable chip (or "Xóa bộ lọc") disappears.
  useEffect(() => {
    const index = pendingChipFocus.current;
    if (index === null) return;
    pendingChipFocus.current = null;
    const buttons = chipListRef.current?.querySelectorAll<HTMLButtonElement>('.explore-active__chip');
    const target = index >= 0 && buttons && buttons.length > 0 ? buttons[Math.min(index, buttons.length - 1)] : undefined;
    (target ?? countRef.current)?.focus();
  });

  const openSheet = () => {
    setDraft(filter);
    setSheetOpen(true);
  };
  const closeSheet = useCallback(() => {
    setSheetOpen(false);
  }, []);
  const applySheet = () => {
    apply({ ...draft, query: filter.query });
    setSheetOpen(false);
  };
  const resetAll = () => {
    pendingChipFocus.current = -1;
    reset();
  };

  const renderCard = (event: SchoolEvent) => {
    const regState = registrationState(event, state.registrations, now);
    const canAct = regState === 'open' || regState === 'registered';
    return (
      <StationCard
        event={event}
        clubName={clubName(event.clubId)}
        state={regState}
        seatsLeft={seatsLeft(event, state.registrations)}
        deadlineDays={deadlineDaysLeft(event, now)}
        conflict={findConflicts(event, myUpcoming).length > 0}
        variant={view === 'grid' ? 'full' : 'compact'}
        actions={
          <>
            {canAct ? <EventRegistration eventId={event.id} size="sm" /> : null}
            <Button to={pathFor('event', { slug: event.slug })} variant="quiet" size="sm" iconEnd="arrow-right">
              Xem chi tiết<VisuallyHidden> sự kiện {event.title}</VisuallyHidden>
            </Button>
          </>
        }
      />
    );
  };

  return (
    <>
      <PageHead
        eyebrow={
          <>
            <span>Sự kiện đã phê duyệt</span>
            <span aria-hidden="true">·</span>
            <span>Năm học {SCHOOL.schoolYear}</span>
          </>
        }
        title="Khám phá sự kiện"
        lead="Tra cứu sự kiện đã được Hội đồng Học sinh phê duyệt theo lĩnh vực, câu lạc bộ, khối, thời gian, hình thức và hạn đăng ký."
      >
        <SearchField
          ref={searchRef}
          className="explore-search"
          size="lg"
          label="Tìm kiếm sự kiện"
          placeholder="Tên sự kiện, câu lạc bộ, địa điểm"
          hint="Tìm kiếm không phân biệt chữ hoa, chữ thường và dấu tiếng Việt, ví dụ: tranh bien."
          shortcut="Ctrl K"
          maxLength={QUERY_MAX_LENGTH}
          value={filter.query}
          onChange={explore.setQuery}
        />
      </PageHead>

      <div className="explore">
        <div className="container explore__layout">
          {isDesktop && options ? (
            <FilterRail
              value={filter}
              options={options}
              onChange={apply}
              headExtra={
                railActive > 0 ? (
                  <span className="explore__rail-active">
                    <span className="mono">{railActive}</span> đang áp dụng
                  </span>
                ) : null
              }
            />
          ) : null}

          <section className="explore__results" aria-label="Kết quả tìm kiếm">
            <div className="explore-toolbar">
              {isDesktop ? null : (
                <Button
                  className="explore-toolbar__filters"
                  variant="secondary"
                  size="sm"
                  iconStart="filter"
                  aria-haspopup="dialog"
                  aria-expanded={sheetOpen}
                  onClick={openSheet}
                >
                  Bộ lọc
                  {railActive > 0 ? (
                    <span className="explore-toolbar__badge">
                      <VisuallyHidden>, số bộ lọc đang áp dụng: </VisuallyHidden>
                      {railActive}
                    </span>
                  ) : null}
                </Button>
              )}
              <p ref={countRef} className="explore-toolbar__count" tabIndex={-1} aria-live="polite" aria-atomic="true">
                <span className="explore-toolbar__number">{results.length}</span> sự kiện
                <span className="explore-toolbar__order"> · theo thời gian diễn ra</span>
              </p>
              <div className="explore-view" role="group" aria-label="Cách hiển thị kết quả">
                {(['grid', 'list'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    className="explore-view__option"
                    aria-pressed={view === v}
                    onClick={() => {
                      explore.setView(v);
                    }}
                  >
                    {v === 'grid' ? <GridGlyph /> : <Icon name="list" size="sm" />}
                    <span className="explore-view__full">{VIEW_LABELS[v].full}</span>
                    <span className="explore-view__short" aria-hidden="true">
                      {VIEW_LABELS[v].short}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {anyActive ? (
              <div className="explore-active">
                <ul ref={chipListRef} className="explore-active__list" aria-label="Bộ lọc đang áp dụng">
                  {chips.map((chip, index) => (
                    <li key={chip.id}>
                      <button
                        type="button"
                        className="explore-active__chip"
                        data-edge={chip.code !== undefined}
                        style={chip.code ? ({ '--chip-line': lineVar(chip.code) } as Record<string, string>) : undefined}
                        onClick={() => {
                          pendingChipFocus.current = index;
                          apply(chip.without);
                        }}
                      >
                        <VisuallyHidden>Bỏ lọc </VisuallyHidden>
                        {chip.code ? <span className="explore-active__code">{chip.code}</span> : null}
                        <span>{chip.label}</span>
                        <Icon name="x" size="sm" />
                      </button>
                    </li>
                  ))}
                </ul>
                <Button variant="quiet" size="sm" onClick={resetAll}>
                  Xóa bộ lọc
                </Button>
              </div>
            ) : null}

            {results.length === 0 ? (
              <div className="explore-empty">
                <OpenRoute />
                <h2 className="explore-empty__title">
                  {anyActive ? 'Không có sự kiện phù hợp' : 'Chưa có sự kiện sắp diễn ra'}
                </h2>
                <p className="explore-empty__body">
                  {anyActive
                    ? 'Chưa có sự kiện nào đáp ứng đồng thời từ khóa và các bộ lọc đang áp dụng. Vui lòng xóa bớt bộ lọc, sử dụng từ khóa khác hoặc xem toàn bộ sự kiện của năm học trên Lộ trình.'
                    : 'Các sự kiện đã phê duyệt sẽ được hiển thị tại đây. Vui lòng xem toàn bộ năm học trên Lộ trình hoặc quay lại sau khi các câu lạc bộ công bố sự kiện mới.'}
                </p>
                {hiddenPast > 0 ? (
                  <p className="explore-empty__body">
                    Có <span className="mono">{hiddenPast}</span> sự kiện đã diễn ra phù hợp với điều kiện tìm kiếm.
                  </p>
                ) : null}
                <div className="cluster">
                  {anyActive ? (
                    <Button variant="primary" onClick={resetAll}>
                      Xóa bộ lọc
                    </Button>
                  ) : null}
                  {hiddenPast > 0 ? (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        apply({ ...filter, includePast: true });
                      }}
                    >
                      Hiển thị sự kiện đã diễn ra
                    </Button>
                  ) : null}
                  <Button to={pathFor('route')} variant={anyActive || hiddenPast > 0 ? 'quiet' : 'primary'} iconEnd="arrow-right">
                    Xem Lộ trình
                  </Button>
                </div>
              </div>
            ) : (
              <div className="explore-months">
                {groups.map((group) => (
                  <section key={group.key} className="explore-month" aria-labelledby={`explore-month-${group.key}`}>
                    <div className="explore-month__head">
                      <h2 id={`explore-month-${group.key}`} className="explore-month__title">
                        {group.label}
                      </h2>
                      <p className="explore-month__count">
                        <span className="mono">{group.events.length}</span> sự kiện
                      </p>
                    </div>
                    <ol className={view === 'grid' ? 'explore-grid' : 'explore-list'}>
                      {group.events.map((event) => (
                        <li key={event.id} className={view === 'grid' ? 'explore-grid__item' : 'explore-list__item'}>
                          {renderCard(event)}
                        </li>
                      ))}
                    </ol>
                  </section>
                ))}
                <div className="explore-end">
                  <span className="explore-end__terminus" aria-hidden="true" />
                  <div className="explore-end__text">
                    <p>
                      Đã hiển thị toàn bộ <span className="mono">{results.length}</span> sự kiện phù hợp.
                    </p>
                    {hiddenPast > 0 ? (
                      <p className="explore-end__note">
                        <span className="mono">{hiddenPast}</span> sự kiện đã diễn ra đang được ẩn.{' '}
                        <Button
                          variant="quiet"
                          size="sm"
                          className="explore-end__action"
                          onClick={() => {
                            apply({ ...filter, includePast: true });
                          }}
                        >
                          Hiển thị sự kiện đã diễn ra
                        </Button>
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {isDesktop ? null : (
        <FilterSheet
          open={sheetOpen}
          title="Bộ lọc"
          onClose={closeSheet}
          status={
            draftCounts ? (
              <>
                <span className="mono">{draftCounts.windows[draft.window]}</span> sự kiện phù hợp với bộ lọc đã chọn
              </>
            ) : undefined
          }
          actions={
            <>
              <Button
                variant="secondary"
                block
                onClick={() => {
                  setDraft({ ...DEFAULT_EXPLORE_FILTER, query: filter.query });
                }}
              >
                Xóa bộ lọc
              </Button>
              <Button variant="primary" block onClick={applySheet}>
                Áp dụng
              </Button>
            </>
          }
        >
          {draftCounts ? <FilterRail value={draft} options={railOptions(draftCounts)} onChange={setDraft} variant="sheet" /> : null}
        </FilterSheet>
      )}
    </>
  );
}
