import { describe, expect, it } from 'vitest';
import { SEED_PORTFOLIO, SEED_PROFILE, SEED_REGISTRATIONS, SEED_SUBMISSIONS } from '../data/seed';
import { makeEvent } from '../domain/test-fixtures';
import { createSeedState, DEFAULT_CLUB_ID, isAppStateV1, migrate, STATE_VERSION, STORAGE_KEY } from './schema';

describe('constants', () => {
  it('pins the storage key, version and default club', () => {
    expect(STORAGE_KEY).toBe('rodemap:v1');
    expect(STATE_VERSION).toBe(1);
    expect(DEFAULT_CLUB_ID).toBe('inkstep');
  });
});

describe('createSeedState', () => {
  it('builds the illustrative demo state', () => {
    const s = createSeedState();
    expect(s).toEqual({
      version: 1,
      role: 'student',
      activeClubId: 'inkstep',
      profile: SEED_PROFILE,
      registrations: SEED_REGISTRATIONS,
      portfolio: SEED_PORTFOLIO,
      submittedEvents: [],
      moderation: {},
      submissions: SEED_SUBMISSIONS,
      theme: 'system',
      demoToday: null,
      mochiForcedOffline: false,
    });
  });

  it('returns deep copies: mutating one state affects neither the next one nor the seed constants', () => {
    const first = createSeedState();
    expect(first.profile).not.toBe(SEED_PROFILE);
    expect(first.registrations).not.toBe(SEED_REGISTRATIONS);
    expect(first.portfolio).not.toBe(SEED_PORTFOLIO);
    expect(first.submissions).not.toBe(SEED_SUBMISSIONS);

    first.profile!.interests.push('TS');
    first.profile!.availability.weekend = false;
    first.registrations.push({ eventId: 'ev-099', registeredAt: '2026-10-07T09:00:00+07:00', status: 'registered' });
    first.registrations[0]!.status = 'absent';
    first.portfolio[0]!.evidenceLinks.push('https://example.com/minh-chung/them');
    first.submissions[0]!.history.push({ at: '2026-10-07T09:00:00+07:00', actor: 'hdhs', action: 'approve' });
    first.submittedEvents.push(makeEvent({ id: 'ev-new' }));
    first.moderation['ev-001'] = 'rejected';

    const second = createSeedState();
    expect(second.profile).toEqual(SEED_PROFILE);
    expect(second.registrations).toEqual(SEED_REGISTRATIONS);
    expect(second.portfolio).toEqual(SEED_PORTFOLIO);
    expect(second.submissions).toEqual(SEED_SUBMISSIONS);
    expect(second.submittedEvents).toEqual([]);
    expect(second.moderation).toEqual({});

    expect(SEED_PROFILE.interests).not.toContain('TS');
    expect(SEED_PROFILE.availability.weekend).toBe(true);
    expect(SEED_REGISTRATIONS.map((r) => r.eventId)).not.toContain('ev-099');
    expect(SEED_REGISTRATIONS[0]?.status).toBe('attended');
    expect(SEED_PORTFOLIO[0]?.evidenceLinks).toHaveLength(1);
    expect(SEED_SUBMISSIONS[0]?.history).toHaveLength(1);
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

  it.each([null, undefined, 1, 'rodemap', true, [], [createSeedState()]])('rejects the non-object %j', (raw) => {
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
    ['a non-string theme', { theme: 0 }],
    ['an unknown theme', { theme: 'sepia' }],
    ['a numeric demo date', { demoToday: 20261007 }],
    ['an unreadable demo date', { demoToday: 'ngày mai' }],
    ['a missing demo date', { demoToday: undefined }],
    ['a non-boolean Mochi offline flag', { mochiForcedOffline: 'false' }],
  ];

  it.each(malformed)('rejects a state with %s', (_label, patch) => {
    const raw: unknown = { ...createSeedState(), ...patch };
    expect(isAppStateV1(raw)).toBe(false);
    expect(migrate(raw)).toBeNull();
  });
});
