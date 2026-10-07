import { useId, useState } from 'react';
import { Button } from '../components/atoms/Button';
import { LineBadge } from '../components/atoms/LineBadge';
import { MonoTime } from '../components/atoms/MonoTime';
import { StatusTag } from '../components/atoms/StatusTag';
import { ConfirmDialog } from '../components/molecules/ConfirmDialog';
import { PageHead } from '../components/molecules/PageHead';
import { ACTION_LABELS, STATUS_LABELS } from '../content/moderation';
import { formatDate, formatLongDate, formatTime, formatTimeRange, toIsoDateTime, toMillis } from '../domain/dates';
import type { ModerationDecision } from '../state/actions';
import { selectAllEvents, selectModerationQueue } from '../state/selectors';
import { useCatalog } from '../state/useCatalog';
import './Moderation.css';

const DECISION_TITLES: Record<ModerationDecision, string> = {
  approve: 'Phê duyệt sự kiện',
  request_changes: 'Yêu cầu chỉnh sửa',
  reject: 'Từ chối sự kiện',
};

export function ModerationPage() {
  const { state, dispatch, now, clubName } = useCatalog();
  const reasonId = useId();
  const [decision, setDecision] = useState<{ submissionId: string; title: string; action: ModerationDecision } | null>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [status, setStatus] = useState('');
  const queue = selectModerationQueue(state);
  const allEvents = selectAllEvents(state);
  const reviewed = state.submissions
    .map((s) => ({ s, event: allEvents.find((e) => e.id === s.eventId) }))
    .filter((r) => r.event && r.event.status !== 'pending')
    .sort((a, b) => toMillis(b.s.history.at(-1)?.at ?? b.s.submittedAt) - toMillis(a.s.history.at(-1)?.at ?? a.s.submittedAt));

  if (state.role !== 'moderator') {
    return (
      <>
        <PageHead
          eyebrow="Dành cho Hội đồng Học sinh"
          title="Kiểm duyệt"
          lead="Hội đồng Học sinh xem xét sự kiện do câu lạc bộ gửi và phê duyệt, yêu cầu chỉnh sửa hoặc từ chối kèm lý do."
        />
        <section className="band band--surface">
          <div className="container">
            <div className="stack stack--md moderation__gate">
              <p>
                Trong bản trình diễn, bạn có thể chuyển sang vai trò HĐHS để xem hàng chờ kiểm duyệt. Vai trò có thể thay đổi tại mục
                Tài khoản minh họa.
              </p>
              <div className="cluster">
                <Button
                  variant="primary"
                  onClick={() => {
                    dispatch({ type: 'role/set', role: 'moderator' });
                  }}
                >
                  Chuyển sang vai trò HĐHS
                </Button>
              </div>
            </div>
          </div>
        </section>
      </>
    );
  }

  const close = () => {
    setDecision(null);
    setReason('');
    setReasonError('');
  };

  const confirm = () => {
    if (!decision) return;
    if (decision.action !== 'approve' && reason.trim() === '') {
      setReasonError('Vui lòng nhập lý do để câu lạc bộ có cơ sở điều chỉnh.');
      return;
    }
    dispatch({
      type: 'moderation/review',
      submissionId: decision.submissionId,
      action: decision.action,
      ...(decision.action === 'approve' ? {} : { reason: reason.trim() }),
      at: toIsoDateTime(now),
    });
    const verb = decision.action === 'approve' ? 'Đã phê duyệt' : decision.action === 'reject' ? 'Đã từ chối' : 'Đã yêu cầu chỉnh sửa';
    setStatus(`${verb} sự kiện “${decision.title}”.`);
    close();
  };

  return (
    <>
      <PageHead
        eyebrow="Dành cho Hội đồng Học sinh"
        title="Kiểm duyệt"
        lead="Chỉ sự kiện đã được phê duyệt mới hiển thị với học sinh. Yêu cầu chỉnh sửa và từ chối cần kèm lý do cụ thể."
      >
        <p className="moderation__count">
          <span className="mono">{queue.length}</span> sự kiện đang chờ duyệt
        </p>
      </PageHead>

      <p className="visually-hidden" role="status">
        {status}
      </p>

      <section className="band band--surface" aria-labelledby="moderation-queue">
        <div className="container stack stack--md">
          <h2 id="moderation-queue" className="moderation__title">
            Hàng chờ kiểm duyệt
          </h2>
          {status !== '' ? (
            <p className="moderation__status">
              <StatusTag tone="ok">Đã xử lý</StatusTag> {status}
            </p>
          ) : null}
          {queue.length === 0 ? (
            <p className="moderation__muted">Không có sự kiện nào đang chờ duyệt. Sự kiện mới do câu lạc bộ gửi sẽ xuất hiện tại đây.</p>
          ) : (
            <ol className="moderation__queue">
              {queue.map(({ submission, event, club }) => {
                const start = toMillis(event.start);
                const deadline = toMillis(event.registrationDeadline);
                return (
                  <li key={submission.id} className="moderation__item" style={{ '--line': `var(--line-${event.category.toLowerCase()})` } as Record<string, string>}>
                    <article className="moderation__card" aria-labelledby={`${submission.id}-title`}>
                      <header className="moderation__card-head">
                        <p className="moderation__meta">
                          <LineBadge code={event.category} showName size="sm" />
                          <span>{club?.shortName ?? ''}</span>
                          <span>
                            Gửi ngày <MonoTime dateTime={submission.submittedAt}>{formatDate(toMillis(submission.submittedAt))}</MonoTime>
                          </span>
                        </p>
                        <h3 id={`${submission.id}-title`} className="moderation__event-title">
                          {event.title}
                        </h3>
                      </header>
                      <dl className="moderation__facts">
                        <div>
                          <dt>Thời gian</dt>
                          <dd>
                            <MonoTime dateTime={event.start}>
                              {formatLongDate(start)} · {formatTimeRange(start, toMillis(event.end))}
                            </MonoTime>
                          </dd>
                        </div>
                        <div>
                          <dt>Địa điểm</dt>
                          <dd>{event.format === 'online' ? `Trực tuyến · ${event.location}` : event.location}</dd>
                        </div>
                        <div>
                          <dt>Khối · số chỗ</dt>
                          <dd>
                            Khối {event.eligibleGrades.join(', ')} · <span className="mono">{event.capacity}</span> chỗ
                          </dd>
                        </div>
                        <div>
                          <dt>Hạn đăng ký</dt>
                          <dd>
                            <MonoTime dateTime={event.registrationDeadline}>
                              {formatDate(deadline)} {formatTime(deadline)}
                            </MonoTime>
                          </dd>
                        </div>
                      </dl>
                      <p className="moderation__summary">{event.summary}</p>
                      <details className="moderation__details">
                        <summary>Mô tả chi tiết và lịch sử xử lý</summary>
                        <p>{event.description}</p>
                        <ol className="moderation__history">
                          {submission.history.map((h) => (
                            <li key={`${h.at}-${h.action}`}>
                              <MonoTime dateTime={h.at}>{formatDate(toMillis(h.at))}</MonoTime> · {ACTION_LABELS[h.action]}
                              {h.reason ? `: ${h.reason}` : ''}
                            </li>
                          ))}
                        </ol>
                      </details>
                      <div className="moderation__actions">
                        <Button
                          size="sm"
                          variant="primary"
                          iconStart="check"
                          onClick={() => {
                            setDecision({ submissionId: submission.id, title: event.title, action: 'approve' });
                          }}
                        >
                          Phê duyệt
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setDecision({ submissionId: submission.id, title: event.title, action: 'request_changes' });
                          }}
                        >
                          Yêu cầu chỉnh sửa
                        </Button>
                        <Button
                          size="sm"
                          variant="quiet"
                          onClick={() => {
                            setDecision({ submissionId: submission.id, title: event.title, action: 'reject' });
                          }}
                        >
                          Từ chối
                        </Button>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </section>

      <section className="band" aria-labelledby="moderation-done">
        <div className="container stack stack--md">
          <h2 id="moderation-done" className="moderation__title">
            Đã xử lý
          </h2>
          {reviewed.length === 0 ? (
            <p className="moderation__muted">Chưa có sự kiện nào được xử lý.</p>
          ) : (
            <ul className="moderation__done">
              {reviewed.map(({ s, event }) => {
                if (!event) return null;
                const label = STATUS_LABELS[event.status];
                const last = s.history.at(-1);
                return (
                  <li key={s.id} className="moderation__done-item">
                    <span className="moderation__done-title">
                      <LineBadge code={event.category} size="sm" />
                      {event.title}
                    </span>
                    <span className="moderation__done-club">{clubName(event.clubId)}</span>
                    <StatusTag tone={label.tone}>{label.label}</StatusTag>
                    {last?.reason ? <span className="moderation__done-reason">Lý do: {last.reason}</span> : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <ConfirmDialog
        open={decision !== null}
        title={decision ? DECISION_TITLES[decision.action] : ''}
        confirmLabel={decision?.action === 'approve' ? 'Phê duyệt' : decision?.action === 'reject' ? 'Từ chối' : 'Gửi yêu cầu'}
        tone={decision?.action === 'reject' ? 'stop' : 'default'}
        onConfirm={confirm}
        onCancel={close}
      >
        <p className="moderation__dialog-event">{decision?.title}</p>
        {decision?.action === 'approve' ? (
          <p>Sau khi phê duyệt, sự kiện sẽ hiển thị với học sinh trên Khám phá sự kiện và Lộ trình.</p>
        ) : (
          <div className="moderation__reason">
            <label htmlFor={reasonId}>Lý do (bắt buộc)</label>
            <textarea
              id={reasonId}
              rows={4}
              value={reason}
              aria-invalid={reasonError !== '' ? true : undefined}
              aria-describedby={reasonError !== '' ? `${reasonId}-error` : undefined}
              onChange={(e) => {
                setReason(e.target.value);
                setReasonError('');
              }}
            />
            {reasonError !== '' ? (
              <span id={`${reasonId}-error`} className="moderation__error">
                {reasonError}
              </span>
            ) : null}
            <p className="moderation__muted">
              {decision?.action === 'reject'
                ? 'Câu lạc bộ sẽ nhận được lý do từ chối. Sự kiện bị từ chối không hiển thị với học sinh.'
                : 'Câu lạc bộ có thể chỉnh sửa và gửi lại sự kiện sau khi nhận được yêu cầu.'}
            </p>
          </div>
        )}
      </ConfirmDialog>
    </>
  );
}
