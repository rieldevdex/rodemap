/**
 * Wire protocol between the browser and the Mochi Worker endpoint (/api/mochi).
 *
 * The browser owns the conversation: it sends the full, append-only message
 * history (assistant turns replayed verbatim, including thinking blocks) and
 * receives the next assistant turn. Tools run in the browser; the server only
 * relays to the Claude API with a fixed system prompt and tool list.
 */

/** Longest message a student may type. */
export const MAX_USER_CHARS = 500;
/** Longest conversation (messages) before Mochi starts a new one; history is never trimmed. */
export const MAX_MESSAGES = 48;
/** Upper bound for the request body. */
export const MAX_BODY_BYTES = 256 * 1024;
/** Tool round-trips the browser performs for a single student message. */
export const MAX_TOOL_HOPS = 4;
/**
 * Short-term limits against bursts. The address limit is generous because a whole school
 * can share one public address behind the school Wi-Fi.
 */
export const RATE_LIMITS = {
  session: { requests: 40, windowMs: 10 * 60 * 1000 },
  ip: { requests: 400, windowMs: 10 * 60 * 1000 },
} as const;

/**
 * Weekly question quota (Monday 00:00 to Sunday 24:00, Asia/Ho_Chi_Minh), enforced by the
 * Supabase relay. A question is a student message; the tool round-trips that follow it are
 * capped separately at REQUESTS_PER_QUESTION requests per question.
 */
export const WEEKLY_QUOTA = { perBrowser: 20, total: 500 } as const;
export const REQUESTS_PER_QUESTION = MAX_TOOL_HOPS + 1;

/** One content block as sent to / received from the Messages API (kept opaque on purpose). */
export type WireBlock = { type: string } & Record<string, unknown>;

export interface WireMessage {
  role: 'user' | 'assistant';
  content: WireBlock[];
}

export interface MochiRequest {
  /** Random id kept in this browser, used for the limits and the weekly quota; not linked to a person. */
  sessionId: string;
  messages: WireMessage[];
}

export type MochiErrorCode =
  | 'offline' // no API key configured: the browser switches to offline mode
  | 'rate_limited'
  | 'too_long'
  | 'bad_request'
  | 'upstream'; // the Claude API failed or timed out

/** Which limit refused a request: a short burst, this browser's week or the whole site's week. */
export type MochiLimitScope = 'burst' | 'weekly_browser' | 'weekly_total';

/** This browser's weekly questions, returned with every answer when the quota is enforced. */
export interface MochiQuota {
  remaining: number;
  limit: number;
  /** Next Monday 00:00, Asia/Ho_Chi_Minh. */
  resetsAt: string;
}

export type MochiResponse =
  | { ok: true; content: WireBlock[]; stopReason: string | null; model: string; quota?: MochiQuota }
  | { ok: false; error: MochiErrorCode; retryAfterSeconds?: number; scope?: MochiLimitScope; limit?: number; resetsAt?: string };
