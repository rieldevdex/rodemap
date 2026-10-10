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

const { handleMochi } = await import('./mochi');
const { default: Anthropic } = await import('@anthropic-ai/sdk');
type ErrorClass = new (status: number) => Error;
const E = Anthropic as unknown as Record<'AuthenticationError' | 'PermissionDeniedError' | 'RateLimitError' | 'BadRequestError' | 'APIError', ErrorClass>;

let ipCounter = 0;

function call(body: unknown, env: Record<string, unknown> = { ANTHROPIC_API_KEY: 'test-key' }, raw?: string) {
  ipCounter += 1;
  const request = new Request('https://rodemap.test/api/mochi', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'cf-connecting-ip': `10.0.0.${ipCounter}` },
    body: raw ?? JSON.stringify(body),
  });
  return handleMochi(request, env);
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

  it('relays to Claude Haiku 5.5 with the fixed prompt and tools, without a server-side fallback', async () => {
    create.mockResolvedValue({ content: [{ type: 'text', text: 'Xin chào.' }], stop_reason: 'end_turn', model: 'claude-haiku-5-5' });
    const res = await call(valid(), { ANTHROPIC_API_KEY: 'k', MOCHI_EFFORT: 'medium' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, content: [{ type: 'text', text: 'Xin chào.' }], stopReason: 'end_turn', model: 'claude-haiku-5-5' });
    const params = create.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(params.model).toBe('claude-haiku-5-5');
    expect(params).not.toHaveProperty('fallbacks');
    expect(params.betas).toEqual(['thinking-binding-controls-2026-08-01']);
    expect(params.thinking).toEqual({ type: 'adaptive', block_binding: { prefix_mismatch_behavior: 'drop_block' } });
    expect(params.output_config).toEqual({ effort: 'medium' });
    expect(params.tool_choice).toEqual({ type: 'auto' });
    expect((params.tools as unknown[]).length).toBe(11);
  });

  it('uses MOCHI_MODEL when set (with the fallback where the model has one) and low effort by default', async () => {
    create.mockResolvedValue({ content: [], stop_reason: 'end_turn', model: 'claude-sonnet-5-5' });
    await call(valid(), { ANTHROPIC_API_KEY: 'k', MOCHI_MODEL: ' claude-sonnet-5-5 ', MOCHI_EFFORT: 'extreme' });
    const params = create.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(params.model).toBe('claude-sonnet-5-5');
    expect(params.fallbacks).toBe('default');
    expect(params.betas).toContain('server-side-fallback-2026-07-01');
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

describe('POST /api/mochi through the Supabase relay', () => {
  const RELAY = { MOCHI_RELAY_URL: 'https://relay.test/functions/v1/rodemap-mochi', MOCHI_RELAY_KEY: 'anon-key' };
  const reply = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

  it('forwards the validated request with the anon key and the client address, then passes the turn through', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply({ ok: true, content: [{ type: 'text', text: 'Chào bạn.' }], stopReason: 'end_turn', model: 'claude-haiku-5-5' }));
    vi.stubGlobal('fetch', fetchMock);
    const res = await call(valid('relay-session-1'), RELAY);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, content: [{ type: 'text', text: 'Chào bạn.' }], stopReason: 'end_turn', model: 'claude-haiku-5-5' });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];
    expect(url).toBe(RELAY.MOCHI_RELAY_URL);
    expect(init.headers.authorization).toBe('Bearer anon-key');
    expect(init.headers.apikey).toBe('anon-key');
    expect(init.headers['x-rodemap-client-ip']).toMatch(/^10\.0\.0\.\d+$/);
    expect(JSON.parse(init.body as string)).toEqual(valid('relay-session-1'));
    expect(create).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('validates and rate-limits before forwarding', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply({ ok: true, content: [], stopReason: 'end_turn', model: 'm' }));
    vi.stubGlobal('fetch', fetchMock);
    expect((await call({ sessionId: 'x', messages: [] }, RELAY)).status).toBe(400);
    let last: Response | undefined;
    for (let i = 0; i < 41; i += 1) last = await call(valid('relay-same-session'), RELAY);
    expect(last?.status).toBe(429);
    expect(fetchMock).toHaveBeenCalledTimes(40);
    vi.unstubAllGlobals();
  });

  it('passes relay errors through and maps broken or missing relays safely', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const cases: [Response | Error, number, string][] = [
      [reply({ ok: false, error: 'rate_limited', retryAfterSeconds: 12 }, 429, { 'retry-after': '12' }), 429, 'rate_limited'],
      [reply({ ok: false, error: 'offline' }, 503), 503, 'offline'],
      [reply({ msg: 'Invalid JWT' }, 401), 503, 'offline'],
      [reply({ message: 'Function not found' }, 404), 503, 'offline'],
      [new Response('Internal error', { status: 500 }), 502, 'upstream'],
      [new TypeError('fetch failed'), 502, 'upstream'],
    ];
    for (const [outcome, status, code] of cases) {
      vi.stubGlobal('fetch', outcome instanceof Error ? vi.fn().mockRejectedValue(outcome) : vi.fn().mockResolvedValue(outcome));
      const res = await call(valid(), RELAY);
      expect(res.status, code).toBe(status);
      expect((await res.json<{ error: string }>()).error).toBe(code);
      if (code === 'rate_limited') expect(res.headers.get('retry-after')).toBe('12');
    }
    vi.unstubAllGlobals();
    spy.mockRestore();
  });

  it('prefers a key set on the Worker over the relay', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    create.mockResolvedValue({ content: [], stop_reason: 'end_turn', model: 'claude-haiku-5-5' });
    expect((await call(valid(), { ...RELAY, ANTHROPIC_API_KEY: 'k' })).status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
