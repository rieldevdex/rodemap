/**
 * "Bản tin tuần": Mochi's weekly digest, built only from the data (no invented facts).
 * Pure; formal Vietnamese.
 */
import { CATEGORY_LABELS } from './category-labels';
import { addDays, formatDate, formatDayLabel, formatShortDate, formatTime, startOfIsoWeek, toMillis } from './dates';
import { eventStart, isPast, isRegistered, seatsLeft, sortByStart } from './events';
import { CATEGORY_CODES, type CalendarPeriod, type Millis, type Registration, type SchoolEvent } from './types';

export interface DigestContext {
  now: Millis;
  regs: Registration[];
  periods: CalendarPeriod[];
}

export interface Digest {
  /** "Tuần 12/10 – 18/10/2026" */
  weekLabel: string;
  paragraphs: string[];
  highlights: { eventId: string; reason: 'deadline' | 'few_seats' }[];
}

/** Events with at most this many seats left are worth a mention. */
export const DIGEST_FEW_SEATS = 5;
/** How far ahead (days) the digest looks for few seats and exam periods. */
export const DIGEST_LOOKAHEAD_DAYS = 14;

const quote = (e: SchoolEvent) => `“${e.title}”`;
const when = (e: SchoolEvent) => `${formatDayLabel(eventStart(e))}, ${formatTime(eventStart(e))}`;

export function weeklyDigest(events: readonly SchoolEvent[], ctx: DigestContext): Digest {
  const weekStart = startOfIsoWeek(ctx.now);
  const weekEnd = addDays(weekStart, 7);
  const lookahead = addDays(ctx.now, DIGEST_LOOKAHEAD_DAYS);
  const approved = sortByStart(events.filter((e) => e.status === 'approved'));
  const inWeek = approved.filter((e) => eventStart(e) >= weekStart && eventStart(e) < weekEnd);
  const paragraphs: string[] = [];
  const highlights: Digest['highlights'] = [];

  if (inWeek.length === 0) {
    paragraphs.push('Tuần này Rodemap chưa có sự kiện nào được công bố.');
  } else {
    const counts = CATEGORY_CODES.map((code) => ({ code, n: inWeek.filter((e) => e.category === code).length })).filter((c) => c.n > 0);
    const list = counts.map((c) => `${CATEGORY_LABELS[c.code]} (${c.n})`).join(', ');
    paragraphs.push(`Tuần này có ${inWeek.length} sự kiện thuộc ${counts.length} lĩnh vực: ${list}.`);
  }

  const mine = inWeek.filter((e) => isRegistered(e.id, ctx.regs));
  paragraphs.push(
    mine.length === 0
      ? 'Bạn chưa đăng ký sự kiện nào trong tuần.'
      : `Bạn đã đăng ký ${mine.length} sự kiện trong tuần: ${mine.map((e) => `${quote(e)} (${when(e)})`).join('; ')}.`,
  );

  const deadlines = approved
    .filter((e) => !isRegistered(e.id, ctx.regs) && !isPast(e, ctx.now))
    .map((e) => ({ e, d: toMillis(e.registrationDeadline) }))
    .filter(({ d }) => d >= ctx.now && d < weekEnd)
    .sort((a, b) => a.d - b.d);
  const first = deadlines[0];
  if (first) {
    paragraphs.push(
      `Có ${deadlines.length} hạn đăng ký kết thúc trong tuần, sớm nhất là ${quote(first.e)} vào ${formatTime(first.d)} ngày ${formatDate(first.d)}.`,
    );
    for (const { e } of deadlines.slice(0, 3)) highlights.push({ eventId: e.id, reason: 'deadline' });
  }

  const scarce = approved.filter((e) => {
    const left = seatsLeft(e, ctx.regs);
    return !isRegistered(e.id, ctx.regs) && !isPast(e, ctx.now) && eventStart(e) < lookahead && left > 0 && left <= DIGEST_FEW_SEATS;
  });
  if (scarce.length > 0) {
    paragraphs.push(`Lưu ý: ${scarce.slice(0, 2).map((e) => `${quote(e)} chỉ còn ${seatsLeft(e, ctx.regs)} chỗ`).join('; ')}.`);
    for (const e of scarce.slice(0, 2)) highlights.push({ eventId: e.id, reason: 'few_seats' });
  }

  const exam = ctx.periods.find((p) => p.kind === 'exam' && toMillis(p.start) >= startOfIsoWeek(ctx.now) && toMillis(p.start) < lookahead);
  if (exam) {
    paragraphs.push(
      `${exam.label} bắt đầu từ ngày ${formatDate(toMillis(exam.start))}; bạn nên cân nhắc điều chỉnh quỹ giờ tham gia hoạt động trong giai đoạn này.`,
    );
  }

  return {
    weekLabel: `Tuần ${formatShortDate(weekStart)} – ${formatDate(addDays(weekStart, 6))}`,
    paragraphs,
    highlights,
  };
}
