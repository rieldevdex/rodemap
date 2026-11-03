// Dữ liệu minh họa phục vụ bản trình diễn. Thay thế bằng dữ liệu chính thức khi triển khai.
import type { PortfolioEntry, Profile, Registration } from '../domain/types';

/** The demo student (grade 11). Nothing beyond grade and class is stored. */
export const SEED_PROFILE: Profile = {
  grade: 11,
  className: '11A2',
  interests: ['CN', 'HT', 'TN', 'KN'],
  topInterests: ['CN', 'HT', 'TN'],
  goals: ['technology', 'study_abroad', 'volunteering'],
  availability: { weekdayAfterSchool: true, weekend: true },
  weeklyHourBudget: 6,
  onboardedAt: '2026-09-01T20:00:00+07:00',
};

/**
 * Two attended school-wide September events of the Hội đồng Học sinh (ev-001, ev-003) and one
 * upcoming registration (ev-027). Only HĐHS events are used: the clubs are real, so nobody is
 * shown registered for a club event on their behalf. Every ISO week stays within the 6-hour budget.
 */
export const SEED_REGISTRATIONS: Registration[] = [
  { eventId: 'ev-001', registeredAt: '2026-09-02T20:15:00+07:00', status: 'attended' },
  { eventId: 'ev-003', registeredAt: '2026-09-10T19:40:00+07:00', status: 'attended' },
  { eventId: 'ev-027', registeredAt: '2026-10-05T20:10:00+07:00', status: 'registered' },
];

/** One entry per attended event, in event order; pf-002 still holds Mochi's draft reflection. */
export const SEED_PORTFOLIO: PortfolioEntry[] = [
  {
    id: 'pf-001',
    eventId: 'ev-001',
    category: 'TS',
    role: 'Học sinh tham dự',
    hours: 2.5,
    reflection:
      'Lễ khai giảng giúp tôi nắm được kế hoạch năm học 2026–2027 và các nhiệm vụ trọng tâm mà nhà trường đề ra. Phần tuyên dương học sinh tiêu biểu là động lực để tôi xác định mục tiêu học tập cụ thể cho năm học lớp 11. Sau buổi lễ, tôi đã lập kế hoạch tham gia các hoạt động ngoại khóa phù hợp với lĩnh vực mình quan tâm.',
    reflectionSource: 'student',
    evidenceLinks: ['https://example.com/minh-chung/le-khai-giang-2026-2027'],
    createdAt: '2026-09-06T19:00:00+07:00',
    updatedAt: '2026-09-07T20:30:00+07:00',
  },
  {
    id: 'pf-002',
    eventId: 'ev-003',
    category: 'TS',
    role: 'Học sinh tham dự',
    hours: 3.5,
    reflection:
      'Tôi tham gia Ngày hội Câu lạc bộ năm học 2026–2027 do Hội đồng Học sinh tổ chức tại sân trường và Nhà thi đấu đa năng. Qua hoạt động, tôi được tìm hiểu kế hoạch hoạt động của các câu lạc bộ và trao đổi trực tiếp với ban chủ nhiệm về tiêu chí tuyển thành viên. Hoạt động giúp tôi lựa chọn câu lạc bộ phù hợp với lĩnh vực mình quan tâm.',
    reflectionSource: 'mochi_draft',
    evidenceLinks: [],
    createdAt: '2026-09-20T19:30:00+07:00',
    updatedAt: '2026-09-20T19:30:00+07:00',
  },
];
