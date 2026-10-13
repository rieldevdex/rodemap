// Dữ liệu minh họa phục vụ bản trình diễn. Thay thế bằng dữ liệu chính thức khi triển khai.
import type { ActivityProposal, CollaborationProposal, ProposalResponse } from '../domain/types';

/** Students' proposals to Hội đồng Học sinh. Anonymous: only the author's grade is kept. */
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
    clubId: 'khoa-hoc-du-lieu',
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
    clubId: 'tinh-nguyen-xanh',
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
    clubId: 'tranh-bien',
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
    clubId: 'inkstep',
    authorGrade: 10,
    submittedAt: '2026-10-05T20:15:00+07:00',
    supporters: 9,
  },
];

/** Clubs' proposals to organise an activity together. */
export const COLLABORATIONS: CollaborationProposal[] = [
  {
    id: 'ht-001',
    fromClubId: 'robotics',
    toClubId: 'inkstep',
    title: 'Ngày hội Công nghệ học đường',
    category: 'CN',
    description:
      'Câu lạc bộ Robotics đề xuất phối hợp tổ chức ngày hội gồm khu trình diễn robot và khu trải nghiệm sản phẩm học tập. Hai câu lạc bộ cùng xây dựng nội dung, phân công thành viên hướng dẫn và đăng ký sự kiện với Hội đồng Học sinh.',
    month: '2026-12',
    submittedAt: '2026-10-01T20:30:00+07:00',
  },
  {
    id: 'ht-002',
    fromClubId: 'inkstep',
    toClubId: 'khoa-hoc-du-lieu',
    title: 'Chuỗi buổi chia sẻ về dữ liệu trong sản phẩm học tập',
    category: 'CN',
    description:
      'Inkstep đề xuất phối hợp tổ chức ba buổi chia sẻ về cách thu thập và phân tích dữ liệu sử dụng để cải tiến sản phẩm học tập. Mỗi câu lạc bộ phụ trách nội dung theo thế mạnh chuyên môn của mình.',
    month: '2026-11',
    submittedAt: '2026-09-24T19:00:00+07:00',
  },
  {
    id: 'ht-003',
    fromClubId: 'am-nhac',
    toClubId: 'san-khau',
    title: 'Chương trình nhạc kịch chào xuân',
    category: 'NT',
    description:
      'Câu lạc bộ Âm nhạc đề xuất phối hợp dàn dựng một vở nhạc kịch ngắn biểu diễn tại Hội xuân. Câu lạc bộ Âm nhạc phụ trách phần âm nhạc, Câu lạc bộ Sân khấu phụ trách kịch bản và diễn xuất.',
    month: '2027-01',
    submittedAt: '2026-09-26T21:00:00+07:00',
  },
  {
    id: 'ht-004',
    fromClubId: 'tinh-nguyen-xanh',
    toClubId: 'my-thuat',
    title: 'Vẽ tranh tường chủ đề bảo vệ môi trường',
    category: 'TN',
    description:
      'Câu lạc bộ Tình nguyện Xanh đề xuất phối hợp vẽ tranh tường tại khu vực nhà xe với chủ đề bảo vệ môi trường. Câu lạc bộ Mỹ thuật phụ trách phác thảo, học sinh tình nguyện tham gia tô màu theo hướng dẫn.',
    month: '2026-11',
    submittedAt: '2026-09-15T18:20:00+07:00',
  },
];

/** Answers already given in the sample data (the demo's answers are kept in AppState). */
export const PROPOSAL_RESPONSES: Record<string, ProposalResponse> = {
  'dx-001': {
    status: 'accepted',
    at: '2026-09-25T16:00:00+07:00',
    by: 'hdhs',
    note: 'Hội đồng Học sinh tiếp nhận đề xuất và phối hợp với Câu lạc bộ Toán học xây dựng kế hoạch tổ chức giải trong học kỳ II.',
    assignedClubId: 'toan-hoc',
  },
  'dx-004': {
    status: 'accepted',
    at: '2026-09-22T16:30:00+07:00',
    by: 'hdhs',
    note: 'Đề xuất được chuyển tới Câu lạc bộ Tình nguyện Xanh; câu lạc bộ dự kiến tổ chức chương trình vào tháng 3/2027.',
    assignedClubId: 'tinh-nguyen-xanh',
  },
  'dx-005': {
    status: 'declined',
    at: '2026-09-30T16:15:00+07:00',
    by: 'hdhs',
    note: 'Sân trường được sử dụng cho hoạt động chung trong giờ ra chơi. Hội đồng Học sinh đề nghị tổ chức giải vào cuối tuần và mời học sinh gửi lại đề xuất theo hướng này.',
    assignedClubId: null,
  },
  'ht-002': {
    status: 'accepted',
    at: '2026-09-29T20:00:00+07:00',
    by: 'khoa-hoc-du-lieu',
    note: 'Câu lạc bộ Khoa học Dữ liệu đồng ý hợp tác và đề xuất tổ chức buổi đầu tiên vào tuần thứ ba của tháng 11/2026.',
    assignedClubId: null,
  },
  'ht-004': {
    status: 'declined',
    at: '2026-09-21T19:30:00+07:00',
    by: 'my-thuat',
    note: 'Câu lạc bộ Mỹ thuật đã có kế hoạch triển lãm trong tháng 11/2026 và đề nghị trao đổi lại cho học kỳ II.',
    assignedClubId: null,
  },
};
