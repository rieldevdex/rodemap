/**
 * Mochi's conversation runner. The wire history is append-only (assistant turns are
 * replayed verbatim, thinking blocks included); a failed turn is discarded whole, so
 * the history the server sees never has gaps or edits.
 */
import type { CardStatus, MochiCard } from './cards';
import { respondOffline } from './offline/engine';
import { MAX_MESSAGES, MAX_TOOL_HOPS, type MochiErrorCode, type MochiRequest, type MochiResponse, type WireBlock, type WireMessage } from './protocol';
import { buildSnapshot } from './snapshot';
import { executeTool, type ToolContext } from './tools/executors';

export type ChatItem =
  | { id: string; role: 'student'; text: string }
  | { id: string; role: 'mochi'; text: string; mode: 'online' | 'offline' }
  | { id: string; role: 'card'; card: MochiCard; status: CardStatus }
  | { id: string; role: 'notice'; text: string };

export interface Conversation {
  wire: WireMessage[];
  items: ChatItem[];
  focusEventId?: string | undefined;
  /** Whether the first (full) snapshot was already sent in this conversation. */
  snapshotSent: boolean;
  /** App events (confirmations) to report to the model with the next student message. */
  pendingNotes: string[];
  /** The wire ends with tool results that still await the next student message. */
  openToolResults: boolean;
}

export function emptyConversation(): Conversation {
  return { wire: [], items: [], snapshotSent: false, pendingNotes: [], openToolResults: false };
}

let counter = 0;
export function itemId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

export interface TurnDeps {
  sessionId: string;
  send: (req: MochiRequest) => Promise<MochiResponse>;
  /** Fresh app state for each tool call (the student may confirm a card mid-turn). */
  context: () => ToolContext;
}

export type TurnResult =
  | { ok: true; conversation: Conversation }
  | { ok: false; error: MochiErrorCode | 'refusal' | 'hop_limit'; conversation: Conversation };

function textOf(blocks: WireBlock[]): string {
  return blocks
    .filter((b) => b.type === 'text' && typeof b.text === 'string')
    .map((b) => (b.text as string).trim())
    .filter(Boolean)
    .join('\n\n');
}

/** A conversation that would exceed the message cap is restarted instead of trimmed. */
export function needsRestart(conv: Conversation): boolean {
  return conv.wire.length + 2 + MAX_TOOL_HOPS * 2 > MAX_MESSAGES;
}

/** One online turn: student message → (tool calls run in the browser)* → Mochi's answer. */
export async function runOnlineTurn(conv: Conversation, text: string, deps: TurnDeps): Promise<TurnResult> {
  const ctx = deps.context();
  const notes = conv.pendingNotes.map((n) => ({ type: 'text', text: `<su_kien_ung_dung>${n}</su_kien_ung_dung>` }));
  const studentBlocks: WireBlock[] = [
    { type: 'text', text: buildSnapshot(ctx.state, ctx.now, !conv.snapshotSent) },
    ...notes,
    { type: 'text', text },
  ];
  const wire: WireMessage[] = [...conv.wire];
  const last = wire.at(-1);
  if (conv.openToolResults && last?.role === 'user') {
    wire[wire.length - 1] = { role: 'user', content: [...last.content, ...studentBlocks] };
  } else {
    wire.push({ role: 'user', content: studentBlocks });
  }
  const items: ChatItem[] = [];
  let focusEventId = conv.focusEventId;

  for (let hop = 0; hop <= MAX_TOOL_HOPS; hop += 1) {
    const res = await deps.send({ sessionId: deps.sessionId, messages: wire });
    if (!res.ok) return { ok: false, error: res.error, conversation: conv };
    wire.push({ role: 'assistant', content: res.content });
    const said = textOf(res.content);
    if (said !== '') items.push({ id: itemId('m'), role: 'mochi', text: said, mode: 'online' });
    if (res.stopReason === 'refusal') return { ok: false, error: 'refusal', conversation: conv };

    const calls = res.content.filter((b) => b.type === 'tool_use');
    if (calls.length === 0) {
      return {
        ok: true,
        conversation: { ...conv, wire, items: [...conv.items, ...items], focusEventId, snapshotSent: true, pendingNotes: [], openToolResults: false },
      };
    }
    const results: WireBlock[] = calls.map((call) => {
      const outcome = executeTool(String(call.name), call.input, deps.context());
      if (outcome.card) {
        items.push({ id: itemId('c'), role: 'card', card: outcome.card, status: 'pending' });
        if (outcome.card.kind === 'registration' || outcome.card.kind === 'draft') focusEventId = outcome.card.eventId;
      }
      const block: WireBlock = { type: 'tool_result', tool_use_id: String(call.id), content: JSON.stringify(outcome.result) };
      if (outcome.isError) block.is_error = true;
      return block;
    });
    wire.push({ role: 'user', content: results });
    if (hop === MAX_TOOL_HOPS) {
      // Keep the chain valid: the results wait for the next student message.
      return {
        ok: false,
        error: 'hop_limit',
        conversation: { ...conv, wire, items: [...conv.items, ...items], focusEventId, snapshotSent: true, pendingNotes: [], openToolResults: true },
      };
    }
  }
  /* c8 ignore next */
  return { ok: false, error: 'hop_limit', conversation: conv };
}

/** One offline turn (never touches the wire history). */
export function runOfflineTurn(conv: Conversation, text: string, ctx: ToolContext): Conversation {
  const reply = respondOffline(text, { ...ctx, focusEventId: conv.focusEventId });
  const items: ChatItem[] = [{ id: itemId('m'), role: 'mochi', text: reply.text, mode: 'offline' }];
  for (const card of reply.cards) items.push({ id: itemId('c'), role: 'card', card, status: 'pending' });
  return { ...conv, items: [...conv.items, ...items], focusEventId: reply.focusEventId ?? conv.focusEventId };
}

export function addStudentItem(conv: Conversation, text: string): Conversation {
  return { ...conv, items: [...conv.items, { id: itemId('s'), role: 'student', text }] };
}

export function addNotice(conv: Conversation, text: string): Conversation {
  return { ...conv, items: [...conv.items, { id: itemId('n'), role: 'notice', text }] };
}

export function setCardStatus(conv: Conversation, id: string, status: CardStatus, note?: string): Conversation {
  return {
    ...conv,
    items: conv.items.map((i) => (i.id === id && i.role === 'card' ? { ...i, status } : i)),
    pendingNotes: note === undefined ? conv.pendingNotes : [...conv.pendingNotes, note],
  };
}
