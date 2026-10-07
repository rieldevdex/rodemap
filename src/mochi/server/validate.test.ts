import { describe, expect, it } from 'vitest';
import { MAX_MESSAGES, MAX_USER_CHARS } from '../protocol';
import { MAX_SNAPSHOT_CHARS, MAX_TOOL_RESULT_CHARS, SNAPSHOT_TAG, validateMochiRequest } from './validate';

const sessionId = 'abcd1234efgh';
const user = (text: string) => ({ role: 'user', content: [{ type: 'text', text }] });
const assistant = (content: unknown[]) => ({ role: 'assistant', content });

describe('validateMochiRequest', () => {
  it('accepts a first turn with a snapshot and a question, dropping unknown fields', () => {
    const r = validateMochiRequest({
      sessionId,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: `${SNAPSHOT_TAG}{}</du_lieu_rodemap>`, cache_control: { type: 'ephemeral' } },
            { type: 'text', text: 'Mochi gợi ý sự kiện tuần này.' },
          ],
        },
      ],
    });
    expect(r).toEqual({
      ok: true,
      value: {
        sessionId,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: `${SNAPSHOT_TAG}{}</du_lieu_rodemap>` },
              { type: 'text', text: 'Mochi gợi ý sự kiện tuần này.' },
            ],
          },
        ],
      },
    });
  });

  it('keeps assistant turns verbatim and normalises tool results', () => {
    const thinking = { type: 'thinking', thinking: '', signature: 'sig' };
    const toolUse = { type: 'tool_use', id: 'toolu_1', name: 'search_events', input: {} };
    const r = validateMochiRequest({
      sessionId,
      messages: [
        user('Tìm sự kiện'),
        assistant([thinking, toolUse]),
        { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: '[]', is_error: true, extra: 1 }] },
      ],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.messages[1]?.content[0]).toBe(thinking);
    expect(r.value.messages[2]?.content[0]).toEqual({ type: 'tool_result', tool_use_id: 'toolu_1', content: '[]', is_error: true });
  });

  it('omits is_error unless it is true', () => {
    const r = validateMochiRequest({
      sessionId,
      messages: [user('a'), assistant([{ type: 'text', text: 'b' }]), { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't', content: 'x', is_error: false }] }],
    });
    expect(r.ok && r.value.messages[2]?.content[0]).toEqual({ type: 'tool_result', tool_use_id: 't', content: 'x' });
  });

  it.each([
    ['not an object', null],
    ['bad session id', { sessionId: 'x', messages: [user('a')] }],
    ['no messages', { sessionId, messages: [] }],
    ['messages not an array', { sessionId, messages: 'a' }],
    ['message without content', { sessionId, messages: [{ role: 'user', content: [] }] }],
    ['message not an object', { sessionId, messages: ['a'] }],
    ['starts with assistant', { sessionId, messages: [assistant([{ type: 'text', text: 'a' }])] }],
    ['ends with assistant', { sessionId, messages: [user('a'), assistant([{ type: 'text', text: 'b' }])] }],
    ['user block not an object', { sessionId, messages: [{ role: 'user', content: ['a'] }] }],
    ['blank text', { sessionId, messages: [user('   ')] }],
    ['image block from user', { sessionId, messages: [{ role: 'user', content: [{ type: 'image', source: {} }] }] }],
    ['tool result without id', { sessionId, messages: [{ role: 'user', content: [{ type: 'tool_result', content: 'x' }] }] }],
    ['tool result with array content', { sessionId, messages: [{ role: 'user', content: [{ type: 'tool_result', tool_use_id: 't', content: [] }] }] }],
    ['unknown assistant block', { sessionId, messages: [user('a'), assistant([{ type: 'server_tool_use' }]), user('b')] }],
    ['assistant block not an object', { sessionId, messages: [user('a'), assistant(['x']), user('b')] }],
  ])('rejects %s', (_label, body) => {
    expect(validateMochiRequest(body)).toEqual({ ok: false, error: 'bad_request' });
  });

  it.each([
    ['a long student message', { sessionId, messages: [user('a'.repeat(MAX_USER_CHARS + 1))] }],
    ['a long snapshot', { sessionId, messages: [user(SNAPSHOT_TAG + 'a'.repeat(MAX_SNAPSHOT_CHARS))] }],
    [
      'a long tool result',
      {
        sessionId,
        messages: [
          user('a'),
          assistant([{ type: 'text', text: 'b' }]),
          { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't', content: 'x'.repeat(MAX_TOOL_RESULT_CHARS + 1) }] },
        ],
      },
    ],
    ['too many messages', { sessionId, messages: Array.from({ length: MAX_MESSAGES + 1 }, (_, i) => (i % 2 ? assistant([{ type: 'text', text: 'b' }]) : user('a'))) }],
  ])('flags %s as too long', (_label, body) => {
    expect(validateMochiRequest(body)).toEqual({ ok: false, error: 'too_long' });
  });

  it('accepts a snapshot longer than a student message', () => {
    expect(validateMochiRequest({ sessionId, messages: [user(SNAPSHOT_TAG + 'a'.repeat(MAX_USER_CHARS + 10))] }).ok).toBe(true);
  });
});
