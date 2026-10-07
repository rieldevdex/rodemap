/** Fixed-window rate limiting for the Mochi Pages Function. Pure apart from the injected store. */

export interface RateWindow {
  count: number;
  windowStart: number;
}

export interface RateStore {
  get(key: string): Promise<RateWindow | null>;
  set(key: string, value: RateWindow, ttlSeconds: number): Promise<void>;
}

export interface RateDecision {
  allowed: boolean;
  retryAfterSeconds: number;
}

/** Decides one request against a window and returns the updated window. */
export function decide(
  current: RateWindow | null,
  now: number,
  limit: { requests: number; windowMs: number },
): { decision: RateDecision; next: RateWindow } {
  const fresh = current === null || now - current.windowStart >= limit.windowMs;
  const window = fresh ? { count: 0, windowStart: now } : current;
  if (window.count >= limit.requests) {
    const retryAfterSeconds = Math.max(1, Math.ceil((window.windowStart + limit.windowMs - now) / 1000));
    return { decision: { allowed: false, retryAfterSeconds }, next: window };
  }
  return { decision: { allowed: true, retryAfterSeconds: 0 }, next: { count: window.count + 1, windowStart: window.windowStart } };
}

/** Checks every key (e.g. session and IP); the request is allowed only if all allow it. */
export async function checkRateLimit(
  store: RateStore,
  keys: string[],
  now: number,
  limit: { requests: number; windowMs: number },
): Promise<RateDecision> {
  let worst: RateDecision = { allowed: true, retryAfterSeconds: 0 };
  for (const key of keys) {
    const { decision, next } = decide(await store.get(key), now, limit);
    await store.set(key, next, Math.ceil(limit.windowMs / 1000));
    if (!decision.allowed && decision.retryAfterSeconds >= worst.retryAfterSeconds) worst = decision;
  }
  return worst;
}

/** In-memory store (per isolate). Good enough for a demo; bind a KV namespace for durable limits. */
export function memoryStore(map = new Map<string, RateWindow>()): RateStore {
  return {
    get: (key) => Promise.resolve(map.get(key) ?? null),
    set: (key, value) => {
      map.set(key, value);
      return Promise.resolve();
    },
  };
}
