/**
 * Nội dung Trang chủ. Phần tham chiếu (eyebrow, tiêu đề, vấn đề, giải pháp, Mochi)
 * giữ nguyên theo đề bài.
 */
import type { CategoryCode } from '../domain/types';

export const HERO = {
  eyebrow: 'Đề xuất tranh cử Hội đồng Học sinh nhiệm kỳ 2026–2027',
  headline: 'Toàn bộ hoạt động ngoại khóa trên một lộ trình thống nhất.',
  primaryCta: 'Bắt đầu thiết lập lộ trình',
  secondaryCta: 'Xem đề án',
} as const;

export const PROBLEM =
  'Mỗi ngày, học sinh tiếp nhận một lượng lớn thông tin về các hoạt động ngoại khóa. Tuy nhiên, thông tin được phân tán qua nhiều kênh như thư điện tử, Facebook và Instagram, khiến học sinh khó theo dõi và dễ bỏ lỡ những hoạt động phù hợp.';

export const SOLUTION =
  'Rodemap tổng hợp sự kiện của các câu lạc bộ vào một nền tảng duy nhất, phân loại theo lĩnh vực và sắp xếp trên dòng thời gian, đồng thời hỗ trợ học sinh xây dựng lộ trình cá nhân và hồ sơ năng lực.';

export const MOCHI_INTRO =
  'Mochi là trợ lý đồng hành, hỗ trợ học sinh lựa chọn sự kiện phù hợp, đăng ký tham gia và sắp xếp lịch cá nhân, qua đó góp phần nâng cao hiệu quả tham gia hoạt động ngoại khóa.';

export interface Pillar {
  id: string;
  title: string;
  body: string;
  /** Category line used to draw the pillar's station marker. */
  line: CategoryCode;
}

export const PILLARS: Pillar[] = [
  {
    id: 'tong-hop',
    title: 'Tổng hợp',
    body: 'Sự kiện của các câu lạc bộ, Đoàn trường và Hội đồng Học sinh được tập trung tại một nơi sau khi được kiểm duyệt.',
    line: 'HT',
  },
  {
    id: 'phan-loai',
    title: 'Phân loại',
    body: 'Mỗi sự kiện thuộc một trong bảy lĩnh vực; mỗi lĩnh vực có mã tuyến và màu riêng. Bộ lọc hỗ trợ tra cứu theo câu lạc bộ, khối, thời gian, hình thức và hạn đăng ký.',
    line: 'NT',
  },
  {
    id: 'lo-trinh',
    title: 'Lộ trình',
    body: 'Năm học được trình bày như một bản đồ lộ trình; kế hoạch cá nhân được kiểm tra trùng lịch và quỹ giờ mỗi tuần.',
    line: 'TN',
  },
  {
    id: 'ho-so-nang-luc',
    title: 'Hồ sơ năng lực',
    body: 'Hoạt động đã tham gia được tổng hợp theo lĩnh vực, kèm vai trò, số giờ, phần tự đánh giá và minh chứng, sẵn sàng in trên khổ A4.',
    line: 'CN',
  },
];

export interface ParticipantStep {
  id: string;
  actor: string;
  title: string;
  body: string;
}

export const PARTICIPATION: ParticipantStep[] = [
  {
    id: 'cau-lac-bo',
    actor: 'Câu lạc bộ',
    title: 'Gửi sự kiện',
    body: 'Đại diện câu lạc bộ điền biểu mẫu sự kiện với thời gian, địa điểm, đối tượng và hạn đăng ký; hệ thống kiểm tra tính hợp lệ trước khi gửi.',
  },
  {
    id: 'hdhs',
    actor: 'Hội đồng Học sinh',
    title: 'Kiểm duyệt và phát hành bản tin',
    body: 'Thành viên phụ trách phê duyệt, yêu cầu chỉnh sửa hoặc từ chối kèm lý do. Chỉ sự kiện đã được phê duyệt mới được hiển thị với học sinh. Hội đồng Học sinh đồng thời phát hành Bản tin hằng tháng với thông báo, tin hoạt động và hướng dẫn.',
  },
  {
    id: 'hoc-sinh',
    actor: 'Học sinh',
    title: 'Xây dựng lộ trình',
    body: 'Học sinh khám phá sự kiện, đăng ký tham gia, theo dõi lịch cá nhân và tổng hợp hồ sơ năng lực sau mỗi hoạt động.',
  },
];

/** Đoạn hội thoại minh họa trên Trang chủ; phản hồi của Mochi được sinh từ dữ liệu minh họa ở chế độ ngoại tuyến. */
export const DEMO_QUESTION = 'Mochi gợi ý cho mình một vài sự kiện phù hợp trong tuần tới nhé.';

export const CLOSING = {
  title: 'Bắt đầu thiết lập lộ trình của bạn.',
  body: 'Quá trình thiết lập gồm bốn bước và chỉ sử dụng thông tin về khối lớp, lĩnh vực quan tâm, mục tiêu và thời gian có thể tham gia.',
  cta: 'Bắt đầu thiết lập lộ trình',
} as const;
