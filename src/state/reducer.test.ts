import { describe, expect, it } from 'vitest';
import { EVENTS } from '../data/events';
import { SEED_PORTFOLIO, SEED_PROFILE, SEED_REGISTRATIONS, SEED_SUBMISSIONS } from '../data/seed';
import { makeEvent, makeProfile, reg } from '../domain/test-fixtures';
import type { PortfolioEntry, SchoolEvent, Submission } from '../domain/types';
import type { Action } from './actions';
import { effectiveStatus, reducer } from './reducer';
import { createSeedState, type AppState } from './schema';

const AT = '2026-10-07T09:00:00+07:00';
const LATER = '2026-10-08T10:30:00+07:00';
const REASON = 'Đề nghị câu lạc bộ bổ sung địa điểm tổ chức cụ thể trước khi gửi lại.';

function seedEvent(id: string): SchoolEvent {
  const e = EVENTS.find((x) => x.id === id);
  if (!e) throw new Error(`Unknown seed event ${id}`);
  return e;
}

function entry(id: string, eventId: string, overrides: Partial<PortfolioEntry> = {}): PortfolioEntry {
  return {
    id,
    eventId,
    category: 'HT',
    role: 'Thành viên tham gia',
    hours: 1.5,
    reflection: '',
    reflectionSource: 'mochi_draft',
    evidenceLinks: [],
    createdAt: AT,
    updatedAt: AT,
    ...overrides,
  };
}

function submission(id: string, eventId: string, overrides: Partial<Submission> = {}): Submission {
  return {
    id,
    eventId,
    clubId: 'inkstep',
    submittedAt: AT,
    history: [{ at: AT, actor: 'club', action: 'submit' }],
    ...overrides,
  };
}

function stateWith(overrides: Partial<AppState>): AppState {
  return { ...createSeedState(), ...overrides };
}

/** Freezes the whole tree so any mutation inside the reducer throws (ES modules run in strict mode). */
function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

const regOf = (s: AppState, eventId: string) => s.registrations.find((r) => r.eventId === eventId);
const subOf = (s: AppState, id: string) => s.submissions.find((x) => x.id === id);

describe('effectiveStatus', () => {
  it('falls back to the seed event status', () => {
    const s = createSeedState();
    expect(effectiveStatus(s, 'ev-001')).toBe('approved');
    expect(effectiveStatus(s, 'ev-046')).toBe('pending');
    expect(effectiveStatus(s, 'ev-049')).toBe('changes_requested');
  });

  it('prefers a submitted copy over the seed event, and a moderation override over both', () => {
    const copy = { ...seedEvent('ev-049'), status: 'pending' as const };
    const s = stateWith({ submittedEvents: [copy] });
    expect(effectiveStatus(s, 'ev-049')).toBe('pending');
    expect(effectiveStatus({ ...s, moderation: { 'ev-049': 'approved' } }, 'ev-049')).toBe('approved');
    expect(effectiveStatus(stateWith({ moderation: { 'ev-001': 'rejected' } }), 'ev-001')).toBe('rejected');
  });

  it('returns undefined for an unknown event', () => {
    expect(effectiveStatus(createSeedState(), 'ev-ghost')).toBeUndefined();
  });
});

describe('reducer purity', () => {
  it('never mutates a deep-frozen input state', () => {
    const frozen = deepFreeze(createSeedState());
    const actions: Action[] = [
      { type: 'profile/complete', profile: makeProfile() },
      { type: 'profile/clear' },
      { type: 'registration/register', eventId: 'ev-016', at: AT },
      { type: 'registration/register', eventId: 'ev-009', at: AT },
      { type: 'registration/unregister', eventId: 'ev-014' },
      { type: 'registration/markAttended', eventId: 'ev-009', entry: entry('pf-new', 'ev-009') },
      { type: 'registration/markAbsent', eventId: 'ev-009' },
      { type: 'portfolio/upsert', entry: entry('pf-001', 'ev-005') },
      { type: 'portfolio/remove', id: 'pf-002' },
      { type: 'submission/create', event: makeEvent({ id: 'ev-frozen' }), submission: submission('sub-frozen', 'ev-frozen') },
      { type: 'submission/resubmit', submissionId: 'sub-004', event: seedEvent('ev-049'), at: AT },
      { type: 'moderation/review', submissionId: 'sub-001', action: 'approve', at: AT },
      { type: 'role/set', role: 'moderator' },
      { type: 'club/setActive', clubId: 'robotics' },
      { type: 'theme/set', theme: 'dark' },
      { type: 'demo/setToday', date: '2026-10-07' },
      { type: 'demo/setMochiOffline', offline: true },
      { type: 'demo/reset' },
    ];
    for (const action of actions) {
      expect(() => reducer(frozen, action), action.type).not.toThrow();
    }
    expect(frozen).toEqual(createSeedState());
  });
});

describe('profile/complete', () => {
  it('stores the profile from an empty state', () => {
    const s = stateWith({ profile: null });
    const profile = makeProfile({ grade: 10, className: '10A1' });
    const next = reducer(s, { type: 'profile/complete', profile });
    expect(next.profile).toBe(profile);
    expect(s.profile).toBeNull();
  });

  it('replaces an existing profile and keeps the rest of the state', () => {
    const s = createSeedState();
    const profile = makeProfile({ weeklyHourBudget: 10 });
    const next = reducer(s, { type: 'profile/complete', profile });
    expect(next.profile).toEqual(profile);
    expect(next.registrations).toBe(s.registrations);
    expect(s.profile).toEqual(SEED_PROFILE);
  });
});

describe('profile/clear', () => {
  it('removes the profile', () => {
    const next = reducer(createSeedState(), { type: 'profile/clear' });
    expect(next.profile).toBeNull();
  });

  it('is a no-op without a profile', () => {
    const s = stateWith({ profile: null });
    expect(reducer(s, { type: 'profile/clear' })).toBe(s);
  });
});

describe('registration/register', () => {
  it('adds a new registration', () => {
    const s = createSeedState();
    const next = reducer(s, { type: 'registration/register', eventId: 'ev-016', at: AT });
    expect(next.registrations).toHaveLength(SEED_REGISTRATIONS.length + 1);
    expect(next.registrations.at(-1)).toEqual({ eventId: 'ev-016', registeredAt: AT, status: 'registered' });
    expect(next.registrations.slice(0, -1)).toEqual(s.registrations);
    expect(s.registrations).toHaveLength(SEED_REGISTRATIONS.length);
  });

  it('re-registers after an absence, updating the time in place', () => {
    const s = stateWith({ registrations: [reg('ev-015'), reg('ev-016', 'absent'), reg('ev-017')] });
    const next = reducer(s, { type: 'registration/register', eventId: 'ev-016', at: LATER });
    expect(next.registrations.map((r) => r.eventId)).toEqual(['ev-015', 'ev-016', 'ev-017']);
    expect(regOf(next, 'ev-016')).toEqual({ eventId: 'ev-016', registeredAt: LATER, status: 'registered' });
    expect(next.registrations[0]).toBe(s.registrations[0]);
  });

  it('is a no-op for a duplicate registration or an attended event', () => {
    const s = createSeedState();
    expect(reducer(s, { type: 'registration/register', eventId: 'ev-014', at: LATER })).toBe(s);
    expect(reducer(s, { type: 'registration/register', eventId: 'ev-005', at: LATER })).toBe(s);
  });
});

describe('registration/unregister', () => {
  it('removes a registered event', () => {
    const s = createSeedState();
    const next = reducer(s, { type: 'registration/unregister', eventId: 'ev-014' });
    expect(regOf(next, 'ev-014')).toBeUndefined();
    expect(next.registrations).toHaveLength(SEED_REGISTRATIONS.length - 1);
  });

  it('is a no-op for attended, absent or unknown registrations', () => {
    const s = stateWith({ registrations: [reg('ev-005', 'attended'), reg('ev-009', 'absent')] });
    expect(reducer(s, { type: 'registration/unregister', eventId: 'ev-005' })).toBe(s);
    expect(reducer(s, { type: 'registration/unregister', eventId: 'ev-009' })).toBe(s);
    expect(reducer(s, { type: 'registration/unregister', eventId: 'ev-016' })).toBe(s);
  });
});

describe('registration/markAttended', () => {
  it('marks the event attended and adds the portfolio entry', () => {
    const s = createSeedState();
    const e = entry('pf-009', 'ev-009', { category: 'KN' });
    const next = reducer(s, { type: 'registration/markAttended', eventId: 'ev-009', entry: e });
    expect(regOf(next, 'ev-009')?.status).toBe('attended');
    expect(next.portfolio).toEqual([...SEED_PORTFOLIO, e]);
  });

  it('adds the entry only once when the event already has one', () => {
    const existing = entry('pf-keep', 'ev-009');
    const s = stateWith({ portfolio: [existing] });
    const next = reducer(s, { type: 'registration/markAttended', eventId: 'ev-009', entry: entry('pf-dup', 'ev-009') });
    expect(regOf(next, 'ev-009')?.status).toBe('attended');
    expect(next.portfolio).toBe(s.portfolio);
  });

  it('corrects an absence to attended', () => {
    const s = stateWith({ registrations: [reg('ev-009', 'absent')], portfolio: [] });
    const next = reducer(s, { type: 'registration/markAttended', eventId: 'ev-009', entry: entry('pf-x', 'ev-009') });
    expect(regOf(next, 'ev-009')?.status).toBe('attended');
    expect(next.portfolio).toHaveLength(1);
  });

  it('is a no-op when already attended or not registered', () => {
    const s = createSeedState();
    expect(reducer(s, { type: 'registration/markAttended', eventId: 'ev-005', entry: entry('pf-x', 'ev-005') })).toBe(s);
    expect(reducer(s, { type: 'registration/markAttended', eventId: 'ev-016', entry: entry('pf-y', 'ev-016') })).toBe(s);
  });
});

describe('registration/markAbsent', () => {
  it('marks a registered event absent without touching the portfolio', () => {
    const s = createSeedState();
    const next = reducer(s, { type: 'registration/markAbsent', eventId: 'ev-009' });
    expect(regOf(next, 'ev-009')?.status).toBe('absent');
    expect(regOf(next, 'ev-009')?.registeredAt).toBe(regOf(s, 'ev-009')?.registeredAt);
    expect(next.portfolio).toBe(s.portfolio);
  });

  it('is a no-op for attended, absent or unknown registrations', () => {
    const s = stateWith({ registrations: [reg('ev-005', 'attended'), reg('ev-009', 'absent')] });
    expect(reducer(s, { type: 'registration/markAbsent', eventId: 'ev-005' })).toBe(s);
    expect(reducer(s, { type: 'registration/markAbsent', eventId: 'ev-009' })).toBe(s);
    expect(reducer(s, { type: 'registration/markAbsent', eventId: 'ev-016' })).toBe(s);
  });
});

describe('portfolio/upsert', () => {
  it('appends a new entry', () => {
    const s = createSeedState();
    const e = entry('pf-new', 'ev-009');
    const next = reducer(s, { type: 'portfolio/upsert', entry: e });
    expect(next.portfolio).toEqual([...SEED_PORTFOLIO, e]);
    expect(next.registrations).toBe(s.registrations);
  });

  it('replaces an entry with the same id in place, leaving the previous state intact', () => {
    const s = createSeedState();
    const edited = { ...SEED_PORTFOLIO[1]!, reflection: 'Nội dung do học sinh biên soạn lại.', reflectionSource: 'student' as const };
    const next = reducer(s, { type: 'portfolio/upsert', entry: edited });
    expect(next.portfolio.map((p) => p.id)).toEqual(['pf-001', 'pf-002', 'pf-003']);
    expect(next.portfolio[1]).toBe(edited);
    expect(next.portfolio[0]).toBe(s.portfolio[0]);
    expect(s.portfolio[1]).toEqual(SEED_PORTFOLIO[1]);
  });
});

describe('portfolio/remove', () => {
  it('removes the entry', () => {
    const next = reducer(createSeedState(), { type: 'portfolio/remove', id: 'pf-002' });
    expect(next.portfolio.map((p) => p.id)).toEqual(['pf-001', 'pf-003']);
  });

  it('is a no-op for an unknown id', () => {
    const s = createSeedState();
    expect(reducer(s, { type: 'portfolio/remove', id: 'pf-404' })).toBe(s);
  });
});

describe('submission/create', () => {
  const created = makeEvent({ id: 'ev-created', clubId: 'inkstep', status: 'draft' });
  const sub = submission('sub-created', 'ev-created');

  it('stores the event as pending and records the submission', () => {
    const s = createSeedState();
    const next = reducer(s, { type: 'submission/create', event: created, submission: sub });
    expect(next.submittedEvents).toEqual([{ ...created, status: 'pending' }]);
    expect(next.moderation).toEqual({ 'ev-created': 'pending' });
    expect(next.submissions).toEqual([...SEED_SUBMISSIONS, sub]);
    expect(effectiveStatus(next, 'ev-created')).toBe('pending');
    expect(s.submittedEvents).toEqual([]);
  });

  it('forces pending even when the event arrives approved', () => {
    const next = reducer(createSeedState(), {
      type: 'submission/create',
      event: { ...created, status: 'approved' },
      submission: sub,
    });
    expect(next.submittedEvents[0]?.status).toBe('pending');
  });

  it('replaces an earlier copy of the same event id', () => {
    const s = reducer(createSeedState(), { type: 'submission/create', event: created, submission: sub });
    const retitled = { ...created, title: 'Buổi chia sẻ phát triển sản phẩm học tập' };
    const next = reducer(s, { type: 'submission/create', event: retitled, submission: submission('sub-2', 'ev-created') });
    expect(next.submittedEvents).toHaveLength(1);
    expect(next.submittedEvents[0]?.title).toBe(retitled.title);
    expect(next.submissions).toHaveLength(SEED_SUBMISSIONS.length + 2);
  });

  it('is a no-op for a duplicate submission id', () => {
    const s = createSeedState();
    expect(reducer(s, { type: 'submission/create', event: created, submission: submission('sub-001', 'ev-created') })).toBe(s);
  });
});

describe('submission/resubmit', () => {
  const edited: SchoolEvent = { ...seedEvent('ev-049'), location: 'Phòng Tin học 2', capacity: 30 };

  it('resubmits after changes were requested: stores the edited copy as pending and logs the note', () => {
    const s = createSeedState();
    const next = reducer(s, { type: 'submission/resubmit', submissionId: 'sub-004', event: edited, at: LATER });
    expect(next.submittedEvents).toEqual([{ ...edited, status: 'pending' }]);
    expect(next.moderation).toEqual({ 'ev-049': 'pending' });
    expect(effectiveStatus(next, 'ev-049')).toBe('pending');
    const history = subOf(next, 'sub-004')?.history ?? [];
    expect(history).toHaveLength(3);
    expect(history.at(-1)).toEqual({ at: LATER, actor: 'club', action: 'resubmit' });
    expect(subOf(next, 'sub-001')).toBe(subOf(s, 'sub-001'));
    expect(subOf(s, 'sub-004')?.history).toHaveLength(2);
  });

  it('replaces an existing edited copy in place', () => {
    const created = makeEvent({ id: 'ev-c', clubId: 'inkstep' });
    let s = reducer(createSeedState(), { type: 'submission/create', event: created, submission: submission('sub-c', 'ev-c') });
    s = reducer(s, { type: 'moderation/review', submissionId: 'sub-c', action: 'request_changes', reason: REASON, at: AT });
    expect(effectiveStatus(s, 'ev-c')).toBe('changes_requested');
    const fixed = { ...created, capacity: 25 };
    const next = reducer(s, { type: 'submission/resubmit', submissionId: 'sub-c', event: fixed, at: LATER });
    expect(next.submittedEvents).toEqual([{ ...fixed, status: 'pending' }]);
    expect(next.moderation['ev-c']).toBe('pending');
  });

  it('is a no-op unless the event is waiting for changes', () => {
    const s = createSeedState();
    // sub-001 → ev-046 is pending, sub-005 → ev-050 is rejected.
    expect(reducer(s, { type: 'submission/resubmit', submissionId: 'sub-001', event: seedEvent('ev-046'), at: LATER })).toBe(s);
    expect(reducer(s, { type: 'submission/resubmit', submissionId: 'sub-005', event: seedEvent('ev-050'), at: LATER })).toBe(s);
    const approved = stateWith({ moderation: { 'ev-049': 'approved' } });
    expect(reducer(approved, { type: 'submission/resubmit', submissionId: 'sub-004', event: edited, at: LATER })).toBe(approved);
  });

  it('is a no-op for an unknown submission, a different event id or an unknown event', () => {
    const s = createSeedState();
    expect(reducer(s, { type: 'submission/resubmit', submissionId: 'sub-404', event: edited, at: LATER })).toBe(s);
    expect(
      reducer(s, { type: 'submission/resubmit', submissionId: 'sub-004', event: { ...edited, id: 'ev-other' }, at: LATER }),
    ).toBe(s);
    const ghost = stateWith({ submissions: [submission('sub-ghost', 'ev-ghost')] });
    expect(
      reducer(ghost, { type: 'submission/resubmit', submissionId: 'sub-ghost', event: makeEvent({ id: 'ev-ghost' }), at: LATER }),
    ).toBe(ghost);
  });
});

describe('moderation/review', () => {
  it('approves a pending submission', () => {
    const s = createSeedState();
    const next = reducer(s, { type: 'moderation/review', submissionId: 'sub-001', action: 'approve', at: LATER });
    expect(next.moderation).toEqual({ 'ev-046': 'approved' });
    expect(effectiveStatus(next, 'ev-046')).toBe('approved');
    expect(subOf(next, 'sub-001')?.history.at(-1)).toEqual({ at: LATER, actor: 'hdhs', action: 'approve' });
    expect(next.submittedEvents).toBe(s.submittedEvents);
    expect(subOf(next, 'sub-002')).toBe(subOf(s, 'sub-002'));
  });

  it('requests changes with a trimmed reason', () => {
    const next = reducer(createSeedState(), {
      type: 'moderation/review',
      submissionId: 'sub-002',
      action: 'request_changes',
      reason: `  ${REASON}  `,
      at: LATER,
    });
    expect(next.moderation['ev-047']).toBe('changes_requested');
    expect(subOf(next, 'sub-002')?.history.at(-1)).toEqual({
      at: LATER,
      actor: 'hdhs',
      action: 'request_changes',
      reason: REASON,
    });
  });

  it('rejects with a reason', () => {
    const next = reducer(createSeedState(), {
      type: 'moderation/review',
      submissionId: 'sub-003',
      action: 'reject',
      reason: REASON,
      at: LATER,
    });
    expect(next.moderation['ev-048']).toBe('rejected');
    expect(subOf(next, 'sub-003')?.history.at(-1)?.reason).toBe(REASON);
  });

  it('is a no-op when changes or a rejection come without a reason', () => {
    const s = createSeedState();
    expect(reducer(s, { type: 'moderation/review', submissionId: 'sub-001', action: 'request_changes', at: LATER })).toBe(s);
    expect(
      reducer(s, { type: 'moderation/review', submissionId: 'sub-001', action: 'request_changes', reason: '   ', at: LATER }),
    ).toBe(s);
    expect(reducer(s, { type: 'moderation/review', submissionId: 'sub-001', action: 'reject', reason: '', at: LATER })).toBe(s);
  });

  it('is a no-op for an invalid transition', () => {
    const s = createSeedState();
    // sub-004 → ev-049 waits for changes, sub-005 → ev-050 is rejected.
    expect(reducer(s, { type: 'moderation/review', submissionId: 'sub-004', action: 'approve', at: LATER })).toBe(s);
    expect(reducer(s, { type: 'moderation/review', submissionId: 'sub-005', action: 'reject', reason: REASON, at: LATER })).toBe(s);
    const approved = reducer(s, { type: 'moderation/review', submissionId: 'sub-001', action: 'approve', at: LATER });
    expect(reducer(approved, { type: 'moderation/review', submissionId: 'sub-001', action: 'approve', at: LATER })).toBe(approved);
  });

  it('is a no-op for an unknown submission or an unknown event', () => {
    const s = createSeedState();
    expect(reducer(s, { type: 'moderation/review', submissionId: 'sub-404', action: 'approve', at: LATER })).toBe(s);
    const ghost = stateWith({ submissions: [submission('sub-ghost', 'ev-ghost')] });
    expect(reducer(ghost, { type: 'moderation/review', submissionId: 'sub-ghost', action: 'approve', at: LATER })).toBe(ghost);
  });
});

describe('setters', () => {
  it('role/set changes the role; the same role returns the identical state', () => {
    const s = createSeedState();
    expect(reducer(s, { type: 'role/set', role: 'moderator' }).role).toBe('moderator');
    expect(reducer(s, { type: 'role/set', role: 'student' })).toBe(s);
  });

  it('club/setActive changes the club; the same club returns the identical state', () => {
    const s = createSeedState();
    expect(reducer(s, { type: 'club/setActive', clubId: 'robotics' }).activeClubId).toBe('robotics');
    expect(reducer(s, { type: 'club/setActive', clubId: 'inkstep' })).toBe(s);
  });

  it('theme/set changes the theme; the same theme returns the identical state', () => {
    const s = createSeedState();
    expect(reducer(s, { type: 'theme/set', theme: 'dark' }).theme).toBe('dark');
    expect(reducer(s, { type: 'theme/set', theme: 'system' })).toBe(s);
  });

  it('demo/setToday sets and clears the demo date; the same value returns the identical state', () => {
    const s = createSeedState();
    const dated = reducer(s, { type: 'demo/setToday', date: '2026-10-07' });
    expect(dated.demoToday).toBe('2026-10-07');
    expect(reducer(dated, { type: 'demo/setToday', date: '2026-10-07' })).toBe(dated);
    expect(reducer(dated, { type: 'demo/setToday', date: null }).demoToday).toBeNull();
    expect(reducer(s, { type: 'demo/setToday', date: null })).toBe(s);
  });

  it('demo/setMochiOffline toggles the flag; the same value returns the identical state', () => {
    const s = createSeedState();
    expect(reducer(s, { type: 'demo/setMochiOffline', offline: true }).mochiForcedOffline).toBe(true);
    expect(reducer(s, { type: 'demo/setMochiOffline', offline: false })).toBe(s);
  });
});

describe('demo/reset', () => {
  it('restores the seed data and keeps the presentation settings', () => {
    let s = createSeedState();
    const actions: Action[] = [
      { type: 'role/set', role: 'moderator' },
      { type: 'club/setActive', clubId: 'robotics' },
      { type: 'theme/set', theme: 'dark' },
      { type: 'demo/setToday', date: '2026-11-02' },
      { type: 'demo/setMochiOffline', offline: true },
      { type: 'profile/clear' },
      { type: 'registration/register', eventId: 'ev-016', at: AT },
      { type: 'portfolio/remove', id: 'pf-001' },
      { type: 'submission/create', event: makeEvent({ id: 'ev-r' }), submission: submission('sub-r', 'ev-r') },
      { type: 'moderation/review', submissionId: 'sub-001', action: 'approve', at: AT },
    ];
    for (const action of actions) s = reducer(s, action);

    const next = reducer(s, { type: 'demo/reset' });
    expect(next).toEqual({ ...createSeedState(), theme: 'dark', demoToday: '2026-11-02', mochiForcedOffline: true });
    expect(next.role).toBe('student');
    expect(next.activeClubId).toBe('inkstep');
    expect(next.registrations).not.toBe(SEED_REGISTRATIONS);
    expect(next.portfolio).not.toBe(SEED_PORTFOLIO);
  });

  it('returns an equal fresh state when nothing changed', () => {
    const s = createSeedState();
    const next = reducer(s, { type: 'demo/reset' });
    expect(next).toEqual(s);
    expect(next.submissions).not.toBe(s.submissions);
  });
});

describe('unknown actions', () => {
  it('return the same state object', () => {
    const s = createSeedState();
    expect(reducer(s, { type: 'legacy/unknown' } as unknown as Parameters<typeof reducer>[1])).toBe(s);
  });
});
