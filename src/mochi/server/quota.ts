/**
 * Mochi's weekly question quota, counted in the Supabase database next to the API key
 * (supabase/migrations/*_rodemap_mochi_usage.sql). Only a SHA-256 digest of the random
 * browser id is sent and stored, never an address or anything about the student.
 *
 * A week runs from Monday 00:00 to Sunday 24:00, Asia/Ho_Chi_Minh. A question is a student
 * message; the tool round-trips that follow it count as requests, capped at
 * REQUESTS_PER_QUESTION per question so a client cannot bypass the quota with tool results.
 */
import { addDays, startOfIsoWeek, toIsoDate, toIsoDateTime } from '../../domain/dates';
import type { IsoDate, IsoDateTime } from '../../domain/types';
import { REQUESTS_PER_QUESTION, WEEKLY_QUOTA, type MochiQuota, type MochiRequest, type MochiResponse } from '../protocol';

export interface QuotaWeek {
  /** Monday of the current week, e.g. "2026-10-12". */
  week: IsoDate;
  /** Next Monday 00:00 (+07:00). */
  resetsAt: IsoDateTime;
  secondsLeft: number;
}

export function quotaWeek(now: number): QuotaWeek {
  const start = startOfIsoWeek(now);
  const next = addDays(start, 7);
  return { week: toIsoDate(start), resetsAt: toIsoDateTime(next), secondsLeft: Math.max(1, Math.ceil((next - now) / 1000)) };
}

/** True when the request carries a new student message (not only tool results). */
export function isNewQuestion(request: MochiRequest): boolean {
  const last = request.messages.at(-1);
  return last?.role === 'user' && last.content.some((b) => b.type === 'text');
}

export interface QuotaConfig {
  perBrowser: number;
  total: number;
}

const MAX_LIMIT = 1_000_000;

function positiveInt(value: string | undefined, fallback: number): number {
  const n = Number(value?.trim());
  return value !== undefined && value.trim() !== '' && Number.isInteger(n) && n >= 1 && n <= MAX_LIMIT ? n : fallback;
}

/** Limits from settings; anything missing or invalid falls back to 20 per browser and 500 in total. */
export function resolveQuotaConfig(perBrowser: string | undefined, total: string | undefined): QuotaConfig {
  return { perBrowser: positiveInt(perBrowser, WEEKLY_QUOTA.perBrowser), total: positiveInt(total, WEEKLY_QUOTA.total) };
}

/** 32 hex characters of SHA-256(browser id): the only form in which the id leaves the relay. */
export async function browserDigest(sessionId: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`rodemap-mochi:${sessionId}`)));
  return Array.from(bytes.slice(0, 16), (b) => b.toString(16).padStart(2, '0')).join('');
}

export type QuotaDecision =
  | { ok: true; quota: MochiQuota }
  | { ok: false; status: number; body: MochiResponse; headers: Record<string, string> };

/** Decides one request; never throws (a quota that cannot be checked refuses the request). */
export type QuotaGate = (input: { sessionId: string; question: boolean; now: number }) => Promise<QuotaDecision>;

interface TakeResult {
  allowed: boolean;
  scope: 'weekly_browser' | 'weekly_total' | null;
  browser_questions: number;
}

function isTakeResult(value: unknown): value is TakeResult {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.allowed === 'boolean' &&
    (v.scope === null || v.scope === 'weekly_browser' || v.scope === 'weekly_total') &&
    typeof v.browser_questions === 'number'
  );
}

const UNAVAILABLE: QuotaDecision = { ok: false, status: 503, body: { ok: false, error: 'upstream' }, headers: {} };

export interface SupabaseQuotaOptions {
  /** The project URL (SUPABASE_URL). */
  url: string;
  /** A server-only key allowed to run rodemap_mochi_take (the service role or a secret key). */
  serviceKey: string;
  config: QuotaConfig;
  fetch?: typeof fetch;
}

/** The quota gate backed by the SQL function public.rodemap_mochi_take. */
export function supabaseQuotaGate(opts: SupabaseQuotaOptions): QuotaGate {
  const send = opts.fetch ?? fetch;
  const endpoint = `${opts.url.replace(/\/+$/, '')}/rest/v1/rpc/rodemap_mochi_take`;
  const headers: Record<string, string> = { 'content-type': 'application/json', apikey: opts.serviceKey };
  // Legacy service-role keys are JWTs and also go in Authorization; new secret keys only in apikey.
  if (opts.serviceKey.startsWith('eyJ')) headers.authorization = `Bearer ${opts.serviceKey}`;
  const { perBrowser, total } = opts.config;

  return async ({ sessionId, question, now }) => {
    const week = quotaWeek(now);
    let result: unknown;
    try {
      const res = await send(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          p_week: week.week,
          p_browser: await browserDigest(sessionId),
          p_question: question,
          p_browser_limit: perBrowser,
          p_total_limit: total,
          p_requests_per_question: REQUESTS_PER_QUESTION,
        }),
      });
      if (!res.ok) {
        console.error('Mochi quota: the database refused the check', res.status);
        return UNAVAILABLE;
      }
      result = await res.json();
    } catch (error) {
      console.error('Mochi quota: unreachable', error instanceof Error ? error.message : 'unknown');
      return UNAVAILABLE;
    }
    if (!isTakeResult(result)) {
      console.error('Mochi quota: unexpected answer');
      return UNAVAILABLE;
    }
    if (result.allowed) {
      return { ok: true, quota: { remaining: Math.max(0, perBrowser - result.browser_questions), limit: perBrowser, resetsAt: week.resetsAt } };
    }
    const scope = result.scope ?? 'weekly_total';
    return {
      ok: false,
      status: 429,
      body: { ok: false, error: 'rate_limited', scope, limit: scope === 'weekly_browser' ? perBrowser : total, retryAfterSeconds: week.secondsLeft, resetsAt: week.resetsAt },
      headers: { 'retry-after': String(week.secondsLeft) },
    };
  };
}
