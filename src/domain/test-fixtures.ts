/**
 * Shared builders for domain, state and Mochi unit tests. Never imported by app
 * code; excluded from coverage in vite.config.ts.
 */
import type { Profile, Registration, SchoolEvent } from './types';

let counter = 0;

/** Builds an approved event; override any field. Times default to Wed 14/10/2026 16:45–18:15. */
export function makeEvent(overrides: Partial<SchoolEvent> = {}): SchoolEvent {
  counter += 1;
  const id = overrides.id ?? `ev-t${String(counter).padStart(3, '0')}`;
  return {
    id,
    slug: id,
    title: `Sự kiện thử nghiệm ${id}`,
    clubId: 'tranh-bien',
    category: 'HT',
    format: 'in_person',
    start: '2026-10-14T16:45:00+07:00',
    end: '2026-10-14T18:15:00+07:00',
    location: 'Phòng 204',
    eligibleGrades: [10, 11, 12],
    capacity: 40,
    seatsTaken: 10,
    registrationDeadline: '2026-10-12T23:59:00+07:00',
    summary: 'Tóm tắt sự kiện thử nghiệm.',
    description: 'Mô tả sự kiện thử nghiệm.',
    tags: [],
    status: 'approved',
    ...overrides,
  };
}

export function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    grade: 11,
    className: '11A2',
    interests: ['CN', 'HT', 'TN'],
    topInterests: ['CN', 'HT', 'TN'],
    goals: ['technology'],
    availability: { weekdayAfterSchool: true, weekend: true },
    weeklyHourBudget: 6,
    onboardedAt: '2026-10-01T09:00:00+07:00',
    ...overrides,
  };
}

export function reg(eventId: string, status: Registration['status'] = 'registered'): Registration {
  return { eventId, registeredAt: '2026-10-01T09:00:00+07:00', status };
}
