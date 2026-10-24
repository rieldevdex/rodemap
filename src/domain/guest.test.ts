import { describe, expect, it } from 'vitest';
import { toMillis } from './dates';
import { cleanGuestPicks, draftFromGuestPicks, EMPTY_GUEST_PICKS, guestProfile, sameGuestPicks, setGuestGrade, toggleGuestInterest } from './guest';
import { emptyDraft } from './profile';

const now = toMillis('2026-10-07T09:00:00+07:00');

describe('guest picks', () => {
  it('starts empty and toggles fields in the order picked', () => {
    expect(EMPTY_GUEST_PICKS).toEqual({ grade: null, interests: [] });
    const a = toggleGuestInterest(toggleGuestInterest(EMPTY_GUEST_PICKS, 'CN'), 'NT');
    expect(a.interests).toEqual(['CN', 'NT']);
    expect(toggleGuestInterest(a, 'CN').interests).toEqual(['NT']);
    expect(setGuestGrade(a, 9).grade).toBe(9);
    expect(setGuestGrade(a, null).grade).toBeNull();
  });

  it('drops unknown grades and fields, and repeats', () => {
    expect(cleanGuestPicks({ grade: 13 as never, interests: ['HT', 'HT', 'ZZ' as never, 'TT'] })).toEqual({ grade: null, interests: ['HT', 'TT'] });
    expect(cleanGuestPicks({ grade: 6, interests: [] })).toEqual({ grade: 6, interests: [] });
  });

  it('compares picks by grade and field order', () => {
    expect(sameGuestPicks({ grade: 6, interests: ['HT'] }, { grade: 6, interests: ['HT'] })).toBe(true);
    expect(sameGuestPicks({ grade: 6, interests: ['HT'] }, { grade: 7, interests: ['HT'] })).toBe(false);
    expect(sameGuestPicks({ grade: 6, interests: ['HT', 'TT'] }, { grade: 6, interests: ['TT', 'HT'] })).toBe(false);
    expect(sameGuestPicks({ grade: 6, interests: ['HT'] }, { grade: 6, interests: [] })).toBe(false);
  });

  it('builds a recommendation profile only once a grade is picked', () => {
    expect(guestProfile({ grade: null, interests: ['CN'] }, now)).toBeNull();
    expect(guestProfile({ grade: 10, interests: ['CN', 'NT', 'TT', 'HT'] }, now)).toEqual({
      grade: 10,
      className: '',
      interests: ['CN', 'NT', 'TT', 'HT'],
      topInterests: ['CN', 'NT', 'TT'],
      goals: [],
      availability: { weekdayAfterSchool: true, weekend: true },
      weeklyHourBudget: 6,
      onboardedAt: '2026-10-07T09:00:00+07:00',
    });
  });

  it('prefills Thiết lập hồ sơ with the grade and fields only', () => {
    expect(draftFromGuestPicks(EMPTY_GUEST_PICKS)).toEqual(emptyDraft());
    expect(draftFromGuestPicks({ grade: 8, interests: ['CN', 'CN', 'HT'] })).toEqual({ ...emptyDraft(), grade: 8, interests: ['CN', 'HT'] });
  });
});
