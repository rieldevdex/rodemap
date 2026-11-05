/**
 * Bảng điểm tháng of Không gian HĐHS (Masterplan, "Hệ thống điểm thành viên"). Pure: no clock, no
 * network. The permissions and the sheet workflow mirror the database functions hdhs_scores,
 * hdhs_save_score, hdhs_score_feedback, hdhs_score_decision and hdhs_score_sheet, which enforce
 * them; the points are computed here, from the inputs the heads enter and from the tasks.
 *
 * Workflow of a month: draft (heads score their members, BĐH scores the heads and each other,
 * Ban Nhân sự checks) → published (each member sees their score and has 3 days to respond; BĐH
 * answers and may adjust) → final (locked). The task figures (A, B, C) are frozen when the sheet
 * is published and again when it is finalised.
 */
import { DAY_MS, toMillis, vnParts } from './dates';
import type { IsoDateTime, Millis } from './types';
import { isBdh, type DepartmentId, type Position, type WsMember, type WsRequest, type WsTask } from './workspace';

/* ── Months ───────────────────────────────────────────────────────── */

/** "2026-11": a calendar month in Vietnam time. */
export type MonthKey = string;

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function isMonthKey(value: string): boolean {
  return MONTH_RE.test(value);
}

function monthParts(key: MonthKey): { year: number; month: number } {
  const m = MONTH_RE.exec(key);
  if (!m) throw new RangeError(`Invalid month: ${key}`);
  return { year: Number(m[1]), month: Number(m[2]) };
}

const pad2 = (n: number) => String(n).padStart(2, '0');

export function monthKeyOf(ms: Millis): MonthKey {
  const p = vnParts(ms);
  return `${p.year}-${pad2(p.month)}`;
}

/** The month `delta` months after `key` (negative for earlier months). */
export function shiftMonth(key: MonthKey, delta: number): MonthKey {
  const { year, month } = monthParts(key);
  const index = year * 12 + (month - 1) + delta;
  return `${Math.floor(index / 12)}-${pad2((index % 12) + 1)}`;
}

/** 00:00 on the first day of the month, Vietnam time. */
export function monthStart(key: MonthKey): Millis {
  return toMillis(`${key}-01`);
}

/** "Tháng 11/2026" */
export function formatMonth(key: MonthKey): string {
  const { year, month } = monthParts(key);
  return `Tháng ${month}/${year}`;
}

/** Heads score between the 25th and the 28th (Masterplan, step 2): from 00:00 on the 25th to the end of the 28th. */
export function scoringWindow(key: MonthKey): { from: Millis; to: Millis } {
  const from = monthStart(key) + 24 * DAY_MS;
  return { from, to: from + 4 * DAY_MS };
}

function inMonth(iso: IsoDateTime | null, key: MonthKey): boolean {
  if (iso === null) return false;
  const ms = toMillis(iso);
  return ms >= monthStart(key) && ms < monthStart(shiftMonth(key, 1));
}

/* ── Frameworks and inputs ────────────────────────────────────────── */

/** "member": A–E for members and deputy heads; "lead": the heads' five criteria, also used for the cross-review of BĐH. */
export type ScoreFramework = 'member' | 'lead';

export function frameworkFor(member: Pick<WsMember, 'departmentId' | 'position'>): ScoreFramework {
  return member.departmentId === 'bdh' || member.position === 'truong_ban' ? 'lead' : 'member';
}

export const FRAMEWORK_LABELS: Record<ScoreFramework, string> = {
  member: 'Khung thành viên',
  lead: 'Khung trưởng ban',
};

/** A 35 · B 25 · C 15 · D 15 · E 10 */
export const MEMBER_WEIGHTS = { completion: 35, quality: 25, onTime: 15, attendance: 15, cooperation: 10 } as const;

export interface LeadCriteria {
  results: number;
  quality: number;
  team: number;
  coordination: number;
  attendance: number;
}

export const LEAD_KEYS = ['results', 'quality', 'team', 'coordination', 'attendance'] as const satisfies readonly (keyof LeadCriteria)[];

export const LEAD_WEIGHTS: LeadCriteria = { results: 35, quality: 20, team: 20, coordination: 15, attendance: 10 };

export const LEAD_LABELS: Record<keyof LeadCriteria, string> = {
  results: 'Kết quả công việc của ban',
  quality: 'Chất lượng đầu ra của ban',
  team: 'Quản lí đội ngũ',
  coordination: 'Phối hợp liên ban và tuân thủ quy trình',
  attendance: 'Chuyên cần và gương mẫu',
};

/** Bonus points per month, all kinds together. */
export const BONUS_CAP = 15;
/** "Hỗ trợ ban khác": at most +6 per month. */
export const SUPPORT_CAP = 6;

export const BONUS_KINDS = ['event_lead', 'initiative', 'excellent', 'overtime', 'support'] as const;
export type BonusKind = (typeof BONUS_KINDS)[number];

export const BONUS_POINTS: Record<BonusKind, number> = { event_lead: 5, initiative: 5, excellent: 3, overtime: 3, support: 2 };

export const BONUS_LABELS: Record<BonusKind, string> = {
  event_lead: 'Đảm nhận vai trò chính trong sự kiện',
  initiative: 'Sáng kiến được Ban điều hành áp dụng',
  excellent: 'Sản phẩm được ghi nhận xuất sắc',
  overtime: 'Làm thêm đột xuất trước sự kiện lớn',
  support: 'Hỗ trợ ban khác',
};

/** Penalties range from 5 to 20 points (Masterplan, "Điểm trừ"). */
export const PENALTY_MIN = 5;
export const PENALTY_MAX = 20;

export interface BonusEntry {
  kind: BonusKind;
  /** The evidence ("căn cứ"): which event, initiative or request. */
  note: string;
}

export interface PenaltyEntry {
  /** Positive: 10 means −10. */
  points: number;
  reason: string;
}

export interface AttendanceTally {
  present: number;
  excused: number;
  /** Required sessions in the month: department meetings, general meetings, assigned events. */
  required: number;
}

/** The task figures behind A, B and C, computed from the tasks due in the month. */
export interface TaskStats {
  assigned: number;
  done: number;
  qualitySum: number;
  qualityCount: number;
  /** Tasks handed in on time, counting 0.5 for a late hand-in after an accepted notice. */
  onTimeCredit: number;
}

/* ── Sheets and rows (as hdhs_scores returns them) ───────────────── */

export type SheetStatus = 'draft' | 'published' | 'final';

export const SHEET_STATUS_LABELS: Record<SheetStatus, string> = {
  draft: 'Đang chấm',
  published: 'Đã công bố, nhận phản hồi',
  final: 'Đã chốt',
};

export interface WsScore {
  memberId: string;
  framework: ScoreFramework;
  /** Member framework only. */
  attendance: AttendanceTally | null;
  /** E, 0–10; member framework only. */
  cooperation: number | null;
  /** Lead framework only. */
  lead: LeadCriteria | null;
  bonuses: BonusEntry[];
  penalties: PenaltyEntry[];
  /** The scorer's evidence and comments. */
  note: string;
  scoredBy: string | null;
  scoredAt: IsoDateTime | null;
  /** Frozen task figures once the sheet is published; null while scoring. */
  stats: TaskStats | null;
  feedback: string;
  feedbackAt: IsoDateTime | null;
  decision: string;
  decidedBy: string | null;
  decidedAt: IsoDateTime | null;
}

export interface WsScoreSheet {
  month: MonthKey;
  status: SheetStatus;
  publishedAt: IsoDateTime | null;
  finalizedAt: IsoDateTime | null;
  /** Only the rows the signed-in member may see. */
  scores: WsScore[];
}

/** Members have 3 days after publication to respond (Masterplan, step 5). */
export const FEEDBACK_WINDOW_MS = 3 * DAY_MS;

/* ── Permissions (mirror hdhs.can_score and the sheet functions) ──── */

const SCORED_BY_HEAD: readonly Position[] = ['pho_ban', 'thanh_vien'];

/**
 * BĐH scores the heads and cross-reviews each other (never themselves); a head scores the deputy
 * heads and members of their department; a deputy head scores the members.
 */
export function canScore(me: WsMember, target: WsMember): boolean {
  if (me.id === target.id) return false;
  if (isBdh(me)) return true;
  if (me.departmentId !== target.departmentId) return false;
  if (me.position === 'truong_ban') return SCORED_BY_HEAD.includes(target.position);
  return me.position === 'pho_ban' && target.position === 'thanh_vien';
}

/** BĐH and Ban Nhân sự see the whole sheet; Ban Nhân sự checks and compiles but does not score. */
export function seesWholeSheet(me: Pick<WsMember, 'departmentId'>): boolean {
  return me.departmentId === 'bdh' || me.departmentId === 'hr';
}

/** The rows shown to `me`: the whole sheet, the members they score, and their own once published. */
export function visibleRows(sheet: WsScoreSheet, me: WsMember, members: readonly WsMember[]): WsMember[] {
  return members.filter((m) => {
    if (m.status !== 'active' && !sheet.scores.some((s) => s.memberId === m.id)) return false;
    if (seesWholeSheet(me) || canScore(me, m)) return true;
    return m.id === me.id && sheet.status !== 'draft';
  });
}

/** While scoring, the scorers edit; once published, only BĐH adjusts (never their own row); a final sheet is locked. */
export function canEditScore(sheet: WsScoreSheet, me: WsMember, target: WsMember): boolean {
  if (sheet.status === 'draft') return canScore(me, target);
  return sheet.status === 'published' && isBdh(me) && me.id !== target.id;
}

export function feedbackDeadline(sheet: WsScoreSheet): Millis | null {
  return sheet.publishedAt === null ? null : toMillis(sheet.publishedAt) + FEEDBACK_WINDOW_MS;
}

export function canSendFeedback(sheet: WsScoreSheet, me: WsMember, now: Millis): boolean {
  const deadline = feedbackDeadline(sheet);
  return sheet.status === 'published' && deadline !== null && now < deadline && sheet.scores.some((s) => s.memberId === me.id);
}

/** BĐH answers a member's feedback before the sheet is final. */
export function canDecide(sheet: WsScoreSheet, me: WsMember, row: WsScore): boolean {
  return sheet.status === 'published' && isBdh(me) && me.id !== row.memberId && row.feedback !== '';
}

export type SheetAction = 'publish' | 'finalize';

export function sheetActions(sheet: WsScoreSheet, me: WsMember): SheetAction[] {
  if (!isBdh(me)) return [];
  if (sheet.status === 'draft') return ['publish'];
  return sheet.status === 'published' ? ['finalize'] : [];
}

/** Active members who still have no score this month (publishing waits for them). */
export function unscoredMembers(sheet: WsScoreSheet, members: readonly WsMember[]): WsMember[] {
  return members.filter((m) => m.status === 'active' && !sheet.scores.some((s) => s.memberId === m.id && s.scoredAt !== null));
}

/* ── Computing the points ─────────────────────────────────────────── */

/** On time: handed in by the deadline, or 0.5 when late after a notice the head accepted. */
function onTimeCredit(t: WsTask): number {
  if (t.submittedAt === null || (t.status !== 'done' && t.status !== 'submitted')) return 0;
  if (t.dueAt === null || toMillis(t.submittedAt) <= toMillis(t.dueAt)) return 1;
  return t.lateApproved ? 0.5 : 0;
}

/** The figures of a set of tasks; cancelled tasks do not count. */
export function taskStats(tasks: readonly WsTask[]): TaskStats {
  const counted = tasks.filter((t) => t.status !== 'cancelled');
  const done = counted.filter((t) => t.status === 'done');
  const ratings = done.flatMap((t) => (t.quality === null ? [] : [t.quality]));
  return {
    assigned: counted.length,
    done: done.length,
    qualitySum: ratings.reduce((s, q) => s + q, 0),
    qualityCount: ratings.length,
    onTimeCredit: counted.reduce((s, t) => s + onTimeCredit(t), 0),
  };
}

/** Tasks of a member that fall due in the month (as the server counts them when it freezes the figures). */
export function memberTasksInMonth(tasks: readonly WsTask[], memberId: string, month: MonthKey): WsTask[] {
  return tasks.filter((t) => t.assigneeId === memberId && inMonth(t.dueAt, month));
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const clamp = (n: number, max: number) => Math.min(max, Math.max(0, n));

export type Grade = 'xuat_sac' | 'tot' | 'dat' | 'can_cai_thien' | 'khong_dat';

export const GRADE_LABELS: Record<Grade, string> = {
  xuat_sac: 'Xuất sắc',
  tot: 'Tốt',
  dat: 'Đạt',
  can_cai_thien: 'Cần cải thiện',
  khong_dat: 'Không đạt',
};

/** What each grade leads to (Masterplan, "Xếp loại"). */
export const GRADE_CONSEQUENCES: Record<Grade, string> = {
  xuat_sac: 'Ban điều hành ghi nhận chính thức; giữ mức này cả học kì được ưu tiên đề cử vị trí quản lí.',
  tot: 'Không có hệ quả đặc biệt.',
  dat: 'Trưởng ban góp ý cuối tháng.',
  can_cai_thien: 'Họp riêng với trưởng ban và lập kế hoạch cải thiện cho tháng sau.',
  khong_dat: 'Cảnh cáo bằng văn bản; hai tháng liên tiếp dưới 40 điểm, Ban điều hành xem xét tạm dừng hoặc chấm dứt tư cách thành viên.',
};

export function gradeFor(total: number): Grade {
  if (total >= 90) return 'xuat_sac';
  if (total >= 75) return 'tot';
  if (total >= 60) return 'dat';
  if (total >= 40) return 'can_cai_thien';
  return 'khong_dat';
}

export interface ScorePart {
  key: string;
  label: string;
  value: number;
  max: number;
}

export interface ScoreResult {
  parts: ScorePart[];
  base: number;
  bonus: number;
  penalty: number;
  total: number;
  grade: Grade;
}

/** Bonuses are capped at +15 a month, support at +6; penalties add up; the total never drops below 0. */
function finish(parts: ScorePart[], bonuses: readonly BonusEntry[], penalties: readonly PenaltyEntry[]): ScoreResult {
  const base = round2(parts.reduce((s, p) => s + p.value, 0));
  const support = Math.min(SUPPORT_CAP, bonuses.filter((b) => b.kind === 'support').length * BONUS_POINTS.support);
  const others = bonuses.filter((b) => b.kind !== 'support').reduce((s, b) => s + BONUS_POINTS[b.kind], 0);
  const bonus = Math.min(BONUS_CAP, support + others);
  const penalty = penalties.reduce((s, p) => s + Math.abs(p.points), 0);
  const total = round2(Math.max(0, base + bonus - penalty));
  return { parts, base, bonus, penalty, total, grade: gradeFor(total) };
}

export interface MemberScoreInput {
  stats: TaskStats;
  attendance: AttendanceTally;
  cooperation: number;
  bonuses: readonly BonusEntry[];
  penalties: readonly PenaltyEntry[];
}

/**
 * A–E exactly as the Masterplan defines them. An unfinished task counts against both A and C
 * (intended). A month without tasks, ratings or required sessions gives the full points of that
 * criterion (nothing was missed).
 */
export function memberScore(input: MemberScoreInput): ScoreResult {
  const { stats: s, attendance: a } = input;
  const w = MEMBER_WEIGHTS;
  const completion = s.assigned === 0 ? w.completion : (s.done / s.assigned) * w.completion;
  const quality = s.qualityCount === 0 ? w.quality : (s.qualitySum / s.qualityCount / 5) * w.quality;
  const onTime = s.assigned === 0 ? w.onTime : (s.onTimeCredit / s.assigned) * w.onTime;
  const attendance = a.required <= 0 ? w.attendance : Math.min(1, (a.present + 0.5 * a.excused) / a.required) * w.attendance;
  const cooperation = clamp(input.cooperation, w.cooperation);
  return finish(
    [
      { key: 'A', label: 'A. Hoàn thành nhiệm vụ', value: round2(completion), max: w.completion },
      { key: 'B', label: 'B. Chất lượng sản phẩm', value: round2(quality), max: w.quality },
      { key: 'C', label: 'C. Đúng hạn', value: round2(onTime), max: w.onTime },
      { key: 'D', label: 'D. Chuyên cần', value: round2(attendance), max: w.attendance },
      { key: 'E', label: 'E. Hợp tác và thái độ', value: round2(cooperation), max: w.cooperation },
    ],
    input.bonuses,
    input.penalties,
  );
}

export function leadScore(criteria: LeadCriteria, bonuses: readonly BonusEntry[], penalties: readonly PenaltyEntry[]): ScoreResult {
  return finish(
    LEAD_KEYS.map((key) => ({ key, label: LEAD_LABELS[key], value: round2(clamp(criteria[key], LEAD_WEIGHTS[key])), max: LEAD_WEIGHTS[key] })),
    bonuses,
    penalties,
  );
}

/**
 * The points of a scored row. The task figures are the frozen ones once the sheet is published,
 * otherwise those of the tasks as they stand. Null for a row nobody has scored yet.
 */
export function rowResult(row: WsScore | undefined, liveStats: TaskStats): ScoreResult | null {
  if (row?.scoredAt == null) return null;
  if (row.framework === 'lead') return row.lead === null ? null : leadScore(row.lead, row.bonuses, row.penalties);
  if (row.attendance === null || row.cooperation === null) return null;
  return memberScore({ stats: row.stats ?? liveStats, attendance: row.attendance, cooperation: row.cooperation, bonuses: row.bonuses, penalties: row.penalties });
}

/**
 * Suggested values for the criteria of a head that the tasks and request slips can measure:
 * results (department tasks due in the month and completed on time), quality (their average
 * rating) and coordination (incoming slips due in the month and answered by their deadline).
 * BĐH reviews and may change them; the other two criteria are judged by BĐH.
 */
export function leadSuggestions(tasks: readonly WsTask[], requests: readonly WsRequest[], dept: DepartmentId, month: MonthKey): Pick<LeadCriteria, 'results' | 'quality' | 'coordination'> {
  const s = taskStats(tasks.filter((t) => t.departmentId === dept && inMonth(t.dueAt, month)));
  const slips = requests.filter((r) => r.toDepartment === dept && inMonth(r.dueAt, month));
  const answered = slips.filter((r) => r.answeredAt !== null && toMillis(r.answeredAt) <= toMillis(r.dueAt)).length;
  const half = (n: number) => Math.round(n * 2) / 2;
  return {
    results: s.assigned === 0 ? LEAD_WEIGHTS.results : half((s.onTimeCredit / s.assigned) * LEAD_WEIGHTS.results),
    quality: s.qualityCount === 0 ? LEAD_WEIGHTS.quality : half((s.qualitySum / s.qualityCount / 5) * LEAD_WEIGHTS.quality),
    coordination: slips.length === 0 ? LEAD_WEIGHTS.coordination : half((answered / slips.length) * LEAD_WEIGHTS.coordination),
  };
}

/* ── Drafts and validation (mirror hdhs_save_score) ───────────────── */

export interface ScoreDraft {
  memberId: string;
  attendance: AttendanceTally;
  cooperation: number;
  lead: LeadCriteria;
  bonuses: BonusEntry[];
  penalties: PenaltyEntry[];
  note: string;
}

export type ScoreDraftErrors = Partial<Record<'attendance' | 'cooperation' | 'lead' | 'bonuses' | 'penalties' | 'note', string>>;

const NOTE_MIN = 10;
const isHalfStep = (n: number) => Number.isFinite(n) && Number.isInteger(n * 2);

export function validateScoreDraft(draft: ScoreDraft, framework: ScoreFramework): ScoreDraftErrors {
  const errors: ScoreDraftErrors = {};
  if (framework === 'member') {
    const a = draft.attendance;
    const counts = [a.present, a.excused, a.required];
    if (!counts.every((n) => Number.isInteger(n) && n >= 0 && n <= 60) || a.present + a.excused > a.required) {
      errors.attendance = 'Số buổi cần là số nguyên; số buổi có mặt và vắng có phép không vượt quá số buổi bắt buộc.';
    }
    if (!isHalfStep(draft.cooperation) || draft.cooperation < 0 || draft.cooperation > MEMBER_WEIGHTS.cooperation) {
      errors.cooperation = 'Điểm hợp tác và thái độ từ 0 đến 10, bước 0,5.';
    }
  } else if (!LEAD_KEYS.every((k) => isHalfStep(draft.lead[k]) && draft.lead[k] >= 0 && draft.lead[k] <= LEAD_WEIGHTS[k])) {
    errors.lead = 'Mỗi tiêu chí từ 0 đến mức tối đa của tiêu chí đó, bước 0,5.';
  }
  if (draft.bonuses.some((b) => b.note.trim().length < NOTE_MIN)) errors.bonuses = 'Mỗi điểm cộng cần ghi căn cứ (tối thiểu 10 ký tự).';
  if (draft.penalties.some((p) => !Number.isInteger(p.points) || p.points < PENALTY_MIN || p.points > PENALTY_MAX || p.reason.trim().length < NOTE_MIN)) {
    errors.penalties = `Mỗi điểm trừ từ ${PENALTY_MIN} đến ${PENALTY_MAX} điểm và cần ghi rõ vi phạm (tối thiểu 10 ký tự).`;
  }
  if (draft.note.length > 1000) errors.note = 'Nhận xét tối đa 1000 ký tự.';
  return errors;
}

/** A draft from a stored row, or an empty one with the suggested lead criteria. */
export function draftFor(memberId: string, row: WsScore | undefined, suggested: Pick<LeadCriteria, 'results' | 'quality' | 'coordination'>): ScoreDraft {
  return {
    memberId,
    attendance: row?.attendance ?? { present: 0, excused: 0, required: 0 },
    cooperation: row?.cooperation ?? 0,
    lead: row?.lead ?? { ...suggested, team: 0, attendance: 0 },
    bonuses: row?.bonuses ?? [],
    penalties: row?.penalties ?? [],
    note: row?.note ?? '',
  };
}

/** "87,25" */
export function formatPoints(n: number): string {
  return String(n).replace('.', ',');
}
