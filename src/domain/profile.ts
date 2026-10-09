/** Onboarding: the profile draft, per-step validation and interest ranking. Pure. */
import { DEFAULT_WEEKLY_HOUR_BUDGET } from './budget';
import { toIsoDateTime } from './dates';
import type { CategoryCode, GoalId, Grade, Millis, Profile } from './types';

export const ONBOARDING_STEPS = ['class', 'interests', 'goals', 'time'] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/** Weekly hour budget slider bounds (hours per ISO week). */
export const BUDGET_LIMITS = { min: 2, max: 12, step: 1 } as const;
/** How many interests are ranked as priorities. */
export const TOP_INTEREST_COUNT = 3;

/** Class names: the grade (6–12), one letter, then up to three letters or digits ("6A1", "11A2", "10CT"). */
const CLASS_NAME_PATTERN = /^(1[0-2]|[6-9])[A-Z][A-Z0-9]{0,3}$/;

export interface ProfileDraft {
  grade: Grade | null;
  className: string;
  /** In rank order: the first TOP_INTEREST_COUNT are the priorities. */
  interests: CategoryCode[];
  goals: GoalId[];
  weekdayAfterSchool: boolean;
  weekend: boolean;
  weeklyHourBudget: number;
}

export type DraftField = 'grade' | 'className' | 'interests' | 'goals' | 'availability';
export type DraftErrors = Partial<Record<DraftField, string>>;

export function emptyDraft(): ProfileDraft {
  return {
    grade: null,
    className: '',
    interests: [],
    goals: [],
    weekdayAfterSchool: false,
    weekend: false,
    weeklyHourBudget: DEFAULT_WEEKLY_HOUR_BUDGET,
  };
}

/** "11 a2 " → "11A2": spaces removed, upper case (Vietnamese class names use ASCII letters). */
export function normalizeClassName(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase();
}

/** Errors for one step; an empty object means the step is complete. */
export function stepErrors(draft: ProfileDraft, step: OnboardingStep): DraftErrors {
  const errors: DraftErrors = {};
  if (step === 'class') {
    if (draft.grade === null) errors.grade = 'Vui lòng chọn khối.';
    const name = normalizeClassName(draft.className);
    if (name === '') {
      errors.className = 'Vui lòng nhập lớp.';
    } else if (!CLASS_NAME_PATTERN.test(name)) {
      errors.className = 'Tên lớp gồm khối và ký hiệu lớp, ví dụ 7A1 hoặc 11A2.';
    } else if (draft.grade !== null && !name.startsWith(String(draft.grade))) {
      errors.className = `Tên lớp cần bắt đầu bằng khối đã chọn (Khối ${String(draft.grade)}), ví dụ ${String(draft.grade)}A2.`;
    }
  } else if (step === 'interests') {
    if (draft.interests.length === 0) errors.interests = 'Vui lòng chọn ít nhất một lĩnh vực quan tâm.';
  } else if (step === 'goals') {
    if (draft.goals.length === 0) errors.goals = 'Vui lòng chọn ít nhất một mục tiêu trong năm học.';
  } else if (!draft.weekdayAfterSchool && !draft.weekend) {
    errors.availability = 'Vui lòng chọn ít nhất một khoảng thời gian có thể tham gia.';
  }
  return errors;
}

/** The first step that still has errors, or null when the whole draft is complete. */
export function firstIncompleteStep(draft: ProfileDraft): OnboardingStep | null {
  return ONBOARDING_STEPS.find((step) => Object.keys(stepErrors(draft, step)).length > 0) ?? null;
}

/** Adds the code at the end of the ranking, or removes it. */
export function toggleInterest(interests: readonly CategoryCode[], code: CategoryCode): CategoryCode[] {
  return interests.includes(code) ? interests.filter((c) => c !== code) : [...interests, code];
}

/** Moves the code one place up (delta -1) or down (+1); out-of-range moves leave the list as is. */
export function moveInterest(interests: readonly CategoryCode[], code: CategoryCode, delta: -1 | 1): CategoryCode[] {
  const from = interests.indexOf(code);
  const to = from + delta;
  const list = [...interests];
  if (from === -1 || to < 0 || to >= list.length) return list;
  list.splice(from, 1);
  list.splice(to, 0, code);
  return list;
}

export function toggleGoal(goals: readonly GoalId[], id: GoalId): GoalId[] {
  return goals.includes(id) ? goals.filter((g) => g !== id) : [...goals, id];
}

/** Clamps and rounds the budget to the slider's bounds and step. */
export function clampBudget(hours: number): number {
  if (!Number.isFinite(hours)) return DEFAULT_WEEKLY_HOUR_BUDGET;
  return Math.min(BUDGET_LIMITS.max, Math.max(BUDGET_LIMITS.min, Math.round(hours / BUDGET_LIMITS.step) * BUDGET_LIMITS.step));
}

/**
 * The profile for a complete draft, or null while a step still has errors. Only grade, class,
 * interests, goals and availability are kept: Rodemap collects nothing else about the student.
 */
export function draftToProfile(draft: ProfileDraft, now: Millis): Profile | null {
  if (draft.grade === null || firstIncompleteStep(draft) !== null) return null;
  return {
    grade: draft.grade,
    className: normalizeClassName(draft.className),
    interests: [...draft.interests],
    topInterests: draft.interests.slice(0, TOP_INTEREST_COUNT),
    goals: [...draft.goals],
    availability: { weekdayAfterSchool: draft.weekdayAfterSchool, weekend: draft.weekend },
    weeklyHourBudget: clampBudget(draft.weeklyHourBudget),
    onboardedAt: toIsoDateTime(now),
  };
}
