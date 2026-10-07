/** Moderation workflow for club submissions. Pure. */
import { DAY_MS, HOUR_MS, SCHOOL_YEAR, addDays, formatDate, isSameVnDay, toMillis } from './dates';
import { foldVietnamese } from './text';
import type {
  EventDraft,
  EventStatus,
  IsoDateTime,
  Millis,
  ReviewAction,
  ReviewActor,
  ReviewNote,
  Submission,
} from './types';

const TRANSITIONS: Record<ReviewAction, { from: readonly EventStatus[]; to: EventStatus; needsReason: boolean }> = {
  submit: { from: ['draft'], to: 'pending', needsReason: false },
  resubmit: { from: ['changes_requested'], to: 'pending', needsReason: false },
  approve: { from: ['pending'], to: 'approved', needsReason: false },
  request_changes: { from: ['pending'], to: 'changes_requested', needsReason: true },
  reject: { from: ['pending'], to: 'rejected', needsReason: true },
};

export function canTransition(from: EventStatus, action: ReviewAction): boolean {
  return TRANSITIONS[action].from.includes(from);
}

export function reviewNeedsReason(action: ReviewAction): boolean {
  return TRANSITIONS[action].needsReason;
}

/**
 * Applies a review action to a submission whose event currently has `status`.
 * Returns the submission with the new history note and the new event status.
 * Throws on an invalid transition or a missing reason.
 */
export function applyReview(
  sub: Submission,
  status: EventStatus,
  action: ReviewAction,
  at: IsoDateTime,
  reason?: string,
): { submission: Submission; status: EventStatus } {
  const rule = TRANSITIONS[action];
  if (!rule.from.includes(status)) {
    throw new Error(`Invalid transition: ${action} from ${status}`);
  }
  const trimmed = reason?.trim() ?? '';
  if (rule.needsReason && trimmed === '') {
    throw new Error(`A reason is required for ${action}`);
  }
  const actor: ReviewActor = action === 'submit' || action === 'resubmit' ? 'club' : 'hdhs';
  const note: ReviewNote = trimmed === '' ? { at, actor, action } : { at, actor, action, reason: trimmed };
  return {
    submission: { ...sub, history: [...sub.history, note] },
    status: rule.to,
  };
}

/* ── Submission form validation ─────────────────────────────────────── */

/** One formal Vietnamese message per invalid field; empty object when the draft is valid. */
export type ValidationErrors = Partial<Record<keyof EventDraft, string>>;

export const DRAFT_LIMITS = {
  titleMin: 8,
  titleMax: 120,
  summaryMin: 40,
  summaryMax: 400,
  descriptionMin: 80,
  capacityMin: 1,
  capacityMax: 2000,
  /** Longest event that starts and ends on the same calendar day. */
  singleDayMaxHours: 12,
  /** Longest event spanning several calendar days. */
  multiDayMaxDays: 3,
} as const;

const graphemes = new Intl.Segmenter('vi', { granularity: 'grapheme' });

/** User-perceived characters after trimming (a Vietnamese letter with its marks counts once). */
function charCount(s: string): number {
  return Array.from(graphemes.segment(s.trim())).length;
}

function parseOrNull(value: string): Millis | null {
  try {
    return toMillis(value);
  } catch {
    return null;
  }
}

/**
 * Validates the club submission form. Rules: title 8–120 characters; summary 40–400;
 * description ≥ 80; location and eligible grades non-empty; capacity an integer 1–2000;
 * start within SCHOOL_YEAR; start < end; same-day events ≤ 12 h, multi-day events ≤ 3 days;
 * registration deadline ≤ start and > now.
 */
export function validateDraft(d: EventDraft, now: Millis): ValidationErrors {
  const L = DRAFT_LIMITS;
  const errors: ValidationErrors = {};

  const titleLength = charCount(d.title);
  if (titleLength < L.titleMin || titleLength > L.titleMax) {
    errors.title = `Tên sự kiện cần có từ ${L.titleMin} đến ${L.titleMax} ký tự.`;
  }
  const summaryLength = charCount(d.summary);
  if (summaryLength < L.summaryMin || summaryLength > L.summaryMax) {
    errors.summary = `Phần tóm tắt cần có từ ${L.summaryMin} đến ${L.summaryMax} ký tự.`;
  }
  if (charCount(d.description) < L.descriptionMin) {
    errors.description = `Phần mô tả chi tiết cần có ít nhất ${L.descriptionMin} ký tự.`;
  }
  if (d.location.trim() === '') errors.location = 'Vui lòng nhập địa điểm tổ chức.';
  if (d.eligibleGrades.length === 0) errors.eligibleGrades = 'Vui lòng chọn ít nhất một khối được tham gia.';
  if (!Number.isInteger(d.capacity) || d.capacity < L.capacityMin || d.capacity > L.capacityMax) {
    errors.capacity = `Số lượng chỗ cần là số nguyên từ ${L.capacityMin} đến ${L.capacityMax}.`;
  }

  const start = parseOrNull(d.start);
  const end = parseOrNull(d.end);
  const deadline = parseOrNull(d.registrationDeadline);
  const yearStart = toMillis(SCHOOL_YEAR.start);
  const yearLastDay = toMillis(SCHOOL_YEAR.end);

  if (start === null) {
    errors.start = 'Vui lòng nhập thời gian bắt đầu hợp lệ.';
  } else if (start < yearStart || start >= addDays(yearLastDay, 1)) {
    errors.start = `Thời gian bắt đầu phải nằm trong năm học, từ ${formatDate(yearStart)} đến ${formatDate(yearLastDay)}.`;
  }

  if (end === null) {
    errors.end = 'Vui lòng nhập thời gian kết thúc hợp lệ.';
  } else if (start !== null) {
    const duration = end - start;
    if (duration <= 0) {
      errors.end = 'Thời gian kết thúc phải sau thời gian bắt đầu.';
    } else if (duration > L.multiDayMaxDays * DAY_MS) {
      errors.end = `Sự kiện kéo dài nhiều ngày không được vượt quá ${L.multiDayMaxDays} ngày.`;
    } else if (isSameVnDay(start, end) && duration > L.singleDayMaxHours * HOUR_MS) {
      errors.end = `Sự kiện trong một ngày không được kéo dài quá ${L.singleDayMaxHours} giờ.`;
    }
  }

  if (deadline === null) {
    errors.registrationDeadline = 'Vui lòng nhập hạn đăng ký hợp lệ.';
  } else if (start !== null && deadline > start) {
    errors.registrationDeadline = 'Hạn đăng ký phải trước thời điểm bắt đầu sự kiện.';
  } else if (deadline <= now) {
    errors.registrationDeadline = 'Hạn đăng ký phải sau thời điểm hiện tại.';
  }

  return errors;
}

/* ── Slugs ──────────────────────────────────────────────────────────── */

export const SLUG_MAX_LENGTH = 60;
/** Used when a title has no ASCII letters or digits after folding. */
export const SLUG_FALLBACK = 'su-kien';

/**
 * ASCII URL slug: folded (diacritics stripped, đ → d), lowercase, words joined by single
 * hyphens, at most 60 characters, cut at a word boundary when possible.
 */
export function slugify(title: string): string {
  const slug = foldVietnamese(title)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  if (slug === '') return SLUG_FALLBACK;
  if (slug.length <= SLUG_MAX_LENGTH) return slug;
  const cut = slug.slice(0, SLUG_MAX_LENGTH);
  if (slug.charAt(SLUG_MAX_LENGTH) === '-') return cut;
  const lastHyphen = cut.lastIndexOf('-');
  return lastHyphen > 0 ? cut.slice(0, lastHyphen) : cut;
}
