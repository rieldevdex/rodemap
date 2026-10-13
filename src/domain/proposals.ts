/**
 * Đề xuất hoạt động (students → Hội đồng Học sinh) and đề xuất hợp tác (club → club):
 * labels, validation, status, support and ordering. Pure.
 */
import { formatMonthYear, SCHOOL_YEAR, toIsoDateTime, toMillis, vnParts } from './dates';
import { charCount } from './moderation';
import {
  CATEGORY_CODES,
  GRADES,
  type ActivityProposal,
  type ActivityProposalDraft,
  type CollaborationDraft,
  type CollaborationProposal,
  type Grade,
  type Millis,
  type ProposalResponse,
  type ProposalStatus,
} from './types';

export const PROPOSAL_LIMITS = {
  titleMin: 8,
  titleMax: 100,
  descriptionMin: 40,
  descriptionMax: 600,
  noteMax: 300,
  /** A decline always explains itself. */
  declineNoteMin: 10,
} as const;

/** Status of a student's proposal, as students and HĐHS read it. */
export const ACTIVITY_STATUS_LABELS: Record<ProposalStatus, string> = {
  pending: 'Đang xem xét',
  accepted: 'Đã tiếp nhận',
  declined: 'Chưa tiếp nhận',
};

/** Status of a collaboration proposal, as clubs read it. */
export const COLLABORATION_STATUS_LABELS: Record<ProposalStatus, string> = {
  pending: 'Chờ phản hồi',
  accepted: 'Đã đồng ý hợp tác',
  declined: 'Đã từ chối',
};

const PHONE = /(?:\+84[ .-]?|\b0)\d(?:[ .-]?\d){8,9}\b/;
const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/;

/** True when the text looks like it holds a phone number or an e-mail address (never stored for students). */
export function hasContactDetails(text: string): boolean {
  return PHONE.test(text) || EMAIL.test(text);
}

const CONTACT_ERROR = 'Vui lòng không ghi số điện thoại, địa chỉ thư điện tử hoặc thông tin cá nhân.';

function lengthError(text: string, min: number, max: number, field: string): string | undefined {
  const n = charCount(text);
  if (n < min || n > max) return `${field} cần có từ ${String(min)} đến ${String(max)} ký tự.`;
  return hasContactDetails(text) ? CONTACT_ERROR : undefined;
}

export type ActivityDraftErrors = Partial<Record<keyof ActivityProposalDraft, string>>;

/** Formal Vietnamese messages per field; an empty object means the proposal can be sent. */
export function validateActivityDraft(d: ActivityProposalDraft, knownClubIds: ReadonlySet<string>): ActivityDraftErrors {
  const L = PROPOSAL_LIMITS;
  const errors: ActivityDraftErrors = {};
  const title = lengthError(d.title, L.titleMin, L.titleMax, 'Tên hoạt động');
  if (title) errors.title = title;
  if (d.category === null || !(CATEGORY_CODES as readonly string[]).includes(d.category)) errors.category = 'Vui lòng chọn lĩnh vực.';
  const description = lengthError(d.description, L.descriptionMin, L.descriptionMax, 'Phần mô tả');
  if (description) errors.description = description;
  if (d.grades.length === 0) errors.grades = 'Vui lòng chọn ít nhất một khối dự kiến tham gia.';
  else if (d.grades.some((g) => !GRADES.includes(g))) errors.grades = 'Danh sách khối không hợp lệ.';
  if (d.clubId !== null && !knownClubIds.has(d.clubId)) errors.clubId = 'Câu lạc bộ đã chọn không tồn tại.';
  return errors;
}

export type CollaborationDraftErrors = Partial<Record<keyof CollaborationDraft, string>>;

/** Months from the one containing `now` to the end of the school year: "2026-10", "2026-11"… */
export function proposalMonths(now: Millis): string[] {
  const end = vnParts(toMillis(SCHOOL_YEAR.end));
  const start = vnParts(Math.max(now, toMillis(SCHOOL_YEAR.start)));
  const months: string[] = [];
  let year = start.year;
  let month = start.month;
  while (year < end.year || (year === end.year && month <= end.month)) {
    months.push(`${String(year)}-${String(month).padStart(2, '0')}`);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return months;
}

/** "2026-11" → "Tháng 11/2026". */
export function proposalMonthLabel(month: string): string {
  return formatMonthYear(toMillis(`${month}-15`));
}

export function validateCollaborationDraft(
  d: CollaborationDraft,
  ctx: { fromClubId: string; knownClubIds: ReadonlySet<string>; now: Millis },
): CollaborationDraftErrors {
  const L = PROPOSAL_LIMITS;
  const errors: CollaborationDraftErrors = {};
  if (d.toClubId === '' || !ctx.knownClubIds.has(d.toClubId)) errors.toClubId = 'Vui lòng chọn câu lạc bộ đối tác.';
  else if (d.toClubId === ctx.fromClubId) errors.toClubId = 'Câu lạc bộ đối tác cần khác câu lạc bộ gửi đề xuất.';
  const title = lengthError(d.title, L.titleMin, L.titleMax, 'Tên hoạt động');
  if (title) errors.title = title;
  if (d.category === null || !(CATEGORY_CODES as readonly string[]).includes(d.category)) errors.category = 'Vui lòng chọn lĩnh vực.';
  const description = lengthError(d.description, L.descriptionMin, L.descriptionMax, 'Nội dung hợp tác');
  if (description) errors.description = description;
  if (!proposalMonths(ctx.now).includes(d.month)) errors.month = 'Vui lòng chọn tháng dự kiến trong năm học.';
  return errors;
}

/** The message for an answer that cannot be saved, or null. */
export function responseError(status: ProposalResponse['status'], note: string): string | null {
  const n = charCount(note);
  if (status === 'declined' && n < PROPOSAL_LIMITS.declineNoteMin) return `Vui lòng nêu lý do, tối thiểu ${String(PROPOSAL_LIMITS.declineNoteMin)} ký tự.`;
  if (n > PROPOSAL_LIMITS.noteMax) return `Phần phản hồi tối đa ${String(PROPOSAL_LIMITS.noteMax)} ký tự.`;
  return null;
}

export function proposalStatus(id: string, responses: Readonly<Record<string, ProposalResponse>>): ProposalStatus {
  return responses[id]?.status ?? 'pending';
}

/** Supporters from the sample data plus the demo student's own support. */
export function supportCount(p: ActivityProposal, supported: readonly string[]): number {
  return p.supporters + (supported.includes(p.id) ? 1 : 0);
}

const STATUS_ORDER: Record<ProposalStatus, number> = { pending: 0, accepted: 1, declined: 2 };

/** Pending first, then accepted, then declined; within each, most supported, then newest, then id. */
export function rankActivityProposals(
  proposals: readonly ActivityProposal[],
  responses: Readonly<Record<string, ProposalResponse>>,
  supported: readonly string[],
): ActivityProposal[] {
  return [...proposals].sort(
    (a, b) =>
      STATUS_ORDER[proposalStatus(a.id, responses)] - STATUS_ORDER[proposalStatus(b.id, responses)] ||
      supportCount(b, supported) - supportCount(a, supported) ||
      toMillis(b.submittedAt) - toMillis(a.submittedAt) ||
      a.id.localeCompare(b.id),
  );
}

/** Newest first, then id. */
export function newestCollaborations(list: readonly CollaborationProposal[]): CollaborationProposal[] {
  return [...list].sort((a, b) => toMillis(b.submittedAt) - toMillis(a.submittedAt) || a.id.localeCompare(b.id));
}

/** The proposal for a valid draft. */
export function activityProposalFromDraft(d: ActivityProposalDraft, opts: { id: string; now: Millis; authorGrade: Grade }): ActivityProposal {
  return {
    id: opts.id,
    title: d.title.trim(),
    category: d.category ?? 'TS',
    description: d.description.trim(),
    grades: [...new Set(d.grades)].sort((a, b) => a - b),
    clubId: d.clubId,
    authorGrade: opts.authorGrade,
    submittedAt: toIsoDateTime(opts.now),
    supporters: 0,
  };
}

/** The collaboration proposal for a valid draft. */
export function collaborationFromDraft(d: CollaborationDraft, opts: { id: string; now: Millis; fromClubId: string }): CollaborationProposal {
  return {
    id: opts.id,
    fromClubId: opts.fromClubId,
    toClubId: d.toClubId,
    title: d.title.trim(),
    category: d.category ?? 'TS',
    description: d.description.trim(),
    month: d.month,
    submittedAt: toIsoDateTime(opts.now),
  };
}
