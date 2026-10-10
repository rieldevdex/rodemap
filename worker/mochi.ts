/**
 * POST /api/mochi — handler (routed by worker/index.ts) for Mochi's conversation. Tools run
 * in the browser; the server only adds the fixed system prompt and tool list (see
 * src/mochi/server/relay.ts). The API key never reaches the browser.
 *
 * Two ways to reach Claude, in this order:
 *   1. ANTHROPIC_API_KEY set on this Worker → the Worker calls the Claude API itself.
 *   2. Otherwise MOCHI_RELAY_URL → the Worker validates and rate-limits the request, then
 *      forwards it to the Supabase Edge Function "rodemap-mochi", which holds the key as a
 *      Supabase secret (supabase/functions/rodemap-mochi).
 * With neither, the browser switches Mochi to its offline mode.
 *
 * Environment:
 *   ANTHROPIC_API_KEY  (secret, optional) — direct mode
 *   MOCHI_MODEL        (var)  — direct mode model, defaults to claude-haiku-5-5
 *   MOCHI_EFFORT       (var)  — low | medium | high, defaults to low (chat latency)
 *   MOCHI_RELAY_URL    (var)  — the Supabase function URL (relay mode)
 *   MOCHI_RELAY_KEY    (var)  — the Supabase project's public anon key (the function verifies a JWT)
 *   MOCHI_RATE_LIMIT   (KV, optional) — durable rate-limit windows across isolates
 */
import { isMochiResponse, jsonResponse, rateLimitResponse, readMochiRequest, relayMochiRequest } from '../src/mochi/server/relay';
import { memoryStore, type RateStore, type RateWindow } from '../src/mochi/server/rate-limit';
import type { MochiRequest } from '../src/mochi/protocol';

export interface Env {
  ANTHROPIC_API_KEY?: string;
  MOCHI_MODEL?: string;
  MOCHI_EFFORT?: string;
  MOCHI_RELAY_URL?: string;
  MOCHI_RELAY_KEY?: string;
  MOCHI_RATE_LIMIT?: KVNamespace;
}

const RELAY_TIMEOUT_MS = 45_000;

/** Per-isolate fallback when no KV namespace is bound. */
const isolateWindows = new Map<string, RateWindow>();

function kvStore(kv: KVNamespace): RateStore {
  return {
    get: async (key) => (await kv.get<RateWindow>(key, 'json')) ?? null,
    set: (key, value, ttlSeconds) => kv.put(key, JSON.stringify(value), { expirationTtl: Math.max(60, ttlSeconds) }),
  };
}

/** Sends a validated request to the Supabase relay and passes its MochiResponse through. */
async function forwardToRelay(url: string, key: string | undefined, body: MochiRequest, clientIp: string): Promise<Response> {
  const headers: Record<string, string> = { 'content-type': 'application/json', 'x-rodemap-client-ip': clientIp };
  if (key !== undefined && key.trim() !== '') {
    headers.authorization = `Bearer ${key.trim()}`;
    headers.apikey = key.trim();
  }
  try {
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(RELAY_TIMEOUT_MS) });
    const data: unknown = await res.json().catch(() => null);
    if (isMochiResponse(data)) {
      const retryAfter = res.headers.get('retry-after');
      return jsonResponse(data, res.status, retryAfter === null ? {} : { 'retry-after': retryAfter });
    }
    console.error('Mochi relay: unexpected response', res.status);
    // A missing function or a rejected key leaves Mochi usable in its offline mode.
    return res.status === 401 || res.status === 403 || res.status === 404
      ? jsonResponse({ ok: false, error: 'offline' }, 503)
      : jsonResponse({ ok: false, error: 'upstream' }, 502);
  } catch (error) {
    console.error('Mochi relay: unreachable', error instanceof Error ? error.message : 'unknown');
    return jsonResponse({ ok: false, error: 'upstream' }, 502);
  }
}

export async function handleMochi(request: Request, env: Env): Promise<Response> {
  const clientIp = request.headers.get('cf-connecting-ip') ?? 'unknown';
  const store = env.MOCHI_RATE_LIMIT ? kvStore(env.MOCHI_RATE_LIMIT) : memoryStore(isolateWindows);

  if (env.ANTHROPIC_API_KEY) {
    return relayMochiRequest(request, { apiKey: env.ANTHROPIC_API_KEY, model: env.MOCHI_MODEL, effort: env.MOCHI_EFFORT, store, clientIp });
  }

  const relayUrl = env.MOCHI_RELAY_URL?.trim() ?? '';
  if (relayUrl === '') return jsonResponse({ ok: false, error: 'offline' }, 503);
  const body = await readMochiRequest(request);
  if (!body.ok) return body.response;
  const limited = await rateLimitResponse(store, body.value.sessionId, clientIp, Date.now());
  if (limited) return limited;
  return forwardToRelay(relayUrl, env.MOCHI_RELAY_KEY, body.value, clientIp);
}
