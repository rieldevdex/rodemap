// Dữ liệu chính thức của vsmcclubs. Cập nhật theo hướng dẫn tại README, mục 5.
import type { NewsPost } from '../domain/types';

/** Council departments that sign articles (an article is signed by a department, never by a student). */
export const NEWS_DEPARTMENTS = ['Ban Truyền thông', 'Ban Học tập', 'Ban Phong trào', 'Ban Tổ chức'] as const;

/**
 * Articles of the Bản tin Hội đồng Học sinh, oldest first: the two how-to guides (bt-003, pinned, and
 * bt-010, shown from 19/10/2026). The sample announcements and reports (bt-001, bt-002, bt-004 …
 * bt-009) were removed on 03/11/2026; their ids are not reused. New articles are written in Soạn bài viết.
 */
export const NEWS: NewsPost[] = [
  /* ── Số 1 · Tháng 9/2026 ──────────────────────────────────────────── */
  {
    id: 'bt-003',
    slug: 'huong-dan-dang-ky-su-kien-va-xuat-lich-hoat-dong',
    title: 'Hướng dẫn đăng ký sự kiện và xuất lịch hoạt động trên vsmcclubs',
    category: 'guide',
    author: 'Ban Truyền thông',
    publishedAt: '2026-09-09T07:30:00+07:00',
    summary:
      'Bài viết hướng dẫn học sinh thiết lập lộ trình, đăng ký và xác nhận đăng ký sự kiện trên vsmcclubs, đồng thời xuất lịch hoạt động sang ứng dụng lịch cá nhân.',
    body: [
      {
        kind: 'paragraph',
        text: 'Nhằm hỗ trợ học sinh chủ động tham gia hoạt động trong năm học 2026–2027, Ban Truyền thông tổng hợp các bước đăng ký sự kiện và quản lý lịch cá nhân trên vsmcclubs. Các sự kiện của câu lạc bộ chỉ hiển thị với học sinh sau khi được Hội đồng Học sinh kiểm duyệt và phê duyệt.',
      },
      { kind: 'heading', text: 'Bước 1. Thiết lập lộ trình' },
      {
        kind: 'paragraph',
        text: 'Trường hợp chưa thiết lập hồ sơ, học sinh chọn Bắt đầu thiết lập lộ trình tại trang Tổng quan, sau đó khai báo khối lớp, lĩnh vực quan tâm, mục tiêu, khoảng thời gian có thể tham gia và quỹ giờ mỗi tuần. Trên cơ sở đó, Mochi đề xuất các sự kiện phù hợp; học sinh xem xét đề xuất và nhấn Xác nhận lộ trình để đăng ký các sự kiện đã chọn.',
      },
      { kind: 'heading', text: 'Bước 2. Đăng ký từng sự kiện' },
      {
        kind: 'list',
        items: [
          'Mở mục Khám phá, sử dụng các bộ lọc Lĩnh vực, Khối được phép tham gia hoặc Hạn đăng ký để tìm sự kiện phù hợp.',
          'Tại trang chi tiết sự kiện, chọn Đăng ký.',
          'Kiểm tra thông tin tại hộp thoại Xác nhận đăng ký, gồm thời gian, địa điểm, số chỗ còn lại và hạn đăng ký; vsmcclubs cảnh báo khi sự kiện trùng lịch hoặc vượt quỹ giờ trong tuần.',
          'Nhấn Xác nhận để hoàn tất đăng ký.',
        ],
      },
      {
        kind: 'paragraph',
        text: 'Sự kiện đã đăng ký được bổ sung vào Lộ trình và Lịch của học sinh. Trường hợp không thể tham gia, học sinh chọn Hủy đăng ký và nhấn Xác nhận; chỗ đã đăng ký được mở lại cho học sinh khác.',
      },
      {
        kind: 'quote',
        text: 'Mochi có vai trò đề xuất sự kiện; mọi thao tác đăng ký hoặc hủy đăng ký chỉ được thực hiện sau khi học sinh nhấn Xác nhận.',
        source: 'Ban Truyền thông, Hội đồng Học sinh',
      },
      { kind: 'heading', text: 'Bước 3. Xuất lịch hoạt động' },
      {
        kind: 'list',
        items: [
          'Tại mục Lịch, chọn Xuất toàn bộ lịch để tạo tệp .ics gồm các sự kiện đã đăng ký; tệp có thể nhập vào ứng dụng lịch trên điện thoại hoặc máy tính.',
          'Đối với từng sự kiện, chọn Thêm vào Google Calendar hoặc Tải tệp .ics tại trang chi tiết sự kiện hoặc tại mục Lịch.',
        ],
      },
      {
        kind: 'paragraph',
        text: 'Mục Lịch đồng thời hiển thị các đợt kiểm tra định kỳ và kỳ nghỉ của năm học, qua đó giúp học sinh sắp xếp hoạt động phù hợp với lịch học.',
      },
    ],
    eventIds: [],
    clubIds: [],
    pinned: true,
  },
  /* ── Số 2 · Tháng 10/2026 ─────────────────────────────────────────── */
  {
    id: 'bt-010',
    slug: 'huong-dan-xac-nhan-tham-gia-va-hoan-thien-ho-so-nang-luc',
    title: 'Hướng dẫn xác nhận tham gia và hoàn thiện Hồ sơ năng lực',
    category: 'guide',
    author: 'Ban Truyền thông',
    publishedAt: '2026-10-19T07:30:00+07:00',
    summary:
      'Bài viết hướng dẫn học sinh xác nhận tham gia sự kiện đã diễn ra, bổ sung vai trò, phần tự đánh giá và minh chứng, sau đó in hoặc xuất Hồ sơ năng lực trên vsmcclubs.',
    body: [
      {
        kind: 'paragraph',
        text: 'Việc xác nhận tham gia sau mỗi sự kiện giúp học sinh tổng hợp đầy đủ hoạt động của năm học theo từng lĩnh vực. Ban Truyền thông hướng dẫn các bước thực hiện trên vsmcclubs như sau.',
      },
      { kind: 'heading', text: 'Bước 1. Xác nhận tham gia' },
      {
        kind: 'paragraph',
        text: 'Các sự kiện đã diễn ra trong lịch của học sinh được hiển thị tại mục Xác nhận tham gia trên trang Tổng quan và tại mục Sự kiện cần xác nhận tham gia trên trang Hồ sơ. Học sinh chọn Xác nhận đã tham gia đối với sự kiện đã tham dự, hoặc chọn Không tham gia nếu vắng mặt. Sau khi xác nhận, sự kiện được bổ sung vào Hồ sơ năng lực theo lĩnh vực.',
      },
      { kind: 'heading', text: 'Bước 2. Bổ sung thông tin hoạt động' },
      {
        kind: 'list',
        items: [
          'Chọn Chỉnh sửa tại mục hoạt động để cập nhật vai trò và số giờ.',
          'Trình bày phần tự đánh giá bằng lời văn của bản thân, gồm vai trò, điều đã học được và kế hoạch tiếp theo.',
          'Bổ sung minh chứng, mỗi dòng một đường dẫn, sau đó chọn Lưu thay đổi.',
        ],
      },
      {
        kind: 'paragraph',
        text: 'Học sinh có thể chọn Đề nghị Mochi soạn bản nháp để tham khảo. Bản nháp được lưu vào hồ sơ khi học sinh nhấn Lưu bản nháp vào hồ sơ trên thẻ của Mochi, hoặc được loại bỏ khi học sinh chọn Không lưu. Văn bản đã lưu được đánh dấu Bản nháp do Mochi đề xuất và chỉ trở thành nội dung của học sinh sau khi học sinh chỉnh sửa.',
      },
      { kind: 'heading', text: 'Bước 3. In và xuất hồ sơ' },
      {
        kind: 'paragraph',
        text: 'Tại trang Hồ sơ, học sinh chọn In hồ sơ (khổ A4) để in hồ sơ, hoặc chọn Xuất tệp JSON để lưu trữ dữ liệu hồ sơ. Phần tóm tắt của hồ sơ tổng hợp số hoạt động, tổng số giờ và số lĩnh vực đã tham gia.',
      },
      {
        kind: 'quote',
        text: 'Đề nghị học sinh xác nhận tham gia ngay sau mỗi sự kiện, qua đó đảm bảo Hồ sơ năng lực được cập nhật đầy đủ và chính xác.',
        source: 'Ban Truyền thông, Hội đồng Học sinh',
      },
    ],
    eventIds: [],
    clubIds: [],
  },
];
