import { describe, expect, it } from 'vitest';
import { toMillis } from './dates';
import {
  BUDGET_LIMITS,
  clampBudget,
  draftToProfile,
  emptyDraft,
  firstIncompleteStep,
  moveInterest,
  normalizeClassName,
  stepErrors,
  toggleGoal,
  toggleInterest,
  type ProfileDraft,
} from './profile';

const now = toMillis('2026-10-07T20:15:00+07:00');

const complete: ProfileDraft = {
  grade: 11,
  className: '11a2 ',
  interests: ['CN', 'HT', 'TN', 'KN'],
  goals: ['technology', 'study_abroad'],
  weekdayAfterSchool: true,
  weekend: false,
  weeklyHourBudget: 5,
};

describe('profile draft', () => {
  it('starts blank with the default budget', () => {
    expect(emptyDraft()).toEqual({
      grade: null,
      className: '',
      interests: [],
      goals: [],
      weekdayAfterSchool: false,
      weekend: false,
      weeklyHourBudget: 6,
    });
    expect(firstIncompleteStep(emptyDraft())).toBe('class');
  });

  it('normalizes class names', () => {
    expect(normalizeClassName(' 11 a2 ')).toBe('11A2');
  });

  it('validates grade and class', () => {
    expect(stepErrors(emptyDraft(), 'class')).toEqual({ grade: 'Vui lòng chọn khối.', className: 'Vui lòng nhập lớp.' });
    expect(stepErrors({ ...complete, className: 'A2' }, 'class')).toEqual({ className: 'Tên lớp gồm khối và ký hiệu lớp, ví dụ 11A2.' });
    expect(stepErrors({ ...complete, className: '10A1' }, 'class')).toEqual({
      className: 'Tên lớp cần bắt đầu bằng khối đã chọn (Khối 11), ví dụ 11A2.',
    });
    expect(stepErrors({ ...complete, grade: null, className: '10A1' }, 'class')).toEqual({ grade: 'Vui lòng chọn khối.' });
    expect(stepErrors({ ...complete, className: '12CT' }, 'class')).toHaveProperty('className');
    expect(stepErrors({ ...complete, grade: 12, className: '12ct' }, 'class')).toEqual({});
  });

  it('requires an interest, a goal and a time slot', () => {
    expect(stepErrors(emptyDraft(), 'interests')).toEqual({ interests: 'Vui lòng chọn ít nhất một lĩnh vực quan tâm.' });
    expect(stepErrors(emptyDraft(), 'goals')).toEqual({ goals: 'Vui lòng chọn ít nhất một mục tiêu trong năm học.' });
    expect(stepErrors(emptyDraft(), 'time')).toEqual({ availability: 'Vui lòng chọn ít nhất một khoảng thời gian có thể tham gia.' });
    expect(stepErrors(complete, 'interests')).toEqual({});
    expect(stepErrors(complete, 'goals')).toEqual({});
    expect(stepErrors({ ...complete, weekdayAfterSchool: false, weekend: true }, 'time')).toEqual({});
  });

  it('finds the first incomplete step', () => {
    expect(firstIncompleteStep({ ...complete, goals: [] })).toBe('goals');
    expect(firstIncompleteStep(complete)).toBeNull();
  });

  it('toggles and ranks interests', () => {
    expect(toggleInterest(['HT'], 'CN')).toEqual(['HT', 'CN']);
    expect(toggleInterest(['HT', 'CN'], 'HT')).toEqual(['CN']);
    expect(moveInterest(['HT', 'CN', 'TN'], 'TN', -1)).toEqual(['HT', 'TN', 'CN']);
    expect(moveInterest(['HT', 'CN', 'TN'], 'HT', 1)).toEqual(['CN', 'HT', 'TN']);
    expect(moveInterest(['HT', 'CN'], 'HT', -1)).toEqual(['HT', 'CN']);
    expect(moveInterest(['HT', 'CN'], 'CN', 1)).toEqual(['HT', 'CN']);
    expect(moveInterest(['HT'], 'TS', 1)).toEqual(['HT']);
  });

  it('toggles goals', () => {
    expect(toggleGoal([], 'fitness')).toEqual(['fitness']);
    expect(toggleGoal(['fitness', 'arts'], 'fitness')).toEqual(['arts']);
  });

  it('clamps the weekly budget', () => {
    expect(clampBudget(0)).toBe(BUDGET_LIMITS.min);
    expect(clampBudget(40)).toBe(BUDGET_LIMITS.max);
    expect(clampBudget(4.4)).toBe(4);
    expect(clampBudget(Number.NaN)).toBe(6);
  });

  it('builds the profile from a complete draft only', () => {
    expect(draftToProfile(emptyDraft(), now)).toBeNull();
    expect(draftToProfile({ ...complete, weekdayAfterSchool: false }, now)).toBeNull();
    expect(draftToProfile(complete, now)).toEqual({
      grade: 11,
      className: '11A2',
      interests: ['CN', 'HT', 'TN', 'KN'],
      topInterests: ['CN', 'HT', 'TN'],
      goals: ['technology', 'study_abroad'],
      availability: { weekdayAfterSchool: true, weekend: false },
      weeklyHourBudget: 5,
      onboardedAt: '2026-10-07T20:15:00+07:00',
    });
  });
});
