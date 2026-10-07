import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { buildIcs, icsFileName } from '../domain/ics';
import { entryFromEvent } from '../domain/portfolio';
import { toIsoDateTime } from '../domain/dates';
import { findRegistration, isPast } from '../domain/events';
import { CLUBS } from '../data/clubs';
import { sendToMochi } from '../mochi/client';
import {
  addNotice,
  addStudentItem,
  emptyConversation,
  needsRestart,
  runOfflineTurn,
  runOnlineTurn,
  setCardStatus,
  type Conversation,
} from '../mochi/conversation';
import { MAX_USER_CHARS } from '../mochi/protocol';
import type { MochiState } from '../components/organisms/Mochi';
import { downloadFile, newId } from './effects';
import { useAppState, useDispatch, useNow } from './hooks';
import { MochiContext, type MochiApi, type MochiMode } from './mochiContext';
import { subscribeMochi } from './mochiBridge';
import { rememberRouteBefore } from './routeMemory';
import { selectEventById, selectMyEvents, selectPublicEvents, selectUpcomingMine } from './selectors';
import { registrationInfo } from './useRegistration';
import { DEFAULT_WEEKLY_HOUR_BUDGET } from '../domain/budget';
import type { AppState } from './schema';

const CELEBRATE_MS = 1600;

function randomSession(): string {
  return newId('mochi').replace(/[^A-Za-z0-9_-]/g, '') + Math.random().toString(36).slice(2, 8);
}

/** Owns Mochi's conversation (in memory only — conversations are never stored). */
export function MochiProvider({ children }: { children: ReactNode }) {
  const state = useAppState();
  const dispatch = useDispatch();
  const now = useNow();
  const [open, setOpen] = useState(false);
  const [conv, setConv] = useState<Conversation>(emptyConversation);
  const [busy, setBusy] = useState(false);
  const [serverOffline, setServerOffline] = useState(false);
  const [lastTurnOffline, setLastTurnOffline] = useState(false);
  const [figure, setFigure] = useState<MochiState>('idle');
  const sessionId = useRef(randomSession());
  const latest = useRef({ state, now });
  const convRef = useRef(conv);
  useLayoutEffect(() => {
    latest.current = { state, now };
    convRef.current = conv;
  });

  const forcedOffline = state.mochiForcedOffline;
  const mode: MochiMode = forcedOffline || serverOffline || lastTurnOffline ? 'offline' : 'online';

  const celebrate = useCallback(() => {
    setFigure('celebrating');
    window.setTimeout(() => {
      setFigure('idle');
    }, CELEBRATE_MS);
  }, []);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim().slice(0, MAX_USER_CHARS);
      if (text === '' || busy) return;
      let current = convRef.current;
      if (needsRestart(current)) {
        current = addNotice(
          { ...emptyConversation(), focusEventId: current.focusEventId },
          'Mochi bắt đầu phiên trò chuyện mới nhằm đảm bảo phản hồi chính xác.',
        );
      }
      current = addStudentItem(current, text);
      setConv(current);
      setBusy(true);
      setFigure('thinking');
      const context = () => latest.current;

      if (latest.current.state.mochiForcedOffline || serverOffline) {
        setConv(runOfflineTurn(current, text, context()));
        setBusy(false);
        setFigure('answering');
        window.setTimeout(() => {
          setFigure('idle');
        }, CELEBRATE_MS);
        return;
      }

      const result = await runOnlineTurn(current, text, { sessionId: sessionId.current, send: sendToMochi, context });
      if (result.ok) {
        setConv(result.conversation);
        setLastTurnOffline(false);
        setFigure('answering');
      } else if (result.error === 'refusal') {
        setConv(addNotice(result.conversation, 'Mochi không thể hỗ trợ yêu cầu này. Bạn có thể hỏi về sự kiện, lịch cá nhân hoặc hồ sơ năng lực.'));
        setFigure('error');
      } else if (result.error === 'hop_limit') {
        setConv(addNotice(result.conversation, 'Mochi cần thêm thông tin để hoàn tất yêu cầu. Vui lòng nêu cụ thể hơn.'));
        setFigure('idle');
      } else {
        if (result.error === 'offline') setServerOffline(true);
        setLastTurnOffline(result.error !== 'offline');
        const notice =
          result.error === 'offline'
            ? 'Mochi đang hoạt động ở chế độ ngoại tuyến với các phản hồi được chuẩn bị sẵn.'
            : result.error === 'rate_limited'
              ? 'Mochi đang nhận nhiều yêu cầu, vì vậy tạm thời trả lời ở chế độ ngoại tuyến.'
              : 'Kết nối tới Mochi tạm thời gián đoạn, vì vậy Mochi trả lời ở chế độ ngoại tuyến.';
        setConv(runOfflineTurn(addNotice(current, notice), text, context()));
        setFigure('answering');
      }
      setBusy(false);
      window.setTimeout(() => {
        setFigure((f) => (f === 'answering' ? 'idle' : f));
      }, CELEBRATE_MS);
    },
    [busy, serverOffline],
  );

  // "Hỏi Mochi về sự kiện này" and other requests from pages.
  useEffect(
    () =>
      subscribeMochi((request) => {
        setOpen(true);
        if (request.kind === 'event') {
          const event = selectEventById(latest.current.state, request.eventId);
          if (!event) return;
          setConv((c) => ({ ...c, focusEventId: event.id }));
          void send(`Mochi cung cấp thông tin về sự kiện “${event.title}”.`);
        } else if (request.kind === 'prompt') {
          void send(request.text);
        }
      }),
    [send],
  );

  const resolveCard = useCallback(
    (id: string, ok: boolean, note?: string, message?: string) => {
      setConv((c) => {
        let next = setCardStatus(c, id, ok ? 'confirmed' : 'dismissed', note);
        if (message) next = addNotice(next, message);
        return next;
      });
      if (ok) celebrate();
    },
    [celebrate],
  );

  const api = useMemo<MochiApi>(() => {
    const st = (): AppState => latest.current.state;
    const at = () => toIsoDateTime(latest.current.now);
    const infoFor = (eventId: string) => {
      const e = selectEventById(st(), eventId);
      if (!e) return undefined;
      return registrationInfo(e, {
        club: CLUBS.find((c) => c.id === e.clubId),
        plan: selectUpcomingMine(st(), latest.current.now),
        regs: st().registrations,
        grade: st().profile?.grade ?? null,
        budget: st().profile?.weeklyHourBudget ?? DEFAULT_WEEKLY_HOUR_BUDGET,
        now: latest.current.now,
      });
    };
    return {
      open,
      setOpen,
      items: conv.items,
      busy,
      mode,
      figure,
      send: (text) => {
        void send(text);
      },
      newConversation: () => {
        setConv(emptyConversation());
      },
      confirmRegistration: (cardId, eventId, action) => {
        const info = infoFor(eventId);
        if (!info) return;
        if (action === 'register' && info.canRegister) {
          rememberRouteBefore(selectMyEvents(st()).map((e) => e.id));
          dispatch({ type: 'registration/register', eventId, at: at() });
          resolveCard(cardId, true, `Học sinh đã xác nhận đăng ký sự kiện ${eventId}.`, `Đã đăng ký “${info.event.title}”. Sự kiện đã được thêm vào Lộ trình và Lịch của tôi.`);
        } else if (action === 'unregister' && info.canUnregister) {
          dispatch({ type: 'registration/unregister', eventId });
          resolveCard(cardId, true, `Học sinh đã xác nhận hủy đăng ký sự kiện ${eventId}.`, `Đã hủy đăng ký “${info.event.title}”.`);
        } else {
          resolveCard(cardId, false, undefined, 'Thao tác không còn khả dụng do trạng thái sự kiện đã thay đổi.');
        }
      },
      confirmPlan: (cardId, eventIds) => {
        const done: string[] = [];
        rememberRouteBefore(selectMyEvents(st()).map((e) => e.id));
        for (const id of eventIds) {
          const info = infoFor(id);
          if (info?.canRegister) {
            dispatch({ type: 'registration/register', eventId: id, at: at() });
            done.push(info.event.title);
          }
        }
        resolveCard(
          cardId,
          done.length > 0,
          done.length > 0 ? `Học sinh đã xác nhận kế hoạch, đăng ký ${done.length} sự kiện: ${eventIds.join(', ')}.` : undefined,
          done.length > 0 ? `Đã đăng ký ${done.length} sự kiện theo kế hoạch.` : 'Không có sự kiện nào được đăng ký.',
        );
      },
      saveDraft: (cardId, eventId, reflection, role) => {
        const e = selectEventById(st(), eventId);
        if (!e) return;
        const stamp = at();
        const existing = st().portfolio.find((p) => p.eventId === eventId);
        if (existing?.reflectionSource === 'student' && existing.reflection.trim() !== '') {
          resolveCard(cardId, false, undefined, 'Bạn đã có phần tự đánh giá cho sự kiện này, vì vậy bản nháp không được lưu.');
          return;
        }
        const base = existing ?? entryFromEvent(e, { id: newId('pf'), now: latest.current.now });
        const entry = { ...base, role, reflection, reflectionSource: 'mochi_draft' as const, updatedAt: stamp };
        const reg = findRegistration(eventId, st().registrations);
        if (!existing && reg?.status === 'registered' && isPast(e, latest.current.now)) {
          dispatch({ type: 'registration/markAttended', eventId, entry });
        } else {
          dispatch({ type: 'portfolio/upsert', entry });
        }
        resolveCard(cardId, true, `Học sinh đã lưu bản nháp tự đánh giá cho sự kiện ${eventId}.`, 'Đã lưu bản nháp vào Hồ sơ năng lực. Bạn cần chỉnh sửa trước khi sử dụng.');
      },
      dismissCard: (cardId) => {
        resolveCard(cardId, false);
      },
      exportIcs: (eventIds) => {
        const all = selectPublicEvents(st());
        const events = all.filter((e) => eventIds.includes(e.id));
        const ics = buildIcs(events, { now: latest.current.now, clubs: CLUBS, calendarName: 'Lịch Rodemap', baseUrl: window.location.origin });
        downloadFile(icsFileName(latest.current.now), ics, 'text/calendar;charset=utf-8');
      },
    };
  }, [open, conv.items, busy, mode, figure, send, dispatch, resolveCard]);

  return <MochiContext.Provider value={api}>{children}</MochiContext.Provider>;
}
