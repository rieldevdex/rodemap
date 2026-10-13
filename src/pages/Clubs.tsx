import { useState } from 'react';
import { LineBadge } from '../components/atoms/LineBadge';
import { MonoTime } from '../components/atoms/MonoTime';
import { PageHead } from '../components/molecules/PageHead';
import { CATEGORY_LABELS } from '../domain/category-labels';
import { CLUB_KIND_LABELS, isStudentClub } from '../domain/clubs';
import { formatDayLabel, toMillis } from '../domain/dates';
import { isPast } from '../domain/events';
import { CATEGORY_CODES, type CategoryCode, type Club } from '../domain/types';
import { CLUBS } from '../data/clubs';
import { Link } from '../router';
import { selectEventsForClub } from '../state/selectors';
import { useCatalog } from '../state/useCatalog';
import './Clubs.css';

/** "13 câu lạc bộ và 2 đơn vị": student clubs, then the council and the offices. */
function countLabel(list: readonly Club[]): string {
  const clubs = list.filter(isStudentClub).length;
  const units = list.length - clubs;
  return units === 0 ? `${String(clubs)} câu lạc bộ` : `${String(clubs)} câu lạc bộ và ${String(units)} đơn vị`;
}

export function ClubsPage() {
  const { state, now } = useCatalog();
  const [filter, setFilter] = useState<CategoryCode | null>(null);
  const clubs = CLUBS.filter((c) => filter === null || c.categories.includes(filter));
  const clubCount = clubs.filter(isStudentClub).length;
  const unitCount = clubs.length - clubCount;

  return (
    <>
      <PageHead
        eyebrow={`Danh sách · ${countLabel(CLUBS)}`}
        title="Câu lạc bộ"
        lead="Các câu lạc bộ, Hội đồng Học sinh và Phòng Cố vấn Học tập, kèm lĩnh vực hoạt động và các sự kiện sắp diễn ra trên Rodemap. Phòng Cố vấn Học tập cập nhật thông tin các cuộc thi học thuật ngoài trường."
      >
        <p className="clubs__ideas">
          Chưa có hoạt động bạn mong muốn? <Link to="/de-xuat">Gửi đề xuất hoạt động tới Hội đồng Học sinh</Link>
        </p>
      </PageHead>
      <section className="band band--surface" aria-labelledby="clubs-list">
        <div className="container stack stack--md">
          <h2 id="clubs-list" className="visually-hidden">
            Danh sách câu lạc bộ và đơn vị
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
            <span className="mono">{clubCount}</span> câu lạc bộ
            {unitCount > 0 ? (
              <>
                {' '}
                và <span className="mono">{unitCount}</span> đơn vị
              </>
            ) : null}
            {filter ? ` thuộc lĩnh vực ${CATEGORY_LABELS[filter]}` : ''}
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
                  <p className="clubs__full">{club.name === club.shortName ? CLUB_KIND_LABELS[club.kind] : club.name}</p>
                  <p className="clubs__desc">{club.description}</p>
                  <p className="clubs__meta">
                    <span>
                      <span className="mono">{upcoming.length}</span> {club.kind === 'office' ? 'cuộc thi' : 'sự kiện'} sắp diễn ra
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
