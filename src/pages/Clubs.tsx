import { useState } from 'react';
import { LineBadge } from '../components/atoms/LineBadge';
import { MonoTime } from '../components/atoms/MonoTime';
import { PageHead } from '../components/molecules/PageHead';
import { CATEGORY_LABELS } from '../domain/category-labels';
import { formatDayLabel, toMillis } from '../domain/dates';
import { isPast } from '../domain/events';
import { CATEGORY_CODES, type CategoryCode } from '../domain/types';
import { CLUBS } from '../data/clubs';
import { Link } from '../router';
import { selectEventsForClub } from '../state/selectors';
import { useCatalog } from '../state/useCatalog';
import './Clubs.css';

export function ClubsPage() {
  const { state, now } = useCatalog();
  const [filter, setFilter] = useState<CategoryCode | null>(null);
  const clubs = CLUBS.filter((c) => filter === null || c.categories.includes(filter));

  return (
    <>
      <PageHead
        eyebrow={`Danh bạ · ${CLUBS.length} câu lạc bộ`}
        title="Câu lạc bộ"
        lead="Các câu lạc bộ và Hội đồng Học sinh cùng lĩnh vực hoạt động, kèm các sự kiện sắp diễn ra trên Rodemap."
      />
      <section className="band band--surface" aria-labelledby="clubs-list">
        <div className="container stack stack--md">
          <h2 id="clubs-list" className="visually-hidden">
            Danh sách câu lạc bộ
          </h2>
          <div className="clubs__filters" role="group" aria-label="Lọc theo lĩnh vực">
            <button type="button" className="clubs__filter" aria-pressed={filter === null} onClick={() => { setFilter(null); }}>
              Tất cả lĩnh vực
            </button>
            {CATEGORY_CODES.map((code) => (
              <button
                key={code}
                type="button"
                className="clubs__filter"
                aria-pressed={filter === code}
                style={{ '--line': `var(--line-${code.toLowerCase()})` } as Record<string, string>}
                onClick={() => {
                  setFilter(filter === code ? null : code);
                }}
              >
                <span className="clubs__filter-code">{code}</span>
                {CATEGORY_LABELS[code]}
              </button>
            ))}
          </div>
          <p className="clubs__count" role="status">
            <span className="mono">{clubs.length}</span> câu lạc bộ{filter ? ` thuộc lĩnh vực ${CATEGORY_LABELS[filter]}` : ''}
          </p>
          <ul className="clubs__list">
            {clubs.map((club) => {
              const upcoming = selectEventsForClub(state, club.id).filter((e) => !isPast(e, now));
              const next = upcoming[0];
              const first = club.categories[0] ?? 'TS';
              return (
                <li key={club.id} className="clubs__item" style={{ '--line': `var(--line-${first.toLowerCase()})` } as Record<string, string>}>
                  <div className="clubs__lines">
                    {club.categories.map((c) => (
                      <LineBadge key={c} code={c} showName size="sm" />
                    ))}
                  </div>
                  <h3 className="clubs__name">
                    <Link className="clubs__link" to={`/cau-lac-bo/${club.slug}`}>
                      {club.shortName}
                    </Link>
                  </h3>
                  <p className="clubs__full">{club.name}</p>
                  <p className="clubs__desc">{club.description}</p>
                  <p className="clubs__meta">
                    <span>
                      <span className="mono">{upcoming.length}</span> sự kiện sắp diễn ra
                    </span>
                    {next ? (
                      <span>
                        Gần nhất: <MonoTime dateTime={next.start}>{formatDayLabel(toMillis(next.start))}</MonoTime>
                      </span>
                    ) : null}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </>
  );
}
