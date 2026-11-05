/**
 * Nội dung trang Giới thiệu (/gioi-thieu; đường dẫn cũ /de-an vẫn mở trang này). vsmcclubs do Hội đồng
 * Học sinh vận hành; nội dung không chứa số liệu ước đoán.
 */

export interface AboutSection {
  id: string;
  /** Số thứ tự hiển thị: "I", "II"… */
  numeral: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface AboutPhase {
  id: string;
  label: string;
  title: string;
  timing: string;
  goals: string[];
  outputs: string[];
}

export const ABOUT_TITLE = 'Giới thiệu vsmcclubs';
export const ABOUT_LEAD =
  'Tổng hợp, phân loại và sắp xếp hoạt động ngoại khóa trên một lộ trình thống nhất, đồng thời hỗ trợ học sinh xây dựng lộ trình cá nhân và hồ sơ năng lực.';

export const ABOUT_SECTIONS: AboutSection[] = [
  {
    id: 'van-de',
    numeral: 'I',
    title: 'Vấn đề',
    paragraphs: [
      'Mỗi ngày, học sinh tiếp nhận một lượng lớn thông tin về các hoạt động ngoại khóa do câu lạc bộ, Đoàn trường và Hội đồng Học sinh tổ chức. Thông tin này được phân tán qua nhiều kênh như thư điện tử, Facebook và Instagram, với hình thức trình bày và thời điểm đăng tải khác nhau.',
      'Thực trạng trên dẫn đến ba hệ quả chính: học sinh khó theo dõi và dễ bỏ lỡ những hoạt động phù hợp; học sinh có thể đăng ký nhiều hoạt động trùng thời gian; và sau mỗi năm học, học sinh chưa có một bản tổng hợp có hệ thống về những hoạt động đã tham gia để phục vụ việc tự đánh giá, xét tuyển hoặc chuẩn bị hồ sơ du học.',
    ],
  },
  {
    id: 'giai-phap',
    numeral: 'II',
    title: 'Giải pháp',
    paragraphs: [
      'vsmcclubs tổng hợp sự kiện của các câu lạc bộ vào một nền tảng duy nhất, phân loại theo lĩnh vực và sắp xếp trên dòng thời gian, đồng thời hỗ trợ học sinh xây dựng lộ trình cá nhân và hồ sơ năng lực.',
      'Năm học được trình bày dưới dạng một bản đồ lộ trình: mỗi lĩnh vực hoạt động là một tuyến, mỗi sự kiện là một điểm dừng, và kế hoạch của học sinh là hành trình nối các điểm dừng đã chọn. Cách trình bày này giúp học sinh nhận biết nhanh mật độ hoạt động, các thời điểm kiểm tra định kỳ và sự cân bằng giữa các lĩnh vực.',
      'Mochi là trợ lý đồng hành, hỗ trợ học sinh lựa chọn sự kiện phù hợp, đăng ký tham gia và sắp xếp lịch cá nhân, qua đó góp phần nâng cao hiệu quả tham gia hoạt động ngoại khóa. Mọi thao tác đăng ký đều cần học sinh xác nhận; Mochi chỉ sử dụng dữ liệu của vsmcclubs và không tự tạo thông tin.',
    ],
    bullets: [
      'Tổng hợp: một nguồn thông tin duy nhất cho sự kiện của các câu lạc bộ và Hội đồng Học sinh, cùng các cuộc thi học thuật ngoài trường do Phòng Cố vấn Học tập cập nhật.',
      'Phân loại: bảy lĩnh vực, mỗi lĩnh vực có mã hai chữ cái và màu tuyến riêng; bộ lọc theo câu lạc bộ, khối, thời gian, hình thức và hạn đăng ký.',
      'Lộ trình: dòng thời gian toàn năm học, phát hiện trùng lịch, quỹ giờ mỗi tuần, xuất lịch định dạng .ics và liên kết Google Calendar.',
      'Hồ sơ năng lực: tổng hợp hoạt động đã tham gia theo lĩnh vực, kèm vai trò, số giờ, phần tự đánh giá và minh chứng; hỗ trợ in trên khổ A4.',
      'Bản tin: Hội đồng Học sinh phát hành thông báo, tin hoạt động, bài giới thiệu câu lạc bộ và hướng dẫn sử dụng theo từng số hằng tháng, liên kết trực tiếp với sự kiện liên quan.',
    ],
  },
  {
    id: 'van-hanh',
    numeral: 'IV',
    title: 'Vận hành',
    paragraphs: [
      'vsmcclubs là ứng dụng web do Hội đồng Học sinh vận hành, có thể truy cập trên máy tính và điện thoại mà không cần cài đặt.',
      'Danh sách câu lạc bộ được tiếp nhận từ Phòng Công tác Học sinh; các câu lạc bộ cập nhật sự kiện của mình, thành viên Hội đồng Học sinh phụ trách kiểm duyệt trước khi sự kiện được công bố, và Phòng Cố vấn Học tập cập nhật thông tin các cuộc thi học thuật ngoài trường. Nhóm học sinh phụ trách kỹ thuật thuộc Hội đồng Học sinh bảo trì nền tảng; hạ tầng lưu trữ sử dụng dịch vụ có gói miễn phí phù hợp với quy mô một trường học.',
      'Trợ lý Mochi sử dụng dịch vụ trí tuệ nhân tạo có tính phí theo lượt sử dụng. Để kiểm soát chi phí, mỗi trình duyệt được hỏi Mochi 20 câu mỗi tuần và toàn trường tối đa 500 câu mỗi tuần; khi hết lượt hoặc khi chưa có kinh phí được phê duyệt, Mochi hoạt động ở chế độ ngoại tuyến với các phản hồi được chuẩn bị sẵn, còn mọi chức năng tổng hợp, lộ trình và hồ sơ năng lực vẫn hoạt động đầy đủ.',
    ],
  },
  {
    id: 'du-lieu',
    numeral: 'V',
    title: 'Bảo vệ dữ liệu học sinh',
    paragraphs: [
      'vsmcclubs áp dụng nguyên tắc thu thập tối thiểu: hồ sơ học sinh chỉ gồm khối, lớp, lĩnh vực quan tâm, mục tiêu trong năm học và thời gian có thể tham gia. Nền tảng không thu thập số điện thoại, địa chỉ, thông tin sức khỏe hay thông tin tài chính.',
      'Hồ sơ, đăng ký và hồ sơ năng lực của học sinh chỉ được lưu trên thiết bị của học sinh và có thể xóa bất kỳ lúc nào tại mục Tài khoản. Riêng Không gian HĐHS, công cụ nội bộ của thành viên Hội đồng Học sinh, lưu dữ liệu công việc trên máy chủ với sự chấp thuận của nhà trường. Chi tiết được trình bày tại Chính sách quyền riêng tư.',
      'Mochi không lưu nội dung trò chuyện, không yêu cầu thông tin cá nhân nhạy cảm và được hướng dẫn từ chối các chủ đề ngoài phạm vi hoạt động của nhà trường. Để tính số câu hỏi mỗi tuần, máy chủ chỉ lưu mã băm của một mã ngẫu nhiên do trình duyệt tạo ra, không gắn với học sinh.',
    ],
  },
];

export const ABOUT_PHASES: AboutPhase[] = [
  {
    id: 'giai-doan-1',
    label: 'Giai đoạn 1',
    title: 'Triển khai toàn trường',
    timing: 'Tháng 11–12/2026',
    goals: [
      'Tiếp nhận danh sách câu lạc bộ và lịch sự kiện từ Phòng Công tác Học sinh để cập nhật lên vsmcclubs.',
      'Phối hợp với Phòng Cố vấn Học tập cập nhật thông tin các cuộc thi học thuật ngoài trường trên vsmcclubs.',
      'Hướng dẫn đại diện câu lạc bộ gửi sự kiện; hoàn thiện quy trình kiểm duyệt và quy chế đăng tải sự kiện.',
      'Tổ chức buổi giới thiệu nền tảng cho học sinh các khối và thu thập ý kiến phản hồi về mức độ thuận tiện khi sử dụng.',
    ],
    outputs: [
      'vsmcclubs trở thành kênh tổng hợp sự kiện chính thức của Hội đồng Học sinh.',
      'Quy chế đăng tải và kiểm duyệt sự kiện.',
      'Báo cáo tổng hợp ý kiến phản hồi của học sinh.',
    ],
  },
  {
    id: 'giai-doan-2',
    label: 'Giai đoạn 2',
    title: 'Đồng bộ Google Calendar và hoàn thiện hồ sơ năng lực',
    timing: 'Học kỳ II, tháng 1–5/2027',
    goals: [
      'Triển khai đồng bộ hai chiều với Google Calendar sau khi được nhà trường phê duyệt phương án tài khoản.',
      'Bổ sung xác nhận tham gia của câu lạc bộ phụ trách vào hồ sơ năng lực.',
      'Đánh giá hiệu quả sau một năm học và đề xuất phương án duy trì.',
    ],
    outputs: ['Lịch cá nhân của học sinh được cập nhật tự động.', 'Hồ sơ năng lực có xác nhận của câu lạc bộ.'],
  },
];

export const PLAN_SECTION = { id: 'ke-hoach', numeral: 'III', title: 'Kế hoạch triển khai' } as const;
