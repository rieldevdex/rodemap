import { describe, expect, it, vi } from 'vitest';
import { clientAddress, handleRodemapMochi, quotaGate, serviceKey } from './handler';

const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request('https://relay.test/functions/v1/rodemap-mochi', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });

describe('Supabase function rodemap-mochi', () => {
  it('answers POST only and stays offline without a key', async () => {
    expect((await handleRodemapMochi(new Request('https://relay.test/', { method: 'GET' }), () => undefined)).status).toBe(405);
    const res = await handleRodemapMochi(post({ sessionId: 'abc12345', messages: [] }), () => undefined);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, error: 'offline' });
  });

  const settings: Record<string, string> = { ANTHROPIC_API_KEY: 'k', SUPABASE_URL: 'https://project.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'eyJservice' };
  const env = (name: string) => settings[name];

  it('validates the body before calling Claude', async () => {
    expect((await handleRodemapMochi(post({ sessionId: 'x', messages: [] }), env)).status).toBe(400);
  });

  it('never skips the weekly quota: without the database settings every request is refused', async () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = await handleRodemapMochi(post({ sessionId: 'abc12345', messages: [] }), (name) => (name === 'ANTHROPIC_API_KEY' ? 'k' : undefined));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, error: 'upstream' });
    quiet.mockRestore();
  });

  it('counts each question with rodemap_mochi_take and passes a refusal on', async () => {
    const send = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ allowed: false, scope: 'weekly_browser', browser_questions: 20, total_questions: 70 }), { status: 200 })),
    );
    const body = { sessionId: 'browser-id-0001', messages: [{ role: 'user', content: [{ type: 'text', text: 'Xin chào' }] }] };
    const res = await handleRodemapMochi(post(body), (name) => ({ ...settings, RODEMAP_MOCHI_WEEKLY_PER_BROWSER: '10' })[name], send);
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ ok: false, error: 'rate_limited', scope: 'weekly_browser', limit: 10 });
    expect(send).toHaveBeenCalledWith('https://project.supabase.co/rest/v1/rpc/rodemap_mochi_take', expect.objectContaining({ method: 'POST' }));
  });

  it('finds the server key: the service role first, else the default secret key', () => {
    expect(serviceKey((n) => ({ SUPABASE_SERVICE_ROLE_KEY: ' eyJlegacy ', SUPABASE_SECRET_KEYS: '{"default":"sb_secret_x"}' })[n])).toBe('eyJlegacy');
    expect(serviceKey((n) => ({ SUPABASE_SECRET_KEYS: '{"other":"sb_secret_o","default":"sb_secret_d"}' })[n])).toBe('sb_secret_d');
    expect(serviceKey((n) => ({ SUPABASE_SECRET_KEYS: '{"only":"sb_secret_o"}' })[n])).toBe('sb_secret_o');
    expect(serviceKey((n) => ({ SUPABASE_SECRET_KEYS: '{"default":42}' })[n])).toBeUndefined();
    expect(serviceKey((n) => ({ SUPABASE_SECRET_KEYS: '{}' })[n])).toBeUndefined();
    expect(serviceKey((n) => ({ SUPABASE_SECRET_KEYS: '"text"' })[n])).toBeUndefined();
    expect(serviceKey((n) => ({ SUPABASE_SECRET_KEYS: 'not json' })[n])).toBeUndefined();
    expect(serviceKey(() => undefined)).toBeUndefined();
  });

  it('builds the gate only with the project URL and a server key', () => {
    expect(quotaGate((n) => ({ SUPABASE_URL: 'https://p.supabase.co' })[n])).toBeNull();
    expect(quotaGate((n) => ({ SUPABASE_SERVICE_ROLE_KEY: 'eyJ' })[n])).toBeNull();
    expect(typeof quotaGate(env)).toBe('function');
  });

  it('reads the client address from the Worker, then from the proxy', () => {
    expect(clientAddress(post({}, { 'x-rodemap-client-ip': '1.2.3.4', 'x-forwarded-for': '9.9.9.9' }))).toBe('1.2.3.4');
    expect(clientAddress(post({}, { 'x-forwarded-for': '9.9.9.9, 10.0.0.1' }))).toBe('9.9.9.9');
    expect(clientAddress(post({}))).toBe('unknown');
  });
});
