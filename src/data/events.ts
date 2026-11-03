// Dữ liệu chính thức của vsmcclubs. Cập nhật theo hướng dẫn tại README, mục 5.
import type { SchoolEvent } from '../domain/types';

/**
 * Events announced by the real clubs, ev-055 onwards. Only their date is known so far (`dateOnly`), so
 * time, place, grades, seats and deadline read "Đang cập nhật" and registration is not open; the clubs
 * complete them through Cổng câu lạc bộ. The former sample events (ev-001 … ev-054) were removed
 * from the site on 03/11/2026; their ids are not reused (tests keep copies in src/testing/sample-data.ts).
 */
export const EVENTS: SchoolEvent[] = [
  /* ── Sự kiện của câu lạc bộ ─────────────────────────────────────── */
  {
    id: 'ev-055',
    slug: 'hoi-nghi-seia-khu-vuc-mua-xuan-2027',
    title: 'Hội nghị SEIA khu vực mùa xuân 2027',
    clubId: 'hanoi-vinschool-seia',
    category: 'KN',
    format: 'in_person',
    start: '2027-01-23T00:00:00+07:00',
    end: '2027-01-24T00:00:00+07:00',
    location: '',
    eligibleGrades: [6, 7, 8, 9, 10, 11, 12],
    capacity: 0,
    seatsTaken: 0,
    registrationDeadline: '2027-01-23T00:00:00+07:00',
    summary:
      'Hội nghị SEIA khu vực mùa xuân 2027 (2027 Regional Spring SEIA Conference) do Hanoi Vinschool SEIA thông báo tổ chức vào ngày 23/01/2027. Thời gian cụ thể, địa điểm, đối tượng tham gia và cách thức đăng ký đang được cập nhật.',
    description:
      'Hanoi Vinschool SEIA đã công bố ngày tổ chức hội nghị. Các thông tin còn lại được cập nhật trên vsmcclubs sau khi câu lạc bộ hoàn thiện kế hoạch và mở đăng ký.',
    tags: ['khoi-nghiep', 'lanh-dao', 'huong-nghiep'],
    status: 'approved',
    dateOnly: true,
  },
  {
    id: 'ev-056',
    slug: 'chung-ket-vbis-innovation-challenge-2027',
    title: 'Chung kết Cuộc thi khởi nghiệp cấp trường VBIS Innovation Challenge',
    clubId: 'young-business-creators',
    category: 'KN',
    format: 'in_person',
    start: '2027-01-30T00:00:00+07:00',
    end: '2027-01-31T00:00:00+07:00',
    location: '',
    eligibleGrades: [6, 7, 8, 9, 10, 11, 12],
    capacity: 0,
    seatsTaken: 0,
    registrationDeadline: '2027-01-30T00:00:00+07:00',
    summary:
      'Vòng chung kết VBIS Innovation Challenge, cuộc thi khởi nghiệp cấp trường do Young Business Creators (YBC) tổ chức, diễn ra vào ngày 30/01/2027. Thời gian cụ thể, địa điểm, thể lệ và cách thức đăng ký đang được cập nhật.',
    description:
      'Young Business Creators đã công bố ngày tổ chức vòng chung kết. Các thông tin còn lại được cập nhật trên vsmcclubs sau khi câu lạc bộ hoàn thiện kế hoạch và mở đăng ký.',
    tags: ['khoi-nghiep', 'thi-dau', 'thuyet-trinh'],
    status: 'approved',
    dateOnly: true,
  },
];
