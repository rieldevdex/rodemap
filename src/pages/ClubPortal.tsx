import { useState } from 'react';
import { Button } from '../components/atoms/Button';
import { LineBadge } from '../components/atoms/LineBadge';
import { MonoTime } from '../components/atoms/MonoTime';
import { StatusTag } from '../components/atoms/StatusTag';
import { PageHead } from '../components/molecules/PageHead';
import { EventSubmissionForm } from '../components/organisms/EventSubmissionForm';
import { ACTION_LABELS, STATUS_LABELS } from '../content/moderation';
import { formatDate, formatDayLabel, formatTime, toIsoDateTime, toMillis } from '../domain/dates';
import { slugify, validateDraft } from '../domain/moderation';
import type { EventDraft, SchoolEvent, Submission } from '../domain/types';
import { CLUBS } from '../data/clubs';
import { TAGS } from '../data/tags';
import { newId } from '../state/effects';
import { selectSubmissionsForClub } from '../state/selectors';
import { useCatalog } from '../state/useCatalog';
import './ClubPortal.css';

function toDraft(e: SchoolEvent): EventDraft {
  return {
    title: e.title,
    clubId: e.clubId,
    category: e.category,
    format: e.format,
    start: e.start,
    end: e.end,
    location: e.location,
    eligibleGrades: e.eligibleGrades,
    capacity: e.capacity,
    registrationDeadline: e.registrationDeadline,
    summary: e.summary,
    description: e.description,
    tags: e.tags,
  };
}

export function ClubPortalPage() {
  const { state, dispatch, now } = useCatalog();
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState<{ submission: Submission; event: SchoolEvent } | null>(null);
  const club = CLUBS.find((c) => c.id === state.activeClubId) ?? CLUBS[0];
  const rows = club ? selectSubmissionsForClub(state, club.id) : [];

  if (state.role !== 'club' || !club) {
    return (
      <>
        <PageHead
          eyebrow="Dành cho câu lạc bộ"
          title="Cổng câu lạc bộ"
          lead="Cổng câu lạc bộ dành cho đại diện câu lạc bộ gửi sự kiện mới và theo dõi trạng thái kiểm duyệt."
        />
        <section className="band band--surface">
          <div className="container stack stack--md club-portal__gate">
            <p>
              Trong bản trình diễn, bạn có thể chuyển sang vai trò Câu lạc bộ để xem cổng gửi sự kiện. Vai trò được lưu trên trình
              duyệt này và có thể thay đổi tại mục Tài khoản minh họa.
            </p>
            <div className="cluster">
              <Button
                variant="primary"
                onClick={() => {
                  dispatch({ type: 'role/set', role: 'club' });
                }}
              >
                Chuyển sang vai trò Câu lạc bộ
              </Button>
              <Button to="/cau-lac-bo" variant="secondary">
                Xem danh bạ câu lạc bộ
              </Button>
            </div>
          </div>
        </section>
      </>
    );
  }

  const submitNew = (draft: EventDraft) => {
    const errors = validateDraft(draft, now);
    if (Object.keys(errors).length > 0) return errors;
    const id = newId('ev');
    const event: SchoolEvent = { ...draft, id, slug: `${slugify(draft.title)}-${id.slice(-4)}`, seatsTaken: 0, status: 'pending' };
    const at = toIsoDateTime(now);
    dispatch({
      type: 'submission/create',
      event,
      submission: { id: newId('sub'), eventId: id, clubId: club.id, submittedAt: at, history: [{ at, actor: 'club', action: 'submit' }] },
    });
    setStatus(`Đã gửi sự kiện “${draft.title}”. Sự kiện đang chờ Hội đồng Học sinh kiểm duyệt.`);
    return {};
  };

  const resubmit = (draft: EventDraft) => {
    if (!editing) return {};
    const errors = validateDraft(draft, now);
    if (Object.keys(errors).length > 0) return errors;
    dispatch({
      type: 'submission/resubmit',
      submissionId: editing.submission.id,
      event: { ...editing.event, ...draft, status: 'pending' },
      at: toIsoDateTime(now),
    });
    setStatus(`Đã gửi lại sự kiện “${draft.title}” để Hội đồng Học sinh kiểm duyệt.`);
    setEditing(null);
    return {};
  };

  const lastReason = (s: Submission) => [...s.history].reverse().find((h) => h.reason)?.reason;

  return (
    <>
      <PageHead
        eyebrow={
          <>
            Cổng câu lạc bộ · {club.shortName}
            {club.categories.map((c) => (
              <LineBadge key={c} code={c} size="sm" />
            ))}
          </>
        }
        title="Cổng câu lạc bộ"
        lead="Gửi sự kiện của câu lạc bộ để Hội đồng Học sinh kiểm duyệt. Sự kiện chỉ hiển thị với học sinh sau khi được phê duyệt."
      >
        <div className="club-portal__club">
          <label htmlFor="club-portal-select">Câu lạc bộ đang đại diện</label>
          <select
            id="club-portal-select"
            value={club.id}
            onChange={(e) => {
              dispatch({ type: 'club/setActive', clubId: e.target.value });
              setEditing(null);
            }}
          >
            {CLUBS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.shortName}
              </option>
            ))}
          </select>
        </div>
      </PageHead>

      <p className="visually-hidden" role="status">
        {status}
      </p>

      <section className="band band--surface" aria-labelledby="club-portal-form">
        <div className="container club-portal__layout">
          <div className="stack stack--md">
            <h2 id="club-portal-form" className="club-portal__title">
              {editing ? 'Chỉnh sửa và gửi lại sự kiện' : 'Gửi sự kiện mới'}
            </h2>
            {editing ? (
              <div className="club-portal__reason">
                <StatusTag tone="warn">Cần chỉnh sửa</StatusTag>
                <p>Ý kiến của Hội đồng Học sinh: {lastReason(editing.submission) ?? 'Không có ghi chú.'}</p>
              </div>
            ) : null}
            {status !== '' ? (
              <p className="club-portal__status">
                <StatusTag tone="ok">Đã gửi</StatusTag> {status}
              </p>
            ) : null}
            <EventSubmissionForm
              key={editing?.submission.id ?? 'new'}
              clubId={club.id}
              defaultCategory={club.categories[0] ?? 'KN'}
              tags={TAGS}
              initial={editing ? toDraft(editing.event) : undefined}
              submitLabel={editing ? 'Gửi lại sự kiện' : 'Gửi sự kiện'}
              onSubmit={editing ? resubmit : submitNew}
              onCancel={
                editing
                  ? () => {
                      setEditing(null);
                    }
                  : undefined
              }
            />
          </div>
          <aside className="club-portal__aside" aria-label="Hướng dẫn gửi sự kiện">
            <h3>Quy trình kiểm duyệt</h3>
            <ol>
              <li>Câu lạc bộ gửi sự kiện với đầy đủ thông tin.</li>
              <li>Hội đồng Học sinh phê duyệt, yêu cầu chỉnh sửa hoặc từ chối kèm lý do.</li>
              <li>Sự kiện được phê duyệt sẽ hiển thị trên Khám phá sự kiện và Lộ trình.</li>
            </ol>
          </aside>
        </div>
      </section>

      <section className="band" aria-labelledby="club-portal-list">
        <div className="container stack stack--md">
          <h2 id="club-portal-list" className="club-portal__title">
            Sự kiện đã gửi
          </h2>
          {rows.length === 0 ? (
            <p className="club-portal__muted">Câu lạc bộ chưa gửi sự kiện nào qua cổng. Sự kiện đã gửi sẽ được liệt kê tại đây cùng trạng thái kiểm duyệt.</p>
          ) : (
            <div className="club-portal__table-wrap">
              <table className="club-portal__table">
                <caption className="visually-hidden">Sự kiện câu lạc bộ đã gửi và trạng thái kiểm duyệt</caption>
                <thead>
                  <tr>
                    <th scope="col">Sự kiện</th>
                    <th scope="col">Thời gian</th>
                    <th scope="col">Ngày gửi</th>
                    <th scope="col">Trạng thái</th>
                    <th scope="col">Ghi chú</th>
                    <th scope="col">
                      <span className="visually-hidden">Thao tác</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ submission, event, status: st }) => {
                    const label = STATUS_LABELS[st];
                    const last = submission.history.at(-1);
                    return (
                      <tr key={submission.id}>
                        <td>
                          <span className="club-portal__event">
                            <LineBadge code={event.category} size="sm" />
                            {event.title}
                          </span>
                        </td>
                        <td>
                          <MonoTime dateTime={event.start}>
                            {formatDayLabel(toMillis(event.start))} · {formatTime(toMillis(event.start))}
                          </MonoTime>
                        </td>
                        <td>
                          <MonoTime dateTime={submission.submittedAt}>{formatDate(toMillis(submission.submittedAt))}</MonoTime>
                        </td>
                        <td>
                          <StatusTag tone={label.tone}>{label.label}</StatusTag>
                        </td>
                        <td className="club-portal__note">
                          {last ? ACTION_LABELS[last.action] : ''}
                          {lastReason(submission) && st !== 'pending' && st !== 'approved' ? `: ${lastReason(submission) ?? ''}` : ''}
                        </td>
                        <td>
                          {st === 'changes_requested' ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setEditing({ submission, event });
                                setStatus('');
                                window.scrollTo({ top: 0 });
                              }}
                            >
                              Chỉnh sửa và gửi lại
                            </Button>
                          ) : null}
                          {st === 'approved' ? (
                            <Button size="sm" variant="quiet" to={`/su-kien/${event.slug}`}>
                              Xem sự kiện
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
