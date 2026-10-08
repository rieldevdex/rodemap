/**
 * Request validation for the Mochi Worker endpoint. Pure; unit tested.
 * User turns are rebuilt from an allow-list of fields; assistant turns are kept
 * verbatim because the Claude API requires replayed thinking blocks unchanged.
 */
import { MAX_MESSAGES, MAX_USER_CHARS, type MochiRequest, type WireBlock, type WireMessage } from '../protocol';

export const SNAPSHOT_TAG = '<du_lieu_rodemap>';
export const MAX_SNAPSHOT_CHARS = 16_000;
export const MAX_TOOL_RESULT_CHARS = 16_000;
const SESSION_RE = /^[A-Za-z0-9_-]{8,64}$/;
const ASSISTANT_TYPES = new Set(['text', 'tool_use', 'thinking', 'redacted_thinking', 'fallback']);

export type ValidationResult = { ok: true; value: MochiRequest } | { ok: false; error: 'bad_request' | 'too_long' };

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

class Invalid extends Error {
  constructor(readonly code: 'bad_request' | 'too_long') {
    super(code);
  }
}

function userTextBlock(block: Record<string, unknown>): WireBlock {
  const text = block.text;
  if (typeof text !== 'string' || text.trim() === '') throw new Invalid('bad_request');
  const limit = text.startsWith(SNAPSHOT_TAG) ? MAX_SNAPSHOT_CHARS : MAX_USER_CHARS;
  if (text.length > limit) throw new Invalid('too_long');
  return { type: 'text', text };
}

function toolResultBlock(block: Record<string, unknown>): WireBlock {
  const { tool_use_id: id, content, is_error: isError } = block;
  if (typeof id !== 'string' || id === '') throw new Invalid('bad_request');
  if (typeof content !== 'string') throw new Invalid('bad_request');
  if (content.length > MAX_TOOL_RESULT_CHARS) throw new Invalid('too_long');
  const out: WireBlock = { type: 'tool_result', tool_use_id: id, content };
  if (isError === true) out.is_error = true;
  return out;
}

function userBlocks(content: unknown[]): WireBlock[] {
  return content.map((raw) => {
    if (!isRecord(raw)) throw new Invalid('bad_request');
    if (raw.type === 'text') return userTextBlock(raw);
    if (raw.type === 'tool_result') return toolResultBlock(raw);
    throw new Invalid('bad_request');
  });
}

function assistantBlocks(content: unknown[]): WireBlock[] {
  return content.map((raw) => {
    if (!isRecord(raw) || typeof raw.type !== 'string' || !ASSISTANT_TYPES.has(raw.type)) {
      throw new Invalid('bad_request');
    }
    return raw as WireBlock;
  });
}

/** Validates and normalises a parsed request body. */
export function validateMochiRequest(raw: unknown): ValidationResult {
  try {
    if (!isRecord(raw)) throw new Invalid('bad_request');
    const { sessionId, messages } = raw;
    if (typeof sessionId !== 'string' || !SESSION_RE.test(sessionId)) throw new Invalid('bad_request');
    if (!Array.isArray(messages) || messages.length === 0) throw new Invalid('bad_request');
    if (messages.length > MAX_MESSAGES) throw new Invalid('too_long');

    const out: WireMessage[] = messages.map((m: unknown, i) => {
      if (!isRecord(m) || !Array.isArray(m.content) || m.content.length === 0) throw new Invalid('bad_request');
      const expected = i % 2 === 0 ? 'user' : 'assistant';
      if (m.role !== expected) throw new Invalid('bad_request');
      return expected === 'user'
        ? { role: 'user', content: userBlocks(m.content) }
        : { role: 'assistant', content: assistantBlocks(m.content) };
    });
    if (out.at(-1)?.role !== 'user') throw new Invalid('bad_request');
    return { ok: true, value: { sessionId, messages: out } };
  } catch (e) {
    if (e instanceof Invalid) return { ok: false, error: e.code };
    throw e;
  }
}
