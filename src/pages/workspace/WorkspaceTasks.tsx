import { useId, useState, type SyntheticEvent } from 'react';
import { Button } from '../../components/atoms/Button';
import { Chip } from '../../components/atoms/Chip';
import { StatusTag, type StatusTone } from '../../components/atoms/StatusTag';
import { ConfirmDialog } from '../../components/molecules/ConfirmDialog';
import '../../components/organisms/EventSubmissionForm.css';
import { formatDate, formatTime, toMillis } from '../../domain/dates';
import {
  availableActions,
  canManage,
  daysLeft,
  DEPARTMENT_IDS,
  followedDepartments,
  fromDateTimeInput,
  isOverdue,
  MAX_REVISIONS,
  membersOf,
  TASK_ACTION_LABELS,
  TASK_STATUS_LABELS,
  tasksForDepartment,
  tasksForMember,
  tasksToReview,
  toDateTimeInput,
  unassignedTasks,
  validateTaskDraft,
  type DepartmentId,
  type TaskAction,
  type TaskDraft,
  type TaskStatus,
  type WsMember,
  type WsSnapshot,
  type WsTask,
} from '../../domain/workspace';
import type { Millis } from '../../domain/types';
import type { Workspace } from '../../workspace/useWorkspace';
import { FollowReminder, ProgressPanel } from './WorkspaceProgress';

interface PanelProps {
  ws: Workspace;
  snapshot: WsSnapshot;
  me: WsMember;
  now: Millis;
}

const STATUS_TONES: Record<TaskStatus, StatusTone> = {
  todo: 'neutral',
  in_progress: 'signal',
  submitted: 'warn',
  changes_requested: 'stop',
  done: 'ok',
  cancelled: 'neutral',
};

export function shortName(snapshot: WsSnapshot, id: DepartmentId): string {
  return snapshot.departments.find((d) => d.id === id)?.shortName ?? id;
}

function memberName(snapshot: WsSnapshot, id: string | null): string {
  if (id === null) return 'Chưa giao';
  return snapshot.members.find((m) => m.id === id)?.fullName ?? 'Thành viên không còn trong danh sách';
}

export function formatDue(iso: string): string {
  const ms = toMillis(iso);
  return `${formatTime(ms)} · ${formatDate(ms)}`;
}

/* ── One task ─────────────────────────────────────────────────────── */

interface TaskCardProps extends PanelProps {
  task: WsTask;
  onAction: (task: WsTask, action: TaskAction) => void;
  onEdit?: ((task: WsTask) => void) | undefined;
}

function TaskCard({ task, snapshot, me, now, onAction, onEdit }: TaskCardProps) {
  const actions = availableActions(task, me, now);
  const left = daysLeft(task, now);
  const overdue = isOverdue(task, now);
  return (
    <article className="ws-task">
      <div className="ws-task__top">
        <span className="ws-task__dept mono">{shortName(snapshot, task.departmentId)}</span>
        <StatusTag tone={STATUS_TONES[task.status]}>{TASK_STATUS_LABELS[task.status]}</StatusTag>
        {overdue ? <StatusTag tone="stop">Quá hạn</StatusTag> : null}
        {task.lateNoticeAt !== null && !task.lateApproved ? <StatusTag tone="warn">Đã báo trễ hạn</StatusTag> : null}
        {task.lateApproved ? <StatusTag tone="neutral">Được gia hạn</StatusTag> : null}
      </div>
      <h3 className="ws-task__title">{task.title}</h3>
      <dl className="ws-task__facts">
        <div>
          <dt>Người thực hiện</dt>
          <dd>{memberName(snapshot, task.assigneeId)}</dd>
        </div>
        <div>
          <dt>Hạn</dt>
          <dd>
            {task.dueAt === null ? (
              'Chưa đặt hạn'
            ) : (
              <>
                <span className="mono">{formatDue(task.dueAt)}</span>
                {left !== null && left >= 0 && task.status !== 'done' && task.status !== 'cancelled' ? ` (còn ${String(left)} ngày)` : null}
              </>
            )}
          </dd>
        </div>
        {task.output === '' ? null : (
          <div>
            <dt>Đầu ra</dt>
            <dd>{task.output}</dd>
          </div>
        )}
        {task.collaborators.length === 0 ? null : (
          <div>
            <dt>Phối hợp</dt>
            <dd>{task.collaborators.map((c) => shortName(snapshot, c)).join(', ')}</dd>
          </div>
        )}
        {task.link === '' ? null : (
          <div>
            <dt>Sản phẩm</dt>
            <dd>
              <a href={task.link} target="_blank" rel="noopener noreferrer">
                Mở sản phẩm
                <span className="visually-hidden"> (mở trong thẻ mới)</span>
              </a>
            </dd>
          </div>
        )}
        {task.quality === null ? null : (
          <div>
            <dt>Chất lượng</dt>
            <dd className="mono">{task.quality}/5</dd>
          </div>
        )}
        {task.revisionCount === 0 ? null : (
          <div>
            <dt>Số vòng chỉnh sửa</dt>
            <dd>
              <span className="mono">{task.revisionCount}</span>
              {task.revisionCount > MAX_REVISIONS ? ' (vượt quá hai vòng theo quy trình)' : null}
            </dd>
          </div>
        )}
        {task.lateNoticeReason === '' ? null : (
          <div>
            <dt>Lý do báo trễ</dt>
            <dd>{task.lateNoticeReason}</dd>
          </div>
        )}
      </dl>
      {task.description === '' ? null : <p className="ws-task__desc">{task.description}</p>}
      {actions.length > 0 || onEdit ? (
        <div className="cluster cluster--sm ws-task__actions">
          {actions.map((a) => (
            <Button
              key={a}
              size="sm"
              variant={a === 'submit' || a === 'complete' ? 'primary' : 'secondary'}
              onClick={() => {
                onAction(task, a);
              }}
            >
              {TASK_ACTION_LABELS[a]}
            </Button>
          ))}
          {onEdit ? (
            <Button
              size="sm"
              variant="quiet"
              onClick={() => {
                onEdit(task);
              }}
            >
              Chỉnh sửa
            </Button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

/* ── Actions that need input ──────────────────────────────────────── */

const NEEDS_INPUT: Partial<Record<TaskAction, string>> = {
  submit: 'Đường dẫn tới sản phẩm (Google Drive, Canva, bài đăng…)',
  notify_late: 'Lý do và thời điểm dự kiến nộp',
  request_changes: 'Nội dung cần chỉnh sửa',
};

function ActionDialog({ ws, pending, onClose }: { ws: Workspace; pending: { task: WsTask; action: TaskAction } | null; onClose: () => void }) {
  const id = useId();
  const [text, setText] = useState('');
  const [quality, setQuality] = useState(0);
  if (pending === null) return null;
  const { task, action } = pending;
  const field = NEEDS_INPUT[action];
  const close = () => {
    setText('');
    setQuality(0);
    onClose();
  };
  const confirm = () => {
    const input = action === 'submit' ? { link: text } : action === 'complete' ? { quality } : { note: text };
    void ws.act(task.id, action, input).then((ok) => {
      if (ok) close();
    });
  };
  return (
    <ConfirmDialog
      open
      title={`${TASK_ACTION_LABELS[action]}: ${task.title}`}
      confirmLabel={TASK_ACTION_LABELS[action]}
      tone={action === 'cancel' ? 'stop' : 'default'}
      confirmDisabled={ws.busy || (action === 'complete' && quality === 0)}
      onConfirm={confirm}
      onCancel={close}
    >
      <div className="submission-form stack stack--sm">
        {field === undefined ? null : (
          <div className="submission-form__field">
            <label htmlFor={`${id}-text`}>{field}</label>
            {action === 'submit' ? (
              <input
                id={`${id}-text`}
                type="url"
                inputMode="url"
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                }}
              />
            ) : (
              <textarea
                id={`${id}-text`}
                rows={3}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                }}
              />
            )}
          </div>
        )}
        {action === 'complete' ? (
          <fieldset className="submission-form__field submission-form__fieldset">
            <legend>Chất lượng sản phẩm (theo thước đo của ban)</legend>
            <div className="submission-form__choices">
              {[1, 2, 3, 4, 5].map((q) => (
                <label key={q} className="submission-form__choice">
                  <input
                    type="radio"
                    name={`${id}-quality`}
                    checked={quality === q}
                    onChange={() => {
                      setQuality(q);
                    }}
                  />
                  {q}
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}
        {action === 'notify_late' ? <p className="submission-form__hint">Theo hệ thống điểm, nhiệm vụ nộp trễ được tính 50% nếu báo trước ít nhất 24 giờ và được trưởng ban đồng ý.</p> : null}
        {action === 'cancel' ? <p className="submission-form__hint">Công việc đã hủy không được tính vào điểm của thành viên.</p> : null}
        {ws.error === '' ? null : (
          <p className="submission-form__error" role="alert">
            {ws.error}
          </p>
        )}
      </div>
    </ConfirmDialog>
  );
}

/* ── Create or edit a task ────────────────────────────────────────── */

function emptyDraft(dept: DepartmentId): TaskDraft {
  return { title: '', description: '', output: '', departmentId: dept, collaborators: [], assigneeId: null, dueAt: null };
}

function TaskForm({ ws, snapshot, me, initial, onClose }: { ws: Workspace; snapshot: WsSnapshot; me: WsMember; initial: WsTask | DepartmentId; onClose: () => void }) {
  const id = useId();
  const editing = typeof initial !== 'string';
  const [draft, setDraft] = useState<TaskDraft>(() =>
    editing
      ? { title: initial.title, description: initial.description, output: initial.output, departmentId: initial.departmentId, collaborators: initial.collaborators, assigneeId: initial.assigneeId, dueAt: initial.dueAt }
      : emptyDraft(initial),
  );
  const [shown, setShown] = useState(false);
  const errors = validateTaskDraft(draft, snapshot.members);
  const set = (patch: Partial<TaskDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
  };
  const departments = snapshot.departments.filter((d) => canManage(me, d.id));
  const submit = (e: SyntheticEvent) => {
    e.preventDefault();
    setShown(true);
    if (Object.keys(errors).length > 0) return;
    void ws.saveTask(editing ? { ...draft, id: initial.id } : draft).then((ok) => {
      if (ok) onClose();
    });
  };
  const err = (key: keyof typeof errors) =>
    shown && errors[key] ? (
      <span id={`${id}-${key}-error`} className="submission-form__error">
        {errors[key]}
      </span>
    ) : null;

  return (
    <form className="submission-form ws-form" aria-label={editing ? 'Chỉnh sửa công việc' : 'Thêm công việc'} onSubmit={submit} noValidate>
      <h3 className="ws-form__title">{editing ? 'Chỉnh sửa công việc' : 'Thêm công việc'}</h3>
      <div className="submission-form__field">
        <label htmlFor={`${id}-title`}>Tên công việc</label>
        <input
          id={`${id}-title`}
          value={draft.title}
          aria-invalid={shown && errors.title ? true : undefined}
          aria-describedby={shown && errors.title ? `${id}-title-error` : undefined}
          onChange={(e) => {
            set({ title: e.target.value });
          }}
        />
        {err('title')}
      </div>
      <div className="submission-form__grid">
        <div className="submission-form__field">
          <label htmlFor={`${id}-dept`}>Ban phụ trách chính</label>
          <select
            id={`${id}-dept`}
            value={draft.departmentId}
            onChange={(e) => {
              set({ departmentId: e.target.value as DepartmentId, assigneeId: null });
            }}
          >
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="submission-form__field">
          <label htmlFor={`${id}-assignee`}>Người thực hiện</label>
          <select
            id={`${id}-assignee`}
            value={draft.assigneeId ?? ''}
            aria-invalid={shown && errors.assigneeId ? true : undefined}
            aria-describedby={shown && errors.assigneeId ? `${id}-assigneeId-error` : undefined}
            onChange={(e) => {
              set({ assigneeId: e.target.value === '' ? null : e.target.value });
            }}
          >
            <option value="">Chưa giao</option>
            {membersOf(snapshot.members, draft.departmentId)
              .filter((m) => m.status === 'active')
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fullName}
                </option>
              ))}
          </select>
          {err('assigneeId')}
        </div>
        <div className="submission-form__field">
          <label htmlFor={`${id}-due`}>Hạn (giờ Việt Nam)</label>
          <input
            id={`${id}-due`}
            type="datetime-local"
            value={toDateTimeInput(draft.dueAt)}
            onChange={(e) => {
              set({ dueAt: fromDateTimeInput(e.target.value) });
            }}
          />
        </div>
      </div>
      <fieldset className="submission-form__field submission-form__fieldset" aria-describedby={shown && errors.collaborators ? `${id}-collaborators-error` : undefined}>
        <legend>Ban phối hợp</legend>
        <div className="submission-form__choices submission-form__choices--wrap">
          {DEPARTMENT_IDS.filter((d) => d !== draft.departmentId).map((d) => (
            <label key={d} className="submission-form__choice">
              <input
                type="checkbox"
                checked={draft.collaborators.includes(d)}
                onChange={(e) => {
                  set({ collaborators: e.target.checked ? [...draft.collaborators, d] : draft.collaborators.filter((c) => c !== d) });
                }}
              />
              {shortName(snapshot, d)}
            </label>
          ))}
        </div>
        {err('collaborators')}
      </fieldset>
      <div className="submission-form__field">
        <label htmlFor={`${id}-output`}>Đầu ra</label>
        <input
          id={`${id}-output`}
          value={draft.output}
          onChange={(e) => {
            set({ output: e.target.value });
          }}
        />
      </div>
      <div className="submission-form__field">
        <label htmlFor={`${id}-desc`}>Mô tả</label>
        <textarea
          id={`${id}-desc`}
          rows={3}
          value={draft.description}
          onChange={(e) => {
            set({ description: e.target.value });
          }}
        />
      </div>
      <div className="submission-form__actions cluster">
        <Button type="submit" variant="primary" disabled={ws.busy}>
          {editing ? 'Lưu thay đổi' : 'Thêm công việc'}
        </Button>
        <Button type="button" variant="quiet" onClick={onClose}>
          Hủy
        </Button>
      </div>
    </form>
  );
}

/* ── Lists ────────────────────────────────────────────────────────── */

function TaskList({ tasks, empty, ...props }: PanelProps & { tasks: WsTask[]; empty: string; onAction: TaskCardProps['onAction']; onEdit?: TaskCardProps['onEdit'] }) {
  if (tasks.length === 0) return <p className="workspace__note">{empty}</p>;
  return (
    <ul className="ws-task-list">
      {tasks.map((t) => (
        <li key={t.id}>
          <TaskCard {...props} task={t} onEdit={props.onEdit && canManage(props.me, t.departmentId) ? props.onEdit : undefined} />
        </li>
      ))}
    </ul>
  );
}

function useActionDialog() {
  const [pending, setPending] = useState<{ task: WsTask; action: TaskAction } | null>(null);
  return {
    pending,
    open: (task: WsTask, action: TaskAction) => {
      setPending({ task, action });
    },
    close: () => {
      setPending(null);
    },
  };
}

/** "Việc của tôi": what waits for my review, my own tasks, and work my department has not assigned yet. */
export function WorkspaceMyTasks(props: PanelProps) {
  const { ws, snapshot, me } = props;
  const dialog = useActionDialog();
  const [showDone, setShowDone] = useState(false);
  const mine = tasksForMember(snapshot.tasks, me.id);
  const open = mine.filter((t) => t.status !== 'done' && t.status !== 'cancelled');
  const finished = mine.filter((t) => t.status === 'done' || t.status === 'cancelled');
  const review = tasksToReview(snapshot.tasks, me);
  const free = canManage(me, me.departmentId) ? unassignedTasks(snapshot.tasks, me.departmentId) : [];
  return (
    <div className="stack stack--xl">
      <FollowReminder snapshot={snapshot} me={me} now={props.now} />
      {review.length > 0 ? (
        <section className="stack stack--md" aria-labelledby="ws-review">
          <h2 id="ws-review" className="workspace__h2">
            Cần bạn duyệt
          </h2>
          <TaskList {...props} tasks={review} empty="" onAction={dialog.open} />
        </section>
      ) : null}
      <section className="stack stack--md" aria-labelledby="ws-mine">
        <h2 id="ws-mine" className="workspace__h2">
          Việc được giao cho tôi
        </h2>
        <TaskList {...props} tasks={open} empty="Bạn chưa có công việc đang thực hiện." onAction={dialog.open} />
        {finished.length > 0 ? (
          <Chip
            pressed={showDone}
            onClick={() => {
              setShowDone((v) => !v);
            }}
          >
            Việc đã kết thúc <span className="mono">{finished.length}</span>
          </Chip>
        ) : null}
        {showDone ? <TaskList {...props} tasks={finished} empty="" onAction={dialog.open} /> : null}
      </section>
      {free.length > 0 ? (
        <section className="stack stack--md" aria-labelledby="ws-free">
          <h2 id="ws-free" className="workspace__h2">
            Việc của ban chưa có người thực hiện
          </h2>
          <p className="workspace__note">Mở thẻ Công việc các ban và chọn Chỉnh sửa để giao việc cho thành viên.</p>
          <TaskList {...props} tasks={free} empty="" onAction={dialog.open} />
        </section>
      ) : null}
      <ActionDialog ws={ws} pending={dialog.pending} onClose={dialog.close} />
    </div>
  );
}

/** "Công việc các ban": a department's tasks (lead, then support), with the add and edit form for its managers. */
export function WorkspaceBoard(props: PanelProps) {
  const { ws, snapshot, me } = props;
  const dialog = useActionDialog();
  // A member of Ban Nhân sự opens on the first department they follow.
  const [dept, setDept] = useState<DepartmentId>(() => followedDepartments(snapshot.hrAssignments, me)[0] ?? me.departmentId);
  const [form, setForm] = useState<WsTask | DepartmentId | null>(null);
  const { lead, support } = tasksForDepartment(snapshot.tasks, dept);
  return (
    <div className="stack stack--lg">
      <div className="cluster cluster--sm" role="group" aria-label="Chọn ban">
        {snapshot.departments.map((d) => (
          <Chip
            key={d.id}
            pressed={dept === d.id}
            onClick={() => {
              setDept(d.id);
              setForm(null);
            }}
          >
            {d.shortName}
          </Chip>
        ))}
      </div>
      <ProgressPanel ws={ws} snapshot={snapshot} me={me} now={props.now} dept={dept} />
      {canManage(me, dept) && form === null ? (
        <div className="cluster">
          <Button
            variant="primary"
            iconStart="plus"
            onClick={() => {
              setForm(dept);
            }}
          >
            Thêm công việc
          </Button>
        </div>
      ) : null}
      {form === null ? null : (
        <TaskForm
          key={typeof form === 'string' ? form : form.id}
          ws={ws}
          snapshot={snapshot}
          me={me}
          initial={form}
          onClose={() => {
            setForm(null);
          }}
        />
      )}
      <section className="stack stack--md" aria-labelledby="ws-lead">
        <h2 id="ws-lead" className="workspace__h2">
          Phụ trách chính <span className="mono">{lead.length}</span>
        </h2>
        <TaskList {...props} tasks={lead} empty="Ban chưa có công việc." onAction={dialog.open} onEdit={setForm} />
      </section>
      <section className="stack stack--md" aria-labelledby="ws-support">
        <h2 id="ws-support" className="workspace__h2">
          Phối hợp <span className="mono">{support.length}</span>
        </h2>
        <TaskList {...props} tasks={support} empty="Ban chưa phối hợp công việc nào." onAction={dialog.open} onEdit={setForm} />
      </section>
      <ActionDialog ws={ws} pending={dialog.pending} onClose={dialog.close} />
    </div>
  );
}
