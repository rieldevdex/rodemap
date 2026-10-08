import { beforeEach, describe, expect, it, vi } from 'vitest';

const create = vi.fn();

vi.mock('@anthropic-ai/sdk', () => {
  class APIError extends Error {
    constructor(readonly status: number, message = 'error') {
      super(message);
    }
  }
  class AuthenticationError extends APIError {}
  class PermissionDeniedError extends APIError {}
  class RateLimitError extends APIError {}
  class BadRequestError extends APIError {}
  class Anthropic {
    static APIError = APIError;
    static AuthenticationError = AuthenticationError;
    static PermissionDeniedError = PermissionDeniedError;
    static RateLimitError = RateLimitError;
    static BadRequestError = BadRequestError;
    beta = { messages: { create } };
  }
  return { default: Anthropic };
});

const { onRequestPost } = await import('./mochi');
const { default: Anthropic } = await import('@anthropic-ai/sdk');
type ErrorClass = new (status: number) => Error;
const E = Anthropic as unknown as Record<'AuthenticationError' | 'PermissionDeniedError' | 'RateLimitError' | 'BadRequestError' | 'APIError', ErrorClass>;

type Ctx = Parameters<typeof onRequestPost>[0];
let ipCounter = 0;

function call(body: unknown, env: Record<string, unknown> = { ANTHROPIC_API_KEY: 'test-key' }, raw?: string) {
  ipCounter += 1;
  const request = new Request('https://rodemap.test/api/mochi', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'cf-connecting-ip': `10.0.0.${ipCounter}` },
    body: raw ?? JSON.stringify(body),
  });
  return onRequestPost({ request, env } as unknown as Ctx);
}

const valid = (sessionId = `session-${ipCounter + 1}-abc`) => ({
  sessionId,
  messages: [{ role: 'user', content: [{ type: 'text', text: 'Mochi gợi ý sự kiện.' }] }],
});

beforeEach(() => {
  create.mockReset();
});

describe('POST /api/mochi', () => {
  it('reports offline mode when no API key is configured', async () => {
    const res = await call(valid(), {});
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, error: 'offline' });
  });

  it('rejects malformed JSON, invalid shapes and oversized bodies', async () => {
    expect((await call(null, undefined, '{nope')).status).toBe(400);
    expect((await call({ sessionId: 'x', messages: [] })).status).toBe(400);
    const huge = await call(null, undefined, JSON.stringify({ pad: 'a'.repeat(300 * 1024) }));
    expect(huge.status).toBe(413);
    const long = await call({ ...valid(), messages: [{ role: 'user', content: [{ type: 'text', text: 'a'.repeat(600) }] }] });
    expect(long.status).toBe(413);
  });

  it('relays to Claude with the fixed prompt, tools, fallbacks and returns the turn', async () => {
    create.mockResolvedValue({ content: [{ type: 'text', text: 'Xin chào.' }], stop_reason: 'end_turn', model: 'claude-opus-5-5' });
    const res = await call(valid(), { ANTHROPIC_API_KEY: 'k', MOCHI_EFFORT: 'medium' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, content: [{ type: 'text', text: 'Xin chào.' }], stopReason: 'end_turn', model: 'claude-opus-5-5' });
    const params = create.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(params.model).toBe('claude-opus-5-5');
    expect(params.fallbacks).toBe('default');
    expect(params.betas).toContain('server-side-fallback-2026-07-01');
    expect(params.output_config).toEqual({ effort: 'medium' });
    expect(params.tool_choice).toEqual({ type: 'auto' });
    expect((params.tools as unknown[]).length).toBe(11);
  });

  it('uses MOCHI_MODEL when set and low effort by default', async () => {
    create.mockResolvedValue({ content: [], stop_reason: 'end_turn', model: 'claude-sonnet-5-5' });
    await call(valid(), { ANTHROPIC_API_KEY: 'k', MOCHI_MODEL: ' claude-sonnet-5-5 ', MOCHI_EFFORT: 'extreme' });
    const params = create.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(params.model).toBe('claude-sonnet-5-5');
    expect(params.output_config).toEqual({ effort: 'low' });
  });

  it('rate-limits a session', async () => {
    create.mockResolvedValue({ content: [], stop_reason: 'end_turn', model: 'm' });
    const body = valid('same-session-rl');
    let last: Response | undefined;
    for (let i = 0; i < 41; i += 1) last = await call(body);
    expect(last?.status).toBe(429);
    expect(last?.headers.get('retry-after')).toMatch(/^\d+$/);
  });

  it('uses a bound KV namespace for rate limits', async () => {
    create.mockResolvedValue({ content: [], stop_reason: 'end_turn', model: 'm' });
    const kv = new Map<string, string>();
    const namespace = {
      get: (key: string) => Promise.resolve(kv.has(key) ? JSON.parse(kv.get(key) ?? 'null') : null),
      put: (key: string, value: string) => {
        kv.set(key, value);
        return Promise.resolve();
      },
    };
    const res = await call(valid('kv-session-1'), { ANTHROPIC_API_KEY: 'k', MOCHI_RATE_LIMIT: namespace });
    expect(res.status).toBe(200);
    expect([...kv.keys()].some((k) => k.startsWith('s:kv-session-1'))).toBe(true);
  });

  it.each([
    ['an invalid key', () => new E.AuthenticationError(401), 503, 'offline'],
    ['a denied key', () => new E.PermissionDeniedError(403), 503, 'offline'],
    ['upstream rate limits', () => new E.RateLimitError(429), 503, 'upstream'],
    ['a rejected request', () => new E.BadRequestError(400), 400, 'bad_request'],
    ['another API error', () => new E.APIError(529), 502, 'upstream'],
    ['a network failure', () => new TypeError('fetch failed'), 502, 'upstream'],
    ['a thrown non-error', () => 'boom', 502, 'upstream'],
  ])('maps %s to a safe response', async (_label, makeError, status, code) => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    create.mockRejectedValue(makeError());
    const res = await call(valid());
    expect(res.status).toBe(status);
    expect((await res.json<{ error: string }>()).error).toBe(code);
    spy.mockRestore();
  });
});
