/** Wording and state for Mochi's weekly question quota in the browser. Pure. */
import { formatLongDate, formatTime, toMillis } from '../domain/dates';
import type { MochiFailure } from './conversation';
import type { MochiQuota } from './protocol';

/** Mochi answers offline until `resetsAt` because a weekly limit is used up. */
export interface WeeklyStop {
  scope: 'weekly_browser' | 'weekly_total';
  limit: number;
  resetsAt: string;
}

/** The stop a refused request describes, or null for any other failure. */
export function weeklyStopFrom(failure: MochiFailure | undefined): WeeklyStop | null {
  if (failure?.error !== 'rate_limited') return null;
  const { scope, limit, resetsAt } = failure;
  if ((scope !== 'weekly_browser' && scope !== 'weekly_total') || typeof limit !== 'number' || typeof resetsAt !== 'string') return null;
  return { scope, limit, resetsAt };
}

/** After the last question of the week, the next one is known to be refused. */
export function weeklyStopFromQuota(quota: MochiQuota | undefined): WeeklyStop | null {
  return quota && quota.remaining <= 0 ? { scope: 'weekly_browser', limit: quota.limit, resetsAt: quota.resetsAt } : null;
}

export function isStopActive(stop: WeeklyStop | null, realNow: number): boolean {
  return stop !== null && toMillis(stop.resetsAt) > realNow;
}

/** "00:00 Thứ Hai, 19/10/2026". */
export function resetLabel(resetsAt: string): string {
  const ms = toMillis(resetsAt);
  return `${formatTime(ms)} ${formatLongDate(ms)}`;
}

export function weeklyStopNotice(stop: WeeklyStop): string {
  const when = resetLabel(stop.resetsAt);
  return stop.scope === 'weekly_browser'
    ? `Bạn đã sử dụng hết ${String(stop.limit)} câu hỏi dành cho Mochi trong tuần này. Mochi tiếp tục hỗ trợ ở chế độ ngoại tuyến; lượt hỏi được làm mới vào ${when}.`
    : `Mochi đã đạt giới hạn câu hỏi chung của Rodemap trong tuần này. Mochi tiếp tục hỗ trợ ở chế độ ngoại tuyến; lượt hỏi được làm mới vào ${when}.`;
}

/** "Còn 17/20 câu hỏi trong tuần này". */
export function quotaLabel(quota: MochiQuota): string {
  return quota.remaining > 0
    ? `Còn ${String(quota.remaining)}/${String(quota.limit)} câu hỏi trong tuần này`
    : `Đã sử dụng hết ${String(quota.limit)} câu hỏi trong tuần này`;
}
