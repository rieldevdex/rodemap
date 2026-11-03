import { describe, expect, it } from 'vitest';
import { NEWS } from '../data/news';
import { SEED_PORTFOLIO, SEED_PROFILE, SEED_REGISTRATIONS } from '../data/seed';
import { makeEvent, makePost, makeProfile, reg } from '../domain/test-fixtures';
import type { PortfolioEntry, SchoolEvent, Submission } from '../domain/types';
import type { Action } from './actions';
import { effectiveStatus, reducer } from './reducer';
import { createDemoState, createSeedState, type AppState } from './schema';

const AT = '2026-10-07T09:00:00+07:00';
const LATER = '2026-10-08T10:30:00+07:00';
const REASON = 'Đề nghị câu lạc bộ bổ sung địa điểm tổ chức cụ thể trước khi gửi lại.';

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
    clubId: 'bot-va-bo',
    submittedAt: AT,
    history: [{ at: AT, actor: 'club', action: 'submit' }],
    ...overrides,
  };
}

/** Club submissions in every moderation state (the sample data has none: the clubs are real). */
const SUBMITTED: SchoolEvent[] = [
  makeEvent({ id: 'ev-s1', clubId: 'novaris-project', status: 'pending', seatsTaken: 0 }),
  makeEvent({ id: 'ev-s2', clubId: 'kat-music-club', status: 'pending', seatsTaken: 0 }),
  makeEvent({ id: 'ev-s3', clubId: 'bot-va-bo', status: 'pending', seatsTaken: 0 }),
  makeEvent({ id: 'ev-s4', clubId: 'bot-va-bo', status: 'changes_requested', seatsTaken: 0 }),
  makeEvent({ id: 'ev-s5', clubId: 'charite', status: 'rejected', seatsTaken: 0 }),
];
const SUBMISSIONS: Submission[] = [
  submission('sub-001', 'ev-s1', { clubId: 'novaris-project', submittedAt: '2026-10-05T15:20:00+07:00', history: [{ at: '2026-10-05T15:20:00+07:00', actor: 'club', action: 'submit' }] }),
  submission('sub-002', 'ev-s2', { clubId: 'kat-music-club', submittedAt: '2026-10-06T10:05:00+07:00', history: [{ at: '2026-10-06T10:05:00+07:00', actor: 'club', action: 'submit' }] }),
  submission('sub-003', 'ev-s3', { submittedAt: '2026-10-06T16:40:00+07:00', history: [{ at: '2026-10-06T16:40:00+07:00', actor: 'club', action: 'submit' }] }),
  submission('sub-004', 'ev-s4', {
    submittedAt: '2026-10-02T14:00:00+07:00',
    history: [
      { at: '2026-10-02T14:00:00+07:00', actor: 'club', action: 'submit' },
      { at: '2026-10-04T09:30:00+07:00', actor: 'hdhs', action: 'request_changes', reason: REASON },
    ],
  }),
  submission('sub-005', 'ev-s5', {
    clubId: 'charite',
    submittedAt: '2026-10-03T08:45:00+07:00',
    history: [
      { at: '2026-10-03T08:45:00+07:00', actor: 'club', action: 'submit' },
      { at: '2026-10-05T10:15:00+07:00', actor: 'hdhs', action: 'reject', reason: REASON },
    ],
  }),
];

function submitted(id: string): SchoolEvent {
  const e = SUBMITTED.find((x) => x.id === id);
  if (!e) throw new Error(`Unknown submitted event ${id}`);
  return e;
}

/** The demo student, plus the club submissions above. */
function demoState(): AppState {
  return { ...createDemoState(), submittedEvents: structuredClone(SUBMITTED), submissions: structuredClone(SUBMISSIONS) };
}

function stateWith(overrides: Partial<AppState>): AppState {
  return { ...demoState(), ...overrides };
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
    const s = demoState();
    expect(effectiveStatus(s, 'ev-001')).toBe('approved');
    expect(effectiveStatus(s, 'ev-s1')).toBe('pending');
    expect(effectiveStatus(s, 'ev-s4')).toBe('changes_requested');
  });

  it('prefers a submitted copy over the seed event, and a moderation override over both', () => {
    const copy = { ...submitted('ev-s4'), status: 'pending' as const };
    const s = stateWith({ submittedEvents: [copy] });
    expect(effectiveStatus(s, 'ev-s4')).toBe('pending');
    expect(effectiveStatus({ ...s, moderation: { 'ev-s4': 'approved' } }, 'ev-s4')).toBe('approved');
    expect(effectiveStatus(stateWith({ moderation: { 'ev-001': 'rejected' } }), 'ev-001')).toBe('rejected');
  });

  it('returns undefined for an unknown event', () => {
    expect(effectiveStatus(demoState(), 'ev-ghost')).toBeUndefined();
  });
});

describe('reducer purity', () => {
  it('never mutates a deep-frozen input state', () => {
    const frozen = deepFreeze(demoState());
    const actions: Action[] = [
      { type: 'profile/complete', profile: makeProfile() },
      { type: 'profile/clear' },
      { type: 'registration/register', eventId: 'ev-051', at: AT },
      { type: 'registration/register', eventId: 'ev-027', at: AT },
      { type: 'registration/unregister', eventId: 'ev-027' },
      { type: 'registration/markAttended', eventId: 'ev-027', entry: entry('pf-new', 'ev-027') },
      { type: 'registration/markAbsent', eventId: 'ev-027' },
      { type: 'portfolio/upsert', entry: entry('pf-001', 'ev-001') },
      { type: 'portfolio/remove', id: 'pf-002' },
      { type: 'submission/create', event: makeEvent({ id: 'ev-frozen' }), submission: submission('sub-frozen', 'ev-frozen') },
      { type: 'submission/resubmit', submissionId: 'sub-004', event: submitted('ev-s4'), at: AT },
      { type: 'moderation/review', submissionId: 'sub-001', action: 'approve', at: AT },
      { type: 'role/set', role: 'moderator' },
      { type: 'club/setActive', clubId: 'charite' },
      { type: 'theme/set', theme: 'dark' },
      { type: 'appearance/setMode', mode: 'diu-nhe' },
      { type: 'appearance/setDensity', density: 'minimal' },
      { type: 'demo/setToday', date: '2026-10-07' },
      { type: 'demo/setMochiOffline', offline: true },
      { type: 'demo/reset' },
    ];
    for (const action of actions) {
      expect(() => reducer(frozen, action), action.type).not.toThrow();
    }
    expect(frozen).toEqual(demoState());
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
    const s = demoState();
    const profile = makeProfile({ weeklyHourBudget: 10 });
    const next = reducer(s, { type: 'profile/complete', profile });
    expect(next.profile).toEqual(profile);
    expect(next.registrations).toBe(s.registrations);
    expect(s.profile).toEqual(SEED_PROFILE);
  });
});

describe('profile/clear', () => {
  it('removes the profile', () => {
    const next = reducer(demoState(), { type: 'profile/clear' });
    expect(next.profile).toBeNull();
  });

  it('is a no-op without a profile', () => {
    const s = stateWith({ profile: null });
    expect(reducer(s, { type: 'profile/clear' })).toBe(s);
  });
});

describe('registration/register', () => {
  it('adds a new registration', () => {
    const s = demoState();
    const next = reducer(s, { type: 'registration/register', eventId: 'ev-051', at: AT });
    expect(next.registrations).toHaveLength(SEED_REGISTRATIONS.length + 1);
    expect(next.registrations.at(-1)).toEqual({ eventId: 'ev-051', registeredAt: AT, status: 'registered' });
    expect(next.registrations.slice(0, -1)).toEqual(s.registrations);
    expect(s.registrations).toHaveLength(SEED_REGISTRATIONS.length);
  });

  it('re-registers after an absence, updating the time in place', () => {
    const s = stateWith({ registrations: [reg('ev-035'), reg('ev-051', 'absent'), reg('ev-040')] });
    const next = reducer(s, { type: 'registration/register', eventId: 'ev-051', at: LATER });
    expect(next.registrations.map((r) => r.eventId)).toEqual(['ev-035', 'ev-051', 'ev-040']);
    expect(regOf(next, 'ev-051')).toEqual({ eventId: 'ev-051', registeredAt: LATER, status: 'registered' });
    expect(next.registrations[0]).toBe(s.registrations[0]);
  });

  it('is a no-op for a duplicate registration or an attended event', () => {
    const s = demoState();
    expect(reducer(s, { type: 'registration/register', eventId: 'ev-027', at: LATER })).toBe(s);
    expect(reducer(s, { type: 'registration/register', eventId: 'ev-001', at: LATER })).toBe(s);
  });
});

describe('registration/unregister', () => {
  it('removes a registered event', () => {
    const s = demoState();
    const next = reducer(s, { type: 'registration/unregister', eventId: 'ev-027' });
    expect(regOf(next, 'ev-027')).toBeUndefined();
    expect(next.registrations).toHaveLength(SEED_REGISTRATIONS.length - 1);
  });

  it('is a no-op for attended, absent or unknown registrations', () => {
    const s = stateWith({ registrations: [reg('ev-001', 'attended'), reg('ev-027', 'absent')] });
    expect(reducer(s, { type: 'registration/unregister', eventId: 'ev-001' })).toBe(s);
    expect(reducer(s, { type: 'registration/unregister', eventId: 'ev-027' })).toBe(s);
    expect(reducer(s, { type: 'registration/unregister', eventId: 'ev-051' })).toBe(s);
  });
});

describe('registration/markAttended', () => {
  it('marks the event attended and adds the portfolio entry', () => {
    const s = demoState();
    const e = entry('pf-009', 'ev-027', { category: 'KN' });
    const next = reducer(s, { type: 'registration/markAttended', eventId: 'ev-027', entry: e });
    expect(regOf(next, 'ev-027')?.status).toBe('attended');
    expect(next.portfolio).toEqual([...SEED_PORTFOLIO, e]);
  });

  it('adds the entry only once when the event already has one', () => {
    const existing = entry('pf-keep', 'ev-027');
    const s = stateWith({ portfolio: [existing] });
    const next = reducer(s, { type: 'registration/markAttended', eventId: 'ev-027', entry: entry('pf-dup', 'ev-027') });
    expect(regOf(next, 'ev-027')?.status).toBe('attended');
    expect(next.portfolio).toBe(s.portfolio);
  });

  it('corrects an absence to attended', () => {
    const s = stateWith({ registrations: [reg('ev-027', 'absent')], portfolio: [] });
    const next = reducer(s, { type: 'registration/markAttended', eventId: 'ev-027', entry: entry('pf-x', 'ev-027') });
    expect(regOf(next, 'ev-027')?.status).toBe('attended');
    expect(next.portfolio).toHaveLength(1);
  });

  it('is a no-op when already attended or not registered', () => {
    const s = demoState();
    expect(reducer(s, { type: 'registration/markAttended', eventId: 'ev-001', entry: entry('pf-x', 'ev-001') })).toBe(s);
    expect(reducer(s, { type: 'registration/markAttended', eventId: 'ev-051', entry: entry('pf-y', 'ev-051') })).toBe(s);
  });
});

describe('registration/markAbsent', () => {
  it('marks a registered event absent without touching the portfolio', () => {
    const s = demoState();
    const next = reducer(s, { type: 'registration/markAbsent', eventId: 'ev-027' });
    expect(regOf(next, 'ev-027')?.status).toBe('absent');
    expect(regOf(next, 'ev-027')?.registeredAt).toBe(regOf(s, 'ev-027')?.registeredAt);
    expect(next.portfolio).toBe(s.portfolio);
  });

  it('is a no-op for attended, absent or unknown registrations', () => {
    const s = stateWith({ registrations: [reg('ev-001', 'attended'), reg('ev-027', 'absent')] });
    expect(reducer(s, { type: 'registration/markAbsent', eventId: 'ev-001' })).toBe(s);
    expect(reducer(s, { type: 'registration/markAbsent', eventId: 'ev-027' })).toBe(s);
    expect(reducer(s, { type: 'registration/markAbsent', eventId: 'ev-051' })).toBe(s);
  });
});

describe('portfolio/upsert', () => {
  it('appends a new entry', () => {
    const s = demoState();
    const e = entry('pf-new', 'ev-027');
    const next = reducer(s, { type: 'portfolio/upsert', entry: e });
    expect(next.portfolio).toEqual([...SEED_PORTFOLIO, e]);
    expect(next.registrations).toBe(s.registrations);
  });

  it('replaces an entry with the same id in place, leaving the previous state intact', () => {
    const s = demoState();
    const edited = { ...SEED_PORTFOLIO[0]!, reflection: 'Nội dung do học sinh biên soạn lại.', reflectionSource: 'student' as const };
    const next = reducer(s, { type: 'portfolio/upsert', entry: edited });
    expect(next.portfolio.map((p) => p.id)).toEqual(['pf-001', 'pf-002']);
    expect(next.portfolio[0]).toBe(edited);
    expect(next.portfolio[1]).toBe(s.portfolio[1]);
    expect(s.portfolio[0]).toEqual(SEED_PORTFOLIO[0]);
  });
});

describe('portfolio/remove', () => {
  it('removes the entry', () => {
    const next = reducer(demoState(), { type: 'portfolio/remove', id: 'pf-002' });
    expect(next.portfolio.map((p) => p.id)).toEqual(['pf-001']);
  });

  it('is a no-op for an unknown id', () => {
    const s = demoState();
    expect(reducer(s, { type: 'portfolio/remove', id: 'pf-404' })).toBe(s);
  });
});

describe('submission/create', () => {
  const created = makeEvent({ id: 'ev-created', clubId: 'bot-va-bo', status: 'draft' });
  const sub = submission('sub-created', 'ev-created');

  it('stores the event as pending and records the submission', () => {
    const s = demoState();
    const next = reducer(s, { type: 'submission/create', event: created, submission: sub });
    expect(next.submittedEvents).toEqual([...SUBMITTED, { ...created, status: 'pending' }]);
    expect(next.moderation).toEqual({ 'ev-created': 'pending' });
    expect(next.submissions).toEqual([...SUBMISSIONS, sub]);
    expect(effectiveStatus(next, 'ev-created')).toBe('pending');
    expect(s.submittedEvents).toEqual(SUBMITTED);
  });

  it('forces pending even when the event arrives approved', () => {
    const next = reducer(demoState(), {
      type: 'submission/create',
      event: { ...created, status: 'approved' },
      submission: sub,
    });
    expect(next.submittedEvents.at(-1)?.status).toBe('pending');
  });

  it('replaces an earlier copy of the same event id', () => {
    const s = reducer(demoState(), { type: 'submission/create', event: created, submission: sub });
    const retitled = { ...created, title: 'Buổi chia sẻ phát triển sản phẩm học tập' };
    const next = reducer(s, { type: 'submission/create', event: retitled, submission: submission('sub-2', 'ev-created') });
    expect(next.submittedEvents).toHaveLength(SUBMITTED.length + 1);
    expect(next.submittedEvents.at(-1)?.title).toBe(retitled.title);
    expect(next.submissions).toHaveLength(SUBMISSIONS.length + 2);
  });

  it('is a no-op for a duplicate submission id', () => {
    const s = demoState();
    expect(reducer(s, { type: 'submission/create', event: created, submission: submission('sub-001', 'ev-created') })).toBe(s);
  });
});

describe('submission/resubmit', () => {
  const edited: SchoolEvent = { ...submitted('ev-s4'), location: 'Phòng Tin học 2', capacity: 30 };

  it('resubmits after changes were requested: stores the edited copy as pending and logs the note', () => {
    const s = demoState();
    const next = reducer(s, { type: 'submission/resubmit', submissionId: 'sub-004', event: edited, at: LATER });
    expect(next.submittedEvents).toEqual(SUBMITTED.map((e) => (e.id === 'ev-s4' ? { ...edited, status: 'pending' } : e)));
    expect(next.moderation).toEqual({ 'ev-s4': 'pending' });
    expect(effectiveStatus(next, 'ev-s4')).toBe('pending');
    const history = subOf(next, 'sub-004')?.history ?? [];
    expect(history).toHaveLength(3);
    expect(history.at(-1)).toEqual({ at: LATER, actor: 'club', action: 'resubmit' });
    expect(subOf(next, 'sub-001')).toBe(subOf(s, 'sub-001'));
    expect(subOf(s, 'sub-004')?.history).toHaveLength(2);
  });

  it('replaces an existing edited copy in place', () => {
    const created = makeEvent({ id: 'ev-c', clubId: 'bot-va-bo' });
    let s = reducer(demoState(), { type: 'submission/create', event: created, submission: submission('sub-c', 'ev-c') });
    s = reducer(s, { type: 'moderation/review', submissionId: 'sub-c', action: 'request_changes', reason: REASON, at: AT });
    expect(effectiveStatus(s, 'ev-c')).toBe('changes_requested');
    const fixed = { ...created, capacity: 25 };
    const next = reducer(s, { type: 'submission/resubmit', submissionId: 'sub-c', event: fixed, at: LATER });
    expect(next.submittedEvents.at(-1)).toEqual({ ...fixed, status: 'pending' });
    expect(next.moderation['ev-c']).toBe('pending');
  });

  it('is a no-op unless the event is waiting for changes', () => {
    const s = demoState();
    // sub-001 → ev-s1 is pending, sub-005 → ev-s5 is rejected.
    expect(reducer(s, { type: 'submission/resubmit', submissionId: 'sub-001', event: submitted('ev-s1'), at: LATER })).toBe(s);
    expect(reducer(s, { type: 'submission/resubmit', submissionId: 'sub-005', event: submitted('ev-s5'), at: LATER })).toBe(s);
    const approved = stateWith({ moderation: { 'ev-s4': 'approved' } });
    expect(reducer(approved, { type: 'submission/resubmit', submissionId: 'sub-004', event: edited, at: LATER })).toBe(approved);
  });

  it('is a no-op for an unknown submission, a different event id or an unknown event', () => {
    const s = demoState();
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
    const s = demoState();
    const next = reducer(s, { type: 'moderation/review', submissionId: 'sub-001', action: 'approve', at: LATER });
    expect(next.moderation).toEqual({ 'ev-s1': 'approved' });
    expect(effectiveStatus(next, 'ev-s1')).toBe('approved');
    expect(subOf(next, 'sub-001')?.history.at(-1)).toEqual({ at: LATER, actor: 'hdhs', action: 'approve' });
    expect(next.submittedEvents).toBe(s.submittedEvents);
    expect(subOf(next, 'sub-002')).toBe(subOf(s, 'sub-002'));
  });

  it('requests changes with a trimmed reason', () => {
    const next = reducer(demoState(), {
      type: 'moderation/review',
      submissionId: 'sub-002',
      action: 'request_changes',
      reason: `  ${REASON}  `,
      at: LATER,
    });
    expect(next.moderation['ev-s2']).toBe('changes_requested');
    expect(subOf(next, 'sub-002')?.history.at(-1)).toEqual({
      at: LATER,
      actor: 'hdhs',
      action: 'request_changes',
      reason: REASON,
    });
  });

  it('rejects with a reason', () => {
    const next = reducer(demoState(), {
      type: 'moderation/review',
      submissionId: 'sub-003',
      action: 'reject',
      reason: REASON,
      at: LATER,
    });
    expect(next.moderation['ev-s3']).toBe('rejected');
    expect(subOf(next, 'sub-003')?.history.at(-1)?.reason).toBe(REASON);
  });

  it('is a no-op when changes or a rejection come without a reason', () => {
    const s = demoState();
    expect(reducer(s, { type: 'moderation/review', submissionId: 'sub-001', action: 'request_changes', at: LATER })).toBe(s);
    expect(
      reducer(s, { type: 'moderation/review', submissionId: 'sub-001', action: 'request_changes', reason: '   ', at: LATER }),
    ).toBe(s);
    expect(reducer(s, { type: 'moderation/review', submissionId: 'sub-001', action: 'reject', reason: '', at: LATER })).toBe(s);
  });

  it('is a no-op for an invalid transition', () => {
    const s = demoState();
    // sub-004 → ev-s4 waits for changes, sub-005 → ev-s5 is rejected.
    expect(reducer(s, { type: 'moderation/review', submissionId: 'sub-004', action: 'approve', at: LATER })).toBe(s);
    expect(reducer(s, { type: 'moderation/review', submissionId: 'sub-005', action: 'reject', reason: REASON, at: LATER })).toBe(s);
    const approved = reducer(s, { type: 'moderation/review', submissionId: 'sub-001', action: 'approve', at: LATER });
    expect(reducer(approved, { type: 'moderation/review', submissionId: 'sub-001', action: 'approve', at: LATER })).toBe(approved);
  });

  it('is a no-op for an unknown submission or an unknown event', () => {
    const s = demoState();
    expect(reducer(s, { type: 'moderation/review', submissionId: 'sub-404', action: 'approve', at: LATER })).toBe(s);
    const ghost = stateWith({ submissions: [submission('sub-ghost', 'ev-ghost')] });
    expect(reducer(ghost, { type: 'moderation/review', submissionId: 'sub-ghost', action: 'approve', at: LATER })).toBe(ghost);
  });
});

describe('setters', () => {
  it('role/set changes the role; the same role returns the identical state', () => {
    const s = demoState();
    expect(reducer(s, { type: 'role/set', role: 'moderator' }).role).toBe('moderator');
    expect(reducer(s, { type: 'role/set', role: 'student' })).toBe(s);
  });

  it('club/setActive changes the club; the same club returns the identical state', () => {
    const s = demoState();
    expect(reducer(s, { type: 'club/setActive', clubId: 'charite' }).activeClubId).toBe('charite');
    expect(reducer(s, { type: 'club/setActive', clubId: 'bot-va-bo' })).toBe(s);
  });

  it('theme/set changes the theme; the same theme returns the identical state', () => {
    const s = demoState();
    expect(reducer(s, { type: 'theme/set', theme: 'dark' }).theme).toBe('dark');
    expect(reducer(s, { type: 'theme/set', theme: 'system' })).toBe(s);
  });

  it('appearance/setMode and appearance/setDensity change the appearance; same or unknown values change nothing', () => {
    const s = demoState();
    const vivid = reducer(s, { type: 'appearance/setMode', mode: 'ruc-ro' });
    expect(vivid.mode).toBe('ruc-ro');
    expect(reducer(vivid, { type: 'appearance/setMode', mode: 'ruc-ro' })).toBe(vivid);
    expect(reducer(s, { type: 'appearance/setMode', mode: 'neon' as never })).toBe(s);
    const minimal = reducer(s, { type: 'appearance/setDensity', density: 'minimal' });
    expect(minimal.density).toBe('minimal');
    expect(reducer(minimal, { type: 'appearance/setDensity', density: 'minimal' })).toBe(minimal);
    expect(reducer(s, { type: 'appearance/setDensity', density: 'tiny' as never })).toBe(s);
    const still = reducer(s, { type: 'appearance/setInteractivity', level: 'none' });
    expect(still.interactivity).toBe('none');
    expect(reducer(still, { type: 'appearance/setInteractivity', level: 'none' })).toBe(still);
    expect(reducer(s, { type: 'appearance/setInteractivity', level: 'wild' as never })).toBe(s);
  });

  it('demo/setToday sets and clears the demo date; the same value returns the identical state', () => {
    const s = demoState();
    const dated = reducer(s, { type: 'demo/setToday', date: '2026-10-07' });
    expect(dated.demoToday).toBe('2026-10-07');
    expect(reducer(dated, { type: 'demo/setToday', date: '2026-10-07' })).toBe(dated);
    expect(reducer(dated, { type: 'demo/setToday', date: null }).demoToday).toBeNull();
    expect(reducer(s, { type: 'demo/setToday', date: null })).toBe(s);
  });

  it('demo/setMochiOffline toggles the flag; the same value returns the identical state', () => {
    const s = demoState();
    expect(reducer(s, { type: 'demo/setMochiOffline', offline: true }).mochiForcedOffline).toBe(true);
    expect(reducer(s, { type: 'demo/setMochiOffline', offline: false })).toBe(s);
  });
});

describe('demo/reset', () => {
  it('clears the student data (a new profile is needed) and keeps the presentation settings', () => {
    let s = demoState();
    const actions: Action[] = [
      { type: 'role/set', role: 'moderator' },
      { type: 'club/setActive', clubId: 'charite' },
      { type: 'theme/set', theme: 'dark' },
      { type: 'appearance/setMode', mode: 'ap-phich' },
      { type: 'appearance/setDensity', density: 'full' },
      { type: 'appearance/setInteractivity', level: 'extreme' },
      { type: 'demo/setToday', date: '2026-11-02' },
      { type: 'demo/setMochiOffline', offline: true },
      { type: 'profile/clear' },
      { type: 'registration/register', eventId: 'ev-051', at: AT },
      { type: 'portfolio/remove', id: 'pf-001' },
      { type: 'submission/create', event: makeEvent({ id: 'ev-r' }), submission: submission('sub-r', 'ev-r') },
      { type: 'moderation/review', submissionId: 'sub-001', action: 'approve', at: AT },
    ];
    for (const action of actions) s = reducer(s, action);

    const next = reducer(s, { type: 'demo/reset' });
    expect(next).toEqual({ ...createSeedState(), theme: 'dark', mode: 'ap-phich', density: 'full', interactivity: 'extreme', demoToday: '2026-11-02', mochiForcedOffline: true });
    expect(next.role).toBe('student');
    expect(next.activeClubId).toBe('bot-va-bo');
    expect(next.profile).toBeNull();
    expect(next.registrations).toEqual([]);
    expect(next.portfolio).toEqual([]);
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
    const s = demoState();
    expect(reducer(s, { type: 'legacy/unknown' } as unknown as Parameters<typeof reducer>[1])).toBe(s);
  });
});

describe('newsletter', () => {
  const post = makePost({ id: 'bt-demo-1', slug: 'thong-bao-thu-nghiem' });

  it('publishes a council article once', () => {
    const s1 = reducer(demoState(), { type: 'news/publish', post });
    expect(s1.newsPosts).toEqual([post]);
    expect(reducer(s1, { type: 'news/publish', post })).toBe(s1);
    expect(reducer(s1, { type: 'news/publish', post: { ...post, id: 'bt-demo-2' } })).toBe(s1);
  });

  it('refuses reserved slugs and the id or slug of a sample article', () => {
    const s = demoState();
    const seed = NEWS[0];
    if (!seed) throw new Error('The sample newsletter is empty');
    expect(reducer(s, { type: 'news/publish', post: { ...post, slug: 'soan-bai' } })).toBe(s);
    expect(reducer(s, { type: 'news/publish', post: { ...post, id: seed.id } })).toBe(s);
    expect(reducer(s, { type: 'news/publish', post: { ...post, slug: seed.slug } })).toBe(s);
  });

  it('removes only articles published in the demo', () => {
    const s1 = reducer(demoState(), { type: 'news/publish', post });
    expect(reducer(s1, { type: 'news/remove', id: post.id }).newsPosts).toEqual([]);
    expect(reducer(s1, { type: 'news/remove', id: 'bt-001' })).toBe(s1);
  });
});

describe('guest picks', () => {
  it('keeps a known grade and distinct known fields, and ignores a repeat', () => {
    const s0 = createSeedState();
    const s1 = reducer(s0, { type: 'guest/setPicks', picks: { grade: 8, interests: ['CN', 'NT', 'CN', 'XX' as never] } });
    expect(s1.guestPicks).toEqual({ grade: 8, interests: ['CN', 'NT'] });
    expect(reducer(s1, { type: 'guest/setPicks', picks: { grade: 8, interests: ['CN', 'NT'] } })).toBe(s1);
    expect(reducer(s1, { type: 'guest/setPicks', picks: { grade: 5 as never, interests: [] } }).guestPicks).toEqual({ grade: null, interests: [] });
    // A reset clears what the visitor picked.
    expect(reducer(s1, { type: 'demo/reset' }).guestPicks).toEqual({ grade: null, interests: [] });
  });
});

describe('proposals', () => {
  const mine = {
    id: 'dx-demo-1',
    title: 'Giải Cờ tướng học sinh',
    category: 'TT' as const,
    description: 'Đề xuất tổ chức giải Cờ tướng dành cho học sinh toàn trường vào buổi chiều thứ Bảy.',
    grades: [6, 7, 8] as const,
    clubId: null,
    authorGrade: 7 as const,
    submittedAt: AT,
    supporters: 0,
  };
  const proposal = { ...mine, grades: [...mine.grades] };
  const collab = {
    id: 'ht-demo-1',
    fromClubId: 'bot-va-bo',
    toClubId: 'charite',
    title: 'Hội chợ bánh gây quỹ thiện nguyện',
    category: 'TN' as const,
    description: 'Câu lạc bộ Bột và Bơ đề xuất phối hợp tổ chức hội chợ bánh gây quỹ cùng Câu lạc bộ Charité.',
    month: '2026-12',
    submittedAt: AT,
  };
  const answer = (status: 'accepted' | 'declined', by: string, note = 'Hội đồng Học sinh tiếp nhận đề xuất.') => ({ status, at: AT, by, note, assignedClubId: null });

  it('stores a sent proposal once and refuses ids already in use', () => {
    const s1 = reducer(demoState(), { type: 'proposal/submit', proposal });
    expect(s1.proposals).toEqual([proposal]);
    expect(reducer(s1, { type: 'proposal/submit', proposal })).toBe(s1);
    expect(reducer(s1, { type: 'proposal/submit', proposal: { ...proposal, id: 'dx-001' } })).toBe(s1);
    const withCollab = reducer(s1, { type: 'collaboration/submit', proposal: collab });
    expect(reducer(withCollab, { type: 'proposal/submit', proposal: { ...proposal, id: collab.id } })).toBe(withCollab);
  });

  it("supports and stops supporting other students' proposals only", () => {
    const s1 = reducer(demoState(), { type: 'proposal/toggleSupport', id: 'dx-002' });
    expect(s1.supportedProposals).toEqual(['dx-002']);
    expect(reducer(s1, { type: 'proposal/toggleSupport', id: 'dx-002' }).supportedProposals).toEqual([]);
    expect(reducer(s1, { type: 'proposal/toggleSupport', id: 'dx-404' })).toBe(s1);
    const own = reducer(s1, { type: 'proposal/submit', proposal });
    expect(reducer(own, { type: 'proposal/toggleSupport', id: proposal.id })).toBe(own);
  });

  it('stores a collaboration between two different clubs once', () => {
    const s1 = reducer(demoState(), { type: 'collaboration/submit', proposal: collab });
    expect(s1.collaborations).toEqual([collab]);
    expect(reducer(s1, { type: 'collaboration/submit', proposal: collab })).toBe(s1);
    expect(reducer(s1, { type: 'collaboration/submit', proposal: { ...collab, id: 'ht-demo-2', toClubId: 'bot-va-bo' } })).toBe(s1);
    expect(reducer(s1, { type: 'collaboration/submit', proposal: { ...collab, id: 'dx-001' } })).toBe(s1);
  });

  it('lets HĐHS answer a pending student proposal once', () => {
    const s = demoState();
    const s1 = reducer(s, { type: 'proposal/respond', id: 'dx-002', response: answer('accepted', 'hdhs') });
    expect(s1.proposalResponses['dx-002']?.status).toBe('accepted');
    expect(reducer(s1, { type: 'proposal/respond', id: 'dx-002', response: answer('declined', 'hdhs') })).toBe(s1);
    // Already answered in the sample data, answered by a club, a decline without a reason, unknown id.
    expect(reducer(s, { type: 'proposal/respond', id: 'dx-001', response: answer('declined', 'hdhs') })).toBe(s);
    expect(reducer(s, { type: 'proposal/respond', id: 'dx-002', response: answer('accepted', 'bot-va-bo') })).toBe(s);
    expect(reducer(s, { type: 'proposal/respond', id: 'dx-002', response: answer('declined', 'hdhs', '  ') })).toBe(s);
    expect(reducer(s, { type: 'proposal/respond', id: 'dx-404', response: answer('accepted', 'hdhs') })).toBe(s);
  });

  it('lets only the receiving club answer a collaboration', () => {
    const s = reducer(demoState(), { type: 'collaboration/submit', proposal: collab });
    expect(reducer(s, { type: 'proposal/respond', id: collab.id, response: answer('accepted', 'bot-va-bo') })).toBe(s);
    expect(reducer(s, { type: 'proposal/respond', id: collab.id, response: answer('accepted', 'hdhs') })).toBe(s);
    const s1 = reducer(s, { type: 'proposal/respond', id: collab.id, response: answer('accepted', 'charite') });
    expect(s1.proposalResponses[collab.id]?.by).toBe('charite');
  });

  it('withdraws only what was sent in this browser and is still unanswered', () => {
    let s = reducer(demoState(), { type: 'proposal/submit', proposal });
    s = reducer(s, { type: 'collaboration/submit', proposal: collab });
    expect(reducer(s, { type: 'proposal/withdraw', id: proposal.id }).proposals).toEqual([]);
    expect(reducer(s, { type: 'proposal/withdraw', id: collab.id }).collaborations).toEqual([]);
    expect(reducer(s, { type: 'proposal/withdraw', id: 'dx-002' })).toBe(s);
    const answered = reducer(s, { type: 'proposal/respond', id: proposal.id, response: answer('accepted', 'hdhs') });
    expect(reducer(answered, { type: 'proposal/withdraw', id: proposal.id })).toBe(answered);
  });
});
