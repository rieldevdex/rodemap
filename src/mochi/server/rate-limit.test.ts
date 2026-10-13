import { describe, expect, it } from 'vitest';
import { checkRateLimit, decide, memoryStore, type RateWindow } from './rate-limit';

const limit = { requests: 2, windowMs: 60_000 };

describe('decide', () => {
  it('opens a window, counts, blocks and reopens after the window', () => {
    const first = decide(null, 1_000, limit);
    expect(first).toEqual({ decision: { allowed: true, retryAfterSeconds: 0 }, next: { count: 1, windowStart: 1_000 } });
    const second = decide(first.next, 2_000, limit);
    expect(second.decision.allowed).toBe(true);
    const third = decide(second.next, 31_000, limit);
    expect(third.decision).toEqual({ allowed: false, retryAfterSeconds: 30 });
    expect(third.next).toBe(second.next);
    expect(decide(second.next, 61_000, limit).decision.allowed).toBe(true);
  });
  it('never asks to retry in less than a second', () => {
    expect(decide({ count: 2, windowStart: 0 }, 59_999, limit).decision.retryAfterSeconds).toBe(1);
  });
});

describe('checkRateLimit', () => {
  it('blocks when any key is exhausted and reports the longest wait', async () => {
    const map = new Map<string, RateWindow>([['ip:1', { count: 2, windowStart: 0 }]]);
    const store = memoryStore(map);
    expect(await checkRateLimit(store, [{ key: 's:a', limit }], 10_000)).toEqual({ allowed: true, retryAfterSeconds: 0 });
    expect(await checkRateLimit(store, [{ key: 's:a', limit }, { key: 'ip:1', limit }], 10_000)).toEqual({ allowed: false, retryAfterSeconds: 50 });
    expect(map.get('s:a')).toEqual({ count: 2, windowStart: 10_000 });
  });
  it('works with the default in-memory map', async () => {
    const store = memoryStore();
    expect((await checkRateLimit(store, [{ key: 'k', limit: { requests: 1, windowMs: 1000 } }], 0)).allowed).toBe(true);
    expect((await checkRateLimit(store, [{ key: 'k', limit: { requests: 1, windowMs: 1000 } }], 1)).allowed).toBe(false);
  });

  it('applies each key its own limit', async () => {
    const store = memoryStore();
    const tight = { requests: 1, windowMs: 60_000 };
    const loose = { requests: 5, windowMs: 60_000 };
    expect((await checkRateLimit(store, [{ key: 's:a', limit: tight }, { key: 'ip:1', limit: loose }], 0)).allowed).toBe(true);
    // Another session behind the same address still passes; the first session is held back.
    expect((await checkRateLimit(store, [{ key: 's:b', limit: tight }, { key: 'ip:1', limit: loose }], 1)).allowed).toBe(true);
    expect((await checkRateLimit(store, [{ key: 's:a', limit: tight }, { key: 'ip:1', limit: loose }], 2)).allowed).toBe(false);
  });
});
