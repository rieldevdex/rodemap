// Dữ liệu minh họa phục vụ bản trình diễn. Thay thế bằng dữ liệu chính thức khi triển khai.
import type { CalendarPeriod } from '../domain/types';

/** "Kiểm tra định kỳ" zones and holidays drawn on the RouteMap (end dates inclusive). */
export const PERIODS: CalendarPeriod[] = [
  { id: 'kt-giua-hk1', kind: 'exam', label: 'Kiểm tra định kỳ giữa học kỳ I', start: '2026-11-02', end: '2026-11-07' },
  { id: 'kt-cuoi-hk1', kind: 'exam', label: 'Kiểm tra định kỳ cuối học kỳ I', start: '2026-12-21', end: '2027-01-02' },
  { id: 'nghi-tet', kind: 'holiday', label: 'Nghỉ Tết Nguyên đán', start: '2027-02-01', end: '2027-02-14' },
  { id: 'kt-giua-hk2', kind: 'exam', label: 'Kiểm tra định kỳ giữa học kỳ II', start: '2027-03-15', end: '2027-03-20' },
  { id: 'kt-cuoi-hk2', kind: 'exam', label: 'Kiểm tra định kỳ cuối học kỳ II', start: '2027-04-26', end: '2027-05-08' },
];
