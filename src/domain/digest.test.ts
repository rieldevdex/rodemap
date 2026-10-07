import { describe, expect, it } from 'vitest';
import { toMillis } from './dates';
import { DIGEST_FEW_SEATS, weeklyDigest } from './digest';
import { makeEvent, reg } from './test-fixtures';
import type { CalendarPeriod } from './types';

const now = toMillis('2026-10-14T09:00:00+07:00'); // Wednesday
const exam: CalendarPeriod = { id: 'p1', kind: 'exam', label: 'Kiểm tra định kỳ giữa học kỳ I', start: '2026-10-26', end: '2026-10-31' };
const holiday: CalendarPeriod = { id: 'p2', kind: 'holiday', label: 'Nghỉ lễ', start: '2026-10-20', end: '2026-10-21' };

describe('weeklyDigest', () => {
  it('reports an empty week honestly', () => {
    const d = weeklyDigest([], { now, regs: [], periods: [] });
    expect(d.weekLabel).toBe('Tuần 12/10 – 18/10/2026');
    expect(d.paragraphs).toEqual(['Tuần này Rodemap chưa có sự kiện nào được công bố.', 'Bạn chưa đăng ký sự kiện nào trong tuần.']);
    expect(d.highlights).toEqual([]);
  });

  it('counts events by category, lists mine, deadlines, scarce seats and an upcoming exam', () => {
    const mine = makeEvent({ id: 'm', category: 'CN', start: '2026-10-15T16:45:00+07:00', end: '2026-10-15T18:15:00+07:00', title: 'Hội thảo A' });
    const open = makeEvent({ id: 'o', category: 'HT', start: '2026-10-17T08:00:00+07:00', end: '2026-10-17T11:00:00+07:00', registrationDeadline: '2026-10-16T23:59:00+07:00', title: 'Buổi B' });
    const later = makeEvent({ id: 'l', category: 'HT', start: '2026-10-16T16:45:00+07:00', end: '2026-10-16T18:00:00+07:00', registrationDeadline: '2026-10-15T23:59:00+07:00', title: 'Buổi C' });
    const scarce = makeEvent({ id: 's', category: 'TT', start: '2026-10-22T16:45:00+07:00', end: '2026-10-22T18:00:00+07:00', registrationDeadline: '2026-10-20T23:59:00+07:00', capacity: 10, seatsTaken: 10 - DIGEST_FEW_SEATS + 2 });
    const full = makeEvent({ id: 'f', start: '2026-10-22T16:45:00+07:00', capacity: 5, seatsTaken: 5 });
    const pending = makeEvent({ id: 'p', status: 'pending', start: '2026-10-15T16:45:00+07:00' });
    const pastDeadline = makeEvent({ id: 'x', start: '2026-10-18T08:00:00+07:00', end: '2026-10-18T09:00:00+07:00', registrationDeadline: '2026-10-13T23:59:00+07:00' });
    const past = makeEvent({ id: 'q', start: '2026-10-05T16:45:00+07:00', end: '2026-10-05T18:00:00+07:00', registrationDeadline: '2026-10-20T23:59:00+07:00', capacity: 10, seatsTaken: 9 });
    const farScarce = makeEvent({ id: 'z', start: '2026-11-30T16:45:00+07:00', end: '2026-11-30T18:00:00+07:00', registrationDeadline: '2026-11-28T23:59:00+07:00', capacity: 10, seatsTaken: 8 });
    const d = weeklyDigest([mine, open, later, scarce, full, pending, pastDeadline, past, farScarce], { now, regs: [reg('m')], periods: [holiday, exam] });
    expect(d.paragraphs[0]).toBe('Tuần này có 4 sự kiện thuộc 2 lĩnh vực: Học thuật (3), Công nghệ – Sáng tạo (1).');
    expect(d.paragraphs[1]).toBe('Bạn đã đăng ký 1 sự kiện trong tuần: “Hội thảo A” (Th 5 · 15/10, 16:45).');
    expect(d.paragraphs[2]).toBe('Có 2 hạn đăng ký kết thúc trong tuần, sớm nhất là “Buổi C” vào 23:59 ngày 15/10/2026.');
    expect(d.paragraphs[3]).toMatch(/chỉ còn 3 chỗ/);
    expect(d.paragraphs[4]).toBe('Kiểm tra định kỳ giữa học kỳ I bắt đầu từ ngày 26/10/2026; bạn nên cân nhắc điều chỉnh quỹ giờ tham gia hoạt động trong giai đoạn này.');
    expect(d.highlights).toEqual([
      { eventId: 'l', reason: 'deadline' },
      { eventId: 'o', reason: 'deadline' },
      { eventId: 's', reason: 'few_seats' },
    ]);
  });

  it('ignores exams that are too far away and holidays', () => {
    const far: CalendarPeriod = { ...exam, start: '2026-12-21', end: '2026-12-31' };
    const d = weeklyDigest([], { now, regs: [], periods: [far, holiday] });
    expect(d.paragraphs).toHaveLength(2);
  });
});
