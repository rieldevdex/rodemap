/**
 * Không gian HĐHS: the Student Council's workspace (members, tasks, request slips between
 * departments; the monthly points live in scores.ts). Pure: no clock, no network. The rules mirror the database
 * functions in supabase/migrations (hdhs_*), which enforce them on the server; this module
 * decides what the screens offer.
 */
import { calendarDaysBetween, HOUR_MS, toIsoDateTime, toMillis } from './dates';
import type { IsoDate, IsoDateTime, Millis } from './types';

/* ── Departments and positions ───────────────────────────────────── */

export const DEPARTMENT_IDS = ['bdh', 'pr', 'hr', 'tai-chinh', 'design', 'su-kien'] as const;
export type DepartmentId = (typeof DEPARTMENT_IDS)[number];

export interface WsDepartment {
  id: DepartmentId;
  name: string;
  shortName: string;
}

export const POSITIONS = ['chu_tich', 'pho_chu_tich', 'thu_ky', 'truong_ban', 'pho_ban', 'thanh_vien'] as const;
export type Position = (typeof POSITIONS)[number];

export const POSITION_LABELS: Record<Position, string> = {
  chu_tich: 'Chủ tịch',
  pho_chu_tich: 'Phó Chủ tịch',
  thu_ky: 'Thư ký',
  truong_ban: 'Trưởng ban',
  pho_ban: 'Phó ban',
  thanh_vien: 'Thành viên',
};

/** Positions of Ban điều hành; the department heads and members use the other three. */
export const BDH_POSITIONS: readonly Position[] = ['chu_tich', 'pho_chu_tich', 'thu_ky'];

export type MemberStatus = 'active' | 'pending' | 'inactive';

export const MEMBER_STATUS_LABELS: Record<MemberStatus, string> = {
  active: 'Đang hoạt động',
  pending: 'Chờ xác nhận',
  inactive: 'Ngừng hoạt động',
};

export interface WsMember {
  id: string;
  fullName: string;
  className: string;
  departmentId: DepartmentId;
  position: Position;
  status: MemberStatus;
  joinedOn: IsoDate;
  /** The school address used to sign in; only Ban điều hành and Ban Nhân sự receive it. */
  email: string | null;
  /** The member has signed in at least once. */
  linked: boolean;
}

/* ── Tasks ────────────────────────────────────────────────────────── */

export type TaskStatus = 'todo' | 'in_progress' | 'submitted' | 'changes_requested' | 'done' | 'cancelled';

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'Được giao',
  in_progress: 'Đang thực hiện',
  submitted: 'Chờ duyệt',
  changes_requested: 'Cần chỉnh sửa',
  done: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

export type TaskSource = 'masterplan' | 'request' | 'manual';

export interface WsTask {
  id: string;
  title: string;
  description: string;
  output: string;
  /** The department in charge ("phụ trách chính"); exactly one per task. */
  departmentId: DepartmentId;
  /** Departments that take part ("phối hợp"). */
  collaborators: DepartmentId[];
  assigneeId: string | null;
  dueAt: IsoDateTime | null;
  status: TaskStatus;
  link: string;
  /** 1–5, given by the head when the task is completed. */
  quality: number | null;
  revisionCount: number;
  submittedAt: IsoDateTime | null;
  completedAt: IsoDateTime | null;
  /** The assignee warned of a delay at least 24 hours before the deadline. */
  lateNoticeAt: IsoDateTime | null;
  lateNoticeReason: string;
  lateApproved: boolean;
  source: TaskSource;
  requestId: string | null;
  createdBy: string | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export type TaskAction = 'start' | 'submit' | 'notify_late' | 'approve_late' | 'request_changes' | 'complete' | 'cancel' | 'reopen';

export const TASK_ACTION_LABELS: Record<TaskAction, string> = {
  start: 'Bắt đầu thực hiện',
  submit: 'Nộp sản phẩm',
  notify_late: 'Báo trễ hạn',
  approve_late: 'Đồng ý gia hạn',
  request_changes: 'Yêu cầu chỉnh sửa',
  complete: 'Duyệt hoàn thành',
  cancel: 'Hủy công việc',
  reopen: 'Mở lại',
};

/** A delay must be announced at least this long before the deadline (Masterplan, tiêu chí C). */
export const LATE_NOTICE_MS = 24 * HOUR_MS;
/** At most two rounds of changes between PR and Design. */
export const MAX_REVISIONS = 2;

/* ── Request slips ("phiếu yêu cầu") ──────────────────────────────── */

export type RequestStatus = 'open' | 'accepted' | 'declined';

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  open: 'Chờ tiếp nhận',
  accepted: 'Đã tiếp nhận',
  declined: 'Không tiếp nhận',
};

export interface WsRequest {
  id: string;
  fromMember: string;
  fromDepartment: DepartmentId;
  toDepartment: DepartmentId;
  title: string;
  description: string;
  dueAt: IsoDateTime;
  status: RequestStatus;
  answerNote: string;
  answeredBy: string | null;
  answeredAt: IsoDateTime | null;
  taskId: string | null;
  createdAt: IsoDateTime;
}

export interface WsSnapshot {
  /** The signed-in member's id. */
  me: string;
  departments: WsDepartment[];
  members: WsMember[];
  tasks: WsTask[];
  requests: WsRequest[];
}

/* ── Permissions (mirror hdhs.can_manage) ────────────────────────── */

export function isBdh(me: Pick<WsMember, 'departmentId'>): boolean {
  return me.departmentId === 'bdh';
}

/** Ban điều hành manages every department; a head or deputy head manages their own. */
export function canManage(me: Pick<WsMember, 'departmentId' | 'position'>, dept: DepartmentId): boolean {
  if (isBdh(me)) return true;
  return me.departmentId === dept && (me.position === 'truong_ban' || me.position === 'pho_ban');
}

/** Ban điều hành and Ban Nhân sự keep the member database. */
export function canManageMembers(me: Pick<WsMember, 'departmentId'>): boolean {
  return me.departmentId === 'bdh' || me.departmentId === 'hr';
}

const OPEN_STATUSES: readonly TaskStatus[] = ['todo', 'in_progress', 'changes_requested'];

/** The actions the workspace offers this member on this task, in display order. */
export function availableActions(task: WsTask, me: WsMember, now: Millis): TaskAction[] {
  const manager = canManage(me, task.departmentId);
  const assignee = task.assigneeId === me.id;
  const actions: TaskAction[] = [];
  if ((assignee || manager) && (task.status === 'todo' || task.status === 'changes_requested')) actions.push('start');
  if ((assignee || manager) && OPEN_STATUSES.includes(task.status)) actions.push('submit');
  if (assignee && canNotifyLate(task, now)) actions.push('notify_late');
  if (manager && task.lateNoticeAt !== null && !task.lateApproved) actions.push('approve_late');
  if (manager && task.status === 'submitted') actions.push('complete', 'request_changes');
  if (manager && task.status !== 'done' && task.status !== 'cancelled') actions.push('cancel');
  if (manager && (task.status === 'done' || task.status === 'cancelled')) actions.push('reopen');
  return actions;
}

/** A delay may be announced once, while the task is open and the deadline is at least 24 hours away. */
export function canNotifyLate(task: WsTask, now: Millis): boolean {
  if (task.dueAt === null || task.lateNoticeAt !== null || !OPEN_STATUSES.includes(task.status)) return false;
  return now <= toMillis(task.dueAt) - LATE_NOTICE_MS;
}

/* ── Views ────────────────────────────────────────────────────────── */

const ACTIVE_ORDER: Record<TaskStatus, number> = {
  changes_requested: 0,
  in_progress: 1,
  todo: 2,
  submitted: 3,
  done: 4,
  cancelled: 5,
};

/** Open work first (changes requested, then in progress, then to do), each by deadline; finished work last. */
export function sortTasks(tasks: readonly WsTask[]): WsTask[] {
  const due = (t: WsTask) => (t.dueAt === null ? Number.POSITIVE_INFINITY : toMillis(t.dueAt));
  return [...tasks].sort((a, b) => ACTIVE_ORDER[a.status] - ACTIVE_ORDER[b.status] || due(a) - due(b) || a.title.localeCompare(b.title, 'vi'));
}

export function isClosed(task: Pick<WsTask, 'status'>): boolean {
  return task.status === 'done' || task.status === 'cancelled';
}

/** Past its deadline and not handed in yet. */
export function isOverdue(task: WsTask, now: Millis): boolean {
  if (task.dueAt === null || isClosed(task) || task.status === 'submitted') return false;
  return now > toMillis(task.dueAt);
}

/** Calendar days left until the deadline (negative once passed), or null without a deadline. */
export function daysLeft(task: Pick<WsTask, 'dueAt'>, now: Millis): number | null {
  return task.dueAt === null ? null : calendarDaysBetween(now, toMillis(task.dueAt));
}

export function tasksForMember(tasks: readonly WsTask[], memberId: string): WsTask[] {
  return sortTasks(tasks.filter((t) => t.assigneeId === memberId));
}

/** Tasks a department leads, then those it takes part in. */
export function tasksForDepartment(tasks: readonly WsTask[], dept: DepartmentId): { lead: WsTask[]; support: WsTask[] } {
  return {
    lead: sortTasks(tasks.filter((t) => t.departmentId === dept)),
    support: sortTasks(tasks.filter((t) => t.departmentId !== dept && t.collaborators.includes(dept))),
  };
}

/** Tasks waiting for this member's decision: submitted or late notices in the departments they manage. */
export function tasksToReview(tasks: readonly WsTask[], me: WsMember): WsTask[] {
  return sortTasks(
    tasks.filter((t) => canManage(me, t.departmentId) && (t.status === 'submitted' || (t.lateNoticeAt !== null && !t.lateApproved && !isClosed(t)))),
  );
}

/** Open tasks of a department that nobody has taken yet. */
export function unassignedTasks(tasks: readonly WsTask[], dept: DepartmentId): WsTask[] {
  return sortTasks(tasks.filter((t) => t.departmentId === dept && t.assigneeId === null && !isClosed(t)));
}

export function requestsToDepartment(requests: readonly WsRequest[], dept: DepartmentId): WsRequest[] {
  return requests.filter((r) => r.toDepartment === dept);
}

export function requestsFromDepartment(requests: readonly WsRequest[], dept: DepartmentId): WsRequest[] {
  return requests.filter((r) => r.fromDepartment === dept);
}

/** Members of a department: Ban điều hành by rank, heads before deputies before members, then by name. */
export function membersOf(members: readonly WsMember[], dept: DepartmentId): WsMember[] {
  return members
    .filter((m) => m.departmentId === dept)
    .sort((a, b) => POSITIONS.indexOf(a.position) - POSITIONS.indexOf(b.position) || a.fullName.localeCompare(b.fullName, 'vi'));
}

/* ── Drafts and validation ────────────────────────────────────────── */

export interface TaskDraft {
  title: string;
  description: string;
  output: string;
  departmentId: DepartmentId;
  collaborators: DepartmentId[];
  assigneeId: string | null;
  dueAt: IsoDateTime | null;
}

export type TaskDraftErrors = Partial<Record<'title' | 'assigneeId' | 'collaborators', string>>;

export function validateTaskDraft(d: TaskDraft, members: readonly WsMember[]): TaskDraftErrors {
  const errors: TaskDraftErrors = {};
  const title = d.title.trim().length;
  if (title < 3 || title > 200) errors.title = 'Tên công việc cần có từ 3 đến 200 ký tự.';
  if (d.assigneeId !== null) {
    const member = members.find((m) => m.id === d.assigneeId);
    if (member?.departmentId !== d.departmentId || member.status !== 'active') errors.assigneeId = 'Người thực hiện cần là thành viên đang hoạt động của ban phụ trách.';
  }
  if (d.collaborators.includes(d.departmentId)) errors.collaborators = 'Ban phụ trách chính không đồng thời là ban phối hợp.';
  return errors;
}

export interface RequestDraft {
  toDepartment: DepartmentId;
  title: string;
  description: string;
  dueAt: IsoDateTime;
}

export type RequestDraftErrors = Partial<Record<keyof RequestDraft, string>>;

export function validateRequestDraft(d: RequestDraft, fromDepartment: DepartmentId, now: Millis): RequestDraftErrors {
  const errors: RequestDraftErrors = {};
  if (d.toDepartment === fromDepartment) errors.toDepartment = 'Phiếu yêu cầu được gửi tới ban khác.';
  const title = d.title.trim().length;
  if (title < 5 || title > 160) errors.title = 'Tên yêu cầu cần có từ 5 đến 160 ký tự.';
  const description = d.description.trim().length;
  if (description < 10 || description > 2000) errors.description = 'Mô tả cần có từ 10 đến 2000 ký tự, gồm mục đích, sản phẩm cần nhận và yêu cầu cụ thể.';
  if (d.dueAt === '' || toMillis(d.dueAt) <= now) errors.dueAt = 'Hạn cần sau thời điểm hiện tại.';
  return errors;
}

export interface MemberDraft {
  fullName: string;
  className: string;
  departmentId: DepartmentId;
  position: Position;
  email: string;
  status: MemberStatus;
}

export type MemberDraftErrors = Partial<Record<keyof MemberDraft, string>>;

export const SCHOOL_EMAIL_DOMAIN = 'stu.vinschool.edu.vn';
const CLASS_RE = /^(6|7|8|9|10|11|12)[A-Z]\d{0,2}$/u;
const EMAIL_RE = /^[a-z0-9._%+-]+@stu\.vinschool\.edu\.vn$/u;

export function validateMemberDraft(d: MemberDraft): MemberDraftErrors {
  const errors: MemberDraftErrors = {};
  const name = d.fullName.trim().length;
  if (name < 2 || name > 80) errors.fullName = 'Họ và tên cần có từ 2 đến 80 ký tự.';
  if (!CLASS_RE.test(d.className.trim().toUpperCase())) errors.className = 'Lớp cần có dạng 10A4 (khối 6 đến 12).';
  const bdhPosition = BDH_POSITIONS.includes(d.position);
  if (d.departmentId === 'bdh' && !bdhPosition && d.position !== 'thanh_vien') errors.position = 'Ban điều hành gồm Chủ tịch, Phó Chủ tịch và Thư ký.';
  if (d.departmentId !== 'bdh' && bdhPosition) errors.position = 'Chủ tịch, Phó Chủ tịch và Thư ký thuộc Ban điều hành.';
  const email = d.email.trim().toLowerCase();
  if (email !== '' && !EMAIL_RE.test(email)) errors.email = `Địa chỉ thư điện tử cần thuộc tên miền @${SCHOOL_EMAIL_DOMAIN}.`;
  return errors;
}

/* ── Server errors (raised by the hdhs_* database functions) ─────── */

const ERROR_MESSAGES: Record<string, string> = {
  not_member: 'Tài khoản chưa có trong danh sách thành viên Hội đồng Học sinh đang hoạt động.',
  forbidden: 'Bạn không có quyền thực hiện thao tác này.',
  not_found: 'Không tìm thấy nội dung. Vui lòng tải lại trang.',
  invalid_transition: 'Thao tác không còn phù hợp với trạng thái hiện tại của công việc. Vui lòng tải lại trang.',
  link_required: 'Vui lòng nhập đường dẫn tới sản phẩm (tối thiểu 8 ký tự).',
  note_required: 'Vui lòng nêu lý do hoặc nội dung cần chỉnh sửa (tối thiểu 10 ký tự).',
  notice_too_late: 'Chỉ được báo trễ hạn trước hạn nộp ít nhất 24 giờ.',
  quality_required: 'Vui lòng chấm chất lượng sản phẩm từ 1 đến 5.',
  invalid_score: 'Điểm nhập chưa hợp lệ. Vui lòng kiểm tra lại các ô được đánh dấu.',
  invalid_month: 'Tháng chấm điểm không hợp lệ.',
  unscored: 'Còn thành viên chưa được chấm điểm, nên chưa thể công bố bảng điểm.',
  sheet_locked: 'Bảng điểm tháng này đã chốt hoặc đã công bố, không thể chỉnh sửa ở bước này.',
  feedback_closed: 'Thời hạn gửi phản hồi về bảng điểm đã kết thúc.',
  network: 'Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại.',
};

/** The Vietnamese message for an error code or a server message that contains one. */
export function workspaceErrorMessage(raw: string): string {
  const match = Object.entries(ERROR_MESSAGES).find(([key]) => raw.includes(key));
  return match === undefined ? 'Đã xảy ra lỗi. Vui lòng thử lại sau ít phút.' : match[1];
}

/* ── Form values ──────────────────────────────────────────────────── */

/** "2026-11-09T23:59" in Vietnam time for <input type="datetime-local">, or "" without a date. */
export function toDateTimeInput(iso: IsoDateTime | null): string {
  return iso === null ? '' : toIsoDateTime(toMillis(iso)).slice(0, 16);
}

/** The value of <input type="datetime-local">, read as Vietnam time; null when empty. */
export function fromDateTimeInput(value: string): IsoDateTime | null {
  return value === '' ? null : `${value}:00+07:00`;
}
