// Dữ liệu minh họa phục vụ bản trình diễn. Thay thế bằng dữ liệu chính thức khi triển khai.
import type { PortfolioEntry, Profile, Registration, Submission } from '../domain/types';

/** The demo student (grade 11). Nothing beyond grade and class is stored. */
export const SEED_PROFILE: Profile = {
  grade: 11,
  className: '11A2',
  interests: ['CN', 'HT', 'TN', 'KN'],
  topInterests: ['CN', 'HT', 'TN'],
  goals: ['technology', 'study_abroad', 'volunteering'],
  availability: { weekdayAfterSchool: true, weekend: true },
  weeklyHourBudget: 6,
  onboardedAt: '2026-09-20T20:00:00+07:00',
};

/**
 * Three attended September events (CN ev-005, TN ev-006, HT ev-007), one past event still
 * awaiting attendance confirmation (ev-009) and two upcoming, non-conflicting registrations
 * (ev-014, ev-020). Every ISO week stays within the 6-hour weekly budget.
 */
export const SEED_REGISTRATIONS: Registration[] = [
  { eventId: 'ev-005', registeredAt: '2026-09-20T20:42:00+07:00', status: 'attended' },
  { eventId: 'ev-006', registeredAt: '2026-09-21T19:10:00+07:00', status: 'attended' },
  { eventId: 'ev-007', registeredAt: '2026-09-20T20:35:00+07:00', status: 'attended' },
  { eventId: 'ev-009', registeredAt: '2026-09-28T21:05:00+07:00', status: 'registered' },
  { eventId: 'ev-014', registeredAt: '2026-10-05T20:10:00+07:00', status: 'registered' },
  { eventId: 'ev-020', registeredAt: '2026-10-06T21:15:00+07:00', status: 'registered' },
];

/** One entry per attended event, in event order; pf-002 still holds Mochi's draft reflection. */
export const SEED_PORTFOLIO: PortfolioEntry[] = [
  {
    id: 'pf-001',
    eventId: 'ev-005',
    category: 'CN',
    role: 'Thành viên tham gia',
    hours: 3,
    reflection:
      'Buổi chia sẻ giúp tôi hiểu rõ các giai đoạn phát triển một sản phẩm học tập, từ xác định vấn đề, nghiên cứu người dùng đến kiểm thử và cải tiến. Tôi đặc biệt quan tâm đến phần nghiên cứu người dùng, bởi đây là cơ sở để nhóm phát triển đưa ra các quyết định thiết kế. Sau buổi chia sẻ, tôi đã đăng ký tham gia buổi chia sẻ tiếp theo của câu lạc bộ về nghiên cứu người dùng.',
    reflectionSource: 'student',
    evidenceLinks: ['https://example.com/minh-chung/inkstep-quy-trinh-phat-trien-san-pham'],
    createdAt: '2026-09-26T19:00:00+07:00',
    updatedAt: '2026-10-05T20:30:00+07:00',
  },
  {
    id: 'pf-002',
    eventId: 'ev-006',
    category: 'TN',
    role: 'Thành viên nhóm thu gom và phân loại rác thải',
    hours: 2.5,
    reflection:
      'Tôi tham gia Chương trình Chủ nhật Xanh với vai trò thành viên nhóm thu gom và phân loại rác thải tại khu vực cổng trường. Qua hoạt động, tôi được hướng dẫn phân loại rác thải tại nguồn và phối hợp với các thành viên khác để hoàn thành khu vực được phân công. Hoạt động góp phần nâng cao ý thức bảo vệ môi trường của bản thân và các bạn cùng tham gia.',
    reflectionSource: 'mochi_draft',
    evidenceLinks: [],
    createdAt: '2026-09-27T19:30:00+07:00',
    updatedAt: '2026-09-27T19:30:00+07:00',
  },
  {
    id: 'pf-003',
    eventId: 'ev-007',
    category: 'HT',
    role: 'Thành viên tham gia',
    hours: 1.75,
    reflection:
      'Tôi tham gia chuyên đề nhằm củng cố kiến thức tổ hợp trước khi ôn luyện cho kỳ thi học sinh giỏi cấp trường. Qua phần luyện tập theo nhóm, tôi nắm vững hơn cách phân biệt chỉnh hợp và tổ hợp, đồng thời rèn luyện kỹ năng trình bày lời giải trước lớp. Tôi nhận thấy bản thân cần dành thêm thời gian luyện tập các bài toán sử dụng nguyên lý bù trừ. Trong thời gian tới, tôi dự kiến tham gia đầy đủ các buổi chuyên đề tiếp theo của câu lạc bộ.',
    reflectionSource: 'student',
    evidenceLinks: ['https://example.com/minh-chung/chuyen-de-to-hop'],
    createdAt: '2026-09-28T20:30:00+07:00',
    updatedAt: '2026-09-29T21:00:00+07:00',
  },
];

/** Moderation histories for the five seed events that are not yet approved (ev-046 … ev-050). */
export const SEED_SUBMISSIONS: Submission[] = [
  {
    id: 'sub-001',
    eventId: 'ev-046',
    clubId: 'robotics',
    submittedAt: '2026-10-05T15:20:00+07:00',
    history: [{ at: '2026-10-05T15:20:00+07:00', actor: 'club', action: 'submit' }],
  },
  {
    id: 'sub-002',
    eventId: 'ev-047',
    clubId: 'am-nhac',
    submittedAt: '2026-10-06T10:05:00+07:00',
    history: [{ at: '2026-10-06T10:05:00+07:00', actor: 'club', action: 'submit' }],
  },
  {
    id: 'sub-003',
    eventId: 'ev-048',
    clubId: 'inkstep',
    submittedAt: '2026-10-06T16:40:00+07:00',
    history: [{ at: '2026-10-06T16:40:00+07:00', actor: 'club', action: 'submit' }],
  },
  {
    id: 'sub-004',
    eventId: 'ev-049',
    clubId: 'inkstep',
    submittedAt: '2026-10-02T14:00:00+07:00',
    history: [
      { at: '2026-10-02T14:00:00+07:00', actor: 'club', action: 'submit' },
      {
        at: '2026-10-04T09:30:00+07:00',
        actor: 'hdhs',
        action: 'request_changes',
        reason:
          'Đề nghị câu lạc bộ bổ sung địa điểm tổ chức cụ thể và điều chỉnh sức chứa phù hợp với quy mô phòng thực hành trước khi gửi lại.',
      },
    ],
  },
  {
    id: 'sub-005',
    eventId: 'ev-050',
    clubId: 'cau-long',
    submittedAt: '2026-10-03T08:45:00+07:00',
    history: [
      { at: '2026-10-03T08:45:00+07:00', actor: 'club', action: 'submit' },
      {
        at: '2026-10-05T10:15:00+07:00',
        actor: 'hdhs',
        action: 'reject',
        reason:
          'Thời gian tổ chức trùng với kỳ kiểm tra định kỳ cuối học kỳ I của nhà trường. Đề nghị câu lạc bộ lựa chọn thời gian khác và gửi đề xuất mới.',
      },
    ],
  },
];
