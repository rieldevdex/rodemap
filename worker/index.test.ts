import { describe, expect, it } from 'vitest';
import worker from './index';

const request = (path: string, method = 'GET') =>
  new Request(`https://rodemap.test${path}`, { method, headers: { 'content-type': 'application/json' }, body: method === 'POST' ? '{}' : null });

describe('Worker routing', () => {
  it('sends POST /api/mochi to the Mochi handler', async () => {
    const res = await worker.fetch(request('/api/mochi', 'POST'), {});
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, error: 'offline' });
  });

  it('answers other methods on /api/mochi with 405', async () => {
    const res = await worker.fetch(request('/api/mochi'), {});
    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('POST');
  });

  it('answers unknown /api paths with 404', async () => {
    expect((await worker.fetch(request('/api/other'), {})).status).toBe(404);
  });
});
