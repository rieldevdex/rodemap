/** The only module that talks to /api/mochi. Never throws: failures map to error codes. */
import type { MochiRequest, MochiResponse } from './protocol';

const TIMEOUT_MS = 20_000;

export async function sendToMochi(req: MochiRequest, endpoint = '/api/mochi'): Promise<MochiResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, TIMEOUT_MS);
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(req),
      signal: controller.signal,
    });
    // No Worker behind /api (local preview, static hosting): behave as "no key configured".
    if (res.status === 404 || res.status === 405) return { ok: false, error: 'offline' };
    const type = res.headers.get('content-type') ?? '';
    if (!type.includes('application/json')) return { ok: false, error: res.ok ? 'upstream' : 'offline' };
    return (await res.json()) as MochiResponse;
  } catch {
    return { ok: false, error: 'upstream' };
  } finally {
    clearTimeout(timer);
  }
}
