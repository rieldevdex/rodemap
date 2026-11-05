import { describe, expect, it } from 'vitest';
import { toMillis } from './dates';
import {
  availableActions,
  canManage,
  canManageMembers,
  canNotifyLate,
  daysLeft,
  isBdh,
  isClosed,
  isOverdue,
  MEMBER_STATUS_LABELS,
  membersOf,
  POSITION_LABELS,
  REQUEST_STATUS_LABELS,
  requestsFromDepartment,
  requestsToDepartment,
  sortTasks,
  TASK_ACTION_LABELS,
  TASK_STATUS_LABELS,
  tasksForDepartment,
  tasksForMember,
  tasksToReview,
  unassignedTasks,
  validateMemberDraft,
  validateRequestDraft,
  validateTaskDraft,
  fromDateTimeInput,
  toDateTimeInput,
  workspaceErrorMessage,
  type MemberDraft,
  type WsMember,
  type WsRequest,
  type WsTask,
} from './workspace';

const NOW = toMillis('2026-11-05T09:00:00+07:00');

function member(overrides: Partial<WsMember> = {}): WsMember {
  return {
    id: 'm-1',
    fullName: 'Thành viên A',
    className: '10A1',
    departmentId: 'pr',
    position: 'thanh_vien',
    status: 'active',
    joinedOn: '2026-11-04',
    email: null,
    linked: true,
    ...overrides,
  };
}

function task(overrides: Partial<WsTask> = {}): WsTask {
  return {
    id: 't-1',
    title: 'Viết bài đăng',
    description: '',
    output: '',
    departmentId: 'pr',
    collaborators: [],
    assigneeId: 'm-1',
    dueAt: '2026-11-10T23:59:00+07:00',
    status: 'todo',
    link: '',
    quality: null,
    revisionCount: 0,
    submittedAt: null,
    completedAt: null,
    lateNoticeAt: null,
    lateNoticeReason: '',
    lateApproved: false,
    source: 'manual',
    requestId: null,
    createdBy: null,
    createdAt: '2026-11-04T09:00:00+07:00',
    updatedAt: '2026-11-04T09:00:00+07:00',
    ...overrides,
  };
}

function request(overrides: Partial<WsRequest> = {}): WsRequest {
  return {
    id: 'r-1',
    fromMember: 'm-1',
    fromDepartment: 'pr',
    toDepartment: 'design',
    title: 'Thiết kế bài đăng',
    description: 'Thiết kế bài đăng chào mừng 20/11.',
    dueAt: '2026-11-14T23:59:00+07:00',
    status: 'open',
    answerNote: '',
    answeredBy: null,
    answeredAt: null,
    taskId: null,
    createdAt: '2026-11-04T09:00:00+07:00',
    ...overrides,
  };
}

const head = member({ id: 'h-1', position: 'truong_ban' });
const deputy = member({ id: 'h-2', position: 'pho_ban' });
const bdh = member({ id: 'b-1', departmentId: 'bdh', position: 'chu_tich' });
const other = member({ id: 'o-1', departmentId: 'design', position: 'truong_ban' });

describe('labels', () => {
  it('names every position, status and action in Vietnamese', () => {
    expect(POSITION_LABELS.pho_chu_tich).toBe('Phó Chủ tịch');
    expect(MEMBER_STATUS_LABELS.pending).toBe('Chờ xác nhận');
    expect(TASK_STATUS_LABELS.changes_requested).toBe('Cần chỉnh sửa');
    expect(TASK_ACTION_LABELS.complete).toBe('Duyệt hoàn thành');
    expect(REQUEST_STATUS_LABELS.open).toBe('Chờ tiếp nhận');
  });
});

describe('permissions', () => {
  it('lets Ban điều hành manage everything and heads or deputies their own department', () => {
    expect(isBdh(bdh)).toBe(true);
    expect(isBdh(head)).toBe(false);
    expect(canManage(bdh, 'design')).toBe(true);
    expect(canManage(head, 'pr')).toBe(true);
    expect(canManage(deputy, 'pr')).toBe(true);
    expect(canManage(head, 'design')).toBe(false);
    expect(canManage(member(), 'pr')).toBe(false);
  });

  it('lets only Ban điều hành and Ban Nhân sự keep the member database', () => {
    expect(canManageMembers(bdh)).toBe(true);
    expect(canManageMembers(member({ departmentId: 'hr' }))).toBe(true);
    expect(canManageMembers(head)).toBe(false);
  });
});

describe('availableActions', () => {
  const me = member();

  it('offers the assignee start, submit and a late notice on an open task', () => {
    expect(availableActions(task(), me, NOW)).toEqual(['start', 'submit', 'notify_late']);
    expect(availableActions(task({ status: 'in_progress' }), me, NOW)).toEqual(['submit', 'notify_late']);
    expect(availableActions(task({ status: 'changes_requested' }), me, NOW)).toEqual(['start', 'submit', 'notify_late']);
  });

  it('offers nothing to the assignee once handed in or closed, and nothing to other members', () => {
    expect(availableActions(task({ status: 'submitted' }), me, NOW)).toEqual([]);
    expect(availableActions(task({ status: 'done' }), me, NOW)).toEqual([]);
    expect(availableActions(task({ assigneeId: 'x' }), me, NOW)).toEqual([]);
    expect(availableActions(task(), other, NOW)).toEqual([]);
  });

  it('offers the manager review, late approval, cancel and reopen', () => {
    expect(availableActions(task({ status: 'submitted' }), head, NOW)).toEqual(['complete', 'request_changes', 'cancel']);
    expect(availableActions(task({ lateNoticeAt: '2026-11-04T09:00:00+07:00' }), head, NOW)).toEqual(['start', 'submit', 'approve_late', 'cancel']);
    expect(availableActions(task({ lateNoticeAt: '2026-11-04T09:00:00+07:00', lateApproved: true }), head, NOW)).toEqual(['start', 'submit', 'cancel']);
    expect(availableActions(task({ status: 'done' }), bdh, NOW)).toEqual(['reopen']);
    expect(availableActions(task({ status: 'cancelled' }), head, NOW)).toEqual(['reopen']);
  });

  it('accepts a late notice only once, at least 24 hours before an existing deadline', () => {
    expect(canNotifyLate(task(), NOW)).toBe(true);
    expect(canNotifyLate(task({ dueAt: null }), NOW)).toBe(false);
    expect(canNotifyLate(task({ lateNoticeAt: '2026-11-04T09:00:00+07:00' }), NOW)).toBe(false);
    expect(canNotifyLate(task({ status: 'submitted' }), NOW)).toBe(false);
    expect(canNotifyLate(task({ dueAt: '2026-11-06T09:00:00+07:00' }), NOW)).toBe(true);
    expect(canNotifyLate(task({ dueAt: '2026-11-06T08:59:00+07:00' }), NOW)).toBe(false);
  });
});

describe('views', () => {
  const a = task({ id: 'a', status: 'todo', dueAt: '2026-11-12T23:59:00+07:00' });
  const b = task({ id: 'b', status: 'changes_requested', dueAt: '2026-11-20T23:59:00+07:00' });
  const c = task({ id: 'c', status: 'todo', dueAt: null, title: 'B' });
  const d = task({ id: 'd', status: 'todo', dueAt: null, title: 'A' });
  const e = task({ id: 'e', status: 'done', dueAt: '2026-11-01T23:59:00+07:00' });

  it('sorts open work first by deadline, undated last, finished work at the end', () => {
    expect(sortTasks([e, c, a, d, b]).map((t) => t.id)).toEqual(['b', 'a', 'd', 'c', 'e']);
  });

  it('knows closed, overdue and days left', () => {
    expect(isClosed(task({ status: 'cancelled' }))).toBe(true);
    expect(isClosed(a)).toBe(false);
    const late = task({ dueAt: '2026-11-04T23:59:00+07:00' });
    expect(isOverdue(late, NOW)).toBe(true);
    expect(isOverdue({ ...late, status: 'submitted' }, NOW)).toBe(false);
    expect(isOverdue({ ...late, status: 'done' }, NOW)).toBe(false);
    expect(isOverdue(c, NOW)).toBe(false);
    expect(isOverdue(a, NOW)).toBe(false);
    expect(daysLeft(a, NOW)).toBe(7);
    expect(daysLeft(c, NOW)).toBeNull();
  });

  it('filters by member, department, review queue and unassigned work', () => {
    const mine = task({ id: 'mine', assigneeId: 'm-1' });
    const theirs = task({ id: 'theirs', assigneeId: 'm-2', departmentId: 'design', collaborators: ['pr'] });
    const free = task({ id: 'free', assigneeId: null });
    const freeDone = task({ id: 'free-done', assigneeId: null, status: 'done' });
    const submitted = task({ id: 'sub', status: 'submitted' });
    const noticed = task({ id: 'notice', lateNoticeAt: '2026-11-04T09:00:00+07:00' });
    const noticedClosed = task({ id: 'notice-closed', lateNoticeAt: '2026-11-04T09:00:00+07:00', status: 'cancelled' });
    const all = [mine, theirs, free, freeDone, submitted, noticed, noticedClosed];
    expect(tasksForMember(all, 'm-2').map((t) => t.id)).toEqual(['theirs']);
    const pr = tasksForDepartment(all, 'pr');
    expect(pr.lead.map((t) => t.id)).not.toContain('theirs');
    expect(pr.support.map((t) => t.id)).toEqual(['theirs']);
    expect(tasksToReview(all, head).map((t) => t.id).sort()).toEqual(['notice', 'sub']);
    expect(tasksToReview(all, member())).toEqual([]);
    expect(unassignedTasks(all, 'pr').map((t) => t.id)).toEqual(['free']);
  });

  it('splits request slips by direction', () => {
    const out = request({ id: 'out' });
    const incoming = request({ id: 'in', fromDepartment: 'design', toDepartment: 'pr' });
    expect(requestsToDepartment([out, incoming], 'pr').map((r) => r.id)).toEqual(['in']);
    expect(requestsFromDepartment([out, incoming], 'pr').map((r) => r.id)).toEqual(['out']);
  });

  it('lists a department by rank, then by name', () => {
    const list = [
      member({ id: '1', fullName: 'Bình', position: 'thanh_vien' }),
      member({ id: '2', fullName: 'An', position: 'thanh_vien' }),
      member({ id: '3', fullName: 'Cường', position: 'truong_ban' }),
      member({ id: '4', fullName: 'Dung', departmentId: 'design' }),
    ];
    expect(membersOf(list, 'pr').map((m) => m.id)).toEqual(['3', '2', '1']);
  });
});

describe('validation', () => {
  const members = [member({ id: 'pr-1' }), member({ id: 'pr-2', status: 'inactive' }), member({ id: 'ds-1', departmentId: 'design' })];
  const draft = { title: 'Viết caption', description: '', output: '', departmentId: 'pr' as const, collaborators: [], assigneeId: 'pr-1', dueAt: null };

  it('checks a task draft', () => {
    expect(validateTaskDraft(draft, members)).toEqual({});
    expect(validateTaskDraft({ ...draft, assigneeId: null }, members)).toEqual({});
    expect(Object.keys(validateTaskDraft({ ...draft, title: 'ab', assigneeId: 'ds-1', collaborators: ['pr'] }, members)).sort()).toEqual([
      'assigneeId',
      'collaborators',
      'title',
    ]);
    expect(validateTaskDraft({ ...draft, assigneeId: 'pr-2' }, members).assigneeId).toBeDefined();
    expect(validateTaskDraft({ ...draft, assigneeId: 'ghost' }, members).assigneeId).toBeDefined();
  });

  it('checks a request slip', () => {
    const slip = { toDepartment: 'design' as const, title: 'Thiết kế bài đăng', description: 'Thiết kế bài đăng chào mừng 20/11.', dueAt: '2026-11-14T23:59:00+07:00' };
    expect(validateRequestDraft(slip, 'pr', NOW)).toEqual({});
    expect(Object.keys(validateRequestDraft({ toDepartment: 'pr', title: 'Ngắn', description: 'Ngắn', dueAt: '2026-11-01T00:00:00+07:00' }, 'pr', NOW)).sort()).toEqual([
      'description',
      'dueAt',
      'title',
      'toDepartment',
    ]);
    expect(validateRequestDraft({ ...slip, dueAt: '' }, 'pr', NOW).dueAt).toBeDefined();
  });

  it('checks a member draft, school address included', () => {
    const ok: MemberDraft = { fullName: 'Nguyễn Văn A', className: '10a4', departmentId: 'pr', position: 'thanh_vien', email: '', status: 'active' };
    expect(validateMemberDraft(ok)).toEqual({});
    expect(validateMemberDraft({ ...ok, email: 'Ten.Ho123@stu.vinschool.edu.vn' })).toEqual({});
    expect(validateMemberDraft({ ...ok, departmentId: 'bdh', position: 'thu_ky' })).toEqual({});
    expect(validateMemberDraft({ ...ok, departmentId: 'bdh', position: 'thanh_vien' })).toEqual({});
    expect(Object.keys(validateMemberDraft({ ...ok, fullName: 'A', className: '13A1', email: 'a@gmail.com' })).sort()).toEqual(['className', 'email', 'fullName']);
    expect(validateMemberDraft({ ...ok, departmentId: 'bdh', position: 'truong_ban' }).position).toBeDefined();
    expect(validateMemberDraft({ ...ok, position: 'chu_tich' }).position).toBeDefined();
  });
});

describe('workspaceErrorMessage', () => {
  it('turns server error codes into formal messages', () => {
    expect(workspaceErrorMessage('notice_too_late')).toBe('Chỉ được báo trễ hạn trước hạn nộp ít nhất 24 giờ.');
    expect(workspaceErrorMessage('ERROR: forbidden (SQLSTATE 42501)')).toBe('Bạn không có quyền thực hiện thao tác này.');
    expect(workspaceErrorMessage('something else')).toBe('Đã xảy ra lỗi. Vui lòng thử lại sau ít phút.');
  });
});

describe('date-time inputs', () => {
  it('round-trips Vietnam wall-clock values', () => {
    expect(toDateTimeInput('2026-11-09T16:59:00+00:00')).toBe('2026-11-09T23:59');
    expect(toDateTimeInput(null)).toBe('');
    expect(fromDateTimeInput('2026-11-09T23:59')).toBe('2026-11-09T23:59:00+07:00');
    expect(fromDateTimeInput('')).toBeNull();
  });
});
