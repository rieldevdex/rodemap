/**
 * The Mochi relay shared by the Cloudflare Worker (worker/mochi.ts) and the Supabase Edge
 * Function (supabase/functions/rodemap-mochi): reads and validates a browser request,
 * rate-limits it, adds the fixed system prompt and tool list, asks Claude for the next
 * assistant turn and maps every failure to a MochiResponse the browser understands.
 * The API key stays on the server that runs this code.
 */
import Anthropic from '@anthropic-ai/sdk';
import { MAX_BODY_BYTES, RATE_LIMIT, type MochiErrorCode, type MochiRequest, type MochiResponse } from '../protocol';
import { MOCHI_SYSTEM_PROMPT } from '../system-prompt';
import { MOCHI_TOOLS } from '../tools/schemas';
import { checkRateLimit, type RateStore } from './rate-limit';
import { validateMochiRequest } from './validate';

/** Claude Haiku 5.5: fast and inexpensive for a student-facing chat. */
export const DEFAULT_MOCHI_MODEL = 'claude-haiku-5-5';

export type MochiEffort = 'low' | 'medium' | 'high';
const EFFORTS: readonly string[] = ['low', 'medium', 'high'];

/** Models that accept the server-side refusal fallback (`fallbacks: "default"`); Claude Haiku 5.5 has none. */
const SERVER_FALLBACK_MODELS: readonly string[] = ['claude-fable-5-1', 'claude-opus-5-5', 'claude-opus-5', 'claude-sonnet-5-5'];

const UPSTREAM_TIMEOUT_MS = 30_000;
const MAX_TOKENS = 8000;
const ERROR_CODES: readonly string[] = ['offline', 'rate_limited', 'too_long', 'bad_request', 'upstream'] satisfies MochiErrorCode[];

/** The configured model, or Claude Haiku 5.5 when the setting is empty. */
export function resolveModel(value: string | undefined): string {
  const model = value?.trim() ?? '';
  return model === '' ? DEFAULT_MOCHI_MODEL : model;
}

/** low | medium | high; anything else is low (chat latency). */
export function resolveEffort(value: string | undefined): MochiEffort {
  return EFFORTS.includes(value ?? '') ? (value as MochiEffort) : 'low';
}

export function supportsServerFallback(model: string): boolean {
  return SERVER_FALLBACK_MODELS.includes(model);
}

export function jsonResponse(body: MochiResponse, status: number, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra },
  });
}

/** True for a body shaped like a MochiResponse (used on what another relay sends back). */
export function isMochiResponse(value: unknown): value is MochiResponse {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (v.ok === true) return Array.isArray(v.content) && typeof v.model === 'string';
  return v.ok === false && typeof v.error === 'string' && ERROR_CODES.includes(v.error);
}

export type ReadResult = { ok: true; value: MochiRequest } | { ok: false; response: Response };

/** Reads, size-checks and validates the POST body. */
export async function readMochiRequest(request: Request): Promise<ReadResult> {
  const length = Number(request.headers.get('content-length') ?? '0');
  if (length > MAX_BODY_BYTES) return { ok: false, response: jsonResponse({ ok: false, error: 'too_long' }, 413) };
  let raw: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return { ok: false, response: jsonResponse({ ok: false, error: 'too_long' }, 413) };
    raw = JSON.parse(text);
  } catch {
    return { ok: false, response: jsonResponse({ ok: false, error: 'bad_request' }, 400) };
  }
  const parsed = validateMochiRequest(raw);
  if (!parsed.ok) return { ok: false, response: jsonResponse({ ok: false, error: parsed.error }, parsed.error === 'too_long' ? 413 : 400) };
  return { ok: true, value: parsed.value };
}

/** The 429 response when the session or the address has used its window, else null. */
export async function rateLimitResponse(store: RateStore, sessionId: string, clientIp: string, now: number): Promise<Response | null> {
  const rate = await checkRateLimit(store, [`s:${sessionId}`, `ip:${clientIp}`], now, RATE_LIMIT);
  if (rate.allowed) return null;
  return jsonResponse({ ok: false, error: 'rate_limited', retryAfterSeconds: rate.retryAfterSeconds }, 429, {
    'retry-after': String(rate.retryAfterSeconds),
  });
}

export function createClaudeClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey, timeout: UPSTREAM_TIMEOUT_MS, maxRetries: 1 });
}

/** Asks Claude for the next assistant turn of a validated conversation. */
export async function askClaude(client: Anthropic, request: MochiRequest, opts: { model: string; effort: MochiEffort }): Promise<Response> {
  const fallback = supportsServerFallback(opts.model);
  try {
    const response = await client.beta.messages.create({
      model: opts.model,
      max_tokens: MAX_TOKENS,
      betas: fallback ? ['server-side-fallback-2026-07-01', 'thinking-binding-controls-2026-08-01'] : ['thinking-binding-controls-2026-08-01'],
      // A classifier false positive is re-run on Anthropic's recommended fallback model (not on Haiku).
      ...(fallback ? { fallbacks: 'default' as const } : {}),
      // Replayed thinking blocks that fail the conversation check are dropped instead of failing the demo.
      thinking: { type: 'adaptive', block_binding: { prefix_mismatch_behavior: 'drop_block' } },
      output_config: { effort: opts.effort },
      // Tools and system prompt are constant, so they form a cacheable prefix; the
      // top-level breakpoint also caches the growing conversation.
      cache_control: { type: 'ephemeral' },
      system: [{ type: 'text', text: MOCHI_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      tools: MOCHI_TOOLS as unknown as Anthropic.Beta.BetaTool[],
      tool_choice: { type: 'auto' },
      messages: request.messages as unknown as Anthropic.Beta.BetaMessageParam[],
    });
    return jsonResponse(
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
      return jsonResponse({ ok: false, error: 'offline' }, 503);
    }
    if (error instanceof Anthropic.RateLimitError) {
      return jsonResponse({ ok: false, error: 'upstream', retryAfterSeconds: 30 }, 503);
    }
    if (error instanceof Anthropic.BadRequestError) {
      console.error('Mochi: request rejected by the API', error.message);
      return jsonResponse({ ok: false, error: 'bad_request' }, 400);
    }
    if (error instanceof Anthropic.APIError) {
      console.error('Mochi: API error', error.status);
      return jsonResponse({ ok: false, error: 'upstream' }, 502);
    }
    console.error('Mochi: unexpected failure', error instanceof Error ? error.message : 'unknown');
    return jsonResponse({ ok: false, error: 'upstream' }, 502);
  }
}

export interface RelayConfig {
  /** Without a key the browser switches Mochi to its offline mode. */
  apiKey: string | undefined;
  model: string | undefined;
  effort: string | undefined;
  store: RateStore;
  clientIp: string;
}

/** The whole relay for one POST: key check, body, rate limit, Claude. */
export async function relayMochiRequest(request: Request, config: RelayConfig): Promise<Response> {
  if (config.apiKey === undefined || config.apiKey === '') return jsonResponse({ ok: false, error: 'offline' }, 503);
  const body = await readMochiRequest(request);
  if (!body.ok) return body.response;
  const limited = await rateLimitResponse(config.store, body.value.sessionId, config.clientIp, Date.now());
  if (limited) return limited;
  return askClaude(createClaudeClient(config.apiKey), body.value, { model: resolveModel(config.model), effort: resolveEffort(config.effort) });
}
