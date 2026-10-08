/**
 * Offline Mochi: a deterministic, rule-based engine for the six core intents
 * (gợi ý sự kiện, đăng ký, xem lịch, tóm tắt tuần, hỏi về sự kiện, hồ sơ năng lực).
 * It reuses the same tool executors as online mode, so cards and facts are identical.
 */
import { CATEGORY_LABELS } from '../../domain/category-labels';
import { addDays, formatDate, formatLongDate, formatTimeRange, toIsoDate } from '../../domain/dates';
import { eventEnd, eventStart, isPast } from '../../domain/events';
import { windowRange, type DateWindow } from '../../domain/filters';
import { groupByCategory, totalHours } from '../../domain/portfolio';
import { NEWS_CATEGORY_LABELS } from '../../domain/news';
import { foldVietnamese, formatHours } from '../../domain/text';
import type { SchoolEvent } from '../../domain/types';
import { CLUBS } from '../../data/clubs';
import { tagLabel } from '../../data/tags';
import { selectConflictsInPlan, selectPendingAttendance, selectPublicEvents, selectUpcomingMine } from '../../state/selectors';
import type { MochiCard } from '../cards';
import { executeTool, type ToolContext } from '../tools/executors';

export type OfflineIntent =
  | 'privacy'
  | 'unregister'
  | 'register'
  | 'news'
  | 'portfolio'
  | 'calendar'
  | 'summary'
  | 'recommend'
  | 'event_question'
  | 'help'
  | 'unknown';

export interface OfflineContext extends ToolContext {
  /** The event the conversation is about (from "Hỏi Mochi về sự kiện này" or the last answer). */
  focusEventId?: string | undefined;
}

export interface OfflineReply {
  intent: OfflineIntent;
  text: string;
  cards: MochiCard[];
  focusEventId?: string;
}

const PATTERNS: [OfflineIntent, RegExp][] = [
  ['privacy', /(\b0\d{9}\b|so dien thoai cua (minh|em|toi)|dia chi nha|mat khau)/],
  ['unregister', /\b(huy dang ky|huy ghi danh|rut dang ky|khong tham gia nua)\b/],
  ['register', /\b(dang ky|ghi danh|dang ki)\b/],
  // "Bản tin" alone is the council newsletter (the nav item); "bản tin tuần" is Mochi's weekly summary.
  ['news', /\b(ban tin(?! tuan)|bao tuong|tin tuc|thong bao moi|thong bao gi|thong bao nao|bai viet cua hoi dong|bai viet cua hdhs)\b/],
  ['portfolio', /\b(ho so nang luc|ho so|tu danh gia|minh chung|nang luc|phan anh|bai viet)\b/],
  ['calendar', /\b(lich cua|lich ca nhan|xem lich|lich|xuat lich|ics|google calendar|trung lich)\b/],
  ['summary', /\b(tom tat|ban tin tuan|tong hop|tuan nay co|thang nay co)\b/],
  ['recommend', /\b(goi y|de xuat|nen tham gia|phu hop|tham gia gi|su kien nao|hoat dong nao)\b/],
  ['event_question', /\b(khi nao|o dau|bao gio|dia diem|con cho|han dang ky|may gio|thoi gian|danh cho khoi)\b/],
  ['help', /\b(xin chao|chao mochi|chao|giup|ho tro|lam duoc gi|huong dan|mochi la ai)\b/],
];

/** Classifies a student message (accents optional). */
export function classify(text: string): OfflineIntent {
  const t = ` ${foldVietnamese(text)} `;
  for (const [intent, re] of PATTERNS) if (re.test(t)) return intent;
  return 'unknown';
}

const STOPWORDS = new Set(['su', 'kien', 'cua', 'cho', 'va', 'cac', 'nhung', 'mot', 'voi', 'trong', 've', 'clb', 'cau', 'lac', 'bo', 'nam', 'hoc', 'tai', 'theo', 'dang', 'ky', 'mochi', 'minh', 'toi', 'em', 'ban', 'nay', 'do']);

function tokens(s: string): string[] {
  return foldVietnamese(s)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 2 && !STOPWORDS.has(w));
}

/** Finds the event a message names: an id like "ev-012", or the best title match. */
export function findEventInText(text: string, events: readonly SchoolEvent[], now: number): SchoolEvent | undefined {
  const id = /\bev-\d{3}\b/i.exec(text)?.[0]?.toLowerCase();
  if (id) return events.find((e) => e.id === id);
  const words = new Set(tokens(text));
  let best: { e: SchoolEvent; score: number } | undefined;
  for (const e of events) {
    const titleWords = [...new Set(tokens(e.title))];
    const hits = titleWords.filter((w) => words.has(w)).length;
    const enough = hits >= 2 || (hits === 1 && titleWords.length === 1);
    if (!enough) continue;
    const score = hits / titleWords.length + hits;
    const better =
      !best ||
      score > best.score ||
      (score === best.score && !isPast(e, now) && (isPast(best.e, now) || eventStart(e) < eventStart(best.e)));
    if (better) best = { e, score };
  }
  return best?.e;
}

/** "tuần này", "tuần tới", "tháng này", "30 ngày tới" → a date window. */
export function windowInText(text: string): DateWindow | undefined {
  const t = foldVietnamese(text);
  if (/tuan (toi|sau)/.test(t)) return 'next_week';
  if (t.includes('tuan nay')) return 'this_week';
  if (t.includes('thang nay')) return 'this_month';
  if (/(30 ngay|thang toi|thang sau)/.test(t)) return 'next_30_days';
  return undefined;
}

const line = (e: SchoolEvent) => `${formatLongDate(eventStart(e))}, ${formatTimeRange(eventStart(e), eventEnd(e))}`;
const clubName = (id: string) => CLUBS.find((c) => c.id === id)?.name ?? '';
/** "Tiếng Anh" → "tiếng Anh": only the first letter is lowered, so proper names keep their capitals. */
const lowerFirst = (text: string) => text.charAt(0).toLocaleLowerCase('vi') + text.slice(1);

const SUGGESTION_HINT =
  'Bạn có thể nhập: “Gợi ý sự kiện tuần tới”, “Đăng ký …”, “Lịch của tôi”, “Tóm tắt tuần này”, “Bản tin Hội đồng Học sinh” hoặc “Hồ sơ năng lực”.';

function recommendReply(text: string, ctx: OfflineContext): OfflineReply {
  const window = windowInText(text);
  const range = window ? windowRange(window, ctx.now) : null;
  const out = executeTool(
    'recommend_events',
    range ? { limit: 3, from_date: toIsoDate(range.from), to_date: toIsoDate(addDays(range.to, -1)) } : { limit: 3 },
    ctx,
  );
  const recs = (out.result as { recommendations: { id: string; title: string; date: string; time: string; reasons: string[] }[] }).recommendations;
  if (recs.length === 0) {
    return {
      intent: 'recommend',
      text: 'Mochi chưa tìm thấy sự kiện phù hợp còn mở đăng ký trong khoảng thời gian đã chọn. Bạn có thể mở rộng khoảng thời gian tìm kiếm tại trang Khám phá sự kiện.',
      cards: [],
    };
  }
  const intro = ctx.state.profile
    ? `Dựa trên hồ sơ của bạn, Mochi đề xuất ${recs.length} sự kiện sau:`
    : `Bạn chưa thiết lập hồ sơ; sau khi thiết lập, các đề xuất sẽ phù hợp hơn với bạn. Mochi đề xuất ${recs.length} sự kiện sắp diễn ra như sau:`;
  const items = recs.map((r) => `– ${r.title} (${r.date}, ${r.time})${r.reasons[0] ? `: ${r.reasons[0].toLocaleLowerCase('vi')}.` : '.'}`);
  const first = recs[0];
  return {
    intent: 'recommend',
    text: [intro, items.join('\n'), `Bạn có thể nhấn Đăng ký trên thẻ bên dưới hoặc nhập “Đăng ký ${first?.title ?? 'tên sự kiện'}” để Mochi chuẩn bị thẻ xác nhận.`].join('\n\n'),
    cards: out.card ? [out.card] : [],
    ...(first ? { focusEventId: first.id } : {}),
  };
}

function registrationReply(intent: 'register' | 'unregister', text: string, ctx: OfflineContext): OfflineReply {
  const upcoming = selectPublicEvents(ctx.state).filter((e) => !isPast(e, ctx.now));
  const events = intent === 'unregister' ? selectUpcomingMine(ctx.state, ctx.now) : upcoming;
  // Prefer upcoming events; fall back to past ones only to explain why nothing can be done.
  const found =
    findEventInText(text, events, ctx.now) ??
    (intent === 'register' ? findEventInText(text, selectPublicEvents(ctx.state), ctx.now) : undefined);
  const event = found ?? (ctx.focusEventId ? events.find((e) => e.id === ctx.focusEventId) : undefined);
  if (!event) {
    return {
      intent,
      text:
        intent === 'register'
          ? `Mochi chưa xác định được sự kiện bạn muốn đăng ký. Vui lòng nêu tên sự kiện, ví dụ: “Đăng ký ${upcoming[0]?.title ?? '[tên sự kiện]'}”, hoặc nhập “Gợi ý sự kiện” để xem đề xuất.`
          : 'Mochi chưa xác định được sự kiện bạn muốn hủy đăng ký. Vui lòng nêu tên một sự kiện trong lịch của bạn.',
      cards: [],
    };
  }
  const out = executeTool('propose_registration', { event_id: event.id, action: intent }, ctx);
  const r = out.result as { status: string; reason?: string; conflicts?: { title: string }[]; exceeds_weekly_budget?: boolean };
  const facts = `“${event.title}” (${line(event)}, ${event.location})`;
  if (r.status === 'awaiting_confirmation') {
    const parts =
      intent === 'register'
        ? [`Mochi đã chuẩn bị thẻ xác nhận đăng ký ${facts}.`]
        : [`Mochi đã chuẩn bị thẻ xác nhận hủy đăng ký ${facts}.`];
    if (r.conflicts && r.conflicts.length > 0) parts.push(`Lưu ý: sự kiện trùng thời gian với ${r.conflicts.map((c) => `“${c.title}”`).join(', ')}.`);
    if (r.exceeds_weekly_budget) parts.push('Lưu ý: nếu đăng ký sự kiện này, tổng số giờ trong tuần sẽ vượt quỹ giờ mỗi tuần của bạn.');
    parts.push('Vui lòng kiểm tra thông tin trên thẻ và nhấn Xác nhận để hoàn tất.');
    return { intent, text: parts.join(' '), cards: out.card ? [out.card] : [], focusEventId: event.id };
  }
  if (r.status === 'already_registered') {
    return { intent, text: `Bạn đã đăng ký ${facts}. Sự kiện đã có trong trang Lộ trình và trang Lịch của tôi.`, cards: [], focusEventId: event.id };
  }
  return {
    intent,
    text: `Mochi không thể chuẩn bị thẻ xác nhận cho ${facts}: ${lowerFirst(r.reason ?? '')} Bạn có thể nhập “Gợi ý sự kiện” để xem các sự kiện còn mở đăng ký.`,
    cards: [],
    focusEventId: event.id,
  };
}

function newsReply(text: string, ctx: OfflineContext): OfflineReply {
  const t = foldVietnamese(text);
  const category = t.includes('huong dan') ? 'guide' : t.includes('cau lac bo') ? 'club' : undefined;
  const out = executeTool('list_news', category ? { limit: 3, category } : { limit: 3 }, ctx);
  const r = out.result as { status: string; total_matching?: number; posts?: { title: string; category: string; published: string; summary: string }[] };
  if (r.status !== 'ok' || !r.posts) {
    return { intent: 'news', text: 'Bản tin Hội đồng Học sinh hiện chưa có bài viết phù hợp. Bạn có thể xem toàn bộ bài viết tại trang Bản tin.', cards: [] };
  }
  const total = String(r.total_matching ?? r.posts.length);
  const items = r.posts.map((p) => `– ${p.title} (${p.category} · ${p.published}): ${p.summary}`);
  return {
    intent: 'news',
    text: [
      category
        ? `Chuyên mục ${NEWS_CATEGORY_LABELS[category]} của Bản tin Hội đồng Học sinh hiện có ${total} bài viết đã phát hành. Các bài viết mới nhất trong chuyên mục:`
        : `Bản tin Hội đồng Học sinh hiện có ${total} bài viết đã phát hành. Các bài viết mới nhất:`,
      items.join('\n'),
      'Bạn có thể đọc toàn văn từng bài viết từ thẻ bên dưới hoặc tại trang Bản tin.',
    ].join('\n\n'),
    cards: out.card ? [out.card] : [],
  };
}

function calendarReply(ctx: OfflineContext): OfflineReply {
  const mine = selectUpcomingMine(ctx.state, ctx.now);
  if (mine.length === 0) {
    return {
      intent: 'calendar',
      text: 'Bạn chưa đăng ký sự kiện nào sắp diễn ra. Mochi có thể đề xuất sự kiện phù hợp nếu bạn nhập “Gợi ý sự kiện”.',
      cards: [],
    };
  }
  const conflicts = selectConflictsInPlan(ctx.state).filter((c) => mine.some((e) => e.id === c.a) && mine.some((e) => e.id === c.b));
  const titleOf = (id: string) => mine.find((e) => e.id === id)?.title ?? id;
  const parts = [
    `Lịch của bạn hiện có ${mine.length} sự kiện sắp diễn ra:`,
    mine.slice(0, 6).map((e) => `– ${line(e)}: ${e.title}`).join('\n'),
  ];
  if (conflicts.length > 0) parts.push(`Lưu ý trùng lịch: ${conflicts.map((c) => `“${titleOf(c.a)}” và “${titleOf(c.b)}”`).join('; ')}.`);
  parts.push('Bạn có thể tải tệp .ics hoặc thêm từng sự kiện vào Google Calendar từ thẻ bên dưới.');
  const out = executeTool('export_calendar', { scope: 'all' }, ctx);
  return { intent: 'calendar', text: parts.join('\n\n'), cards: out.card ? [out.card] : [] };
}

function summaryReply(text: string, ctx: OfflineContext): OfflineReply {
  const scope = foldVietnamese(text).includes('thang') ? 'month' : 'week';
  const next = /(tuan|thang) (toi|sau)/.test(foldVietnamese(text));
  const anchor = next ? addDays(ctx.now, scope === 'week' ? 7 : 31) : ctx.now;
  const r = executeTool('summarize_events', { scope, date: toIsoDate(anchor) }, ctx).result as {
    period: string;
    event_count: number;
    events_by_category: Record<string, number>;
    my_events: { title: string; date: string }[];
    registration_deadlines: { title: string; deadline: string }[];
    calendar_periods: { label: string; from: string; to: string }[];
  };
  const parts: string[] = [];
  const cats = Object.entries(r.events_by_category).map(([name, n]) => `${name} (${n})`);
  parts.push(
    r.event_count === 0
      ? `${r.period}: Rodemap chưa có sự kiện nào trong khoảng thời gian này.`
      : `${r.period}: Rodemap có ${r.event_count} sự kiện, phân theo nhóm: ${cats.join(', ')}.`,
  );
  parts.push(
    r.my_events.length > 0
      ? `Bạn đã đăng ký: ${r.my_events.map((e) => `“${e.title}” (${e.date})`).join('; ')}.`
      : 'Bạn chưa đăng ký sự kiện nào trong khoảng thời gian này.',
  );
  if (r.registration_deadlines.length > 0) {
    parts.push(`Các hạn đăng ký cần lưu ý: ${r.registration_deadlines.slice(0, 4).map((d) => `“${d.title}” (${d.deadline})`).join('; ')}.`);
  }
  for (const p of r.calendar_periods) parts.push(`Lưu ý: ${p.label} diễn ra từ ${p.from} đến ${p.to}.`);
  parts.push('Bạn có thể nhập “Gợi ý sự kiện” để Mochi đề xuất các hoạt động phù hợp.');
  return { intent: 'summary', text: parts.join('\n\n'), cards: [] };
}

function eventQuestionReply(text: string, ctx: OfflineContext): OfflineReply {
  const events = selectPublicEvents(ctx.state);
  const event = findEventInText(text, events, ctx.now) ?? (ctx.focusEventId ? events.find((e) => e.id === ctx.focusEventId) : undefined);
  if (!event) {
    return {
      intent: 'event_question',
      text: 'Dữ liệu hiện có của Rodemap chưa có thông tin này. Vui lòng nêu rõ tên sự kiện, hoặc tra cứu tại trang Khám phá sự kiện.',
      cards: [],
    };
  }
  const d = executeTool('get_event', { event_id: event.id }, ctx).result as {
    club: string;
    date: string;
    time: string;
    location: string;
    format: string;
    eligible_grades: string;
    seats_left: number;
    registration_deadline: string;
    status: string;
    summary: string;
    conflicts_with_plan: { title: string }[];
  };
  const parts = [
    `“${event.title}” do ${d.club} tổ chức vào ${d.date}, ${d.time}, ${event.format === 'online' ? `theo hình thức trực tuyến (${d.location.replace(/^Trực tuyến\s*[–-]\s*/, '')})` : `tại ${d.location}`}. Sự kiện dành cho ${d.eligible_grades.toLocaleLowerCase('vi')}${
      isPast(event, ctx.now) ? '' : d.seats_left > 0 ? `; hiện còn ${String(d.seats_left)} chỗ; hạn đăng ký: ${d.registration_deadline}` : '; hiện đã hết chỗ'
    }. Trạng thái: ${d.status.toLocaleLowerCase('vi')}.`,
    d.summary,
  ];
  if (d.conflicts_with_plan.length > 0) parts.push(`Lưu ý: sự kiện trùng thời gian với ${d.conflicts_with_plan.map((c) => `“${c.title}”`).join(', ')} trong lịch của bạn.`);
  if (d.status === 'Còn chỗ') parts.push('Nếu bạn muốn tham gia, vui lòng nhập “Đăng ký sự kiện này” để Mochi chuẩn bị thẻ xác nhận.');
  return { intent: 'event_question', text: parts.join('\n\n'), cards: [{ kind: 'events', title: 'Sự kiện', eventIds: [event.id] }], focusEventId: event.id };
}

/** A clearly provisional reflection built only from the event's facts. */
export function offlineDraft(e: SchoolEvent): string {
  const topics = e.tags.slice(0, 2).map((t) => lowerFirst(tagLabel(t)));
  const topicText = topics.length > 0 ? `về ${topics.join(' và ')}` : 'thêm về lĩnh vực này';
  const scope = e.category === 'TS' ? 'hoạt động chung của toàn trường' : `hoạt động thuộc lĩnh vực ${CATEGORY_LABELS[e.category].toLocaleLowerCase('vi')}`;
  return `Tôi đã tham gia ${e.title} do ${clubName(e.clubId)} tổ chức vào ngày ${formatDate(eventStart(e))}. Thông qua ${scope}, tôi có điều kiện tìm hiểu ${topicText}. [Bổ sung: vai trò cụ thể của bạn, điều bạn học được và kế hoạch tiếp theo.]`;
}

function portfolioReply(text: string, ctx: OfflineContext): OfflineReply {
  const pending = selectPendingAttendance(ctx.state, ctx.now);
  const entries = ctx.state.portfolio;
  const parts: string[] = [];
  const cards: MochiCard[] = [];
  if (entries.length > 0) {
    const groups = groupByCategory(entries).map((g) => `${CATEGORY_LABELS[g.category]} (${formatHours(g.hours)} giờ)`);
    parts.push(`Hồ sơ năng lực của bạn hiện có ${entries.length} hoạt động, tổng cộng ${formatHours(totalHours(entries))} giờ: ${groups.join(', ')}.`);
  } else {
    parts.push('Hồ sơ năng lực của bạn chưa có hoạt động nào.');
  }
  if (pending.length > 0) {
    parts.push(`Bạn có ${pending.length} sự kiện đã diễn ra cần xác nhận tham gia: ${pending.map((e) => `“${e.title}”`).join(', ')}. Vui lòng xác nhận tại trang Tổng quan để bổ sung vào hồ sơ.`);
  }
  // A named attended event wins; otherwise the first entry still without the student's own reflection.
  const entryEvents = selectPublicEvents(ctx.state).filter((e) => entries.some((p) => p.eventId === e.id));
  const named = findEventInText(text, entryEvents, ctx.now);
  const needsReflection = named
    ? entries.find((p) => p.eventId === named.id)
    : entries.find((p) => p.reflection.trim() === '' || p.reflectionSource === 'mochi_draft');
  const event = needsReflection ? entryEvents.find((e) => e.id === needsReflection.eventId) : undefined;
  if (event) {
    const out = executeTool('draft_portfolio_entry', { event_id: event.id, draft_reflection: offlineDraft(event), role: needsReflection?.role ?? 'Thành viên tham gia' }, ctx);
    if (out.card) {
      cards.push(out.card);
      parts.push(`Mochi đã soạn bản nháp phần tự đánh giá cho “${event.title}”. Đây là bản nháp do Mochi đề xuất; bạn cần chỉnh sửa trước khi sử dụng.`);
    }
  }
  parts.push('Bạn có thể xem và in hồ sơ tại trang Hồ sơ năng lực.');
  return { intent: 'portfolio', text: parts.join('\n\n'), cards };
}

/** Answers one message without the network. */
export function respondOffline(text: string, ctx: OfflineContext): OfflineReply {
  const intent = classify(text);
  switch (intent) {
    case 'privacy':
      return {
        intent,
        text: 'Để bảo vệ thông tin cá nhân, bạn vui lòng không chia sẻ số điện thoại, địa chỉ hay mật khẩu với Mochi. Mochi chỉ sử dụng dữ liệu hoạt động ngoại khóa của Rodemap. ' + SUGGESTION_HINT,
        cards: [],
      };
    case 'unregister':
    case 'register':
      return registrationReply(intent, text, ctx);
    case 'news':
      return newsReply(text, ctx);
    case 'portfolio':
      return portfolioReply(text, ctx);
    case 'calendar':
      return calendarReply(ctx);
    case 'summary':
      return summaryReply(text, ctx);
    case 'recommend':
      return recommendReply(text, ctx);
    case 'event_question':
      return eventQuestionReply(text, ctx);
    case 'help':
      return {
        intent,
        text: `Mochi là trợ lý đồng hành của Rodemap. Mochi có thể đề xuất sự kiện phù hợp với hồ sơ của bạn, chuẩn bị thẻ xác nhận đăng ký, tổng hợp lịch cá nhân, tóm tắt sự kiện trong tuần và đề xuất bản nháp cho hồ sơ năng lực. ${SUGGESTION_HINT}`,
        cards: [],
      };
    case 'unknown': {
      const event = findEventInText(text, selectPublicEvents(ctx.state), ctx.now);
      if (event) return eventQuestionReply(text, ctx);
      return {
        intent,
        text: `Mochi hỗ trợ các nội dung liên quan đến hoạt động ngoại khóa của nhà trường. ${SUGGESTION_HINT}`,
        cards: [],
      };
    }
  }
}
