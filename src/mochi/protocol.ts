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
/** Requests per session (and per IP) per window. */
export const RATE_LIMIT = { requests: 40, windowMs: 10 * 60 * 1000 } as const;

/** One content block as sent to / received from the Messages API (kept opaque on purpose). */
export type WireBlock = { type: string } & Record<string, unknown>;

export interface WireMessage {
  role: 'user' | 'assistant';
  content: WireBlock[];
}

export interface MochiRequest {
  /** Random per-browser id used for rate limiting; not linked to a person. */
  sessionId: string;
  messages: WireMessage[];
}

export type MochiErrorCode =
  | 'offline' // no API key configured: the browser switches to offline mode
  | 'rate_limited'
  | 'too_long'
  | 'bad_request'
  | 'upstream'; // the Claude API failed or timed out

export type MochiResponse =
  | { ok: true; content: WireBlock[]; stopReason: string | null; model: string }
  | { ok: false; error: MochiErrorCode; retryAfterSeconds?: number };
