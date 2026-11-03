// Dữ liệu minh họa phục vụ bản trình diễn. Thay thế bằng dữ liệu chính thức khi triển khai.
import type { NewsPost } from '../domain/types';

/** Council departments that sign articles (an article is signed by a department, never by a student). */
export const NEWS_DEPARTMENTS = ['Ban Truyền thông', 'Ban Học tập', 'Ban Phong trào', 'Ban Tổ chức'] as const;

/**
 * Articles of the Bản tin Hội đồng Học sinh, oldest first.
 * bt-001 … bt-005 are published between 03/09/2026 and 21/09/2026 (bt-003, the registration
 * guide, is pinned); bt-010 is scheduled for 19/10/2026 and stays hidden until then. The articles
 * about the former demo clubs and their events (bt-006 … bt-009) were removed on 03/11/2026 with
 * those clubs; their ids are not reused.
 * Facts about events quote src/data/events.ts; exam weeks quote src/data/calendar.ts.
 */
export const NEWS: NewsPost[] = [
  /* ── Số 1 · Tháng 9/2026 ──────────────────────────────────────────── */
  {
    id: 'bt-001',
    slug: 'thong-bao-to-chuc-le-khai-giang-nam-hoc-2026-2027',
    title: 'Thông báo tổ chức Lễ khai giảng năm học 2026–2027',
    category: 'announcement',
    author: 'Ban Tổ chức',
    publishedAt: '2026-09-03T07:30:00+07:00',
    summary:
      'Hội đồng Học sinh thông báo kế hoạch tổ chức Lễ khai giảng năm học 2026–2027 vào Thứ Bảy, 05/09/2026, tại sân trường, dành cho học sinh toàn trường từ khối 6 đến khối 12.',
    body: [
      {
        kind: 'paragraph',
        text: 'Lễ khai giảng năm học 2026–2027 là sự kiện chính thức mở đầu năm học mới, dành cho toàn thể học sinh nhà trường. Tại buổi lễ, học sinh được phổ biến kế hoạch năm học và các nhiệm vụ trọng tâm, đồng thời tham dự lễ tuyên dương học sinh tiêu biểu.',
      },
      { kind: 'heading', text: 'Thông tin sự kiện' },
      {
        kind: 'list',
        items: [
          'Sự kiện: Lễ khai giảng năm học 2026–2027.',
          'Thời gian: từ 07:00 đến 09:30, Thứ Bảy, 05/09/2026.',
          'Địa điểm: Sân trường.',
          'Đối tượng: học sinh toàn trường, từ khối 6 đến khối 12.',
          'Đơn vị tổ chức: Hội đồng Học sinh.',
          'Hạn đăng ký: 23:59, Thứ Năm, 03/09/2026.',
        ],
      },
      { kind: 'heading', text: 'Nội dung chương trình' },
      {
        kind: 'paragraph',
        text: 'Chương trình gồm nghi thức chào cờ, diễn văn khai giảng của Ban Giám hiệu, tuyên dương học sinh đạt thành tích xuất sắc năm học trước và phần văn nghệ chào mừng do các câu lạc bộ phụ trách.',
      },
      { kind: 'heading', text: 'Lưu ý đối với học sinh' },
      {
        kind: 'list',
        items: [
          'Có mặt tại sân trường trước 06:45 và tập trung theo vị trí của lớp.',
          'Mặc đồng phục theo quy định.',
          'Đăng ký trên vsmcclubs trong thời hạn nêu trên để buổi lễ được bổ sung vào Lộ trình và Lịch: tại trang sự kiện, chọn Đăng ký và nhấn Xác nhận.',
        ],
      },
      {
        kind: 'paragraph',
        text: 'Kể từ số này, Bản tin Hội đồng Học sinh được phát hành hằng tháng tại mục Bản tin trên vsmcclubs nhằm cung cấp cho học sinh toàn trường các thông báo, tin hoạt động, bài giới thiệu câu lạc bộ và hướng dẫn sử dụng ứng dụng.',
      },
    ],
    eventIds: ['ev-001'],
    clubIds: ['hdhs'],
  },
  {
    id: 'bt-002',
    slug: 'nhin-lai-le-khai-giang-nam-hoc-2026-2027',
    title: 'Nhìn lại Lễ khai giảng năm học 2026–2027',
    category: 'activity',
    author: 'Ban Truyền thông',
    publishedAt: '2026-09-07T16:30:00+07:00',
    summary:
      'Sáng Thứ Bảy, 05/09/2026, Lễ khai giảng năm học 2026–2027 diễn ra tại sân trường, chính thức mở đầu năm học mới của học sinh toàn trường.',
    body: [
      {
        kind: 'paragraph',
        text: 'Sáng Thứ Bảy, 05/09/2026, từ 07:00 đến 09:30, Lễ khai giảng năm học 2026–2027 do Hội đồng Học sinh tổ chức đã diễn ra tại sân trường. Buổi lễ dành cho học sinh toàn trường, từ khối 6 đến khối 12, chính thức mở đầu năm học mới.',
      },
      { kind: 'heading', text: 'Chương trình buổi lễ' },
      {
        kind: 'list',
        items: [
          'Nghi thức chào cờ.',
          'Diễn văn khai giảng của Ban Giám hiệu.',
          'Tuyên dương học sinh đạt thành tích xuất sắc năm học trước.',
          'Phần văn nghệ chào mừng do các câu lạc bộ phụ trách.',
        ],
      },
      {
        kind: 'paragraph',
        text: 'Thông qua buổi lễ, học sinh được phổ biến kế hoạch năm học và các nhiệm vụ trọng tâm.',
      },
      {
        kind: 'quote',
        text: 'Hội đồng Học sinh trân trọng cảm ơn Ban Giám hiệu và các câu lạc bộ đã phối hợp thực hiện chương trình.',
        source: 'Ban Tổ chức, Hội đồng Học sinh',
      },
      { kind: 'heading', text: 'Theo dõi các hoạt động tiếp theo' },
      {
        kind: 'paragraph',
        text: 'Các sự kiện tiếp theo của năm học được Hội đồng Học sinh kiểm duyệt và công bố tại mục Khám phá trên vsmcclubs. Học sinh theo dõi thời gian, địa điểm và hạn đăng ký của từng sự kiện, qua đó chủ động sắp xếp hoạt động phù hợp với lịch học. Thông báo về các sự kiện toàn trường được đăng tải đồng thời trên Bản tin Hội đồng Học sinh.',
      },
    ],
    eventIds: ['ev-001'],
    clubIds: ['hdhs'],
  },
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
  {
    id: 'bt-004',
    slug: 'thong-bao-to-chuc-ngay-hoi-cau-lac-bo-nam-hoc-2026-2027',
    title: 'Thông báo tổ chức Ngày hội Câu lạc bộ năm học 2026–2027',
    category: 'announcement',
    author: 'Ban Tổ chức',
    publishedAt: '2026-09-10T07:30:00+07:00',
    summary:
      'Ngày hội Câu lạc bộ năm học 2026–2027 diễn ra vào Thứ Bảy, 19/09/2026, tại Sân trường và Nhà thi đấu đa năng; hạn đăng ký trên vsmcclubs là 23:59, Thứ Năm, 17/09/2026.',
    body: [
      {
        kind: 'paragraph',
        text: 'Hội đồng Học sinh thông báo tổ chức Ngày hội Câu lạc bộ năm học 2026–2027 nhằm giới thiệu hoạt động của các câu lạc bộ tới học sinh toàn trường, đặc biệt là học sinh khối 6 và khối 10. Tại ngày hội, học sinh được tìm hiểu kế hoạch hoạt động, trao đổi trực tiếp với ban chủ nhiệm và đăng ký tham gia câu lạc bộ phù hợp.',
      },
      { kind: 'heading', text: 'Thông tin sự kiện' },
      {
        kind: 'list',
        items: [
          'Sự kiện: Ngày hội Câu lạc bộ năm học 2026–2027.',
          'Thời gian: từ 07:30 đến 11:00, Thứ Bảy, 19/09/2026.',
          'Địa điểm: Sân trường và Nhà thi đấu đa năng.',
          'Đối tượng: học sinh toàn trường, từ khối 6 đến khối 12.',
          'Đơn vị tổ chức: Hội đồng Học sinh.',
          'Hạn đăng ký: 23:59, Thứ Năm, 17/09/2026.',
        ],
      },
      { kind: 'heading', text: 'Nội dung ngày hội' },
      {
        kind: 'paragraph',
        text: 'Mỗi câu lạc bộ bố trí một gian trưng bày giới thiệu thành tích, kế hoạch hoạt động năm học và tiêu chí tuyển thành viên. Hội đồng Học sinh phụ trách điều phối chương trình, đồng thời tổ chức phần trình diễn của các câu lạc bộ nghệ thuật và thể thao tại sân khấu chính.',
      },
      { kind: 'heading', text: 'Đề nghị đối với học sinh' },
      {
        kind: 'paragraph',
        text: 'Trước ngày hội, học sinh tham khảo thông tin các câu lạc bộ tại mục Câu lạc bộ trên vsmcclubs, qua đó xác định câu lạc bộ phù hợp với lĩnh vực quan tâm. Học sinh đăng ký tham dự ngày hội tại trang sự kiện bằng cách chọn Đăng ký và nhấn Xác nhận trước thời hạn nêu trên.',
      },
      {
        kind: 'quote',
        text: 'Ngày hội là dịp để học sinh khối 6 và khối 10 tìm hiểu các câu lạc bộ và lựa chọn hoạt động phù hợp ngay từ đầu năm học.',
        source: 'Ban Tổ chức, Hội đồng Học sinh',
      },
    ],
    eventIds: ['ev-003'],
    clubIds: ['hdhs'],
  },
  {
    id: 'bt-005',
    slug: 'ngay-hoi-cau-lac-bo-nam-hoc-2026-2027-da-dien-ra',
    title: 'Ngày hội Câu lạc bộ năm học 2026–2027 đã diễn ra tại Sân trường và Nhà thi đấu đa năng',
    category: 'activity',
    author: 'Ban Phong trào',
    publishedAt: '2026-09-21T16:30:00+07:00',
    summary:
      'Sáng Thứ Bảy, 19/09/2026, Ngày hội Câu lạc bộ năm học 2026–2027 diễn ra tại Sân trường và Nhà thi đấu đa năng, giới thiệu hoạt động của các câu lạc bộ tới học sinh toàn trường.',
    body: [
      {
        kind: 'paragraph',
        text: 'Sáng Thứ Bảy, 19/09/2026, từ 07:30 đến 11:00, Ngày hội Câu lạc bộ năm học 2026–2027 do Hội đồng Học sinh tổ chức đã diễn ra tại Sân trường và Nhà thi đấu đa năng. Ngày hội dành cho học sinh toàn trường, từ khối 6 đến khối 12, đặc biệt là học sinh khối 6 và khối 10.',
      },
      { kind: 'heading', text: 'Hoạt động tại ngày hội' },
      {
        kind: 'list',
        items: [
          'Các câu lạc bộ bố trí gian trưng bày giới thiệu thành tích, kế hoạch hoạt động năm học và tiêu chí tuyển thành viên.',
          'Học sinh tìm hiểu kế hoạch hoạt động và trao đổi trực tiếp với ban chủ nhiệm các câu lạc bộ.',
          'Học sinh đăng ký tham gia câu lạc bộ phù hợp.',
          'Phần trình diễn của các câu lạc bộ nghệ thuật và thể thao được tổ chức tại sân khấu chính.',
        ],
      },
      {
        kind: 'paragraph',
        text: 'Hội đồng Học sinh phụ trách điều phối chương trình, qua đó tạo điều kiện để học sinh tiếp cận hoạt động của các câu lạc bộ ngay từ đầu năm học.',
      },
      {
        kind: 'quote',
        text: 'Hội đồng Học sinh trân trọng cảm ơn ban chủ nhiệm và thành viên các câu lạc bộ đã phối hợp tổ chức ngày hội.',
        source: 'Ban Phong trào, Hội đồng Học sinh',
      },
      { kind: 'heading', text: 'Tiếp tục tìm hiểu câu lạc bộ' },
      {
        kind: 'paragraph',
        text: 'Học sinh chưa có điều kiện tham dự ngày hội có thể tra cứu thông tin của từng câu lạc bộ tại mục Câu lạc bộ trên vsmcclubs, gồm phần giới thiệu, sự kiện sắp diễn ra và sự kiện đã tổ chức. Trong các số tiếp theo, Bản tin Hội đồng Học sinh lần lượt giới thiệu hoạt động của các câu lạc bộ trong trường.',
      },
    ],
    eventIds: ['ev-003'],
    clubIds: ['hdhs'],
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
