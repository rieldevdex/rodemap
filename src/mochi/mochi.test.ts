import { describe, expect, it, vi } from 'vitest';
import { toMillis } from '../domain/dates';
import { EVENTS } from '../data/events';
import { createSeedState, type AppState } from '../state/schema';
import { addNotice, emptyConversation, needsRestart, runOfflineTurn, runOnlineTurn, setCardStatus, addStudentItem } from './conversation';
import { classify, findEventInText, offlineDraft, respondOffline, windowInText } from './offline/engine';
import type { MochiResponse } from './protocol';
import { buildSnapshot } from './snapshot';
import { MOCHI_TOOLS, TOOL_NAMES } from './tools/schemas';
import { eventBrief, executeTool, resolveClub } from './tools/executors';

const now = toMillis('2026-10-07T09:00:00+07:00');
const seed = (): AppState => ({ ...createSeedState(), demoToday: '2026-10-07' });
const ctx = (state: AppState = seed()) => ({ state, now });
const approved = EVENTS.filter((e) => e.status === 'approved');
const upcoming = approved.filter((e) => toMillis(e.end) > now);
const firstOpen = upcoming.find((e) => e.capacity - e.seatsTaken > 5 && toMillis(e.registrationDeadline) > now && e.eligibleGrades.includes(11));

describe('tool schemas', () => {
  it('defines ten strict tools with closed object schemas', () => {
    expect(TOOL_NAMES).toHaveLength(10);
    for (const tool of MOCHI_TOOLS) {
      expect(tool.strict).toBe(true);
      expect(tool.input_schema.additionalProperties).toBe(false);
      for (const key of tool.input_schema.required) expect(Object.keys(tool.input_schema.properties)).toContain(key);
    }
  });
});

describe('executors', () => {
  it('rejects unknown tools and invalid input as error results', () => {
    expect(executeTool('delete_everything', {}, ctx())).toMatchObject({ isError: true });
    expect(executeTool('get_event', 'not an object', ctx())).toMatchObject({ isError: true });
    expect(executeTool('get_event', {}, ctx())).toMatchObject({ isError: true });
    expect(executeTool('search_events', { limit: 'many' }, ctx())).toMatchObject({ isError: true });
    expect(executeTool('search_events', { from_date: '07/10/2026' }, ctx())).toMatchObject({ isError: true });
    expect(executeTool('search_events', { categories: ['XX'] }, ctx())).toMatchObject({ isError: true });
    expect(executeTool('get_event', { event_id: 'ev-999' }, ctx())).toMatchObject({ isError: true });
  });

  it('searches approved upcoming events with formatted facts and a card', () => {
    const out = executeTool('search_events', { categories: ['CN'], limit: 3 }, ctx());
    const r = out.result as { total: number; events: { category: string; date: string }[] };
    expect(r.events.length).toBeLessThanOrEqual(3);
    expect(r.events.every((e) => e.category === 'CN')).toBe(true);
    expect(r.events[0]?.date).toMatch(/^(Thứ|Chủ nhật)/);
    expect(out.card?.kind).toBe('events');
    expect(executeTool('search_events', { club_id: 'không có câu lạc bộ này' }, ctx())).toMatchObject({ isError: true });
    expect((executeTool('search_events', { query: 'zzzzzz' }, ctx()).result as { total: number }).total).toBe(0);
  });

  it('finds clubs by id, slug or name and summarises them', () => {
    expect(resolveClub('inkstep')?.id).toBe('inkstep');
    expect(resolveClub('Hội đồng Học sinh')?.id).toBe('hdhs');
    const out = executeTool('get_club', { club_id: 'inkstep' }, ctx());
    expect((out.result as { short_name: string }).short_name).toBe('Inkstep');
    expect(executeTool('get_club', { club_id: 'zzz' }, ctx())).toMatchObject({ isError: true });
  });

  it('recommends with reasons and caps the card at three reasons per event', () => {
    const out = executeTool('recommend_events', { limit: 2 }, ctx());
    const r = out.result as { recommendations: { reasons: string[] }[] };
    expect(r.recommendations.length).toBeGreaterThan(0);
    expect(out.card?.kind).toBe('events');
    if (out.card?.kind === 'events') {
      for (const lines of Object.values(out.card.reasons ?? {})) expect(lines.length).toBeLessThanOrEqual(3);
    }
  });

  it('proposes a registration card without changing state', () => {
    if (!firstOpen) throw new Error('fixture: no open event');
    const state = seed();
    const before = JSON.stringify(state);
    const out = executeTool('propose_registration', { event_id: firstOpen.id, action: 'register' }, ctx(state));
    expect(out.card).toEqual({ kind: 'registration', action: 'register', eventId: firstOpen.id });
    expect((out.result as { status: string }).status).toBe('awaiting_confirmation');
    expect(JSON.stringify(state)).toBe(before);
  });

  it('explains when a registration or cancellation is not possible', () => {
    const full = approved.find((e) => e.seatsTaken >= e.capacity);
    if (!full) throw new Error('fixture: no full event');
    expect((executeTool('propose_registration', { event_id: full.id, action: 'register' }, ctx()).result as { status: string }).status).toBe('not_possible');
    const mine = seed().registrations.find((r) => r.status === 'registered' && toMillis(EVENTS.find((e) => e.id === r.eventId)?.end ?? '') > now);
    if (!mine) throw new Error('fixture: no upcoming registration');
    expect((executeTool('propose_registration', { event_id: mine.eventId, action: 'register' }, ctx()).result as { status: string }).status).toBe('already_registered');
    expect(executeTool('propose_registration', { event_id: mine.eventId, action: 'unregister' }, ctx()).card?.kind).toBe('registration');
    if (firstOpen) expect((executeTool('propose_registration', { event_id: firstOpen.id, action: 'unregister' }, ctx()).result as { status: string }).status).toBe('not_possible');
  });

  it('builds a calendar plan card from ids or recommendations', () => {
    const fromRecs = executeTool('propose_calendar_plan', {}, ctx());
    expect(fromRecs.card?.kind).toBe('plan');
    if (firstOpen) {
      const byIds = executeTool('propose_calendar_plan', { event_ids: [firstOpen.id], max_hours_per_week: 20 }, ctx());
      expect(byIds.card).toMatchObject({ kind: 'plan', accepted: [firstOpen.id], budget: 20 });
    }
    expect((executeTool('propose_calendar_plan', { event_ids: ['ev-999'] }, ctx()).result as { status: string }).status).toBe('no_candidates');
  });

  it('checks conflicts against the plan and the weekly budget', () => {
    const r = executeTool('check_conflicts', { event_ids: ['ev-015', 'ev-999'] }, ctx()).result as { conflicts: unknown[]; unknown_event_ids: string[] };
    expect(r.unknown_event_ids).toEqual(['ev-999']);
    expect(r.conflicts.length).toBeGreaterThan(0);
    expect(executeTool('check_conflicts', { event_ids: [] }, ctx())).toMatchObject({ isError: true });
  });

  it('summarises a week, a month, an event and a club', () => {
    const week = executeTool('summarize_events', { scope: 'week' }, ctx()).result as { period: string; event_count: number };
    expect(week.period).toMatch(/^Tuần /);
    const month = executeTool('summarize_events', { scope: 'month', date: '2026-11-15' }, ctx()).result as { calendar_periods: { label: string }[] };
    expect(month.calendar_periods.some((p) => p.label.includes('giữa học kỳ I'))).toBe(true);
    if (firstOpen) expect(executeTool('summarize_events', { scope: 'event', event_id: firstOpen.id }, ctx()).isError).toBeUndefined();
    expect(executeTool('summarize_events', { scope: 'club', club_id: 'hdhs' }, ctx()).isError).toBeUndefined();
    expect(executeTool('summarize_events', { scope: 'club' }, ctx())).toMatchObject({ isError: true });
  });

  it('drafts portfolio entries only for attended events and exports calendars', () => {
    const attended = seed().registrations.find((r) => r.status === 'attended');
    if (!attended) throw new Error('fixture');
    expect(executeTool('draft_portfolio_entry', { event_id: attended.eventId, draft_reflection: 'Bản nháp.' }, ctx()).card?.kind).toBe('draft');
    if (firstOpen) expect((executeTool('draft_portfolio_entry', { event_id: firstOpen.id, draft_reflection: 'x' }, ctx()).result as { status: string }).status).toBe('not_possible');
    expect(executeTool('export_calendar', { scope: 'all' }, ctx()).card?.kind).toBe('export');
    expect((executeTool('export_calendar', { scope: 'selected', event_ids: [] }, ctx()).result as { status: string }).status).toBe('empty');
    const empty = { ...seed(), registrations: [] };
    expect((executeTool('export_calendar', { scope: 'all' }, ctx(empty)).result as { status: string }).status).toBe('empty');
  });

  it('formats event briefs in Vietnamese conventions', () => {
    const e = approved[0];
    if (!e) throw new Error('fixture');
    const b = eventBrief(e, ctx());
    expect(b.time).toMatch(/^\d{2}:\d{2}–\d{2}:\d{2}$/);
    expect(b.registration_deadline).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
  });
});

describe('offline engine', () => {
  it('classifies the six core intents and more, accents optional', () => {
    expect(classify('Gợi ý sự kiện tuần tới')).toBe('recommend');
    expect(classify('dang ky hoi thao')).toBe('register');
    expect(classify('Hủy đăng ký sự kiện này')).toBe('unregister');
    expect(classify('Lịch của tôi')).toBe('calendar');
    expect(classify('Tóm tắt tuần này')).toBe('summary');
    expect(classify('Sự kiện đó tổ chức ở đâu?')).toBe('event_question');
    expect(classify('Hồ sơ năng lực')).toBe('portfolio');
    expect(classify('Xin chào Mochi')).toBe('help');
    expect(classify('Số điện thoại của mình là 0912345678')).toBe('privacy');
    expect(classify('Thời tiết hôm nay thế nào')).toBe('unknown');
    expect(classify('Kể cho mình một câu chuyện')).toBe('unknown');
  });

  it('reads date windows and finds events by title or id', () => {
    expect(windowInText('tuần tới')).toBe('next_week');
    expect(windowInText('tuần này')).toBe('this_week');
    expect(windowInText('tháng này')).toBe('this_month');
    expect(windowInText('30 ngày tới')).toBe('next_30_days');
    expect(windowInText('hôm nay')).toBeUndefined();
    const target = upcoming[2];
    if (!target) throw new Error('fixture');
    expect(findEventInText(`Cho mình hỏi về ${target.title}`, approved, now)?.id).toBe(target.id);
    expect(findEventInText(`sự kiện ${target.id}`, approved, now)?.id).toBe(target.id);
    expect(findEventInText('không liên quan', approved, now)).toBeUndefined();
  });

  it('answers each intent formally with the same cards as online mode', () => {
    const c = ctx();
    expect(respondOffline('Gợi ý sự kiện tuần tới', c).cards[0]?.kind).toBe('events');
    expect(respondOffline('Lịch của tôi', c).cards[0]?.kind).toBe('export');
    expect(respondOffline('Tóm tắt tuần này', c).text).toMatch(/Tuần/);
    expect(respondOffline('Tóm tắt tháng sau', c).text).toMatch(/Tháng/);
    expect(respondOffline('Hồ sơ năng lực', c).text).toMatch(/Hồ sơ năng lực/);
    expect(respondOffline('Xin chào', c).text).toMatch(/Mochi/);
    expect(respondOffline('Kể chuyện cười', c).text).toMatch(/hoạt động ngoại khóa/);
    expect(respondOffline('0912345678', c).text).toMatch(/thông tin cá nhân/);
    if (firstOpen) {
      const reg = respondOffline(`Đăng ký ${firstOpen.title}`, c);
      expect(reg.cards[0]).toEqual({ kind: 'registration', action: 'register', eventId: firstOpen.id });
      expect(reg.text).toMatch(/nhấn Xác nhận/);
      const q = respondOffline(`${firstOpen.title} tổ chức ở đâu`, c);
      expect(q.text).toContain(firstOpen.location);
      expect(respondOffline('Đăng ký sự kiện này', { ...c, focusEventId: firstOpen.id }).cards[0]?.kind).toBe('registration');
    }
    expect(respondOffline('Đăng ký', c).cards).toEqual([]);
    expect(respondOffline('Hủy đăng ký', c).text).toMatch(/hủy đăng ký/);
    expect(respondOffline('Sự kiện tổ chức ở đâu', c).text).toMatch(/chưa có thông tin/);
  });

  it('handles a student without a profile or registrations', () => {
    const blank = { ...seed(), profile: null, registrations: [], portfolio: [] };
    expect(respondOffline('Gợi ý sự kiện', ctx(blank)).text).toMatch(/chưa thiết lập hồ sơ/);
    expect(respondOffline('Lịch của tôi', ctx(blank)).text).toMatch(/chưa đăng ký/);
    expect(respondOffline('Hồ sơ năng lực', ctx(blank)).text).toMatch(/chưa có hoạt động/);
  });

  it('writes a clearly provisional draft from event facts only', () => {
    const e = approved[4];
    if (!e) throw new Error('fixture');
    const draft = offlineDraft(e);
    expect(draft).toContain(e.title);
    expect(draft).toContain('[Bổ sung:');
  });
});

describe('snapshot', () => {
  it('wraps compact JSON data and includes candidates only on the first message', () => {
    const full = buildSnapshot(seed(), now, true);
    const short = buildSnapshot(seed(), now, false);
    expect(full.startsWith('<du_lieu_rodemap>')).toBe(true);
    expect(full).toContain('candidate_events');
    expect(short).not.toContain('candidate_events');
    expect(full.length).toBeLessThan(16_000);
    expect(buildSnapshot({ ...seed(), profile: null }, now, false)).toContain('"profile":null');
  });
});

describe('conversation', () => {
  const okText = (text: string): MochiResponse => ({ ok: true, content: [{ type: 'text', text }], stopReason: 'end_turn', model: 'm' });

  it('runs a tool loop in the browser and keeps the history append-only', async () => {
    if (!firstOpen) throw new Error('fixture');
    const send = vi
      .fn<(req: unknown) => Promise<MochiResponse>>()
      .mockResolvedValueOnce({
        ok: true,
        content: [
          { type: 'thinking', thinking: '', signature: 'sig' },
          { type: 'tool_use', id: 'toolu_1', name: 'propose_registration', input: { event_id: firstOpen.id, action: 'register' } },
        ],
        stopReason: 'tool_use',
        model: 'm',
      })
      .mockResolvedValueOnce(okText('Vui lòng nhấn Xác nhận.'));
    const r = await runOnlineTurn(addStudentItem(emptyConversation(), 'Đăng ký'), 'Đăng ký', { sessionId: 's', send, context: () => ctx() });
    expect(r.ok).toBe(true);
    const conv = r.conversation;
    expect(conv.wire.map((m) => m.role)).toEqual(['user', 'assistant', 'user', 'assistant']);
    expect(conv.wire[1]?.content[0]).toEqual({ type: 'thinking', thinking: '', signature: 'sig' });
    expect(conv.items.some((i) => i.role === 'card')).toBe(true);
    expect(conv.focusEventId).toBe(firstOpen.id);
    // Second request replays the first assistant turn untouched.
    const second = send.mock.calls[1]?.[0] as { messages: unknown[] };
    expect(second.messages[1]).toEqual(conv.wire[1]);
  });

  it('reports server errors and refusals without keeping the failed turn', async () => {
    const base = emptyConversation();
    const offline = await runOnlineTurn(base, 'x', { sessionId: 's', send: () => Promise.resolve({ ok: false, error: 'offline' }), context: () => ctx() });
    expect(offline).toEqual({ ok: false, error: 'offline', conversation: base });
    const refusal = await runOnlineTurn(base, 'x', {
      sessionId: 's',
      send: () => Promise.resolve({ ok: true, content: [], stopReason: 'refusal', model: 'm' }),
      context: () => ctx(),
    });
    expect(refusal.ok).toBe(false);
  });

  it('stops after the tool hop limit with a valid open chain, then merges the next message', async () => {
    const loop: MochiResponse = { ok: true, content: [{ type: 'tool_use', id: 't', name: 'search_events', input: {} }], stopReason: 'tool_use', model: 'm' };
    const r = await runOnlineTurn(emptyConversation(), 'x', { sessionId: 's', send: () => Promise.resolve(loop), context: () => ctx() });
    expect(r).toMatchObject({ ok: false, error: 'hop_limit' });
    expect(r.conversation.openToolResults).toBe(true);
    expect(r.conversation.wire.at(-1)?.role).toBe('user');
    const next = await runOnlineTurn(r.conversation, 'tiếp', { sessionId: 's', send: () => Promise.resolve(okText('Đã rõ.')), context: () => ctx() });
    expect(next.ok && next.conversation.wire.filter((m) => m.role === 'user').length).toBe(r.conversation.wire.filter((m) => m.role === 'user').length);
  });

  it('reports app confirmations with the next message', async () => {
    const send = vi.fn<(req: unknown) => Promise<MochiResponse>>().mockResolvedValue(okText('Đã ghi nhận.'));
    const conv = setCardStatus({ ...emptyConversation(), items: [{ id: 'c1', role: 'card', card: { kind: 'export', eventIds: [] }, status: 'pending' }] }, 'c1', 'confirmed', 'Học sinh đã xác nhận.');
    expect(conv.items[0]).toMatchObject({ status: 'confirmed' });
    const r = await runOnlineTurn(conv, 'Cảm ơn', { sessionId: 's', send, context: () => ctx() });
    const body = JSON.stringify(send.mock.calls[0]?.[0]);
    expect(body).toContain('<su_kien_ung_dung>Học sinh đã xác nhận.</su_kien_ung_dung>');
    expect(r.ok && r.conversation.pendingNotes).toEqual([]);
  });

  it('answers offline without touching the wire and restarts long conversations', () => {
    const conv = runOfflineTurn(addNotice(emptyConversation(), 'ghi chú'), 'Lịch của tôi', ctx());
    expect(conv.wire).toEqual([]);
    expect(conv.items.some((i) => i.role === 'mochi' && i.mode === 'offline')).toBe(true);
    expect(needsRestart(emptyConversation())).toBe(false);
    expect(needsRestart({ ...emptyConversation(), wire: Array.from({ length: 40 }, () => ({ role: 'user' as const, content: [] })) })).toBe(true);
  });
});
