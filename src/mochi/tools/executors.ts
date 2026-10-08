/**
 * Mochi's tools, executed in the browser against the app state. Pure: they read
 * state and return a result for the model plus an optional card for the student.
 * Nothing here changes data — propose_* tools only describe what the student may confirm.
 */
import { CATEGORY_LABELS } from '../../domain/category-labels';
import { allConflicts } from '../../domain/conflicts';
import { hoursByWeek, DEFAULT_WEEKLY_HOUR_BUDGET } from '../../domain/budget';
import {
  addDays,
  formatDate,
  formatLongDate,
  formatMonthYear,
  formatShortDate,
  formatTime,
  formatTimeRange,
  startOfIsoWeek,
  startOfNextVnMonth,
  startOfVnMonth,
  toMillis,
} from '../../domain/dates';
import {
  deadlineDaysLeft,
  eventEnd,
  eventStart,
  findRegistration,
  isPast,
  registrationState,
  seatsLeft,
  type RegistrationState,
} from '../../domain/events';
import { filterEvents } from '../../domain/filters';
import { proposePlan } from '../../domain/planner';
import { NEWS_CATEGORY_LABELS } from '../../domain/news';
import { foldVietnamese } from '../../domain/text';
import { NEWS_CATEGORIES, type Club, type Millis, type SchoolEvent } from '../../domain/types';
import { CLUBS } from '../../data/clubs';
import { GOALS } from '../../data/goals';
import { PERIODS } from '../../data/calendar';
import { tagLabel } from '../../data/tags';
import { describeReasons, describeWarnings } from '../../content/reasons';
import type { AppState } from '../../state/schema';
import {
  selectMyEvents,
  selectNews,
  selectPublicEvents,
  selectRecommendations,
  selectUpcomingMine,
} from '../../state/selectors';
import { registrationInfo } from '../../state/useRegistration';
import type { MochiCard } from '../cards';
import type { ToolName } from './schemas';
import {
  ToolInputError,
  asRecord,
  optBool,
  optCategories,
  optDate,
  optEnum,
  optInt,
  optNumber,
  optString,
  optStringArray,
  reqEnum,
  reqString,
} from './input';

export interface ToolContext {
  state: AppState;
  now: Millis;
}

export interface ToolOutcome {
  /** JSON-serialisable result returned to the model. */
  result: unknown;
  isError?: boolean;
  card?: MochiCard;
}

/* ── Shared formatting ──────────────────────────────────────────────── */

const STATUS_LABELS: Record<RegistrationState, string> = {
  registered: 'Đã đăng ký',
  attended: 'Đã tham gia',
  absent: 'Không tham gia',
  open: 'Còn chỗ',
  full: 'Hết chỗ',
  closed: 'Hết hạn đăng ký',
  past: 'Đã diễn ra',
};

function clubOf(id: string): Club | undefined {
  return CLUBS.find((c) => c.id === id);
}

function budgetOf(state: AppState): number {
  return state.profile?.weeklyHourBudget ?? DEFAULT_WEEKLY_HOUR_BUDGET;
}

/** Compact, already formatted facts about one event (dates in Vietnamese conventions). */
export function eventBrief(e: SchoolEvent, ctx: ToolContext) {
  const start = eventStart(e);
  const deadline = toMillis(e.registrationDeadline);
  return {
    id: e.id,
    title: e.title,
    category: e.category,
    category_name: CATEGORY_LABELS[e.category],
    club: clubOf(e.clubId)?.name ?? e.clubId,
    date: formatLongDate(start),
    time: formatTimeRange(start, eventEnd(e)),
    location: e.location,
    format: e.format === 'online' ? 'Trực tuyến' : 'Trực tiếp',
    seats_left: seatsLeft(e, ctx.state.registrations),
    registration_deadline: `${formatTime(deadline)} ngày ${formatDate(deadline)}`,
    status: STATUS_LABELS[registrationState(e, ctx.state.registrations, ctx.now)],
  };
}

export function eventDetail(e: SchoolEvent, ctx: ToolContext) {
  const info = registrationInfo(e, {
    club: clubOf(e.clubId),
    plan: selectUpcomingMine(ctx.state, ctx.now),
    regs: ctx.state.registrations,
    grade: ctx.state.profile?.grade ?? null,
    budget: budgetOf(ctx.state),
    now: ctx.now,
  });
  return {
    ...eventBrief(e, ctx),
    summary: e.summary,
    description: e.description,
    eligible_grades: `Khối ${e.eligibleGrades.join(', ')}`,
    eligible_for_student: info.eligible,
    capacity: e.capacity,
    tags: e.tags.map(tagLabel),
    deadline_days_left: deadlineDaysLeft(e, ctx.now),
    conflicts_with_plan: info.conflicts.map((c) => eventBrief(c, ctx)),
    exceeds_weekly_budget: info.overBudget,
  };
}

/** Finds a club by id, slug, short name or full name (accents optional). */
export function resolveClub(query: string): Club | undefined {
  const q = foldVietnamese(query);
  return (
    CLUBS.find((c) => c.id === query || c.slug === query) ??
    CLUBS.find((c) => foldVietnamese(c.shortName) === q || foldVietnamese(c.name) === q) ??
    CLUBS.find((c) => foldVietnamese(c.name).includes(q) || foldVietnamese(c.shortName).includes(q))
  );
}

function publicEvent(ctx: ToolContext, id: string): SchoolEvent | undefined {
  return selectPublicEvents(ctx.state).find((e) => e.id === id);
}

function notFound(id: string): ToolOutcome {
  return { result: { error: `Không tìm thấy sự kiện có mã ${id} trong dữ liệu Rodemap.` }, isError: true };
}

function inRange(e: SchoolEvent, from?: string, to?: string): boolean {
  const start = eventStart(e);
  if (from !== undefined && start < toMillis(from)) return false;
  if (to !== undefined && start >= addDays(toMillis(to), 1)) return false;
  return true;
}

/* ── Tools ──────────────────────────────────────────────────────────── */

function searchEvents(input: Record<string, unknown>, ctx: ToolContext): ToolOutcome {
  const clubQuery = optString(input, 'club_id', 120);
  const club = clubQuery === undefined ? undefined : resolveClub(clubQuery);
  if (clubQuery !== undefined && !club) {
    return { result: { error: `Không tìm thấy câu lạc bộ “${clubQuery}”.` }, isError: true };
  }
  const query = optString(input, 'query', 100);
  const categories = optCategories(input, 'categories');
  const format = optEnum(input, 'format', ['in_person', 'online'] as const);
  const hasSeats = optBool(input, 'has_seats');
  const eligibleOnly = optBool(input, 'eligible_only');
  const from = optDate(input, 'from_date');
  const to = optDate(input, 'to_date');
  const limit = optInt(input, 'limit', 1, 10) ?? 6;
  const grade = ctx.state.profile?.grade;
  const matches = filterEvents(
    selectPublicEvents(ctx.state),
    {
      ...(query === undefined ? {} : { query }),
      ...(categories === undefined ? {} : { categories }),
      ...(club === undefined ? {} : { clubIds: [club.id] }),
      ...(format === undefined ? {} : { format }),
      ...(hasSeats === true ? { hasSeats: true } : {}),
      ...(eligibleOnly === true && grade !== undefined ? { grades: [grade] } : {}),
    },
    { now: ctx.now, regs: ctx.state.registrations, clubs: CLUBS },
  ).filter((e) => inRange(e, from, to));
  const shown = matches.slice(0, limit);
  return {
    result: { total: matches.length, shown: shown.length, events: shown.map((e) => eventBrief(e, ctx)) },
    ...(shown.length > 0 ? { card: { kind: 'events', title: 'Kết quả tìm kiếm', eventIds: shown.map((e) => e.id) } } : {}),
  };
}

function getEvent(input: Record<string, unknown>, ctx: ToolContext): ToolOutcome {
  const id = reqString(input, 'event_id', 40);
  const e = publicEvent(ctx, id);
  return e ? { result: eventDetail(e, ctx) } : notFound(id);
}

function getClub(input: Record<string, unknown>, ctx: ToolContext): ToolOutcome {
  const query = reqString(input, 'club_id', 120);
  const club = resolveClub(query);
  if (!club) return { result: { error: `Không tìm thấy câu lạc bộ “${query}”.` }, isError: true };
  const events = selectPublicEvents(ctx.state).filter((e) => e.clubId === club.id);
  const upcoming = events.filter((e) => !isPast(e, ctx.now));
  return {
    result: {
      id: club.id,
      name: club.name,
      short_name: club.shortName,
      description: club.description,
      categories: club.categories.map((c) => `${c} – ${CATEGORY_LABELS[c]}`),
      contact: club.contact,
      upcoming_events: upcoming.slice(0, 6).map((e) => eventBrief(e, ctx)),
      past_event_count: events.length - upcoming.length,
    },
    ...(upcoming.length > 0
      ? { card: { kind: 'events', title: `Sự kiện sắp diễn ra của ${club.shortName}`, eventIds: upcoming.slice(0, 4).map((e) => e.id) } }
      : {}),
  };
}

function recommend(input: Record<string, unknown>, ctx: ToolContext): ToolOutcome {
  const limit = optInt(input, 'limit', 1, 5) ?? 3;
  const from = optDate(input, 'from_date');
  const to = optDate(input, 'to_date');
  const category = optEnum(input, 'category', ['HT', 'NT', 'TT', 'TN', 'KN', 'CN', 'TS'] as const);
  const recs = selectRecommendations(ctx.state, ctx.now, {
    limit,
    ...(from === undefined ? {} : { from: toMillis(from) }),
    ...(to === undefined ? {} : { to: addDays(toMillis(to), 1) }),
    ...(category === undefined ? {} : { category }),
  });
  if (recs.length === 0) {
    return { result: { recommendations: [], note: 'Không có sự kiện phù hợp còn mở đăng ký trong phạm vi đã chọn.' } };
  }
  return {
    result: {
      profile_set: ctx.state.profile !== null,
      recommendations: recs.map((r) => ({ ...eventBrief(r.event, ctx), reasons: describeReasons(r), warnings: describeWarnings(r) })),
    },
    card: {
      kind: 'events',
      title: 'Mochi đề xuất',
      eventIds: recs.map((r) => r.event.id),
      // The card shows the three strongest reasons; the model receives all of them.
      reasons: Object.fromEntries(recs.map((r) => [r.event.id, describeReasons(r).slice(0, 3)])),
      warnings: Object.fromEntries(recs.map((r) => [r.event.id, describeWarnings(r)])),
    },
  };
}

function checkConflicts(input: Record<string, unknown>, ctx: ToolContext): ToolOutcome {
  const ids = optStringArray(input, 'event_ids', 10) ?? [];
  if (ids.length === 0) throw new ToolInputError('event_ids must contain at least one id.');
  const events = ids.map((id) => publicEvent(ctx, id));
  const missing = ids.filter((_, i) => events[i] === undefined);
  const found = events.filter((e): e is SchoolEvent => e !== undefined);
  const plan = selectUpcomingMine(ctx.state, ctx.now);
  const pool = [...plan.filter((p) => !ids.includes(p.id)), ...found];
  const conflicts = allConflicts(pool).filter((c) => ids.includes(c.a) || ids.includes(c.b));
  const budget = budgetOf(ctx.state);
  const weeks = [...hoursByWeek(pool)].filter(([, h]) => h > budget).map(([week, hours]) => ({ week, hours, budget }));
  const titleOf = (id: string) => pool.find((e) => e.id === id)?.title ?? id;
  return {
    result: {
      ...(missing.length ? { unknown_event_ids: missing } : {}),
      conflicts: conflicts.map((c) => ({ a: titleOf(c.a), b: titleOf(c.b), overlap_minutes: c.overlapMinutes })),
      weeks_over_budget: weeks,
      weekly_hour_budget: budget,
    },
  };
}

const NOT_POSSIBLE: Partial<Record<RegistrationState, string>> = {
  full: 'Sự kiện đã hết chỗ.',
  closed: 'Sự kiện đã hết hạn đăng ký.',
  past: 'Sự kiện đã diễn ra.',
  attended: 'Bạn đã tham gia sự kiện này.',
  absent: 'Sự kiện đã diễn ra.',
};

function proposeRegistration(input: Record<string, unknown>, ctx: ToolContext): ToolOutcome {
  const id = reqString(input, 'event_id', 40);
  const action = reqEnum(input, 'action', ['register', 'unregister'] as const);
  const e = publicEvent(ctx, id);
  if (!e) return notFound(id);
  const info = registrationInfo(e, {
    club: clubOf(e.clubId),
    plan: selectUpcomingMine(ctx.state, ctx.now),
    regs: ctx.state.registrations,
    grade: ctx.state.profile?.grade ?? null,
    budget: budgetOf(ctx.state),
    now: ctx.now,
  });
  const brief = eventBrief(e, ctx);
  if (action === 'register') {
    if (info.state === 'registered') return { result: { status: 'already_registered', event: brief } };
    if (!info.eligible) return { result: { status: 'not_possible', reason: `Sự kiện chỉ dành cho khối ${e.eligibleGrades.join(', ')}.`, event: brief } };
    if (!info.canRegister) return { result: { status: 'not_possible', reason: NOT_POSSIBLE[info.state] ?? 'Sự kiện hiện không mở đăng ký.', event: brief } };
    return {
      result: {
        status: 'awaiting_confirmation',
        event: brief,
        conflicts: info.conflicts.map((c) => eventBrief(c, ctx)),
        exceeds_weekly_budget: info.overBudget,
        note: 'Thẻ xác nhận đã hiển thị. Việc đăng ký chỉ được thực hiện khi học sinh nhấn Xác nhận.',
      },
      card: { kind: 'registration', action: 'register', eventId: e.id },
    };
  }
  if (!info.canUnregister) {
    const reason = info.state === 'open' || info.state === 'full' || info.state === 'closed' ? 'Học sinh chưa đăng ký sự kiện này.' : (NOT_POSSIBLE[info.state] ?? 'Không thể hủy đăng ký.');
    return { result: { status: 'not_possible', reason, event: brief } };
  }
  return {
    result: { status: 'awaiting_confirmation', event: brief, note: 'Thẻ xác nhận hủy đăng ký đã hiển thị. Thao tác chỉ được thực hiện khi học sinh nhấn Xác nhận.' },
    card: { kind: 'registration', action: 'unregister', eventId: e.id },
  };
}

function proposeCalendarPlan(input: Record<string, unknown>, ctx: ToolContext): ToolOutcome {
  const ids = optStringArray(input, 'event_ids', 10);
  const from = optDate(input, 'from_date');
  const to = optDate(input, 'to_date');
  const budget = optNumber(input, 'max_hours_per_week', 1, 40) ?? budgetOf(ctx.state);
  const publicEvents = selectPublicEvents(ctx.state);
  let candidates: SchoolEvent[];
  if (ids && ids.length > 0) {
    candidates = ids.map((id) => publicEvents.find((e) => e.id === id)).filter((e): e is SchoolEvent => e !== undefined);
  } else {
    candidates = selectRecommendations(ctx.state, ctx.now, {
      limit: 8,
      ...(from === undefined ? {} : { from: toMillis(from) }),
      ...(to === undefined ? {} : { to: addDays(toMillis(to), 1) }),
    }).map((r) => r.event);
  }
  if (candidates.length === 0) {
    return { result: { status: 'no_candidates', note: 'Không có sự kiện phù hợp để lập kế hoạch trong phạm vi đã chọn.' } };
  }
  const proposal = proposePlan(candidates, {
    profile: ctx.state.profile,
    plan: selectUpcomingMine(ctx.state, ctx.now),
    regs: ctx.state.registrations,
    now: ctx.now,
    goals: GOALS,
    allEvents: publicEvents,
    budget,
  });
  const titleOf = (id: string) => publicEvents.find((e) => e.id === id)?.title ?? id;
  return {
    result: {
      status: 'awaiting_confirmation',
      accepted: proposal.accepted.map((e) => eventBrief(e, ctx)),
      dropped: proposal.dropped.map((d) => ({ event: d.event.title, reason: d.reason, ...(d.conflictWith ? { conflict_with: titleOf(d.conflictWith) } : {}) })),
      alternatives: proposal.alternatives.map((a) => ({ for: titleOf(a.forEventId), alternative: eventBrief(a.event, ctx) })),
      hours_by_week: proposal.hoursByWeek,
      weekly_hour_budget: budget,
      note: 'Thẻ kế hoạch đã hiển thị. Không sự kiện nào được đăng ký cho đến khi học sinh nhấn Xác nhận.',
    },
    card: {
      kind: 'plan',
      accepted: proposal.accepted.map((e) => e.id),
      dropped: proposal.dropped.map((d) => ({ eventId: d.event.id, reason: d.reason, ...(d.conflictWith ? { conflictWith: d.conflictWith } : {}) })),
      alternatives: proposal.alternatives.map((a) => ({ forEventId: a.forEventId, eventId: a.event.id })),
      hoursByWeek: proposal.hoursByWeek,
      budget,
    },
  };
}

function periodsBetween(from: Millis, to: Millis) {
  return PERIODS.filter((p) => toMillis(p.start) < to && addDays(toMillis(p.end), 1) > from).map((p) => ({
    label: p.label,
    from: formatDate(toMillis(p.start)),
    to: formatDate(toMillis(p.end)),
  }));
}

function summarize(input: Record<string, unknown>, ctx: ToolContext): ToolOutcome {
  const scope = reqEnum(input, 'scope', ['event', 'club', 'week', 'month'] as const);
  if (scope === 'event') return getEvent(input, ctx);
  if (scope === 'club') {
    const club = optString(input, 'club_id', 120);
    if (club === undefined) throw new ToolInputError('club_id is required for scope club.');
    return getClub({ club_id: club }, ctx);
  }
  const date = optDate(input, 'date');
  const anchor = date === undefined ? ctx.now : toMillis(date) + 9 * 60 * 60 * 1000;
  const from = scope === 'week' ? startOfIsoWeek(anchor) : startOfVnMonth(anchor);
  const to = scope === 'week' ? addDays(from, 7) : startOfNextVnMonth(anchor);
  const events = selectPublicEvents(ctx.state).filter((e) => eventStart(e) >= from && eventStart(e) < to);
  const mine = selectMyEvents(ctx.state).filter((e) => eventStart(e) >= from && eventStart(e) < to);
  const deadlines = selectPublicEvents(ctx.state).filter((e) => {
    const d = toMillis(e.registrationDeadline);
    return d >= Math.max(from, ctx.now) && d < to && findRegistration(e.id, ctx.state.registrations) === undefined;
  });
  const byCategory: Record<string, number> = {};
  for (const e of events) byCategory[CATEGORY_LABELS[e.category]] = (byCategory[CATEGORY_LABELS[e.category]] ?? 0) + 1;
  return {
    result: {
      scope,
      period: scope === 'week' ? `Tuần ${formatShortDate(from)} – ${formatDate(addDays(to, -1))}` : formatMonthYear(from),
      event_count: events.length,
      events_by_category: byCategory,
      events: events.slice(0, 12).map((e) => eventBrief(e, ctx)),
      my_events: mine.map((e) => eventBrief(e, ctx)),
      registration_deadlines: deadlines.slice(0, 8).map((e) => ({ title: e.title, deadline: eventBrief(e, ctx).registration_deadline })),
      calendar_periods: periodsBetween(from, to),
    },
  };
}

function draftPortfolioEntry(input: Record<string, unknown>, ctx: ToolContext): ToolOutcome {
  const id = reqString(input, 'event_id', 40);
  const reflection = reqString(input, 'draft_reflection', 1500);
  const role = optString(input, 'role', 80) ?? 'Thành viên tham gia';
  const e = publicEvent(ctx, id);
  if (!e) return notFound(id);
  const reg = findRegistration(e.id, ctx.state.registrations);
  const eligible = reg?.status === 'attended' || (reg?.status === 'registered' && isPast(e, ctx.now));
  if (!eligible) {
    return { result: { status: 'not_possible', reason: 'Chỉ có thể đề xuất bản nháp cho sự kiện học sinh đã tham gia.' } };
  }
  return {
    result: { status: 'draft_shown', note: 'Bản nháp được hiển thị với nhãn "Bản nháp do Mochi đề xuất"; học sinh cần chỉnh sửa trước khi sử dụng.' },
    card: { kind: 'draft', eventId: e.id, reflection, role },
  };
}

function exportCalendar(input: Record<string, unknown>, ctx: ToolContext): ToolOutcome {
  const scope = reqEnum(input, 'scope', ['all', 'selected'] as const);
  const events =
    scope === 'all'
      ? selectMyEvents(ctx.state)
      : (optStringArray(input, 'event_ids', 20) ?? []).map((id) => publicEvent(ctx, id)).filter((e): e is SchoolEvent => e !== undefined);
  if (events.length === 0) {
    return { result: { status: 'empty', note: scope === 'all' ? 'Học sinh chưa đăng ký sự kiện nào.' : 'Không tìm thấy sự kiện đã chọn.' } };
  }
  return {
    result: { status: 'export_ready', count: events.length, events: events.map((e) => e.title), note: 'Tệp .ics chỉ được tải xuống khi học sinh nhấn nút trên thẻ.' },
    card: { kind: 'export', eventIds: events.map((e) => e.id) },
  };
}

function listNews(input: Record<string, unknown>, ctx: ToolContext): ToolOutcome {
  const limit = optInt(input, 'limit', 1, 5) ?? 3;
  const category = optEnum(input, 'category', NEWS_CATEGORIES);
  const all = selectNews(ctx.state, ctx.now);
  const posts = (category ? all.filter((p) => p.category === category) : all).slice(0, limit);
  if (posts.length === 0) {
    return { result: { status: 'empty', note: 'Bản tin Hội đồng Học sinh chưa có bài viết phù hợp.' } };
  }
  const titleOf = (id: string) => publicEvent(ctx, id)?.title;
  return {
    result: {
      status: 'ok',
      total_published: all.length,
      posts: posts.map((p) => ({
        id: p.id,
        title: p.title,
        category: NEWS_CATEGORY_LABELS[p.category],
        author: `${p.author}, Hội đồng Học sinh`,
        published: formatLongDate(toMillis(p.publishedAt)),
        summary: p.summary,
        related_events: p.eventIds.flatMap((id) => titleOf(id) ?? []),
        url: `/ban-tin/${p.slug}`,
      })),
    },
    card: {
      kind: 'news',
      posts: posts.map((p) => ({
        id: p.id,
        title: p.title,
        category: NEWS_CATEGORY_LABELS[p.category],
        date: formatDate(toMillis(p.publishedAt)),
        href: `/ban-tin/${p.slug}`,
      })),
    },
  };
}

const EXECUTORS: Record<ToolName, (input: Record<string, unknown>, ctx: ToolContext) => ToolOutcome> = {
  search_events: searchEvents,
  get_event: getEvent,
  get_club: getClub,
  recommend_events: recommend,
  check_conflicts: checkConflicts,
  propose_registration: proposeRegistration,
  propose_calendar_plan: proposeCalendarPlan,
  summarize_events: summarize,
  draft_portfolio_entry: draftPortfolioEntry,
  export_calendar: exportCalendar,
  list_news: listNews,
};

/** Runs one tool call. Unknown tools and invalid inputs become error results the model can correct. */
export function executeTool(name: string, input: unknown, ctx: ToolContext): ToolOutcome {
  const run = (EXECUTORS as Record<string, ((i: Record<string, unknown>, c: ToolContext) => ToolOutcome) | undefined>)[name];
  if (!run) return { result: { error: `Công cụ ${name} không tồn tại.` }, isError: true };
  try {
    return run(asRecord(input), ctx);
  } catch (e) {
    if (e instanceof ToolInputError) return { result: { error: `Tham số không hợp lệ: ${e.message}` }, isError: true };
    throw e;
  }
}
