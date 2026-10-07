/**
 * Nội dung trang Đề án (/de-an). Văn phong đề án gửi Phòng Công tác Học sinh.
 * Các ô trong ngoặc vuông là phần ứng cử viên tự điền; không chứa số liệu ước đoán.
 */

export interface ProposalSection {
  id: string;
  /** Số thứ tự hiển thị kiểu đề án: "I", "II"… */
  numeral: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface ProposalPhase {
  id: string;
  label: string;
  title: string;
  timing: string;
  goals: string[];
  outputs: string[];
}

export const CANDIDATE = {
  name: '[Họ và tên]',
  className: '[Lớp]',
  position: '[Vị trí ứng tuyển]',
  message: '[Thông điệp tranh cử]',
} as const;

export const PROPOSAL_TITLE = 'Đề án xây dựng nền tảng Rodemap';
export const PROPOSAL_SUBTITLE =
  'Tổng hợp, phân loại và sắp xếp hoạt động ngoại khóa trên một lộ trình thống nhất, đồng thời hỗ trợ học sinh xây dựng lộ trình cá nhân và hồ sơ năng lực.';

export const PROPOSAL_SECTIONS: ProposalSection[] = [
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
      'Rodemap tổng hợp sự kiện của các câu lạc bộ vào một nền tảng duy nhất, phân loại theo lĩnh vực và sắp xếp trên dòng thời gian, đồng thời hỗ trợ học sinh xây dựng lộ trình cá nhân và hồ sơ năng lực.',
      'Năm học được trình bày dưới dạng một bản đồ lộ trình: mỗi lĩnh vực hoạt động là một tuyến, mỗi sự kiện là một điểm dừng, và kế hoạch của học sinh là hành trình nối các điểm dừng đã chọn. Cách trình bày này giúp học sinh nhận biết nhanh mật độ hoạt động, các thời điểm kiểm tra định kỳ và sự cân bằng giữa các lĩnh vực.',
      'Mochi là trợ lý đồng hành, hỗ trợ học sinh lựa chọn sự kiện phù hợp, đăng ký tham gia và sắp xếp lịch cá nhân, qua đó góp phần nâng cao hiệu quả tham gia hoạt động ngoại khóa. Mọi thao tác đăng ký đều cần học sinh xác nhận; Mochi chỉ sử dụng dữ liệu của Rodemap và không tự tạo thông tin.',
    ],
    bullets: [
      'Tổng hợp: một nguồn thông tin duy nhất cho toàn bộ sự kiện đã được Hội đồng Học sinh phê duyệt.',
      'Phân loại: bảy lĩnh vực, mỗi lĩnh vực có mã hai chữ cái và màu tuyến riêng; bộ lọc theo câu lạc bộ, khối, thời gian, hình thức và hạn đăng ký.',
      'Lộ trình: dòng thời gian toàn năm học, phát hiện trùng lịch, quỹ giờ mỗi tuần, xuất lịch định dạng .ics và liên kết Google Calendar.',
      'Hồ sơ năng lực: tổng hợp hoạt động đã tham gia theo lĩnh vực, kèm vai trò, số giờ, phần tự đánh giá và minh chứng; hỗ trợ in trên khổ A4.',
    ],
  },
  {
    id: 'nguon-luc',
    numeral: 'IV',
    title: 'Nguồn lực và tính khả thi',
    paragraphs: [
      'Rodemap được phát triển dưới dạng ứng dụng web, có thể truy cập trên máy tính và điện thoại mà không cần cài đặt. Bản trình diễn hiện tại đã có đầy đủ các chức năng chính, vận hành với dữ liệu minh họa, qua đó chứng minh tính khả thi về mặt kỹ thuật.',
      'Việc vận hành cần ba nhóm nguồn lực: nhóm học sinh phụ trách kỹ thuật thuộc Hội đồng Học sinh; đại diện các câu lạc bộ phụ trách cập nhật sự kiện; và thành viên Hội đồng Học sinh phụ trách kiểm duyệt. Hạ tầng lưu trữ sử dụng dịch vụ có gói miễn phí phù hợp với quy mô một trường học.',
      'Trợ lý Mochi sử dụng dịch vụ trí tuệ nhân tạo có tính phí theo lượt sử dụng. Khi chưa có kinh phí được phê duyệt, Mochi hoạt động ở chế độ ngoại tuyến với các phản hồi được chuẩn bị sẵn; mọi chức năng tổng hợp, lộ trình và hồ sơ năng lực vẫn hoạt động đầy đủ.',
    ],
  },
  {
    id: 'du-lieu',
    numeral: 'V',
    title: 'Bảo vệ dữ liệu học sinh',
    paragraphs: [
      'Rodemap áp dụng nguyên tắc thu thập tối thiểu: hồ sơ học sinh chỉ gồm khối, lớp, lĩnh vực quan tâm, mục tiêu trong năm học và thời gian có thể tham gia. Nền tảng không thu thập số điện thoại, địa chỉ, thông tin sức khỏe hay thông tin tài chính.',
      'Trong bản trình diễn, toàn bộ dữ liệu được lưu trên thiết bị của người dùng và có thể xóa bằng chức năng khôi phục dữ liệu minh họa. Khi triển khai chính thức, phương án tài khoản và lưu trữ sẽ được trình Ban Giám hiệu phê duyệt và tuân thủ quy định pháp luật hiện hành về bảo vệ dữ liệu cá nhân.',
      'Mochi không lưu nội dung trò chuyện, không yêu cầu thông tin cá nhân nhạy cảm và được hướng dẫn từ chối các chủ đề ngoài phạm vi hoạt động của nhà trường.',
    ],
  },
  {
    id: 'cam-ket',
    numeral: 'VI',
    title: 'Cam kết',
    paragraphs: [
      'Nếu được tín nhiệm, tôi cam kết triển khai Rodemap theo đúng các giai đoạn đã trình bày, báo cáo tiến độ định kỳ với Hội đồng Học sinh và Phòng Công tác Học sinh, đồng thời tiếp nhận góp ý của học sinh và các câu lạc bộ để điều chỉnh nền tảng.',
      'Đề án được xây dựng trên tinh thần cụ thể, khả thi và trung thực: mọi chức năng nêu trong đề án đều đã có trong bản trình diễn, và những nội dung cần nhà trường phê duyệt được trình bày rõ là kế hoạch của các giai đoạn sau.',
    ],
  },
];

export const PROPOSAL_PHASES: ProposalPhase[] = [
  {
    id: 'giai-doan-1',
    label: 'Giai đoạn 1',
    title: 'Thí điểm với một số câu lạc bộ',
    timing: '[thời gian dự kiến]',
    goals: [
      'Lựa chọn một số câu lạc bộ đăng ký tham gia thí điểm.',
      'Hướng dẫn đại diện câu lạc bộ gửi sự kiện và Hội đồng Học sinh kiểm duyệt.',
      'Thu thập ý kiến phản hồi của học sinh về mức độ thuận tiện khi sử dụng.',
    ],
    outputs: ['Danh sách sự kiện của các câu lạc bộ thí điểm được cập nhật trên Rodemap.', 'Báo cáo đánh giá thí điểm.'],
  },
  {
    id: 'giai-doan-2',
    label: 'Giai đoạn 2',
    title: 'Mở rộng toàn trường',
    timing: '[thời gian dự kiến]',
    goals: [
      'Mời toàn bộ câu lạc bộ và các ban của Hội đồng Học sinh tham gia cập nhật sự kiện.',
      'Hoàn thiện quy trình kiểm duyệt và quy chế đăng tải sự kiện.',
      'Tổ chức buổi giới thiệu nền tảng cho học sinh các khối.',
    ],
    outputs: ['Rodemap trở thành kênh tổng hợp sự kiện chính thức của Hội đồng Học sinh.', 'Quy chế đăng tải và kiểm duyệt sự kiện.'],
  },
  {
    id: 'giai-doan-3',
    label: 'Giai đoạn 3',
    title: 'Đồng bộ Google Calendar và hoàn thiện hồ sơ năng lực',
    timing: '[thời gian dự kiến]',
    goals: [
      'Triển khai đồng bộ hai chiều với Google Calendar sau khi được nhà trường phê duyệt phương án tài khoản.',
      'Bổ sung xác nhận tham gia của câu lạc bộ phụ trách vào hồ sơ năng lực.',
      'Đánh giá hiệu quả sau một năm học và đề xuất phương án duy trì.',
    ],
    outputs: ['Lịch cá nhân của học sinh được cập nhật tự động.', 'Hồ sơ năng lực có xác nhận của câu lạc bộ.'],
  },
];

export const PLAN_SECTION = { id: 'ke-hoach', numeral: 'III', title: 'Kế hoạch triển khai' } as const;
