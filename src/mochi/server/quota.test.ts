import { describe, expect, it, vi } from 'vitest';
import { toMillis } from '../../domain/dates';
import type { MochiRequest } from '../protocol';
import { browserDigest, isNewQuestion, quotaWeek, resolveQuotaConfig, supabaseQuotaGate } from './quota';
import { memoryStore } from './rate-limit';
import { relayMochiRequest } from './relay';

const now = toMillis('2026-10-14T09:30:00+07:00'); // Wednesday

describe('quota week', () => {
  it('runs from Monday 00:00 to the next Monday, Vietnam time', () => {
    expect(quotaWeek(now)).toEqual({ week: '2026-10-12', resetsAt: '2026-10-19T00:00:00+07:00', secondsLeft: 397_800 });
    // Sunday 23:59:59.5 is still the same week, and never "retry in 0 seconds".
    expect(quotaWeek(toMillis('2026-10-18T23:59:59+07:00') + 500)).toMatchObject({ week: '2026-10-12', secondsLeft: 1 });
    // Monday 06:59 in Vietnam is Sunday in UTC: the Vietnamese week counts.
    expect(quotaWeek(toMillis('2026-10-19T06:59:00+07:00')).week).toBe('2026-10-19');
  });
});

describe('questions and tool round-trips', () => {
  const ask = (content: { type: string }[]): MochiRequest => ({ sessionId: 's', messages: [{ role: 'user', content }] });
  it('counts a student message as a question, tool results alone as a round-trip', () => {
    expect(isNewQuestion(ask([{ type: 'text' }]))).toBe(true);
    expect(isNewQuestion(ask([{ type: 'tool_result' }, { type: 'text' }]))).toBe(true);
    expect(isNewQuestion(ask([{ type: 'tool_result' }]))).toBe(false);
    expect(isNewQuestion({ sessionId: 's', messages: [] })).toBe(false);
  });
});

describe('settings', () => {
  it('defaults to 20 per browser and 500 in total, and ignores invalid values', () => {
    expect(resolveQuotaConfig(undefined, undefined)).toEqual({ perBrowser: 20, total: 500 });
    expect(resolveQuotaConfig(' 30 ', '1000')).toEqual({ perBrowser: 30, total: 1000 });
    expect(resolveQuotaConfig('0', '-5')).toEqual({ perBrowser: 20, total: 500 });
    expect(resolveQuotaConfig('2.5', 'nhiều')).toEqual({ perBrowser: 20, total: 500 });
    expect(resolveQuotaConfig('', '99999999')).toEqual({ perBrowser: 20, total: 500 });
  });
});

describe('browser digest', () => {
  it('is 32 hex characters, stable, and never the id itself', async () => {
    const a = await browserDigest('0123456789abcdef0123456789abcdef');
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(await browserDigest('0123456789abcdef0123456789abcdef')).toBe(a);
    expect(await browserDigest('another-browser-id')).not.toBe(a);
    expect(a).not.toBe('0123456789abcdef0123456789abcdef');
  });
});

type Fetch = typeof fetch;
const answer = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));

function gate(fetchImpl: (url: string, init: RequestInit) => Promise<Response>, serviceKey = 'eyJservice') {
  const spy = vi.fn(fetchImpl);
  return { spy, take: supabaseQuotaGate({ url: 'https://project.supabase.co/', serviceKey, config: { perBrowser: 20, total: 500 }, fetch: spy as unknown as Fetch }) };
}

describe('Supabase quota gate', () => {
  it('sends the week, a digest of the browser id and the limits to rodemap_mochi_take', async () => {
    const { spy, take } = gate(() => answer({ allowed: true, scope: null, browser_questions: 3, total_questions: 40 }));
    expect(await take({ sessionId: 'browser-id-0001', question: true, now })).toEqual({
      ok: true,
      quota: { remaining: 17, limit: 20, resetsAt: '2026-10-19T00:00:00+07:00' },
    });
    const [url, init] = spy.mock.calls[0] ?? [];
    expect(url).toBe('https://project.supabase.co/rest/v1/rpc/rodemap_mochi_take');
    expect(init?.headers).toEqual({ 'content-type': 'application/json', apikey: 'eyJservice', authorization: 'Bearer eyJservice' });
    expect(JSON.parse(init?.body as string)).toEqual({
      p_week: '2026-10-12',
      p_browser: await browserDigest('browser-id-0001'),
      p_question: true,
      p_browser_limit: 20,
      p_total_limit: 500,
      p_requests_per_question: 5,
    });
  });

  it('sends a new secret key only as apikey', async () => {
    const { spy, take } = gate(() => answer({ allowed: true, scope: null, browser_questions: 25, total_questions: 1 }), 'sb_secret_abc');
    expect(await take({ sessionId: 'browser-id-0001', question: false, now })).toMatchObject({ ok: true, quota: { remaining: 0 } });
    expect(spy.mock.calls[0]?.[1].headers).toEqual({ 'content-type': 'application/json', apikey: 'sb_secret_abc' });
  });

  it('refuses with the scope, the limit and the time until Monday', async () => {
    const browser = gate(() => answer({ allowed: false, scope: 'weekly_browser', browser_questions: 20, total_questions: 90 }));
    expect(await browser.take({ sessionId: 'browser-id-0001', question: true, now })).toEqual({
      ok: false,
      status: 429,
      body: { ok: false, error: 'rate_limited', scope: 'weekly_browser', limit: 20, retryAfterSeconds: 397_800, resetsAt: '2026-10-19T00:00:00+07:00' },
      headers: { 'retry-after': '397800' },
    });
    const total = gate(() => answer({ allowed: false, scope: 'weekly_total', browser_questions: 2, total_questions: 500 }));
    expect(await total.take({ sessionId: 'browser-id-0001', question: true, now })).toMatchObject({ body: { scope: 'weekly_total', limit: 500 } });
    const unnamed = gate(() => answer({ allowed: false, scope: null, browser_questions: 2, total_questions: 500 }));
    expect(await unnamed.take({ sessionId: 'browser-id-0001', question: true, now })).toMatchObject({ body: { scope: 'weekly_total' } });
  });

  it('refuses when the count cannot be checked', async () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const unavailable = { ok: false, status: 503, body: { ok: false, error: 'upstream' }, headers: {} };
    expect(await gate(() => answer({ message: 'permission denied' }, 401)).take({ sessionId: 'browser-id-0001', question: true, now })).toEqual(unavailable);
    expect(await gate(() => Promise.reject(new Error('network'))).take({ sessionId: 'browser-id-0001', question: true, now })).toEqual(unavailable);
    expect(await gate(() => Promise.reject(new Error(''))).take({ sessionId: 'browser-id-0001', question: true, now })).toEqual(unavailable);
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- a fetch polyfill may reject with a non-Error value
    expect(await gate(() => Promise.reject('down')).take({ sessionId: 'browser-id-0001', question: true, now })).toEqual(unavailable);
    expect(await gate(() => answer({ allowed: 'yes' })).take({ sessionId: 'browser-id-0001', question: true, now })).toEqual(unavailable);
    expect(await gate(() => answer({ allowed: true, scope: 'other', browser_questions: 1 })).take({ sessionId: 'browser-id-0001', question: true, now })).toEqual(unavailable);
    expect(await gate(() => answer({ allowed: true, scope: null })).take({ sessionId: 'browser-id-0001', question: true, now })).toEqual(unavailable);
    expect(await gate(() => answer(null)).take({ sessionId: 'browser-id-0001', question: true, now })).toEqual(unavailable);
    expect(await gate(() => Promise.resolve(new Response('not json'))).take({ sessionId: 'browser-id-0001', question: true, now })).toEqual(unavailable);
    quiet.mockRestore();
  });

  it('uses the global fetch when none is given', () => {
    expect(typeof supabaseQuotaGate({ url: 'https://p.supabase.co', serviceKey: 'k', config: { perBrowser: 1, total: 1 } })).toBe('function');
  });
});

describe('relay with the weekly quota', () => {
  const body = { sessionId: 'browser-id-0001', messages: [{ role: 'user', content: [{ type: 'text', text: 'Xin chào' }] }] };
  const post = () => new Request('https://relay.test/', { method: 'POST', body: JSON.stringify(body) });

  it('asks the gate whether this is a question and returns its refusal before calling Claude', async () => {
    const quota = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      body: { ok: false, error: 'rate_limited', scope: 'weekly_total', limit: 500, retryAfterSeconds: 10, resetsAt: '2026-10-19T00:00:00+07:00' },
      headers: { 'retry-after': '10' },
    });
    const res = await relayMochiRequest(post(), { apiKey: 'k', model: undefined, effort: undefined, store: memoryStore(), clientIp: '1.2.3.4', quota });
    expect(res.status).toBe(429);
    expect(res.headers.get('retry-after')).toBe('10');
    expect(await res.json()).toMatchObject({ error: 'rate_limited', scope: 'weekly_total' });
    expect(quota).toHaveBeenCalledWith(expect.objectContaining({ sessionId: 'browser-id-0001', question: true }));
  });

  it('marks a short burst refusal as such', async () => {
    const store = memoryStore();
    const config = { apiKey: 'k', model: undefined, effort: undefined, store, clientIp: '1.2.3.4', quota: vi.fn().mockResolvedValue({ ok: false, status: 503, body: { ok: false, error: 'upstream' }, headers: {} }) };
    for (let i = 0; i < 40; i += 1) await relayMochiRequest(post(), config);
    const res = await relayMochiRequest(post(), config);
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ error: 'rate_limited', scope: 'burst' });
  });
});
