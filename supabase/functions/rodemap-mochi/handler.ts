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
 *   RODEMAP_MOCHI_WEEKLY_PER_BROWSER — questions per browser per week, defaults to 20
 *   RODEMAP_MOCHI_WEEKLY_TOTAL       — questions for the whole site per week, defaults to 500
 * Provided by Supabase: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEYS),
 * used to count the weekly quota with the SQL function public.rodemap_mochi_take.
 * Without a key the function answers { ok: false, error: "offline" } and Mochi runs offline.
 * Without the database settings it refuses every request: the quota is never skipped.
 */
import { resolveQuotaConfig, supabaseQuotaGate, type QuotaGate } from '../../../src/mochi/server/quota';
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

/** The server key for the database: the legacy service role, else the default new secret key. */
export function serviceKey(env: (name: string) => string | undefined): string | undefined {
  const legacy = present(env('SUPABASE_SERVICE_ROLE_KEY'));
  if (legacy !== undefined) return legacy;
  try {
    const keys: unknown = JSON.parse(env('SUPABASE_SECRET_KEYS') ?? '');
    if (typeof keys === 'object' && keys !== null) {
      const values = Object.entries(keys as Record<string, unknown>);
      const chosen = values.find(([name]) => name === 'default') ?? values[0];
      return typeof chosen?.[1] === 'string' ? present(chosen[1]) : undefined;
    }
  } catch {
    /* not set or not JSON */
  }
  return undefined;
}

/** The weekly quota gate, or null when the database settings are missing. */
export function quotaGate(env: (name: string) => string | undefined, send?: typeof fetch): QuotaGate | null {
  const url = present(env('SUPABASE_URL'));
  const key = serviceKey(env);
  if (url === undefined || key === undefined) return null;
  return supabaseQuotaGate({
    url,
    serviceKey: key,
    config: resolveQuotaConfig(env('RODEMAP_MOCHI_WEEKLY_PER_BROWSER'), env('RODEMAP_MOCHI_WEEKLY_TOTAL')),
    ...(send ? { fetch: send } : {}),
  });
}

export function handleRodemapMochi(request: Request, env: (name: string) => string | undefined, send?: typeof fetch): Promise<Response> {
  if (request.method !== 'POST') return Promise.resolve(new Response(null, { status: 405, headers: { allow: 'POST' } }));
  const key = present(env('RODEMAP_ANTHROPIC_API_KEY')) ?? present(env('ANTHROPIC_API_KEY'));
  if (key === undefined) return Promise.resolve(jsonResponse({ ok: false, error: 'offline' }, 503));
  const quota = quotaGate(env, send);
  if (quota === null) {
    console.error('Mochi: SUPABASE_URL or the service key is missing, so the weekly quota cannot be counted');
    return Promise.resolve(jsonResponse({ ok: false, error: 'upstream' }, 503));
  }
  return relayMochiRequest(request, {
    apiKey: key,
    model: env('RODEMAP_MOCHI_MODEL'),
    effort: env('RODEMAP_MOCHI_EFFORT'),
    store: memoryStore(windows),
    clientIp: clientAddress(request),
    quota,
  });
}
