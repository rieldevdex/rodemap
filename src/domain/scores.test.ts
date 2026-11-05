import { describe, expect, it } from 'vitest';
import { toMillis } from './dates';
import {
  BONUS_CAP,
  BONUS_LABELS,
  canDecide,
  canEditScore,
  canScore,
  canSendFeedback,
  draftFor,
  FEEDBACK_WINDOW_MS,
  feedbackDeadline,
  formatMonth,
  formatPoints,
  FRAMEWORK_LABELS,
  frameworkFor,
  GRADE_CONSEQUENCES,
  GRADE_LABELS,
  gradeFor,
  isMonthKey,
  leadScore,
  leadSuggestions,
  memberScore,
  memberTasksInMonth,
  monthKeyOf,
  monthStart,
  rowResult,
  scoringWindow,
  seesWholeSheet,
  SHEET_STATUS_LABELS,
  sheetActions,
  shiftMonth,
  taskStats,
  unscoredMembers,
  validateScoreDraft,
  visibleRows,
  type ScoreDraft,
  type TaskStats,
  type WsScore,
  type WsScoreSheet,
} from './scores';
import type { WsMember, WsRequest, WsTask } from './workspace';

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
    dueAt: '2026-11-20T23:59:00+07:00',
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
    fromMember: 'd-1',
    fromDepartment: 'design',
    toDepartment: 'pr',
    title: 'Gửi nội dung chữ',
    description: 'Nội dung chữ cho bài đăng 20/11.',
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

function row(overrides: Partial<WsScore> = {}): WsScore {
  return {
    memberId: 'm-1',
    framework: 'member',
    attendance: { present: 5, excused: 1, required: 6 },
    cooperation: 8,
    lead: null,
    bonuses: [],
    penalties: [],
    note: '',
    scoredBy: 'h-1',
    scoredAt: '2026-11-26T09:00:00+07:00',
    stats: null,
    feedback: '',
    feedbackAt: null,
    decision: '',
    decidedBy: null,
    decidedAt: null,
    ...overrides,
  };
}

function sheet(overrides: Partial<WsScoreSheet> = {}): WsScoreSheet {
  return { month: '2026-11', status: 'draft', publishedAt: null, finalizedAt: null, scores: [], ...overrides };
}

const NOW = toMillis('2026-11-26T09:00:00+07:00');
const mem = member();
const deputy = member({ id: 'p-1', position: 'pho_ban' });
const head = member({ id: 'h-1', position: 'truong_ban' });
const otherHead = member({ id: 'h-2', departmentId: 'design', position: 'truong_ban' });
const hr = member({ id: 'n-1', departmentId: 'hr' });
const chair = member({ id: 'b-1', departmentId: 'bdh', position: 'chu_tich' });
const vice = member({ id: 'b-2', departmentId: 'bdh', position: 'pho_chu_tich' });
const support = (note = 'Hỗ trợ Ban Design ngày 12/11') => ({ kind: 'support' as const, note });

describe('months', () => {
  it('names, shifts and bounds Vietnam calendar months', () => {
    expect(monthKeyOf(toMillis('2026-11-30T23:30:00+07:00'))).toBe('2026-11');
    expect(monthKeyOf(toMillis('2026-11-30T17:30:00Z'))).toBe('2026-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2027-01', -1)).toBe('2026-12');
    expect(shiftMonth('2026-11', -13)).toBe('2025-10');
    expect(monthStart('2026-11')).toBe(toMillis('2026-11-01T00:00:00+07:00'));
    expect(formatMonth('2026-11')).toBe('Tháng 11/2026');
    expect(isMonthKey('2026-11')).toBe(true);
    expect(isMonthKey('2026-13')).toBe(false);
    expect(() => formatMonth('11/2026')).toThrow(RangeError);
  });

  it('opens scoring from the 25th to the end of the 28th', () => {
    const { from, to } = scoringWindow('2026-11');
    expect(from).toBe(toMillis('2026-11-25T00:00:00+07:00'));
    expect(to).toBe(toMillis('2026-11-29T00:00:00+07:00'));
  });
});

describe('labels', () => {
  it('names frameworks, statuses, grades and bonuses in Vietnamese', () => {
    expect(FRAMEWORK_LABELS.lead).toBe('Khung trưởng ban');
    expect(SHEET_STATUS_LABELS.final).toBe('Đã chốt');
    expect(GRADE_LABELS.tot).toBe('Tốt');
    expect(GRADE_CONSEQUENCES.can_cai_thien).toContain('kế hoạch cải thiện');
    expect(BONUS_LABELS.support).toBe('Hỗ trợ ban khác');
    expect(formatPoints(87.25)).toBe('87,25');
  });
});

describe('permissions', () => {
  it('uses the head framework for heads and the whole of BĐH', () => {
    expect(frameworkFor(mem)).toBe('member');
    expect(frameworkFor(deputy)).toBe('member');
    expect(frameworkFor(head)).toBe('lead');
    expect(frameworkFor(vice)).toBe('lead');
  });

  it('lets BĐH score anyone but themselves, a head their deputies and members, a deputy the members', () => {
    expect(canScore(chair, vice)).toBe(true);
    expect(canScore(chair, chair)).toBe(false);
    expect(canScore(chair, otherHead)).toBe(true);
    expect(canScore(head, mem)).toBe(true);
    expect(canScore(head, deputy)).toBe(true);
    expect(canScore(head, otherHead)).toBe(false);
    expect(canScore(head, member({ id: 'x', departmentId: 'design' }))).toBe(false);
    expect(canScore(deputy, mem)).toBe(true);
    expect(canScore(deputy, head)).toBe(false);
    expect(canScore(mem, member({ id: 'm-2' }))).toBe(false);
    expect(canScore(hr, mem)).toBe(false);
  });

  it('shows the whole sheet to BĐH and Nhân sự, the scored members to a head, and a member their own row once published', () => {
    const members = [mem, deputy, head, otherHead, hr, chair, member({ id: 'gone', status: 'inactive' }), member({ id: 'left', status: 'inactive' })];
    const draft = sheet({ scores: [row({ memberId: 'left' })] });
    expect(seesWholeSheet(hr)).toBe(true);
    expect(seesWholeSheet(head)).toBe(false);
    expect(visibleRows(draft, hr, members).map((m) => m.id)).toEqual(['m-1', 'p-1', 'h-1', 'h-2', 'n-1', 'b-1', 'left']);
    expect(visibleRows(draft, head, members).map((m) => m.id)).toEqual(['m-1', 'p-1', 'left']);
    expect(visibleRows(draft, mem, members)).toEqual([]);
    expect(visibleRows(sheet({ status: 'published' }), mem, members).map((m) => m.id)).toEqual(['m-1']);
  });

  it('lets the scorers edit while scoring, then only BĐH, and nobody once final', () => {
    expect(canEditScore(sheet(), head, mem)).toBe(true);
    expect(canEditScore(sheet({ status: 'published' }), head, mem)).toBe(false);
    expect(canEditScore(sheet({ status: 'published' }), chair, head)).toBe(true);
    expect(canEditScore(sheet({ status: 'published' }), chair, chair)).toBe(false);
    expect(canEditScore(sheet({ status: 'final' }), chair, head)).toBe(false);
  });

  it('takes feedback for 3 days after publication, from members who have a row', () => {
    const published = sheet({ status: 'published', publishedAt: '2026-11-29T09:00:00+07:00', scores: [row()] });
    const deadline = feedbackDeadline(published);
    expect(deadline).toBe(toMillis('2026-11-29T09:00:00+07:00') + FEEDBACK_WINDOW_MS);
    expect(feedbackDeadline(sheet())).toBeNull();
    expect(canSendFeedback(published, mem, toMillis('2026-12-01T09:00:00+07:00'))).toBe(true);
    expect(canSendFeedback(published, mem, toMillis('2026-12-02T09:00:00+07:00'))).toBe(false);
    expect(canSendFeedback(published, deputy, NOW)).toBe(false);
    expect(canSendFeedback(sheet({ scores: [row()] }), mem, NOW)).toBe(false);
    expect(canSendFeedback(sheet({ status: 'published', scores: [row()] }), mem, NOW)).toBe(false);
  });

  it('lets BĐH answer feedback on other members while the sheet is published', () => {
    const published = sheet({ status: 'published' });
    expect(canDecide(published, chair, row({ feedback: 'Em đã nộp đúng hạn bài ngày 12/11.' }))).toBe(true);
    expect(canDecide(published, chair, row())).toBe(false);
    expect(canDecide(published, head, row({ feedback: 'Em đã nộp đúng hạn bài ngày 12/11.' }))).toBe(false);
    expect(canDecide(published, chair, row({ memberId: 'b-1', feedback: 'Phản hồi về điểm của tôi.' }))).toBe(false);
    expect(canDecide(sheet({ status: 'final' }), chair, row({ feedback: 'Em đã nộp đúng hạn bài ngày 12/11.' }))).toBe(false);
  });

  it('offers BĐH to publish a draft and to finalise a published sheet', () => {
    expect(sheetActions(sheet(), chair)).toEqual(['publish']);
    expect(sheetActions(sheet({ status: 'published' }), chair)).toEqual(['finalize']);
    expect(sheetActions(sheet({ status: 'final' }), chair)).toEqual([]);
    expect(sheetActions(sheet(), head)).toEqual([]);
  });

  it('lists active members without a score', () => {
    const s = sheet({ scores: [row(), row({ memberId: 'p-1', scoredAt: null })] });
    expect(unscoredMembers(s, [mem, deputy, head, member({ id: 'gone', status: 'inactive' })]).map((m) => m.id)).toEqual(['p-1', 'h-1']);
  });
});

describe('points', () => {
  const due = '2026-11-20T23:59:00+07:00';
  const onTime = (q: number) => task({ status: 'done', quality: q, dueAt: due, submittedAt: '2026-11-19T10:00:00+07:00' });
  const late = (q: number) => task({ status: 'done', quality: q, dueAt: due, submittedAt: '2026-11-21T10:00:00+07:00' });
  const full = { present: 1, excused: 0, required: 1 };

  it('reproduces the Masterplan example: 87,25 points, Tốt', () => {
    // 10 tasks, 9 done (8 on time), quality 4/5 on average, 5 of 6 sessions plus 1 excused, E = 8, one support.
    const tasks = [...Array.from({ length: 8 }, () => onTime(4)), late(4), task({ status: 'in_progress' })];
    const result = memberScore({ stats: taskStats(tasks), attendance: { present: 5, excused: 1, required: 6 }, cooperation: 8, bonuses: [support()], penalties: [] });
    expect(result.parts.map((p) => p.value)).toEqual([31.5, 20, 12, 13.75, 8]);
    expect(result).toMatchObject({ base: 85.25, bonus: 2, penalty: 0, total: 87.25, grade: 'tot' });
  });

  it('counts half on-time credit for an accepted late notice, ignores cancelled tasks and credits undated hand-ins', () => {
    const stats = taskStats([{ ...late(5), lateApproved: true }, task({ status: 'submitted', dueAt: null, submittedAt: '2026-11-03T10:00:00+07:00' }), task({ status: 'cancelled' })]);
    expect(stats).toEqual({ assigned: 2, done: 1, qualitySum: 5, qualityCount: 1, onTimeCredit: 1.5 });
    const result = memberScore({ stats, attendance: { present: 0, excused: 0, required: 0 }, cooperation: 12, bonuses: [], penalties: [] });
    expect(result.parts.map((p) => p.value)).toEqual([17.5, 25, 11.25, 15, 10]);
  });

  it('rates quality on rated tasks only', () => {
    const unrated = task({ status: 'done', quality: null, submittedAt: '2026-11-19T10:00:00+07:00' });
    expect(memberScore({ stats: taskStats([unrated, onTime(3)]), attendance: full, cooperation: 10, bonuses: [], penalties: [] }).parts[1]?.value).toBe(15);
  });

  it('gives full points to a month with nothing assigned, caps bonuses and never drops below 0', () => {
    const empty: TaskStats = { assigned: 0, done: 0, qualitySum: 0, qualityCount: 0, onTimeCredit: 0 };
    const base = { stats: empty, attendance: { present: 0, excused: 0, required: 0 }, cooperation: 10, penalties: [] };
    expect(memberScore({ ...base, bonuses: [] }).total).toBe(100);
    expect(memberScore({ ...base, bonuses: [support(), support(), support(), support()] }).bonus).toBe(6);
    const all = (['event_lead', 'initiative', 'excellent', 'overtime', 'support'] as const).map((kind) => ({ kind, note: 'Có xác nhận của trưởng ban' }));
    expect(memberScore({ ...base, bonuses: all }).bonus).toBe(BONUS_CAP);
    const awful = memberScore({ stats: taskStats([task()]), attendance: { present: 0, excused: 0, required: 4 }, cooperation: -3, bonuses: [], penalties: [{ points: 10, reason: 'Đăng bài chưa qua duyệt' }, { points: -20, reason: 'Sai sót nghiêm trọng' }] });
    expect(awful).toMatchObject({ penalty: 30, total: 0, grade: 'khong_dat' });
  });

  it('adds up the head criteria within their limits and grades every band', () => {
    const result = leadScore({ results: 40, quality: 18, team: 17.5, coordination: 12, attendance: -1 }, [], [{ points: 5, reason: 'Thái độ chưa phù hợp' }]);
    expect(result.parts.map((p) => [p.key, p.value, p.max])).toEqual([
      ['results', 35, 35],
      ['quality', 18, 20],
      ['team', 17.5, 20],
      ['coordination', 12, 15],
      ['attendance', 0, 10],
    ]);
    expect(result).toMatchObject({ base: 82.5, penalty: 5, total: 77.5, grade: 'tot' });
    expect([95, 80, 65, 45, 10].map(gradeFor)).toEqual(['xuat_sac', 'tot', 'dat', 'can_cai_thien', 'khong_dat']);
  });

  it('computes a row from its frozen figures, or the live ones while scoring', () => {
    const live = taskStats([onTime(5), task()]);
    expect(rowResult(row(), live)?.parts[0]?.value).toBe(17.5);
    expect(rowResult(row({ stats: { assigned: 1, done: 1, qualitySum: 5, qualityCount: 1, onTimeCredit: 1 } }), live)?.parts[0]?.value).toBe(35);
    expect(rowResult(row({ framework: 'lead', attendance: null, cooperation: null, lead: { results: 30, quality: 20, team: 20, coordination: 15, attendance: 10 } }), live)?.total).toBe(95);
    expect(rowResult(row({ framework: 'lead', lead: null }), live)).toBeNull();
    expect(rowResult(row({ cooperation: null }), live)).toBeNull();
    expect(rowResult(row({ scoredAt: null }), live)).toBeNull();
    expect(rowResult(undefined, live)).toBeNull();
  });

  it('picks a member’s tasks due in the month', () => {
    const tasks = [task({ id: 'in', dueAt: '2026-11-30T23:59:00+07:00' }), task({ id: 'next', dueAt: '2026-12-01T00:00:00+07:00' }), task({ id: 'undated', dueAt: null }), task({ id: 'else', assigneeId: 'm-9' })];
    expect(memberTasksInMonth(tasks, 'm-1', '2026-11').map((t) => t.id)).toEqual(['in']);
  });

  it('suggests the measurable head criteria from the department’s tasks and request slips', () => {
    const tasks = [onTime(4), late(5), task({ departmentId: 'design', status: 'done', quality: 1 })];
    const slips = [request({ answeredAt: '2026-11-10T09:00:00+07:00', status: 'accepted' }), request({ id: 'r-2', answeredAt: '2026-11-16T09:00:00+07:00', status: 'accepted' }), request({ id: 'r-3' }), request({ id: 'r-4', dueAt: '2026-12-02T23:59:00+07:00' })];
    expect(leadSuggestions(tasks, slips, 'pr', '2026-11')).toEqual({ results: 17.5, quality: 18, coordination: 5 });
    expect(leadSuggestions([], [], 'hr', '2026-11')).toEqual({ results: 35, quality: 20, coordination: 15 });
  });
});

describe('drafts', () => {
  const ok: ScoreDraft = {
    memberId: 'm-1',
    attendance: { present: 5, excused: 1, required: 6 },
    cooperation: 8.5,
    lead: { results: 30, quality: 18, team: 17.5, coordination: 15, attendance: 10 },
    bonuses: [support()],
    penalties: [{ points: 10, reason: 'Đăng bài khi chưa qua duyệt' }],
    note: '',
  };

  it('accepts complete drafts of both frameworks', () => {
    expect(validateScoreDraft(ok, 'member')).toEqual({});
    expect(validateScoreDraft(ok, 'lead')).toEqual({});
  });

  it('flags impossible attendance, cooperation off the half-point scale and criteria over their limit', () => {
    expect(Object.keys(validateScoreDraft({ ...ok, attendance: { present: 6, excused: 1, required: 6 }, cooperation: 8.3 }, 'member')).sort()).toEqual(['attendance', 'cooperation']);
    expect(validateScoreDraft({ ...ok, attendance: { present: 1.5, excused: 0, required: 6 } }, 'member').attendance).toBeDefined();
    expect(validateScoreDraft({ ...ok, cooperation: 11 }, 'member').cooperation).toBeDefined();
    expect(validateScoreDraft({ ...ok, cooperation: -1 }, 'member').cooperation).toBeDefined();
    expect(validateScoreDraft({ ...ok, lead: { ...ok.lead, team: 21 } }, 'lead').lead).toBeDefined();
    expect(validateScoreDraft({ ...ok, lead: { ...ok.lead, team: -0.5 } }, 'lead').lead).toBeDefined();
    expect(validateScoreDraft({ ...ok, lead: { ...ok.lead, team: Number.NaN } }, 'lead').lead).toBeDefined();
  });

  it('requires evidence for every bonus and penalty, penalties within 5–20 points, and a short note', () => {
    expect(validateScoreDraft({ ...ok, bonuses: [support('Có')] }, 'member').bonuses).toBeDefined();
    expect(validateScoreDraft({ ...ok, penalties: [{ points: 3, reason: 'Đăng bài khi chưa qua duyệt' }] }, 'member').penalties).toBeDefined();
    expect(validateScoreDraft({ ...ok, penalties: [{ points: 25, reason: 'Đăng bài khi chưa qua duyệt' }] }, 'member').penalties).toBeDefined();
    expect(validateScoreDraft({ ...ok, penalties: [{ points: 7.5, reason: 'Đăng bài khi chưa qua duyệt' }] }, 'member').penalties).toBeDefined();
    expect(validateScoreDraft({ ...ok, penalties: [{ points: 10, reason: 'Vi phạm' }] }, 'member').penalties).toBeDefined();
    expect(validateScoreDraft({ ...ok, note: 'x'.repeat(1001) }, 'member').note).toBeDefined();
  });

  it('starts from the stored row, or from an empty draft with the suggested criteria', () => {
    expect(draftFor('m-1', row({ note: 'Đúng hạn cả tháng.' }), { results: 35, quality: 20, coordination: 15 })).toMatchObject({ cooperation: 8, note: 'Đúng hạn cả tháng.' });
    expect(draftFor('h-1', undefined, { results: 30, quality: 16, coordination: 15 })).toEqual({
      memberId: 'h-1',
      attendance: { present: 0, excused: 0, required: 0 },
      cooperation: 0,
      lead: { results: 30, quality: 16, coordination: 15, team: 0, attendance: 0 },
      bonuses: [],
      penalties: [],
      note: '',
    });
  });
});
