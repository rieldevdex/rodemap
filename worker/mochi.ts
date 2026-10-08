/**
 * POST /api/mochi — handler (routed by worker/index.ts) relaying Mochi's conversation to
 * the Claude API. The API key never leaves the server. Tools run in the browser:
 * this handler only adds the fixed system prompt and tool list, validates and
 * rate-limits the request, and returns the next assistant turn verbatim.
 *
 * Environment:
 *   ANTHROPIC_API_KEY  (secret)  — without it the browser switches to offline mode
 *   MOCHI_MODEL        (var)     — defaults to claude-opus-5-5
 *   MOCHI_EFFORT       (var)     — low | medium | high, defaults to low (chat latency)
 *   MOCHI_RATE_LIMIT   (KV, optional) — durable rate-limit windows across isolates
 */
import Anthropic from '@anthropic-ai/sdk';
import { MAX_BODY_BYTES, RATE_LIMIT, type MochiResponse } from '../src/mochi/protocol';
import { checkRateLimit, memoryStore, type RateStore, type RateWindow } from '../src/mochi/server/rate-limit';
import { validateMochiRequest } from '../src/mochi/server/validate';
import { MOCHI_SYSTEM_PROMPT } from '../src/mochi/system-prompt';
import { MOCHI_TOOLS } from '../src/mochi/tools/schemas';

export interface Env {
  ANTHROPIC_API_KEY?: string;
  MOCHI_MODEL?: string;
  MOCHI_EFFORT?: string;
  MOCHI_RATE_LIMIT?: KVNamespace;
}

const DEFAULT_MODEL = 'claude-opus-5-5';
const EFFORTS = new Set(['low', 'medium', 'high']);
const UPSTREAM_TIMEOUT_MS = 30_000;

/** Per-isolate fallback when no KV namespace is bound. */
const isolateWindows = new Map<string, RateWindow>();

function kvStore(kv: KVNamespace): RateStore {
  return {
    get: async (key) => (await kv.get<RateWindow>(key, 'json')) ?? null,
    set: (key, value, ttlSeconds) => kv.put(key, JSON.stringify(value), { expirationTtl: Math.max(60, ttlSeconds) }),
  };
}

function json(body: MochiResponse, status: number, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra },
  });
}

export async function handleMochi(request: Request, env: Env): Promise<Response> {
  if (!env.ANTHROPIC_API_KEY) return json({ ok: false, error: 'offline' }, 503);

  const length = Number(request.headers.get('content-length') ?? '0');
  if (length > MAX_BODY_BYTES) return json({ ok: false, error: 'too_long' }, 413);

  let raw: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return json({ ok: false, error: 'too_long' }, 413);
    raw = JSON.parse(text);
  } catch {
    return json({ ok: false, error: 'bad_request' }, 400);
  }

  const parsed = validateMochiRequest(raw);
  if (!parsed.ok) return json({ ok: false, error: parsed.error }, parsed.error === 'too_long' ? 413 : 400);

  const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
  const store = env.MOCHI_RATE_LIMIT ? kvStore(env.MOCHI_RATE_LIMIT) : memoryStore(isolateWindows);
  const rate = await checkRateLimit(store, [`s:${parsed.value.sessionId}`, `ip:${ip}`], Date.now(), RATE_LIMIT);
  if (!rate.allowed) {
    return json({ ok: false, error: 'rate_limited', retryAfterSeconds: rate.retryAfterSeconds }, 429, {
      'retry-after': String(rate.retryAfterSeconds),
    });
  }

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: UPSTREAM_TIMEOUT_MS, maxRetries: 1 });
  const configuredModel = env.MOCHI_MODEL?.trim() ?? '';
  const model = configuredModel === '' ? DEFAULT_MODEL : configuredModel;
  const effort = EFFORTS.has(env.MOCHI_EFFORT ?? '') ? (env.MOCHI_EFFORT as 'low' | 'medium' | 'high') : 'low';

  try {
    const response = await client.beta.messages.create({
      model,
      max_tokens: 8000,
      betas: ['server-side-fallback-2026-07-01', 'thinking-binding-controls-2026-08-01'],
      // A classifier false positive is re-run on Anthropic's recommended fallback model.
      fallbacks: 'default',
      // Replayed thinking blocks that fail the conversation check are dropped instead of failing the demo.
      thinking: { type: 'adaptive', block_binding: { prefix_mismatch_behavior: 'drop_block' } },
      output_config: { effort },
      // Tools and system prompt are constant, so they form a cacheable prefix; the
      // top-level breakpoint also caches the growing conversation.
      cache_control: { type: 'ephemeral' },
      system: [{ type: 'text', text: MOCHI_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      tools: MOCHI_TOOLS as unknown as Anthropic.Beta.BetaTool[],
      tool_choice: { type: 'auto' },
      messages: parsed.value.messages as unknown as Anthropic.Beta.BetaMessageParam[],
    });
    return json(
      {
        ok: true,
        content: response.content as unknown as { type: string }[],
        stopReason: response.stop_reason,
        model: response.model,
      },
      200,
    );
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
      console.error('Mochi: the API key was rejected', error.status);
      return json({ ok: false, error: 'offline' }, 503);
    }
    if (error instanceof Anthropic.RateLimitError) {
      return json({ ok: false, error: 'upstream', retryAfterSeconds: 30 }, 503);
    }
    if (error instanceof Anthropic.BadRequestError) {
      console.error('Mochi: request rejected by the API', error.message);
      return json({ ok: false, error: 'bad_request' }, 400);
    }
    if (error instanceof Anthropic.APIError) {
      console.error('Mochi: API error', error.status);
      return json({ ok: false, error: 'upstream' }, 502);
    }
    console.error('Mochi: unexpected failure', error instanceof Error ? error.message : 'unknown');
    return json({ ok: false, error: 'upstream' }, 502);
  }
}
