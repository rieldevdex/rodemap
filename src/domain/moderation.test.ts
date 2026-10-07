import { describe, expect, it } from 'vitest';
import { toMillis } from './dates';
import { SLUG_FALLBACK, SLUG_MAX_LENGTH, applyReview, canTransition, reviewNeedsReason, slugify, validateDraft } from './moderation';
import type { EventDraft, Submission } from './types';

const sub: Submission = {
  id: 'sub-1',
  eventId: 'ev-x',
  clubId: 'tranh-bien',
  submittedAt: '2026-10-05T10:00:00+07:00',
  history: [{ at: '2026-10-05T10:00:00+07:00', actor: 'club', action: 'submit' }],
};
const at = '2026-10-06T09:00:00+07:00';

describe('canTransition / reviewNeedsReason', () => {
  it('allows only the defined transitions', () => {
    expect(canTransition('draft', 'submit')).toBe(true);
    expect(canTransition('pending', 'approve')).toBe(true);
    expect(canTransition('approved', 'approve')).toBe(false);
    expect(canTransition('changes_requested', 'resubmit')).toBe(true);
    expect(canTransition('rejected', 'resubmit')).toBe(false);
  });
  it('requires reasons for request_changes and reject only', () => {
    expect(reviewNeedsReason('reject')).toBe(true);
    expect(reviewNeedsReason('request_changes')).toBe(true);
    expect(reviewNeedsReason('approve')).toBe(false);
  });
});

describe('applyReview', () => {
  it('approves a pending submission and records an HĐHS note', () => {
    const r = applyReview(sub, 'pending', 'approve', at);
    expect(r.status).toBe('approved');
    expect(r.submission.history.at(-1)).toEqual({ at, actor: 'hdhs', action: 'approve' });
    expect(sub.history).toHaveLength(1);
  });
  it('records a trimmed reason when requesting changes or rejecting', () => {
    const r = applyReview(sub, 'pending', 'request_changes', at, '  Bổ sung địa điểm cụ thể.  ');
    expect(r.status).toBe('changes_requested');
    expect(r.submission.history.at(-1)).toEqual({ at, actor: 'hdhs', action: 'request_changes', reason: 'Bổ sung địa điểm cụ thể.' });
    expect(applyReview(sub, 'pending', 'reject', at, 'Trùng lịch kiểm tra.').status).toBe('rejected');
  });
  it('lets the club resubmit after changes were requested', () => {
    const r = applyReview(sub, 'changes_requested', 'resubmit', at);
    expect(r.status).toBe('pending');
    expect(r.submission.history.at(-1)?.actor).toBe('club');
  });
  it('throws on invalid transitions and missing reasons', () => {
    expect(() => applyReview(sub, 'approved', 'approve', at)).toThrow(/Invalid transition/);
    expect(() => applyReview(sub, 'pending', 'reject', at, '   ')).toThrow(/reason/);
    expect(() => applyReview(sub, 'pending', 'reject', at)).toThrow(/reason/);
  });
});

/* ── validateDraft ─────────────────────────────────────────────────── */

const now = toMillis('2026-10-07T09:00:00+07:00');
const valid: EventDraft = {
  title: 'Hội thảo Kỹ năng thuyết trình',
  clubId: 'tranh-bien',
  category: 'KN',
  format: 'in_person',
  start: '2026-10-21T16:45:00+07:00',
  end: '2026-10-21T18:15:00+07:00',
  location: 'Hội trường A',
  eligibleGrades: [10, 11],
  capacity: 80,
  registrationDeadline: '2026-10-19T23:59:00+07:00',
  summary: 'Buổi hội thảo giới thiệu phương pháp chuẩn bị và trình bày bài thuyết trình trước tập thể.',
  description:
    'Chương trình gồm phần chia sẻ của giáo viên phụ trách, phần thực hành theo nhóm và phần nhận xét, qua đó giúp học sinh tự tin trình bày ý kiến.',
  tags: [],
};
const check = (overrides: Partial<EventDraft>) => validateDraft({ ...valid, ...overrides }, now);

describe('validateDraft', () => {
  it('accepts a complete draft', () => {
    expect(validateDraft(valid, now)).toEqual({});
  });

  it('bounds the title to 8–120 characters (trimmed, a letter with diacritics counts once)', () => {
    expect(check({ title: 'a'.repeat(7) }).title).toBe('Tên sự kiện cần có từ 8 đến 120 ký tự.');
    expect(check({ title: `  ${'a'.repeat(7)}   ` }).title).toBeDefined();
    expect(check({ title: 'a'.repeat(8) }).title).toBeUndefined();
    expect(check({ title: 'a'.repeat(120) }).title).toBeUndefined();
    expect(check({ title: 'a'.repeat(121) }).title).toBeDefined();
    expect(check({ title: 'Hội thảo'.normalize('NFD') }).title).toBeUndefined();
    expect(check({ title: 'ộ'.normalize('NFD').repeat(7) }).title).toBeDefined();
  });

  it('bounds the summary to 40–400 characters and the description to at least 80', () => {
    expect(check({ summary: 'a'.repeat(39) }).summary).toBe('Phần tóm tắt cần có từ 40 đến 400 ký tự.');
    expect(check({ summary: 'a'.repeat(40) }).summary).toBeUndefined();
    expect(check({ summary: 'a'.repeat(400) }).summary).toBeUndefined();
    expect(check({ summary: 'a'.repeat(401) }).summary).toBeDefined();
    expect(check({ description: 'a'.repeat(79) }).description).toBe('Phần mô tả chi tiết cần có ít nhất 80 ký tự.');
    expect(check({ description: 'a'.repeat(80) }).description).toBeUndefined();
  });

  it('requires a location and at least one grade', () => {
    expect(check({ location: '   ' }).location).toBe('Vui lòng nhập địa điểm tổ chức.');
    expect(check({ eligibleGrades: [] }).eligibleGrades).toBe('Vui lòng chọn ít nhất một khối được tham gia.');
  });

  it('requires an integer capacity from 1 to 2000', () => {
    const message = 'Số lượng chỗ cần là số nguyên từ 1 đến 2000.';
    expect(check({ capacity: 0 }).capacity).toBe(message);
    expect(check({ capacity: 2001 }).capacity).toBe(message);
    expect(check({ capacity: 12.5 }).capacity).toBe(message);
    expect(check({ capacity: Number.NaN }).capacity).toBe(message);
    expect(check({ capacity: 1 }).capacity).toBeUndefined();
    expect(check({ capacity: 2000 }).capacity).toBeUndefined();
  });

  it('requires a valid start within the school year', () => {
    expect(check({ start: '' })).toEqual({ start: 'Vui lòng nhập thời gian bắt đầu hợp lệ.' });
    const outside = 'Thời gian bắt đầu phải nằm trong năm học, từ 01/09/2026 đến 31/05/2027.';
    expect(check({ start: '2026-08-31T23:59:00+07:00' }).start).toBe(outside);
    expect(check({ start: '2027-06-01T00:00:00+07:00' }).start).toBe(outside);
    const lastEvening = check({
      start: '2027-05-31T17:00:00+07:00',
      end: '2027-05-31T19:00:00+07:00',
      registrationDeadline: '2027-05-30T23:59:00+07:00',
    });
    expect(lastEvening.start).toBeUndefined();
  });

  it('requires a valid end after the start', () => {
    expect(check({ end: 'không hợp lệ' }).end).toBe('Vui lòng nhập thời gian kết thúc hợp lệ.');
    expect(check({ end: valid.start }).end).toBe('Thời gian kết thúc phải sau thời gian bắt đầu.');
    expect(check({ end: '2026-10-21T16:00:00+07:00' }).end).toBe('Thời gian kết thúc phải sau thời gian bắt đầu.');
  });

  it('limits same-day events to 12 hours and multi-day events to 3 days', () => {
    const day = { start: '2026-10-24T07:00:00+07:00', registrationDeadline: '2026-10-22T23:59:00+07:00' };
    expect(check({ ...day, end: '2026-10-24T19:00:00+07:00' }).end).toBeUndefined();
    expect(check({ ...day, end: '2026-10-24T19:15:00+07:00' }).end).toBe('Sự kiện trong một ngày không được kéo dài quá 12 giờ.');
    expect(check({ ...day, start: '2026-10-24T19:00:00+07:00', end: '2026-10-25T09:00:00+07:00' }).end).toBeUndefined();
    expect(check({ ...day, end: '2026-10-27T07:00:00+07:00' }).end).toBeUndefined();
    expect(check({ ...day, end: '2026-10-27T07:15:00+07:00' }).end).toBe('Sự kiện kéo dài nhiều ngày không được vượt quá 3 ngày.');
  });

  it('skips end checks that need the start when the start is invalid', () => {
    expect(check({ start: 'sai định dạng' }).end).toBeUndefined();
  });

  it('requires a registration deadline no later than the start and after now', () => {
    expect(check({ registrationDeadline: '' }).registrationDeadline).toBe('Vui lòng nhập hạn đăng ký hợp lệ.');
    expect(check({ registrationDeadline: '2026-10-21T17:00:00+07:00' }).registrationDeadline).toBe(
      'Hạn đăng ký phải trước thời điểm bắt đầu sự kiện.',
    );
    expect(check({ registrationDeadline: valid.start }).registrationDeadline).toBeUndefined();
    expect(check({ registrationDeadline: '2026-10-07T09:00:00+07:00' }).registrationDeadline).toBe(
      'Hạn đăng ký phải sau thời điểm hiện tại.',
    );
    expect(check({ start: '', registrationDeadline: '2026-10-01T09:00:00+07:00' }).registrationDeadline).toBe(
      'Hạn đăng ký phải sau thời điểm hiện tại.',
    );
    expect(check({ start: '', registrationDeadline: '2026-12-01T09:00:00+07:00' }).registrationDeadline).toBeUndefined();
  });
});

/* ── slugify ───────────────────────────────────────────────────────── */

describe('slugify', () => {
  it('folds Vietnamese to lowercase ASCII words joined by single hyphens', () => {
    expect(slugify('Giải Bóng đá Học sinh: Vòng 1 – 2026!')).toBe('giai-bong-da-hoc-sinh-vong-1-2026');
    expect(slugify('  ĐỘI TUYỂN Tranh biện -- Khối 10  ')).toBe('doi-tuyen-tranh-bien-khoi-10');
    expect(slugify('Hội thảo'.normalize('NFD'))).toBe('hoi-thao');
  });

  it('falls back when nothing ASCII remains', () => {
    expect(slugify('')).toBe(SLUG_FALLBACK);
    expect(slugify('!!! – ???')).toBe('su-kien');
  });

  it('keeps at most 60 characters, cutting at a word boundary when possible', () => {
    const long = slugify(
      'Hội thảo chuyên đề phát triển kỹ năng nghiên cứu khoa học dành cho học sinh khối 10 và khối 11',
    );
    expect(long).toBe('hoi-thao-chuyen-de-phat-trien-ky-nang-nghien-cuu-khoa-hoc');
    expect(long.length).toBeLessThanOrEqual(SLUG_MAX_LENGTH);
    expect(slugify(`${'a'.repeat(60)} b`)).toBe('a'.repeat(60));
    expect(slugify(`abc ${'d'.repeat(70)}`)).toBe('abc');
    expect(slugify('x'.repeat(70))).toBe('x'.repeat(60));
  });
});
