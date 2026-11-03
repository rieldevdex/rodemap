// Dữ liệu chính thức của vsmcclubs. Cập nhật theo hướng dẫn tại README, mục 5.
import type { CalendarPeriod } from '../domain/types';

/**
 * "Kiểm tra định kỳ" zones and holidays drawn on the RouteMap (end dates inclusive). Empty until the
 * school publishes its calendar; add each period as { id, kind: 'exam' | 'holiday', label, start, end }.
 */
export const PERIODS: CalendarPeriod[] = [];
