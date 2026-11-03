// Dữ liệu minh họa phục vụ bản trình diễn. Thay thế bằng dữ liệu chính thức khi triển khai.
import type { ActivityProposal, CollaborationProposal, ProposalResponse } from '../domain/types';

/**
 * Students' proposals to Hội đồng Học sinh. Anonymous: only the author's grade is kept. The sample
 * proposals name no club, since the clubs are real and did not receive them.
 */
export const ACTIVITY_PROPOSALS: ActivityProposal[] = [
  {
    id: 'dx-001',
    title: 'Giải Cờ vua học sinh cấp trường',
    category: 'TT',
    description:
      'Đề xuất tổ chức giải Cờ vua theo thể thức Thụy Sĩ dành cho học sinh toàn trường, thi đấu vào buổi chiều thứ Bảy. Giải đấu giúp học sinh rèn luyện tư duy chiến thuật và tạo sân chơi cho học sinh yêu thích thể thao trí tuệ.',
    grades: [6, 7, 8, 9, 10, 11, 12],
    clubId: null,
    authorGrade: 7,
    submittedAt: '2026-09-14T19:20:00+07:00',
    supporters: 46,
  },
  {
    id: 'dx-002',
    title: 'Câu lạc bộ đọc sách theo chủ đề hằng tháng',
    category: 'NT',
    description:
      'Đề xuất tổ chức buổi giới thiệu và thảo luận sách theo một chủ đề mỗi tháng tại thư viện trường. Hoạt động giúp học sinh trung học cơ sở hình thành thói quen đọc và rèn luyện kỹ năng trình bày quan điểm.',
    grades: [6, 7, 8, 9],
    clubId: null,
    authorGrade: 8,
    submittedAt: '2026-09-20T20:05:00+07:00',
    supporters: 31,
  },
  {
    id: 'dx-003',
    title: 'Buổi hướng dẫn tra cứu tài liệu tại thư viện số',
    category: 'HT',
    description:
      'Đề xuất tổ chức buổi hướng dẫn tìm kiếm, đánh giá và trích dẫn tài liệu tham khảo từ thư viện số của nhà trường. Nội dung hỗ trợ học sinh thực hiện bài tập nghiên cứu và dự án học tập.',
    grades: [9, 10, 11, 12],
    clubId: null,
    authorGrade: 10,
    submittedAt: '2026-09-28T18:40:00+07:00',
    supporters: 18,
  },
  {
    id: 'dx-004',
    title: 'Chương trình đi bộ gây quỹ ủng hộ học sinh vùng cao',
    category: 'TN',
    description:
      'Đề xuất tổ chức chương trình đi bộ quanh khu vực trường vào sáng Chủ nhật, mỗi học sinh tham gia đóng góp một khoản ủng hộ tự nguyện. Toàn bộ số tiền được chuyển tới chương trình hỗ trợ học sinh vùng cao do nhà trường phối hợp thực hiện.',
    grades: [6, 7, 8, 9, 10, 11, 12],
    clubId: null,
    authorGrade: 11,
    submittedAt: '2026-09-10T21:10:00+07:00',
    supporters: 52,
  },
  {
    id: 'dx-005',
    title: 'Giải bóng đá mini giữa các lớp trong giờ ra chơi',
    category: 'TT',
    description:
      'Đề xuất tổ chức giải bóng đá mini giữa các lớp, thi đấu trong giờ ra chơi buổi trưa tại sân trường. Giải đấu tạo cơ hội rèn luyện thể chất và tăng cường sự gắn kết giữa học sinh các lớp.',
    grades: [6, 7, 8, 9],
    clubId: null,
    authorGrade: 6,
    submittedAt: '2026-09-18T17:30:00+07:00',
    supporters: 27,
  },
  {
    id: 'dx-006',
    title: 'Hội thảo kỹ năng thuyết trình cho học sinh trung học cơ sở',
    category: 'KN',
    description:
      'Đề xuất tổ chức hội thảo hướng dẫn cách chuẩn bị dàn ý, sử dụng trang chiếu và trình bày trước lớp. Học sinh được thực hành trình bày ngắn và nhận góp ý từ thành viên câu lạc bộ.',
    grades: [6, 7, 8, 9],
    clubId: null,
    authorGrade: 9,
    submittedAt: '2026-10-02T19:45:00+07:00',
    supporters: 12,
  },
  {
    id: 'dx-007',
    title: 'Triển lãm sản phẩm lập trình của học sinh',
    category: 'CN',
    description:
      'Đề xuất tổ chức triển lãm giới thiệu trò chơi, ứng dụng và trang web do học sinh tự xây dựng. Học sinh tham quan được trải nghiệm sản phẩm và trao đổi với nhóm phát triển về quy trình thực hiện.',
    grades: [8, 9, 10, 11, 12],
    clubId: null,
    authorGrade: 10,
    submittedAt: '2026-10-05T20:15:00+07:00',
    supporters: 9,
  },
];

/**
 * Clubs' proposals to organise an activity together. None in the sample data: the clubs are real,
 * so no proposal is sent or answered on their behalf (the demo's proposals are kept in AppState).
 */
export const COLLABORATIONS: CollaborationProposal[] = [];

/** Answers already given in the sample data (the demo's answers are kept in AppState). */
export const PROPOSAL_RESPONSES: Record<string, ProposalResponse> = {
  'dx-001': {
    status: 'accepted',
    at: '2026-09-25T16:00:00+07:00',
    by: 'hdhs',
    note: 'Hội đồng Học sinh tiếp nhận đề xuất và xây dựng kế hoạch tổ chức giải trong học kỳ II.',
    assignedClubId: null,
  },
  'dx-004': {
    status: 'accepted',
    at: '2026-09-22T16:30:00+07:00',
    by: 'hdhs',
    note: 'Hội đồng Học sinh tiếp nhận đề xuất và dự kiến tổ chức chương trình vào tháng 3/2027.',
    assignedClubId: null,
  },
  'dx-005': {
    status: 'declined',
    at: '2026-09-30T16:15:00+07:00',
    by: 'hdhs',
    note: 'Sân trường được sử dụng cho hoạt động chung trong giờ ra chơi. Hội đồng Học sinh đề nghị tổ chức giải vào cuối tuần và mời học sinh gửi lại đề xuất theo hướng này.',
    assignedClubId: null,
  },
};
