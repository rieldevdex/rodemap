import { describe, expect, it } from 'vitest';
import { SEED_PORTFOLIO, SEED_PROFILE, SEED_REGISTRATIONS } from '../testing/sample-data';
import { makeEvent } from '../domain/test-fixtures';
import { createSeedState, DEFAULT_CLUB_ID, dropRetiredReferences, isAppStateV1, migrate, STATE_VERSION, STORAGE_KEY } from './schema';
import { createDemoState } from '../testing/sample-data';

describe('constants', () => {
  it('pins the storage key, version and default club', () => {
    expect(STORAGE_KEY).toBe('vsmcclubs:v1');
    expect(STATE_VERSION).toBe(1);
    expect(DEFAULT_CLUB_ID).toBe('bot-va-bo');
  });
});

describe('createSeedState', () => {
  it('starts a new visitor without a profile, registrations or portfolio', () => {
    expect(createSeedState()).toEqual({
      version: 1,
      role: 'student',
      activeClubId: 'bot-va-bo',
      profile: null,
      registrations: [],
      portfolio: [],
      submittedEvents: [],
      moderation: {},
      submissions: [],
      newsPosts: [],
      proposals: [],
      collaborations: [],
      proposalResponses: {},
      supportedProposals: [],
      guestPicks: { grade: null, interests: [] },
      theme: 'system',
      mode: 'lo-trinh',
      density: 'compact',
      interactivity: 'medium',
      demoToday: null,
      mochiForcedOffline: false,
    });
  });

  it('builds the illustrative grade 11 student for tests and screenshots', () => {
    const s = createDemoState();
    expect(s).toEqual({
      version: 1,
      role: 'student',
      activeClubId: 'bot-va-bo',
      profile: SEED_PROFILE,
      registrations: SEED_REGISTRATIONS,
      portfolio: SEED_PORTFOLIO,
      submittedEvents: [],
      moderation: {},
      submissions: [],
      newsPosts: [],
      proposals: [],
      collaborations: [],
      proposalResponses: {},
      supportedProposals: [],
      guestPicks: { grade: null, interests: [] },
      theme: 'system',
      mode: 'lo-trinh',
      density: 'compact',
      interactivity: 'medium',
      demoToday: null,
      mochiForcedOffline: false,
    });
  });

  it('returns deep copies: mutating one state affects neither the next one nor the seed constants', () => {
    const first = createDemoState();
    expect(first.profile).not.toBe(SEED_PROFILE);
    expect(first.registrations).not.toBe(SEED_REGISTRATIONS);
    expect(first.portfolio).not.toBe(SEED_PORTFOLIO);

    first.profile!.interests.push('TS');
    first.profile!.availability.weekend = false;
    first.registrations.push({ eventId: 'ev-099', registeredAt: '2026-10-07T09:00:00+07:00', status: 'registered' });
    first.registrations[0]!.status = 'absent';
    first.portfolio[0]!.evidenceLinks.push('https://example.com/minh-chung/them');
    first.submittedEvents.push(makeEvent({ id: 'ev-new' }));
    first.moderation['ev-001'] = 'rejected';

    const second = createDemoState();
    expect(second.profile).toEqual(SEED_PROFILE);
    expect(second.registrations).toEqual(SEED_REGISTRATIONS);
    expect(second.portfolio).toEqual(SEED_PORTFOLIO);
    expect(second.submissions).toEqual([]);
    expect(second.submittedEvents).toEqual([]);
    expect(second.moderation).toEqual({});

    expect(SEED_PROFILE.interests).not.toContain('TS');
    expect(SEED_PROFILE.availability.weekend).toBe(true);
    expect(SEED_REGISTRATIONS.map((r) => r.eventId)).not.toContain('ev-099');
    expect(SEED_REGISTRATIONS[0]?.status).toBe('attended');
    expect(SEED_PORTFOLIO[0]?.evidenceLinks).toHaveLength(1);
  });
});

describe('isAppStateV1 / migrate', () => {
  it('accepts the seed state and a JSON round trip of it', () => {
    const seed = createSeedState();
    expect(isAppStateV1(seed)).toBe(true);
    expect(migrate(seed)).toBe(seed);
    const parsed: unknown = JSON.parse(JSON.stringify(seed));
    expect(isAppStateV1(parsed)).toBe(true);
    expect(migrate(parsed)).toEqual(seed);
  });

  it('accepts every role, every theme, a null profile and a demo date', () => {
    for (const role of ['student', 'club', 'moderator'] as const) {
      expect(isAppStateV1({ ...createSeedState(), role })).toBe(true);
    }
    for (const theme of ['system', 'light', 'dark'] as const) {
      expect(isAppStateV1({ ...createSeedState(), theme })).toBe(true);
    }
    expect(isAppStateV1({ ...createSeedState(), profile: null, demoToday: '2026-10-07' })).toBe(true);
  });

  it.each([null, undefined, 1, 'vsmcclubs', true, [], [createSeedState()]])('rejects the non-object %j', (raw) => {
    expect(isAppStateV1(raw)).toBe(false);
    expect(migrate(raw)).toBeNull();
  });

  const malformed: [string, Record<string, unknown>][] = [
    ['an unknown version', { version: 2 }],
    ['a missing version', { version: undefined }],
    ['a version as text', { version: '1' }],
    ['a non-string role', { role: 1 }],
    ['an unknown role', { role: 'admin' }],
    ['a non-string active club', { activeClubId: null }],
    ['a profile that is not an object', { profile: 'hồ sơ' }],
    ['a profile array', { profile: [] }],
    ['a missing profile', { profile: undefined }],
    ['registrations that are not an array', { registrations: {} }],
    ['a portfolio that is not an array', { portfolio: null }],
    ['submitted events that are not an array', { submittedEvents: 'ev-001' }],
    ['moderation that is an array', { moderation: [] }],
    ['moderation that is null', { moderation: null }],
    ['submissions that are not an array', { submissions: {} }],
    ['news posts that are not an array', { newsPosts: {} }],
    ['news posts set to undefined', { newsPosts: undefined }],
    ['proposals that are not an array', { proposals: {} }],
    ['collaborations that are not an array', { collaborations: 'ht-001' }],
    ['proposal responses that are an array', { proposalResponses: [] }],
    ['supported proposals that are not an array', { supportedProposals: null }],
    ['guest picks that are not an object', { guestPicks: [] }],
    ['guest picks with a text grade', { guestPicks: { grade: '11', interests: [] } }],
    ['guest picks without interests', { guestPicks: { grade: null } }],
    ['a non-string theme', { theme: 0 }],
    ['an unknown theme', { theme: 'sepia' }],
    ['an unknown appearance mode', { mode: 'neon' }],
    ['a non-string appearance mode', { mode: 1 }],
    ['an unknown text density', { density: 'tiny' }],
    ['a non-string text density', { density: null }],
    ['an unknown interactivity level', { interactivity: 'wild' }],
    ['a non-string interactivity level', { interactivity: 2 }],
    ['a numeric demo date', { demoToday: 20261007 }],
    ['an unreadable demo date', { demoToday: 'ngày mai' }],
    ['a missing demo date', { demoToday: undefined }],
    ['a non-boolean Mochi offline flag', { mochiForcedOffline: 'false' }],
  ];

  it('upgrades a v1 state saved before proposals existed', () => {
    const older: Partial<ReturnType<typeof createSeedState>> = createDemoState();
    delete older.proposals;
    delete older.collaborations;
    delete older.proposalResponses;
    delete older.supportedProposals;
    const migrated = migrate(older);
    expect(migrated?.proposals).toEqual([]);
    expect(migrated?.collaborations).toEqual([]);
    expect(migrated?.proposalResponses).toEqual({});
    expect(migrated?.supportedProposals).toEqual([]);
    expect(migrated?.profile).toEqual(older.profile);
  });

  it('upgrades a v1 state saved before guest picks existed', () => {
    const older: Partial<ReturnType<typeof createSeedState>> = createSeedState();
    delete older.guestPicks;
    expect(migrate(older)?.guestPicks).toEqual({ grade: null, interests: [] });
  });

  it('upgrades a v1 state saved before appearance modes and text density existed', () => {
    const older: Partial<ReturnType<typeof createSeedState>> = createSeedState();
    delete older.mode;
    delete older.density;
    delete older.interactivity;
    const migrated = migrate(older);
    expect(migrated?.mode).toBe('lo-trinh');
    expect(migrated?.density).toBe('compact');
    expect(migrated?.interactivity).toBe('medium');
  });

  it('accepts every appearance mode and text density', () => {
    for (const mode of ['lo-trinh', 'ruc-ro', 'ap-phich', 'diu-nhe'] as const) {
      expect(isAppStateV1({ ...createSeedState(), mode })).toBe(true);
    }
    for (const density of ['full', 'compact', 'minimal'] as const) {
      expect(isAppStateV1({ ...createSeedState(), density })).toBe(true);
    }
    for (const interactivity of ['none', 'slight', 'medium', 'extreme'] as const) {
      expect(isAppStateV1({ ...createSeedState(), interactivity })).toBe(true);
    }
  });

  it('upgrades a v1 state saved before the newsletter existed', () => {
    const older: Partial<ReturnType<typeof createSeedState>> = createSeedState();
    delete older.newsPosts;
    const migrated = migrate(older);
    expect(migrated?.newsPosts).toEqual([]);
    expect(migrated?.registrations).toEqual(older.registrations);
  });

  it.each(malformed)('rejects a state with %s', (_label, patch) => {
    const raw: unknown = { ...createSeedState(), ...patch };
    expect(isAppStateV1(raw)).toBe(false);
    expect(migrate(raw)).toBeNull();
  });
});

describe('dropRetiredReferences', () => {
  it('keeps a current state as it is (same object)', () => {
    const demo = createDemoState();
    expect(dropRetiredReferences(demo)).toBe(demo);
    const own = { ...demo, submittedEvents: [makeEvent({ id: 'ev-own', clubId: 'bot-va-bo' })], registrations: [...demo.registrations, { eventId: 'ev-own', registeredAt: '2026-10-07T09:00:00+07:00', status: 'registered' as const }] };
    expect(dropRetiredReferences(own)).toBe(own);
  });

  it('drops what a state saved before the real clubs points at, and keeps everything else', () => {
    const demo = createDemoState();
    const saved = {
      ...demo,
      activeClubId: 'inkstep',
      registrations: [...demo.registrations, { eventId: 'ev-007', registeredAt: '2026-09-20T20:35:00+07:00', status: 'attended' as const }],
      portfolio: [...demo.portfolio, { ...demo.portfolio[0]!, id: 'pf-old', eventId: 'ev-007' }],
      submissions: [
        { id: 'sub-001', eventId: 'ev-046', clubId: 'robotics', submittedAt: '2026-10-05T15:20:00+07:00', history: [] },
        { id: 'sub-own', eventId: 'ev-own', clubId: 'bot-va-bo', submittedAt: '2026-10-06T15:20:00+07:00', history: [] },
      ],
      submittedEvents: [makeEvent({ id: 'ev-own', clubId: 'bot-va-bo' })],
      moderation: { 'ev-047': 'approved' as const, 'ev-own': 'pending' as const },
      collaborations: [
        { id: 'ht-901', fromClubId: 'inkstep', toClubId: 'charite', title: 'Hợp tác', category: 'TN' as const, description: 'Mô tả.', month: '2026-12', submittedAt: '2026-10-01T20:30:00+07:00' },
        { id: 'ht-902', fromClubId: 'bot-va-bo', toClubId: 'charite', title: 'Hợp tác', category: 'TN' as const, description: 'Mô tả.', month: '2026-12', submittedAt: '2026-10-01T20:30:00+07:00' },
      ],
      proposals: [
        { id: 'dx-901', title: 'Đề xuất', category: 'HT' as const, description: 'Mô tả.', grades: [11 as const], clubId: 'tranh-bien', authorGrade: 11 as const, submittedAt: '2026-10-01T20:30:00+07:00', supporters: 0 },
        { id: 'dx-902', title: 'Đề xuất', category: 'HT' as const, description: 'Mô tả.', grades: [11 as const], clubId: 'mentis-club', authorGrade: 11 as const, submittedAt: '2026-10-01T20:30:00+07:00', supporters: 0 },
      ],
      proposalResponses: {
        'dx-901': { status: 'accepted' as const, at: '2026-10-02T20:30:00+07:00', by: 'hdhs', note: 'Tiếp nhận.', assignedClubId: 'toan-hoc' },
        'dx-902': { status: 'accepted' as const, at: '2026-10-02T20:30:00+07:00', by: 'hdhs', note: 'Tiếp nhận.', assignedClubId: 'mentis-club' },
      },
    };
    const clean = dropRetiredReferences(saved);
    expect(clean.activeClubId).toBe(DEFAULT_CLUB_ID);
    expect(clean.registrations).toEqual(demo.registrations);
    expect(clean.portfolio).toEqual(demo.portfolio);
    expect(clean.submissions.map((x) => x.id)).toEqual(['sub-own']);
    expect(clean.moderation).toEqual({ 'ev-own': 'pending' });
    expect(clean.collaborations.map((c) => c.id)).toEqual(['ht-902']);
    expect(clean.proposals.map((p) => p.clubId)).toEqual([null, 'mentis-club']);
    expect(clean.proposalResponses['dx-901']?.assignedClubId).toBeNull();
    expect(clean.proposalResponses['dx-902']?.assignedClubId).toBe('mentis-club');
    // Unrelated fields come through untouched.
    expect(clean.profile).toEqual(demo.profile);
  });

  it('keeps a real active club and cleans each kind of stale reference on its own', () => {
    const demo = createDemoState();
    expect(dropRetiredReferences({ ...demo, activeClubId: 'charite', moderation: { 'ev-046': 'pending' } })).toEqual({ ...demo, activeClubId: 'charite' });
    expect(dropRetiredReferences({ ...demo, portfolio: [{ ...demo.portfolio[0]!, eventId: 'ev-005' }] }).portfolio).toEqual([]);
  });

  it('runs on load, through migrate', () => {
    const saved: unknown = JSON.parse(JSON.stringify({ ...createDemoState(), activeClubId: 'inkstep' }));
    expect(migrate(saved)?.activeClubId).toBe(DEFAULT_CLUB_ID);
  });
});
