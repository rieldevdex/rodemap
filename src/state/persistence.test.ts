import { afterEach, describe, expect, it, vi } from 'vitest';
import { getStorage, loadState, saveState } from './persistence';
import { reducer } from './reducer';
import { createSeedState, STORAGE_KEY } from './schema';

interface FakeStorage extends Storage {
  readonly data: Map<string, string>;
}

/** In-memory Storage; `failOn` makes the named methods throw like a blocked or full localStorage. */
function memoryStorage(initial: Record<string, string> = {}, failOn: ('getItem' | 'setItem')[] = []): FakeStorage {
  const data = new Map(Object.entries(initial));
  const fail = (method: 'getItem' | 'setItem'): void => {
    if (failOn.includes(method)) throw new DOMException('Storage is unavailable', 'QuotaExceededError');
  };
  return {
    data,
    get length() {
      return data.size;
    },
    clear: () => {
      data.clear();
    },
    getItem: (key: string) => {
      fail('getItem');
      return data.get(key) ?? null;
    },
    key: (index: number) => [...data.keys()][index] ?? null,
    removeItem: (key: string) => {
      data.delete(key);
    },
    setItem: (key: string, value: string) => {
      fail('setItem');
      data.set(key, value);
    },
  };
}

describe('memoryStorage (test fake)', () => {
  it('behaves like Storage', () => {
    const s = memoryStorage({ a: '1' });
    s.setItem('b', '2');
    expect(s.length).toBe(2);
    expect(s.key(1)).toBe('b');
    expect(s.key(5)).toBeNull();
    s.removeItem('a');
    expect(s.getItem('a')).toBeNull();
    s.clear();
    expect(s.length).toBe(0);
  });
});

describe('loadState', () => {
  it('returns the seed when storage is unavailable', () => {
    expect(loadState(null)).toEqual(createSeedState());
  });

  it('returns the seed when the key is missing or empty', () => {
    expect(loadState(memoryStorage())).toEqual(createSeedState());
    expect(loadState(memoryStorage({ [STORAGE_KEY]: '' }))).toEqual(createSeedState());
  });

  it.each(['{', 'dữ liệu hỏng', '{"version":1,', 'undefined'])('returns the seed for corrupt JSON %j', (raw) => {
    expect(loadState(memoryStorage({ [STORAGE_KEY]: raw }))).toEqual(createSeedState());
  });

  it('returns the seed for valid JSON with the wrong version or shape', () => {
    const wrongVersion = JSON.stringify({ ...createSeedState(), version: 2 });
    expect(loadState(memoryStorage({ [STORAGE_KEY]: wrongVersion }))).toEqual(createSeedState());
    expect(loadState(memoryStorage({ [STORAGE_KEY]: 'null' }))).toEqual(createSeedState());
    expect(loadState(memoryStorage({ [STORAGE_KEY]: '[]' }))).toEqual(createSeedState());
    const missingField = JSON.stringify({ ...createSeedState(), submissions: undefined });
    expect(loadState(memoryStorage({ [STORAGE_KEY]: missingField }))).toEqual(createSeedState());
  });

  it('returns the seed when reading throws', () => {
    const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify(createSeedState()) }, ['getItem']);
    expect(loadState(storage)).toEqual(createSeedState());
  });

  it('returns a fresh seed object on every fallback', () => {
    const a = loadState(null);
    const b = loadState(null);
    expect(a).not.toBe(b);
    expect(a.registrations).not.toBe(b.registrations);
  });

  it('ignores other keys', () => {
    const storage = memoryStorage({ 'rodemap:v0': JSON.stringify({ ...createSeedState(), role: 'moderator' }) });
    expect(loadState(storage).role).toBe('student');
  });
});

describe('saveState', () => {
  it('round-trips a changed state through storage', () => {
    let state = createSeedState();
    state = reducer(state, { type: 'role/set', role: 'moderator' });
    state = reducer(state, { type: 'theme/set', theme: 'dark' });
    state = reducer(state, { type: 'demo/setToday', date: '2026-10-07' });
    state = reducer(state, { type: 'registration/register', eventId: 'ev-016', at: '2026-10-07T09:05:00+07:00' });
    state = reducer(state, {
      type: 'moderation/review',
      submissionId: 'sub-001',
      action: 'approve',
      at: '2026-10-07T09:10:00+07:00',
    });

    const storage = memoryStorage();
    saveState(storage, state);
    expect(storage.data.get(STORAGE_KEY)).toBe(JSON.stringify(state));

    const loaded = loadState(storage);
    expect(loaded).toEqual(state);
    expect(loaded).not.toBe(state);
  });

  it('overwrites the previous value', () => {
    const storage = memoryStorage();
    saveState(storage, createSeedState());
    saveState(storage, { ...createSeedState(), theme: 'light' });
    expect(storage.length).toBe(1);
    expect(loadState(storage).theme).toBe('light');
  });

  it('does not throw when storage is unavailable or writing fails', () => {
    expect(() => {
      saveState(null, createSeedState());
    }).not.toThrow();
    const full = memoryStorage({}, ['setItem']);
    expect(() => {
      saveState(full, createSeedState());
    }).not.toThrow();
    expect(full.length).toBe(0);
  });
});

describe('getStorage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns null without a window (tests, server rendering)', () => {
    expect(typeof window).toBe('undefined');
    expect(getStorage()).toBeNull();
  });

  it('returns window.localStorage when it is available', () => {
    const storage = memoryStorage();
    vi.stubGlobal('window', { localStorage: storage });
    expect(getStorage()).toBe(storage);
  });

  it('returns null when accessing localStorage throws (blocked or private mode)', () => {
    const blocked = {};
    Object.defineProperty(blocked, 'localStorage', {
      get() {
        throw new DOMException('Access is denied', 'SecurityError');
      },
    });
    vi.stubGlobal('window', blocked);
    expect(getStorage()).toBeNull();
    expect(loadState(getStorage())).toEqual(createSeedState());
  });
});
