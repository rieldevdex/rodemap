import { useId, useState, type SyntheticEvent } from 'react';
import { Button } from '../../components/atoms/Button';
import { StatusTag, type StatusTone } from '../../components/atoms/StatusTag';
import { ConfirmDialog } from '../../components/molecules/ConfirmDialog';
import '../../components/organisms/EventSubmissionForm.css';
import {
  canManage,
  fromDateTimeInput,
  membersOf,
  REQUEST_STATUS_LABELS,
  requestsFromDepartment,
  requestsToDepartment,
  toDateTimeInput,
  validateRequestDraft,
  type DepartmentId,
  type RequestDraft,
  type RequestStatus,
  type WsMember,
  type WsRequest,
  type WsSnapshot,
} from '../../domain/workspace';
import type { Millis } from '../../domain/types';
import type { Workspace } from '../../workspace/useWorkspace';
import { formatDue, shortName } from './WorkspaceTasks';

interface PanelProps {
  ws: Workspace;
  snapshot: WsSnapshot;
  me: WsMember;
  now: Millis;
}

const TONES: Record<RequestStatus, StatusTone> = { open: 'warn', accepted: 'ok', declined: 'neutral' };

function RequestCard({ request, snapshot, actions }: { request: WsRequest; snapshot: WsSnapshot; actions?: React.ReactNode }) {
  const from = snapshot.members.find((m) => m.id === request.fromMember)?.fullName ?? 'Thành viên';
  return (
    <article className="ws-task">
      <div className="ws-task__top">
        <span className="ws-task__dept mono">
          {shortName(snapshot, request.fromDepartment)} → {shortName(snapshot, request.toDepartment)}
        </span>
        <StatusTag tone={TONES[request.status]}>{REQUEST_STATUS_LABELS[request.status]}</StatusTag>
      </div>
      <h3 className="ws-task__title">{request.title}</h3>
      <dl className="ws-task__facts">
        <div>
          <dt>Người gửi</dt>
          <dd>{from}</dd>
        </div>
        <div>
          <dt>Hạn</dt>
          <dd className="mono">{formatDue(request.dueAt)}</dd>
        </div>
        {request.answerNote === '' ? null : (
          <div>
            <dt>Phản hồi</dt>
            <dd>{request.answerNote}</dd>
          </div>
        )}
      </dl>
      <p className="ws-task__desc">{request.description}</p>
      {actions ? <div className="cluster cluster--sm ws-task__actions">{actions}</div> : null}
    </article>
  );
}

function AnswerDialog({ ws, snapshot, pending, onClose }: { ws: Workspace; snapshot: WsSnapshot; pending: { request: WsRequest; accept: boolean } | null; onClose: () => void }) {
  const id = useId();
  const [assignee, setAssignee] = useState('');
  const [note, setNote] = useState('');
  if (pending === null) return null;
  const { request, accept } = pending;
  const close = () => {
    setAssignee('');
    setNote('');
    onClose();
  };
  return (
    <ConfirmDialog
      open
      title={accept ? `Tiếp nhận: ${request.title}` : `Không tiếp nhận: ${request.title}`}
      confirmLabel={accept ? 'Tiếp nhận và tạo công việc' : 'Không tiếp nhận'}
      tone={accept ? 'default' : 'stop'}
      confirmDisabled={ws.busy || (!accept && note.trim().length < 10)}
      onConfirm={() => {
        void ws.answerRequest(request.id, accept, assignee === '' ? null : assignee, note).then((ok) => {
          if (ok) close();
        });
      }}
      onCancel={close}
    >
      <div className="submission-form stack stack--sm">
        {accept ? (
          <div className="submission-form__field">
            <label htmlFor={`${id}-assignee`}>Người thực hiện</label>
            <select
              id={`${id}-assignee`}
              value={assignee}
              onChange={(e) => {
                setAssignee(e.target.value);
              }}
            >
              <option value="">Giao sau</option>
              {membersOf(snapshot.members, request.toDepartment)
                .filter((m) => m.status === 'active')
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName}
                  </option>
                ))}
            </select>
          </div>
        ) : null}
        <div className="submission-form__field">
          <label htmlFor={`${id}-note`}>{accept ? 'Ghi chú (không bắt buộc)' : 'Lý do (bắt buộc, tối thiểu 10 ký tự)'}</label>
          <textarea
            id={`${id}-note`}
            rows={3}
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
            }}
          />
        </div>
        {ws.error === '' ? null : (
          <p className="submission-form__error" role="alert">
            {ws.error}
          </p>
        )}
      </div>
    </ConfirmDialog>
  );
}

function RequestForm({ ws, snapshot, me, now }: PanelProps) {
  const id = useId();
  const first = snapshot.departments.find((d) => d.id !== me.departmentId)?.id ?? 'bdh';
  const blank: RequestDraft = { toDepartment: first, title: '', description: '', dueAt: '' };
  const [draft, setDraft] = useState<RequestDraft>(blank);
  const [shown, setShown] = useState(false);
  const [sent, setSent] = useState('');
  const errors = validateRequestDraft(draft, me.departmentId, now);
  const set = (patch: Partial<RequestDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
  };
  const submit = (e: SyntheticEvent) => {
    e.preventDefault();
    setShown(true);
    setSent('');
    if (Object.keys(errors).length > 0) return;
    void ws.createRequest(draft).then((ok) => {
      if (!ok) return;
      setSent(`Đã gửi phiếu yêu cầu “${draft.title.trim()}” tới ${shortName(snapshot, draft.toDepartment)}.`);
      setDraft(blank);
      setShown(false);
    });
  };
  const field = (key: keyof RequestDraft) => ({
    'aria-invalid': shown && errors[key] ? true : undefined,
    'aria-describedby': shown && errors[key] ? `${id}-${key}-error` : undefined,
  });
  const err = (key: keyof RequestDraft) =>
    shown && errors[key] ? (
      <span id={`${id}-${key}-error`} className="submission-form__error">
        {errors[key]}
      </span>
    ) : null;
  return (
    <form className="submission-form ws-form" aria-label="Gửi phiếu yêu cầu" onSubmit={submit} noValidate>
      <h3 className="ws-form__title">Gửi phiếu yêu cầu</h3>
      <p className="submission-form__hint">Yêu cầu giữa các ban được gửi bằng phiếu, có người gửi, ban nhận, mô tả và hạn. Ban nhận tiếp nhận phiếu thành công việc của ban.</p>
      <div className="submission-form__grid">
        <div className="submission-form__field">
          <label htmlFor={`${id}-to`}>Ban nhận</label>
          <select
            id={`${id}-to`}
            value={draft.toDepartment}
            {...field('toDepartment')}
            onChange={(e) => {
              set({ toDepartment: e.target.value as DepartmentId });
            }}
          >
            {snapshot.departments
              .filter((d) => d.id !== me.departmentId)
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
          </select>
          {err('toDepartment')}
        </div>
        <div className="submission-form__field">
          <label htmlFor={`${id}-due`}>Hạn (giờ Việt Nam)</label>
          <input
            id={`${id}-due`}
            type="datetime-local"
            value={draft.dueAt === '' ? '' : toDateTimeInput(draft.dueAt)}
            {...field('dueAt')}
            onChange={(e) => {
              set({ dueAt: fromDateTimeInput(e.target.value) ?? '' });
            }}
          />
          {err('dueAt')}
        </div>
      </div>
      <div className="submission-form__field">
        <label htmlFor={`${id}-title`}>Tên yêu cầu</label>
        <input
          id={`${id}-title`}
          value={draft.title}
          {...field('title')}
          onChange={(e) => {
            set({ title: e.target.value });
          }}
        />
        {err('title')}
      </div>
      <div className="submission-form__field">
        <label htmlFor={`${id}-desc`}>Mô tả (mục đích, sản phẩm cần nhận, kích thước hoặc định dạng, tài liệu tham khảo)</label>
        <textarea
          id={`${id}-desc`}
          rows={4}
          value={draft.description}
          {...field('description')}
          onChange={(e) => {
            set({ description: e.target.value });
          }}
        />
        {err('description')}
      </div>
      <div className="submission-form__actions cluster">
        <Button type="submit" variant="primary" disabled={ws.busy}>
          Gửi phiếu yêu cầu
        </Button>
      </div>
      <p className="workspace__note" role="status">
        {sent}
      </p>
    </form>
  );
}

/** "Phiếu yêu cầu": send a slip to another department; the receiving managers accept (it becomes a task) or decline with a reason. */
export function WorkspaceRequests(props: PanelProps) {
  const { ws, snapshot, me } = props;
  const [pending, setPending] = useState<{ request: WsRequest; accept: boolean } | null>(null);
  const incoming = requestsToDepartment(snapshot.requests, me.departmentId);
  const outgoing = requestsFromDepartment(snapshot.requests, me.departmentId);
  const manager = canManage(me, me.departmentId);
  return (
    <div className="stack stack--xl">
      <RequestForm {...props} />
      <section className="stack stack--md" aria-labelledby="ws-incoming">
        <h2 id="ws-incoming" className="workspace__h2">
          Gửi tới ban của tôi <span className="mono">{incoming.length}</span>
        </h2>
        {incoming.length === 0 ? (
          <p className="workspace__note">Ban chưa nhận phiếu yêu cầu nào.</p>
        ) : (
          <ul className="ws-task-list">
            {incoming.map((r) => (
              <li key={r.id}>
                <RequestCard
                  request={r}
                  snapshot={snapshot}
                  actions={
                    manager && r.status === 'open' ? (
                      <>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => {
                            setPending({ request: r, accept: true });
                          }}
                        >
                          Tiếp nhận
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setPending({ request: r, accept: false });
                          }}
                        >
                          Không tiếp nhận
                        </Button>
                      </>
                    ) : undefined
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="stack stack--md" aria-labelledby="ws-outgoing">
        <h2 id="ws-outgoing" className="workspace__h2">
          Ban của tôi đã gửi <span className="mono">{outgoing.length}</span>
        </h2>
        {outgoing.length === 0 ? (
          <p className="workspace__note">Ban chưa gửi phiếu yêu cầu nào.</p>
        ) : (
          <ul className="ws-task-list">
            {outgoing.map((r) => (
              <li key={r.id}>
                <RequestCard request={r} snapshot={snapshot} />
              </li>
            ))}
          </ul>
        )}
      </section>
      <AnswerDialog
        ws={ws}
        snapshot={snapshot}
        pending={pending}
        onClose={() => {
          setPending(null);
        }}
      />
    </div>
  );
}
