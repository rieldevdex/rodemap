/**
 * Supabase Edge Function "rodemap-mochi": Mochi's Claude relay for Rodemap. The Rodemap
 * Worker forwards validated /api/mochi requests here (MOCHI_RELAY_URL), so the Claude API
 * key lives only in the Supabase project's secrets.
 *
 * Secrets / environment (Supabase → Edge Functions → Secrets):
 *   RODEMAP_ANTHROPIC_API_KEY  — optional, a key just for Rodemap; otherwise ANTHROPIC_API_KEY
 *   ANTHROPIC_API_KEY          — the project's shared Claude API key
 *   RODEMAP_MOCHI_MODEL        — defaults to claude-haiku-5-5
 *   RODEMAP_MOCHI_EFFORT       — low | medium | high, defaults to low
 * Without a key the function answers { ok: false, error: "offline" } and Mochi runs offline.
 */
import { memoryStore, type RateWindow } from '../../../src/mochi/server/rate-limit';
import { jsonResponse, relayMochiRequest } from '../../../src/mochi/server/relay';

/** Per-isolate rate-limit windows (session and client address). */
const windows = new Map<string, RateWindow>();

/** The trimmed value, or undefined when it is missing or empty. */
function present(value: string | undefined): string | undefined {
  const v = value?.trim();
  return v === undefined || v === '' ? undefined : v;
}

/** The address the Rodemap Worker reports, else the first forwarded address. */
export function clientAddress(request: Request): string {
  return present(request.headers.get('x-rodemap-client-ip') ?? undefined) ?? present(request.headers.get('x-forwarded-for')?.split(',')[0]) ?? 'unknown';
}

export function handleRodemapMochi(request: Request, env: (name: string) => string | undefined): Promise<Response> {
  if (request.method !== 'POST') return Promise.resolve(new Response(null, { status: 405, headers: { allow: 'POST' } }));
  const key = present(env('RODEMAP_ANTHROPIC_API_KEY')) ?? present(env('ANTHROPIC_API_KEY'));
  if (key === undefined) return Promise.resolve(jsonResponse({ ok: false, error: 'offline' }, 503));
  return relayMochiRequest(request, {
    apiKey: key,
    model: env('RODEMAP_MOCHI_MODEL'),
    effort: env('RODEMAP_MOCHI_EFFORT'),
    store: memoryStore(windows),
    clientIp: clientAddress(request),
  });
}
