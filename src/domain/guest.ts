/**
 * Trying Rodemap before setting up a profile: a visitor picks a grade and a few fields on
 * Tổng quan to see suggestions. Only the grade and the fields are kept, on this device. Pure.
 */
import { DEFAULT_WEEKLY_HOUR_BUDGET } from './budget';
import { toIsoDateTime } from './dates';
import { emptyDraft, type ProfileDraft } from './profile';
import { CATEGORY_CODES, GRADES, type CategoryCode, type Grade, type GuestPicks, type Millis, type Profile } from './types';

export const EMPTY_GUEST_PICKS: GuestPicks = { grade: null, interests: [] };

/** Picks with a known grade and known, distinct fields only (anything else is dropped). */
export function cleanGuestPicks(picks: GuestPicks): GuestPicks {
  const grade = picks.grade !== null && GRADES.includes(picks.grade) ? picks.grade : null;
  const interests = picks.interests.filter((c, i, all) => CATEGORY_CODES.includes(c) && all.indexOf(c) === i);
  return { grade, interests };
}

export function setGuestGrade(picks: GuestPicks, grade: Grade | null): GuestPicks {
  return { ...picks, grade };
}

/** Adds the field at the end, or removes it. */
export function toggleGuestInterest(picks: GuestPicks, code: CategoryCode): GuestPicks {
  return {
    ...picks,
    interests: picks.interests.includes(code) ? picks.interests.filter((c) => c !== code) : [...picks.interests, code],
  };
}

export function sameGuestPicks(a: GuestPicks, b: GuestPicks): boolean {
  return a.grade === b.grade && a.interests.length === b.interests.length && a.interests.every((c, i) => b.interests[i] === c);
}

/**
 * The profile recommendations use for a visitor: null until a grade is picked (then events of
 * every grade are listed by date). No class, goals or availability are invented; callers pass
 * `availabilityKnown: false` so the time fit is not claimed.
 */
export function guestProfile(picks: GuestPicks, now: Millis): Profile | null {
  if (picks.grade === null) return null;
  return {
    grade: picks.grade,
    className: '',
    interests: [...picks.interests],
    topInterests: picks.interests.slice(0, 3),
    goals: [],
    availability: { weekdayAfterSchool: true, weekend: true },
    weeklyHourBudget: DEFAULT_WEEKLY_HOUR_BUDGET,
    onboardedAt: toIsoDateTime(now),
  };
}

/** Thiết lập hồ sơ starts from the visitor's picks (steps 1 and 2); everything else stays empty. */
export function draftFromGuestPicks(picks: GuestPicks): ProfileDraft {
  const clean = cleanGuestPicks(picks);
  return { ...emptyDraft(), grade: clean.grade, interests: [...clean.interests] };
}
