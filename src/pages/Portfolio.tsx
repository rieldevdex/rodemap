import { Button } from '../components/atoms/Button';
import { DemoLabel } from '../components/atoms/DemoLabel';
import { LineBadge } from '../components/atoms/LineBadge';
import { MonoTime } from '../components/atoms/MonoTime';
import { PageHead } from '../components/molecules/PageHead';
import { PortfolioEntryCard } from '../components/organisms/PortfolioEntryCard';
import { RouteSummary } from '../components/organisms/RouteSummary';
import { CATEGORY_LABELS } from '../domain/category-labels';
import { formatDate, formatDayLabel, toIsoDateTime, toMillis } from '../domain/dates';
import { entryFromEvent, groupByCategory, hoursByCategory, portfolioJson, totalHours } from '../domain/portfolio';
import { formatHours } from '../domain/text';
import type { PortfolioEntry } from '../domain/types';
import { CLUBS } from '../data/clubs';
import { SCHOOL } from '../data/school';
import { downloadFile, newId, printPage } from '../state/effects';
import { requestMochi } from '../state/mochiBridge';
import { selectAllEvents, selectPendingAttendance } from '../state/selectors';
import { useCatalog } from '../state/useCatalog';
import './Portfolio.css';

export function PortfolioPage() {
  const { state, dispatch, now, eventById, clubName } = useCatalog();
  const entries = state.portfolio;
  const groups = groupByCategory(entries);
  const hours = hoursByCategory(entries);
  const total = totalHours(entries);
  const pending = selectPendingAttendance(state, now);
  const profile = state.profile;

  const exportJson = () => {
    const data = portfolioJson(entries, selectAllEvents(state), CLUBS, profile, now);
    downloadFile(`rodemap-ho-so-nang-luc-${formatDate(now).split('/').reverse().join('-')}.json`, JSON.stringify(data, null, 2), 'application/json');
  };

  const save = (entry: PortfolioEntry, patch: Pick<PortfolioEntry, 'role' | 'hours' | 'reflection' | 'evidenceLinks'>) => {
    // A Mochi draft becomes the student's own text once the student changes it.
    const edited = patch.reflection !== entry.reflection;
    const source = entry.reflectionSource === 'mochi_draft' && !edited ? 'mochi_draft' : 'student';
    dispatch({
      type: 'portfolio/upsert',
      entry: { ...entry, ...patch, reflectionSource: patch.reflection === '' ? 'student' : source, updatedAt: toIsoDateTime(now) },
    });
  };

  return (
    <div className="portfolio">
      <PageHead
        eyebrow={`Hồ sơ năng lực · Năm học ${SCHOOL.schoolYear}`}
        title="Hồ sơ năng lực"
        lead="Tổng hợp hoạt động bạn đã tham gia theo lĩnh vực, kèm vai trò, số giờ, phần tự đánh giá và minh chứng."
      >
        <div className="cluster portfolio__head-actions no-print">
          <Button variant="primary" iconStart="print" onClick={printPage} disabled={entries.length === 0}>
            In hồ sơ (khổ A4)
          </Button>
          <Button variant="secondary" iconStart="download" onClick={exportJson} disabled={entries.length === 0}>
            Xuất tệp JSON
          </Button>
        </div>
        <DemoLabel className="no-print" />
      </PageHead>

      {/* Print-only document header (the A4 sheet). */}
      <section className="portfolio__sheet-head print-only" aria-hidden="true">
        <p className="portfolio__sheet-kicker">Rodemap · Hồ sơ năng lực · {SCHOOL.name}</p>
        <h2 className="portfolio__sheet-title">Hồ sơ năng lực năm học {SCHOOL.schoolYear}</h2>
        <dl className="portfolio__sheet-facts">
          <div>
            <dt>Họ và tên</dt>
            <dd className="portfolio__blank" />
          </div>
          <div>
            <dt>Lớp</dt>
            <dd>{profile?.className ?? ''}</dd>
          </div>
          <div>
            <dt>Ngày xuất</dt>
            <dd>{formatDate(now)}</dd>
          </div>
        </dl>
        <p className="portfolio__sheet-note">Bản trình diễn · Dữ liệu minh họa. Các phần đánh dấu “Bản nháp do Mochi đề xuất” chưa được học sinh xác nhận.</p>
      </section>

      <section className="band band--surface portfolio__summary-band" aria-labelledby="portfolio-summary">
        <div className="container portfolio__summary">
          <div className="stack stack--sm">
            <h2 id="portfolio-summary" className="portfolio__section-title">
              Tóm tắt lộ trình
            </h2>
            <p className="portfolio__lead">
              <span className="mono">{entries.length}</span> hoạt động · <span className="mono">{formatHours(total)}</span> giờ ·{' '}
              <span className="mono">{groups.length}</span> lĩnh vực
            </p>
          </div>
          <RouteSummary hours={hours} total={total} />
        </div>
      </section>

      {pending.length > 0 ? (
        <section className="band no-print" aria-labelledby="portfolio-pending">
          <div className="container stack stack--md">
            <h2 id="portfolio-pending" className="portfolio__section-title">
              Sự kiện cần xác nhận tham gia
            </h2>
            <p className="portfolio__muted">Các sự kiện đã diễn ra trong lịch của bạn. Sau khi xác nhận, sự kiện được bổ sung vào hồ sơ năng lực.</p>
            <ul className="portfolio__pending">
              {pending.map((e) => {
                const start = toMillis(e.start);
                return (
                  <li key={e.id} className="portfolio__pending-item">
                    <div className="portfolio__pending-text">
                      <LineBadge code={e.category} size="sm" />
                      <MonoTime dateTime={e.start}>{formatDayLabel(start)}</MonoTime>
                      <span className="portfolio__pending-title">{e.title}</span>
                    </div>
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
                );
              })}
            </ul>
          </div>
        </section>
      ) : null}

      {entries.length === 0 ? (
        <section className="band" aria-labelledby="portfolio-empty">
          <div className="container stack stack--md portfolio__empty">
            <h2 id="portfolio-empty" className="portfolio__section-title">
              Hồ sơ năng lực chưa có hoạt động
            </h2>
            <p className="portfolio__muted">
              Sau khi tham gia sự kiện và xác nhận tham gia, hoạt động sẽ được tổng hợp tại đây theo từng lĩnh vực. Bạn có thể bắt
              đầu bằng việc khám phá sự kiện phù hợp.
            </p>
            <div className="cluster">
              <Button to="/kham-pha" variant="primary">
                Khám phá sự kiện
              </Button>
              <Button to="/lich" variant="secondary">
                Xem lịch của tôi
              </Button>
            </div>
          </div>
        </section>
      ) : (
        groups.map((g) => (
          <section key={g.category} className="band portfolio__group" aria-labelledby={`portfolio-${g.category}`}>
            <div className="container stack stack--md">
              <h2 id={`portfolio-${g.category}`} className="portfolio__group-title">
                <LineBadge code={g.category} />
                <span>{CATEGORY_LABELS[g.category]}</span>
                <span className="portfolio__group-hours mono">{formatHours(g.hours)} giờ</span>
              </h2>
              <div className="portfolio__entries">
                {g.entries.map((entry) => {
                  const event = eventById(entry.eventId);
                  const start = event ? toMillis(event.start) : null;
                  return (
                    <PortfolioEntryCard
                      key={entry.id}
                      entry={entry}
                      eventTitle={event?.title ?? entry.eventId}
                      eventHref={event ? `/su-kien/${event.slug}` : null}
                      clubName={event ? clubName(event.clubId) : ''}
                      dateLabel={start === null ? '' : formatDate(start)}
                      dateTime={event?.start ?? ''}
                      onSave={(patch) => {
                        save(entry, patch);
                      }}
                      onRemove={() => {
                        dispatch({ type: 'portfolio/remove', id: entry.id });
                      }}
                      onAskMochi={() => {
                        requestMochi({ kind: 'prompt', text: `Mochi đề xuất bản nháp phần tự đánh giá cho sự kiện “${event?.title ?? entry.eventId}”.` });
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </section>
        ))
      )}
    </div>
  );
}
