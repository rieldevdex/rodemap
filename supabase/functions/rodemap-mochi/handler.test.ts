import { describe, expect, it } from 'vitest';
import { clientAddress, handleRodemapMochi } from './handler';

const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request('https://relay.test/functions/v1/rodemap-mochi', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });

describe('Supabase function rodemap-mochi', () => {
  it('answers POST only and stays offline without a key', async () => {
    expect((await handleRodemapMochi(new Request('https://relay.test/', { method: 'GET' }), () => undefined)).status).toBe(405);
    const res = await handleRodemapMochi(post({ sessionId: 'abc12345', messages: [] }), () => undefined);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, error: 'offline' });
  });

  it('validates the body before calling Claude', async () => {
    const env = (name: string) => (name === 'ANTHROPIC_API_KEY' ? 'k' : undefined);
    expect((await handleRodemapMochi(post({ sessionId: 'x', messages: [] }), env)).status).toBe(400);
  });

  it('reads the client address from the Worker, then from the proxy', () => {
    expect(clientAddress(post({}, { 'x-rodemap-client-ip': '1.2.3.4', 'x-forwarded-for': '9.9.9.9' }))).toBe('1.2.3.4');
    expect(clientAddress(post({}, { 'x-forwarded-for': '9.9.9.9, 10.0.0.1' }))).toBe('9.9.9.9');
    expect(clientAddress(post({}))).toBe('unknown');
  });
});
