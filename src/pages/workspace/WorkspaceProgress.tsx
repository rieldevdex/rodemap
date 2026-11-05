import { useId, useState, type SyntheticEvent } from 'react';
import { Button } from '../../components/atoms/Button';
import { ConfirmDialog } from '../../components/molecules/ConfirmDialog';
import '../../components/organisms/EventSubmissionForm.css';
import { formatDate, formatTime, isoWeekKey, toMillis } from '../../domain/dates';
import type { Millis } from '../../domain/types';
import {
  canReadProgress,
  canWriteProgress,
  departmentProgress,
  followedDepartments,
  formatWeek,
  progressNotesFor,
  validateProgressNote,
  type DepartmentId,
  type WsMember,
  type WsSnapshot,
} from '../../domain/workspace';
import type { Workspace } from '../../workspace/useWorkspace';

const shortName = (snapshot: WsSnapshot, id: DepartmentId) => snapshot.departments.find((d) => d.id === id)?.shortName ?? id;
const formatDue = (iso: string) => `${formatTime(toMillis(iso))} · ${formatDate(toMillis(iso))}`;
const nameOf = (snapshot: WsSnapshot, id: string) => snapshot.members.find((m) => m.id === id)?.fullName ?? 'Thành viên';

/** The members of Ban Nhân sự who follow a department. */
function followersOf(snapshot: WsSnapshot, dept: DepartmentId): string[] {
  return snapshot.hrAssignments
    .filter((a) => a.departmentId === dept && snapshot.members.some((m) => m.id === a.memberId && m.departmentId === 'hr'))
    .map((a) => nameOf(snapshot, a.memberId));
}

function NoteForm({ ws, dept, week, initial }: { ws: Workspace; dept: DepartmentId; week: string; initial: string }) {
  const id = useId();
  const [body, setBody] = useState(initial);
  const [shown, setShown] = useState(false);
  const [saved, setSaved] = useState('');
  const error = validateProgressNote(body);
  const submit = (e: SyntheticEvent) => {
    e.preventDefault();
    setShown(true);
    setSaved('');
    if (error !== null) return;
    void ws.saveProgressNote(dept, body.trim()).then((ok) => {
      if (ok) setSaved(`Đã lưu nhận xét ${formatWeek(week)}.`);
    });
  };
  return (
    <form className="submission-form stack stack--sm" aria-label="Nhận xét tiến độ tuần này" onSubmit={submit} noValidate>
      <div className="submission-form__field">
        <label htmlFor={`${id}-body`}>Nhận xét tiến độ {formatWeek(week)}</label>
        <textarea
          id={`${id}-body`}
          rows={4}
          value={body}
          aria-invalid={shown && error !== null ? true : undefined}
          aria-describedby={`${id}-hint${shown && error !== null ? ` ${id}-error` : ''}`}
          onChange={(e) => {
            setBody(e.target.value);
          }}
        />
        <span id={`${id}-hint`} className="submission-form__hint">
          Việc đã xong, việc chậm và lý do, việc cần trưởng ban hoặc Ban điều hành hỗ trợ. Mỗi tuần một nhận xét; lưu lại trong tuần sẽ thay nhận xét cũ.
        </span>
        {shown && error !== null ? (
          <span id={`${id}-error`} className="submission-form__error">
            {error}
          </span>
        ) : null}
      </div>
      <div className="cluster">
        <Button type="submit" variant="secondary" disabled={ws.busy}>
          Lưu nhận xét
        </Button>
      </div>
      <p className="workspace__note" role="status">
        {saved}
      </p>
    </form>
  );
}

/** "Tiến độ" of one department on the board: the figures, the followers of Ban Nhân sự and their weekly notes. */
export function ProgressPanel({ ws, snapshot, me, now, dept }: { ws: Workspace; snapshot: WsSnapshot; me: WsMember; now: Millis; dept: DepartmentId }) {
  if (dept === 'bdh' || !canReadProgress(me, dept, snapshot.hrAssignments)) return null;
  const p = departmentProgress(snapshot.tasks, dept, now);
  const week = isoWeekKey(now);
  const notes = progressNotesFor(snapshot.progressNotes, dept);
  const mine = notes.find((n) => n.week === week && n.authorId === me.id);
  const followers = followersOf(snapshot, dept);
  const facts: [string, string][] = [
    ['Việc đang mở', String(p.open)],
    ['Quá hạn', String(p.overdue.length)],
    ['Đến hạn trong 7 ngày', String(p.dueSoon.length)],
    ['Chờ duyệt', String(p.awaitingReview)],
    ['Báo trễ chờ trả lời', String(p.lateNotices)],
    ['Chưa có người thực hiện', String(p.unassigned)],
    ['Nộp đúng hạn trong tháng', p.month.due === 0 ? 'Chưa có việc đến hạn' : `${String(p.month.onTime)}/${String(p.month.due)}`],
  ];
  return (
    <section className="ws-progress stack stack--md" aria-labelledby={`ws-progress-${dept}`}>
      <div>
        <h2 id={`ws-progress-${dept}`} className="workspace__h2">
          Tiến độ {shortName(snapshot, dept)}
        </h2>
        <p className="workspace__note">{followers.length === 0 ? 'Ban điều hành chưa phân công thành viên Ban Nhân sự theo dõi ban này.' : `Ban Nhân sự theo dõi: ${followers.join(', ')}.`}</p>
      </div>
      <dl className="ws-progress__facts">
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd className="mono">{value}</dd>
          </div>
        ))}
      </dl>
      {p.overdue.length > 0 ? (
        <div className="stack stack--sm">
          <h3 className="ws-form__title">Việc quá hạn</h3>
          <ul className="ws-progress__list">
            {p.overdue.map((t) => (
              <li key={t.id}>
                {t.title} <span className="mono">({t.dueAt === null ? '' : formatDue(t.dueAt)})</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {canWriteProgress(me, dept, snapshot.hrAssignments) ? <NoteForm key={`${dept}-${week}`} ws={ws} dept={dept} week={week} initial={mine?.body ?? ''} /> : null}
      <div className="stack stack--sm">
        <h3 className="ws-form__title">Nhận xét tiến độ</h3>
        {notes.length === 0 ? (
          <p className="workspace__note">Chưa có nhận xét tiến độ cho ban này.</p>
        ) : (
          <ul className="ws-progress__notes">
            {notes.map((n) => (
              <li key={n.id}>
                <p className="ws-progress__meta">
                  {formatWeek(n.week)} · {nameOf(snapshot, n.authorId)} · cập nhật {formatDue(n.updatedAt)}
                </p>
                <p>{n.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/** On "Việc của tôi": the departments a member of Ban Nhân sự follows, and whether this week's notes are written. */
export function FollowReminder({ snapshot, me, now }: { snapshot: WsSnapshot; me: WsMember; now: Millis }) {
  const followed = followedDepartments(snapshot.hrAssignments, me);
  if (followed.length === 0) return null;
  const week = isoWeekKey(now);
  const done = (d: DepartmentId) => snapshot.progressNotes.some((n) => n.departmentId === d && n.week === week && n.authorId === me.id);
  const missing = followed.filter((d) => !done(d));
  return (
    <section className="ws-progress stack stack--sm" aria-labelledby="ws-follow">
      <h2 id="ws-follow" className="workspace__h2">
        Theo dõi tiến độ
      </h2>
      <p>
        Bạn theo dõi tiến độ của: {followed.map((d) => shortName(snapshot, d)).join(', ')}.{' '}
        {missing.length === 0
          ? `Đã có nhận xét ${formatWeek(week)} cho tất cả các ban.`
          : `Chưa có nhận xét ${formatWeek(week)} cho: ${missing.map((d) => shortName(snapshot, d)).join(', ')}.`}
      </p>
      <p className="workspace__note">Xem số liệu và ghi nhận xét tại thẻ Công việc các ban.</p>
    </section>
  );
}

/** BĐH assigns a member of Ban Nhân sự to the departments they follow. */
export function HrAssignmentDialog({ ws, snapshot, member, onClose }: { ws: Workspace; snapshot: WsSnapshot; member: WsMember | null; onClose: () => void }) {
  const [chosen, setChosen] = useState<DepartmentId[] | null>(null);
  if (member === null) return null;
  const current = chosen ?? followedDepartments(snapshot.hrAssignments, member);
  const close = () => {
    setChosen(null);
    onClose();
  };
  return (
    <ConfirmDialog
      open
      title={`Phân công theo dõi: ${member.fullName}`}
      confirmLabel="Lưu phân công"
      confirmDisabled={ws.busy}
      onConfirm={() => {
        void ws.setHrAssignments(member.id, current).then((ok) => {
          if (ok) close();
        });
      }}
      onCancel={close}
    >
      <div className="submission-form stack stack--sm">
        <fieldset className="submission-form__field submission-form__fieldset">
          <legend>Các ban được theo dõi tiến độ</legend>
          <div className="submission-form__choices submission-form__choices--wrap">
            {snapshot.departments
              .filter((d) => d.id !== 'bdh')
              .map((d) => (
                <label key={d.id} className="submission-form__choice">
                  <input
                    type="checkbox"
                    checked={current.includes(d.id)}
                    onChange={(e) => {
                      setChosen(e.target.checked ? [...current, d.id] : current.filter((x) => x !== d.id));
                    }}
                  />
                  {d.name}
                </label>
              ))}
          </div>
        </fieldset>
        <p className="submission-form__hint">Thành viên được phân công xem bảng điểm và tiến độ của các ban này, và ghi nhận xét tiến độ hằng tuần.</p>
        {ws.error === '' ? null : (
          <p className="submission-form__error" role="alert">
            {ws.error}
          </p>
        )}
      </div>
    </ConfirmDialog>
  );
}
