// Dữ liệu minh họa phục vụ bản trình diễn. Thay thế bằng dữ liệu chính thức khi triển khai.
import type { NewsPost } from '../domain/types';

/** Council departments that sign articles (an article is signed by a department, never by a student). */
export const NEWS_DEPARTMENTS = ['Ban Truyền thông', 'Ban Học tập', 'Ban Phong trào', 'Ban Tổ chức'] as const;

/**
 * Articles of the Bản tin Hội đồng Học sinh, oldest first.
 * bt-001 … bt-009 are published between 03/09/2026 and 06/10/2026 (bt-009 is pinned);
 * bt-010 is scheduled for 19/10/2026 and stays hidden until then.
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
      'Hội đồng Học sinh thông báo kế hoạch tổ chức Lễ khai giảng năm học 2026–2027 vào Thứ Bảy, 05/09/2026 tại sân trường, dành cho học sinh các khối 10, 11 và 12.',
    body: [
      {
        kind: 'paragraph',
        text: 'Lễ khai giảng năm học 2026–2027 là sự kiện toàn trường chính thức mở đầu năm học mới, dành cho toàn thể học sinh nhà trường. Tại buổi lễ, học sinh được phổ biến kế hoạch năm học và các nhiệm vụ trọng tâm, đồng thời tham dự lễ tuyên dương học sinh tiêu biểu.',
      },
      { kind: 'heading', text: 'Thông tin sự kiện' },
      {
        kind: 'list',
        items: [
          'Sự kiện: Lễ khai giảng năm học 2026–2027.',
          'Thời gian: từ 07:00 đến 09:30, Thứ Bảy, 05/09/2026.',
          'Địa điểm: Sân trường.',
          'Đối tượng: học sinh các khối 10, 11 và 12.',
          'Đơn vị tổ chức: Hội đồng Học sinh.',
          'Hạn đăng ký: 23:59, Thứ Năm, 03/09/2026.',
        ],
      },
      { kind: 'heading', text: 'Nội dung chương trình' },
      {
        kind: 'paragraph',
        text: 'Chương trình gồm nghi thức chào cờ, diễn văn khai giảng của Ban Giám hiệu, tuyên dương học sinh đạt thành tích xuất sắc năm học trước và phần văn nghệ chào mừng do các câu lạc bộ phụ trách.',
      },
      { kind: 'heading', text: 'Yêu cầu đối với học sinh' },
      {
        kind: 'list',
        items: [
          'Có mặt tại sân trường trước 06:45 và tập trung theo vị trí của lớp.',
          'Mặc đồng phục theo quy định.',
          'Hoàn tất đăng ký trên Rodemap trước thời hạn: tại trang sự kiện, chọn Đăng ký và nhấn Xác nhận.',
        ],
      },
      {
        kind: 'paragraph',
        text: 'Kể từ số này, Bản tin Hội đồng Học sinh được phát hành hằng tháng tại mục Bản tin trên Rodemap nhằm cung cấp thông báo, tin hoạt động, giới thiệu câu lạc bộ và hướng dẫn sử dụng Rodemap tới học sinh toàn trường.',
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
        text: 'Sáng Thứ Bảy, 05/09/2026, từ 07:00 đến 09:30, Lễ khai giảng năm học 2026–2027 do Hội đồng Học sinh phụ trách tổ chức đã diễn ra tại sân trường. Buổi lễ dành cho học sinh các khối 10, 11 và 12, chính thức mở đầu năm học 2026–2027.',
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
        text: 'Thông qua buổi lễ, học sinh được phổ biến kế hoạch năm học và các nhiệm vụ trọng tâm, đồng thời tham dự lễ tuyên dương học sinh tiêu biểu.',
      },
      {
        kind: 'quote',
        text: 'Hội đồng Học sinh trân trọng cảm ơn Ban Giám hiệu và các câu lạc bộ đã phối hợp thực hiện chương trình.',
        source: 'Ban Tổ chức, Hội đồng Học sinh',
      },
      { kind: 'heading', text: 'Theo dõi các hoạt động tiếp theo' },
      {
        kind: 'paragraph',
        text: 'Các sự kiện tiếp theo của năm học được Hội đồng Học sinh kiểm duyệt và công bố tại mục Khám phá trên Rodemap. Học sinh theo dõi thời gian, địa điểm và hạn đăng ký của từng sự kiện, qua đó chủ động sắp xếp hoạt động phù hợp với lịch học. Thông báo về các sự kiện toàn trường được đăng tải đồng thời trên Bản tin Hội đồng Học sinh.',
      },
    ],
    eventIds: ['ev-001'],
    clubIds: ['hdhs'],
  },
  {
    id: 'bt-003',
    slug: 'huong-dan-dang-ky-su-kien-va-xuat-lich-hoat-dong',
    title: 'Hướng dẫn đăng ký sự kiện và xuất lịch hoạt động trên Rodemap',
    category: 'guide',
    author: 'Ban Truyền thông',
    publishedAt: '2026-09-09T07:30:00+07:00',
    summary:
      'Bài viết hướng dẫn học sinh thiết lập lộ trình, đăng ký sự kiện, xác nhận thao tác và đưa lịch hoạt động sang ứng dụng lịch cá nhân trên Rodemap.',
    body: [
      {
        kind: 'paragraph',
        text: 'Nhằm hỗ trợ học sinh chủ động tham gia hoạt động trong năm học 2026–2027, Ban Truyền thông tổng hợp các bước đăng ký sự kiện và quản lý lịch cá nhân trên Rodemap. Các sự kiện của câu lạc bộ chỉ hiển thị với học sinh sau khi được Hội đồng Học sinh kiểm duyệt và phê duyệt.',
      },
      { kind: 'heading', text: 'Bước 1. Thiết lập lộ trình' },
      {
        kind: 'paragraph',
        text: 'Tại trang Tổng quan, học sinh chưa thiết lập hồ sơ chọn Bắt đầu thiết lập lộ trình, sau đó khai báo khối lớp, lĩnh vực quan tâm, mục tiêu, khoảng thời gian có thể tham gia và quỹ giờ mỗi tuần. Trên cơ sở đó, Mochi đề xuất các sự kiện phù hợp; học sinh xem xét đề xuất và nhấn Xác nhận lộ trình để đăng ký các sự kiện đã chọn.',
      },
      { kind: 'heading', text: 'Bước 2. Đăng ký từng sự kiện' },
      {
        kind: 'list',
        items: [
          'Mở mục Khám phá, sử dụng các bộ lọc Lĩnh vực, Khối được phép tham gia hoặc Hạn đăng ký để tìm sự kiện phù hợp.',
          'Tại trang chi tiết sự kiện, chọn Đăng ký.',
          'Kiểm tra bảng xác nhận gồm thời gian, địa điểm, số chỗ còn lại và hạn đăng ký; Rodemap cảnh báo khi sự kiện trùng lịch hoặc vượt quỹ giờ trong tuần.',
          'Nhấn Xác nhận để hoàn tất đăng ký.',
        ],
      },
      {
        kind: 'paragraph',
        text: 'Sự kiện đã đăng ký được bổ sung vào Lộ trình và Lịch của học sinh. Trường hợp không thể tham gia, học sinh chọn Hủy đăng ký và nhấn Xác nhận; chỗ của học sinh được mở lại cho học sinh khác đăng ký.',
      },
      {
        kind: 'quote',
        text: 'Mochi chỉ đề xuất sự kiện; mọi thao tác đăng ký hoặc hủy đăng ký đều chỉ được thực hiện sau khi học sinh nhấn Xác nhận.',
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
  },
  {
    id: 'bt-004',
    slug: 'thong-bao-to-chuc-ngay-hoi-cau-lac-bo-nam-hoc-2026-2027',
    title: 'Thông báo tổ chức Ngày hội Câu lạc bộ năm học 2026–2027',
    category: 'announcement',
    author: 'Ban Tổ chức',
    publishedAt: '2026-09-10T07:30:00+07:00',
    summary:
      'Ngày hội Câu lạc bộ năm học 2026–2027 diễn ra vào Thứ Bảy, 19/09/2026 tại Sân trường và Nhà thi đấu đa năng; học sinh đăng ký trên Rodemap trước 23:59 ngày 17/09/2026.',
    body: [
      {
        kind: 'paragraph',
        text: 'Hội đồng Học sinh thông báo tổ chức Ngày hội Câu lạc bộ năm học 2026–2027 nhằm giới thiệu hoạt động của các câu lạc bộ trong trường tới học sinh toàn trường, đặc biệt là học sinh khối 10. Tại ngày hội, học sinh được tìm hiểu kế hoạch hoạt động, trao đổi trực tiếp với ban chủ nhiệm và đăng ký tham gia câu lạc bộ phù hợp.',
      },
      { kind: 'heading', text: 'Thông tin sự kiện' },
      {
        kind: 'list',
        items: [
          'Sự kiện: Ngày hội Câu lạc bộ năm học 2026–2027.',
          'Thời gian: từ 07:30 đến 11:00, Thứ Bảy, 19/09/2026.',
          'Địa điểm: Sân trường và Nhà thi đấu đa năng.',
          'Đối tượng: học sinh các khối 10, 11 và 12.',
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
        text: 'Trước ngày hội, học sinh tham khảo thông tin các câu lạc bộ tại mục Câu lạc bộ trên Rodemap, qua đó xác định câu lạc bộ phù hợp với lĩnh vực quan tâm. Học sinh đăng ký tham dự ngày hội tại trang sự kiện bằng cách chọn Đăng ký và nhấn Xác nhận trước thời hạn nêu trên.',
      },
      {
        kind: 'quote',
        text: 'Ngày hội là dịp để học sinh khối 10 tìm hiểu các câu lạc bộ và lựa chọn hoạt động phù hợp ngay từ đầu năm học.',
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
        text: 'Sáng Thứ Bảy, 19/09/2026, từ 07:30 đến 11:00, Ngày hội Câu lạc bộ năm học 2026–2027 do Hội đồng Học sinh tổ chức đã diễn ra tại Sân trường và Nhà thi đấu đa năng. Ngày hội dành cho học sinh các khối 10, 11 và 12, đặc biệt là học sinh khối 10.',
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
        text: 'Học sinh chưa có điều kiện tham dự ngày hội có thể tra cứu thông tin của từng câu lạc bộ tại mục Câu lạc bộ trên Rodemap, gồm phần giới thiệu, sự kiện sắp diễn ra và sự kiện đã tổ chức. Trong các số tiếp theo, Bản tin Hội đồng Học sinh lần lượt giới thiệu hoạt động của các câu lạc bộ trong trường.',
      },
    ],
    eventIds: ['ev-003'],
    clubIds: ['hdhs'],
  },
  {
    id: 'bt-006',
    slug: 'gioi-thieu-cau-lac-bo-tinh-nguyen-xanh',
    title: 'Giới thiệu Câu lạc bộ Tình nguyện Xanh',
    category: 'club',
    author: 'Ban Phong trào',
    publishedAt: '2026-09-23T07:30:00+07:00',
    summary:
      'Câu lạc bộ Tình nguyện Xanh triển khai các hoạt động bảo vệ môi trường và thiện nguyện trong khuôn viên trường và tại cộng đồng, đồng thời xác nhận giờ hoạt động tình nguyện cho học sinh.',
    body: [
      {
        kind: 'paragraph',
        text: 'Câu lạc bộ Tình nguyện Xanh triển khai các hoạt động bảo vệ môi trường và thiện nguyện trong khuôn viên trường và tại cộng đồng. Câu lạc bộ phối hợp với các đơn vị địa phương tổ chức chương trình và xác nhận giờ hoạt động tình nguyện cho học sinh.',
      },
      { kind: 'heading', text: 'Các chương trình trong học kỳ I' },
      {
        kind: 'paragraph',
        text: 'Theo lịch sự kiện đã được Hội đồng Học sinh phê duyệt, câu lạc bộ tổ chức các chương trình sau, dành cho học sinh các khối 10, 11 và 12:',
      },
      {
        kind: 'list',
        items: [
          'Chương trình Chủ nhật Xanh: Vệ sinh khuôn viên trường và tuyến phố lân cận (từ 07:30 đến 10:00, Chủ nhật, 27/09/2026, tại Cổng trường và tuyến phố lân cận; hạn đăng ký 23:59, Thứ Sáu, 25/09/2026).',
          'Chương trình Quyên góp sách cho thư viện trường vùng cao (từ 08:30 đến 11:00, Thứ Bảy, 10/10/2026, tại Thư viện trường; hạn đăng ký 23:59, Thứ Năm, 08/10/2026).',
          'Hoạt động trồng cây xanh tại công viên khu vực (từ 07:30 đến 11:00, Thứ Bảy, 24/10/2026, tại Công viên khu vực lân cận trường; hạn đăng ký 23:59, Thứ Tư, 21/10/2026).',
          'Chương trình Áo ấm mùa đông: Tiếp nhận và phân loại hiện vật quyên góp (từ 08:00 đến 11:30, Thứ Bảy, 28/11/2026, tại Nhà thi đấu đa năng; hạn đăng ký 23:59, Thứ Tư, 25/11/2026).',
        ],
      },
      { kind: 'heading', text: 'Hình thức tham gia' },
      {
        kind: 'paragraph',
        text: 'Tại Chương trình Chủ nhật Xanh, học sinh được chia thành các nhóm phụ trách từng khu vực, được phát găng tay, túi đựng rác và hướng dẫn phân loại rác thải tại nguồn trước khi bắt đầu. Đối với chương trình quyên góp sách, học sinh có thể mang theo sách giáo khoa, sách tham khảo và truyện thiếu nhi còn sử dụng tốt để đóng góp; các nhóm phụ trách kiểm tra tình trạng sách, phân loại theo cấp học, dán nhãn và đóng thùng.',
      },
      {
        kind: 'paragraph',
        text: 'Học sinh tham gia đầy đủ chương trình được câu lạc bộ xác nhận giờ hoạt động tình nguyện. Sau mỗi sự kiện, học sinh chọn Xác nhận đã tham gia trên Rodemap để hoạt động được bổ sung vào Hồ sơ năng lực.',
      },
    ],
    eventIds: ['ev-006', 'ev-012', 'ev-020', 'ev-029'],
    clubIds: ['tinh-nguyen-xanh'],
  },

  /* ── Số 2 · Tháng 10/2026 ─────────────────────────────────────────── */
  {
    id: 'bt-007',
    slug: 'gioi-thieu-cau-lac-bo-tranh-bien',
    title: 'Giới thiệu Câu lạc bộ Tranh biện',
    category: 'club',
    author: 'Ban Học tập',
    publishedAt: '2026-10-01T07:30:00+07:00',
    summary:
      'Câu lạc bộ Tranh biện tổ chức sinh hoạt, tập huấn và giải đấu nhằm phát triển tư duy phản biện và kỹ năng lập luận; vòng loại giải cấp trường diễn ra ngày 21/10/2026.',
    body: [
      {
        kind: 'paragraph',
        text: 'Câu lạc bộ Tranh biện tổ chức các buổi sinh hoạt, tập huấn và giải đấu nhằm phát triển tư duy phản biện và kỹ năng lập luận của học sinh. Câu lạc bộ phụ trách Giải Tranh biện cấp trường và tuyển chọn đội tuyển tham gia các giải đấu bên ngoài nhà trường.',
      },
      { kind: 'heading', text: 'Buổi sinh hoạt định hướng đầu năm học' },
      {
        kind: 'paragraph',
        text: 'Chiều Thứ Ba, 22/09/2026, từ 16:45 đến 18:15, câu lạc bộ đã tổ chức Buổi sinh hoạt định hướng: Kỹ năng tranh biện căn bản tại Phòng 204. Nội dung gồm giới thiệu các thể thức tranh biện phổ biến, phương pháp phân tích kiến nghị và cách tổ chức luận điểm, dẫn chứng; phần thực hành được tổ chức theo nhóm bốn học sinh.',
      },
      { kind: 'heading', text: 'Giải Tranh biện cấp trường năm học 2026–2027' },
      {
        kind: 'list',
        items: [
          'Giải Tranh biện cấp trường năm học 2026–2027: Vòng loại (từ 16:45 đến 18:30, Thứ Tư, 21/10/2026, tại Phòng 201 và Phòng 202; dành cho học sinh các khối 10, 11 và 12; hạn đăng ký 23:59, Thứ Sáu, 16/10/2026).',
          'Giải Tranh biện cấp trường năm học 2026–2027: Vòng chung kết (từ 08:00 đến 11:30, Thứ Bảy, 10/04/2027, tại Hội trường A; học sinh các khối 10, 11 và 12 tham dự với vai trò khán giả; hạn đăng ký 23:59, Thứ Tư, 07/04/2027).',
        ],
      },
      {
        kind: 'paragraph',
        text: 'Tại vòng loại, các đội ba học sinh thi đấu theo thể thức tranh biện ba người với kiến nghị được công bố mười lăm phút trước giờ thi đấu. Ban giám khảo gồm giáo viên và thành viên ban chủ nhiệm câu lạc bộ, đánh giá theo tiêu chí nội dung lập luận, khả năng phản biện và phong cách trình bày. Các đội xuất sắc được chọn vào vòng chung kết tổ chức trong học kỳ II.',
      },
      {
        kind: 'paragraph',
        text: 'Học sinh quan tâm theo dõi sự kiện của câu lạc bộ tại mục Câu lạc bộ trên Rodemap và đăng ký vòng loại tại trang sự kiện trước thời hạn nêu trên.',
      },
    ],
    eventIds: ['ev-004', 'ev-018', 'ev-042'],
    clubIds: ['tranh-bien'],
  },
  {
    id: 'bt-008',
    slug: 'hoc-sinh-tim-hieu-to-hop-mon-hoc-va-nganh-hoc',
    title: 'Học sinh tìm hiểu mối liên hệ giữa tổ hợp môn học và ngành học tại Hội trường A',
    category: 'activity',
    author: 'Ban Học tập',
    publishedAt: '2026-10-05T16:30:00+07:00',
    summary:
      'Sáng Thứ Bảy, 03/10/2026, Câu lạc bộ Hướng nghiệp tổ chức Hội thảo Định hướng lựa chọn tổ hợp môn học và ngành học tại Hội trường A, dành cho học sinh các khối.',
    body: [
      {
        kind: 'paragraph',
        text: 'Sáng Thứ Bảy, 03/10/2026, từ 08:00 đến 11:30, Câu lạc bộ Hướng nghiệp đã tổ chức Hội thảo Định hướng lựa chọn tổ hợp môn học và ngành học tại Hội trường A. Hội thảo dành cho học sinh các khối 10, 11 và 12, nhằm cung cấp thông tin về mối liên hệ giữa tổ hợp môn học ở bậc trung học phổ thông và các nhóm ngành đào tạo đại học.',
      },
      { kind: 'heading', text: 'Nội dung hội thảo' },
      {
        kind: 'list',
        items: [
          'Chương trình có sự tham gia của chuyên viên tư vấn tuyển sinh và cựu học sinh đang theo học tại các trường đại học.',
          'Học sinh tham gia phần trắc nghiệm sở thích nghề nghiệp.',
          'Học sinh trao đổi trực tiếp với diễn giả về yêu cầu tuyển sinh của từng nhóm ngành.',
          'Học sinh được tư vấn cách xác định thế mạnh cá nhân và xây dựng kế hoạch học tập phù hợp với định hướng nghề nghiệp.',
        ],
      },
      { kind: 'heading', text: 'Về đơn vị tổ chức' },
      {
        kind: 'paragraph',
        text: 'Câu lạc bộ Hướng nghiệp cung cấp thông tin về ngành học, nghề nghiệp và tuyển sinh thông qua hội thảo, tọa đàm và ngày hội. Câu lạc bộ hỗ trợ học sinh tìm hiểu năng lực bản thân và xây dựng kế hoạch học tập phù hợp với định hướng nghề nghiệp.',
      },
      { kind: 'heading', text: 'Đề nghị đối với học sinh đã tham dự' },
      {
        kind: 'paragraph',
        text: 'Học sinh đã đăng ký và tham dự hội thảo chọn Xác nhận đã tham gia tại mục Xác nhận tham gia trên trang Tổng quan hoặc tại trang Hồ sơ. Sau khi xác nhận, hội thảo được bổ sung vào Hồ sơ năng lực cùng vai trò, số giờ và phần tự đánh giá, qua đó góp phần hoàn thiện hồ sơ hoạt động của học sinh trong năm học.',
      },
    ],
    eventIds: ['ev-009'],
    clubIds: ['huong-nghiep'],
  },
  {
    id: 'bt-009',
    slug: 'thong-bao-han-dang-ky-su-kien-thang-10-2026',
    title: 'Thông báo hạn đăng ký sự kiện tháng 10/2026 và lịch Kiểm tra định kỳ giữa học kỳ I',
    category: 'announcement',
    author: 'Ban Tổ chức',
    publishedAt: '2026-10-06T07:00:00+07:00',
    summary:
      'Hội đồng Học sinh tổng hợp hạn đăng ký của một số sự kiện trong tháng 10/2026 và lưu ý lịch Kiểm tra định kỳ giữa học kỳ I từ 02/11/2026 đến 07/11/2026.',
    body: [
      {
        kind: 'paragraph',
        text: 'Trong tháng 10/2026, nhiều sự kiện của các câu lạc bộ đã được Hội đồng Học sinh phê duyệt và mở đăng ký trên Rodemap. Nhằm giúp học sinh chủ động sắp xếp thời gian, Ban Tổ chức tổng hợp thông tin các sự kiện có hạn đăng ký trong tháng như sau.',
      },
      { kind: 'heading', text: 'Sự kiện sắp đóng đăng ký' },
      {
        kind: 'list',
        items: [
          'Buổi thực hành: Lắp ráp và lập trình robot dò đường, do Câu lạc bộ Robotics tổ chức (từ 08:00 đến 11:30, Thứ Bảy, 10/10/2026, tại Phòng Công nghệ; dành cho học sinh các khối 10, 11 và 12; hạn đăng ký 23:59, Thứ Năm, 08/10/2026).',
          'Buổi luyện tập trực tuyến: Thuyết trình học thuật bằng tiếng Anh, do Câu lạc bộ Hùng biện Tiếng Anh tổ chức (từ 19:30 đến 21:00, Thứ Ba, 13/10/2026, Trực tuyến – Google Meet; dành cho học sinh các khối 10, 11 và 12; hạn đăng ký 23:59, Thứ Hai, 12/10/2026).',
          'Cuộc thi Phân tích dữ liệu học đường cấp trường, do Câu lạc bộ Khoa học Dữ liệu tổ chức (từ 08:00 đến 11:30, Thứ Bảy, 17/10/2026, tại Phòng Tin học 1 và Phòng Tin học 2; dành cho học sinh khối 11 và khối 12; hạn đăng ký 23:59, Thứ Tư, 14/10/2026).',
          'Buổi ôn tập trực tuyến: Hệ thống hóa kiến thức Toán giữa học kỳ I, do Câu lạc bộ Toán học tổ chức (từ 19:30 đến 21:00, Thứ Năm, 29/10/2026, Trực tuyến – Google Meet; dành cho học sinh các khối 10, 11 và 12; hạn đăng ký 23:59, Thứ Tư, 28/10/2026).',
        ],
      },
      {
        kind: 'paragraph',
        text: 'Cuộc thi Phân tích dữ liệu học đường cấp trường được tổ chức theo đội, mỗi đội gồm ba học sinh. Học sinh kiểm tra số chỗ còn lại tại bảng xác nhận trước khi nhấn Xác nhận để hoàn tất đăng ký.',
      },
      { kind: 'heading', text: 'Lịch Kiểm tra định kỳ giữa học kỳ I' },
      {
        kind: 'paragraph',
        text: 'Kiểm tra định kỳ giữa học kỳ I diễn ra từ Thứ Hai, 02/11/2026 đến Thứ Bảy, 07/11/2026. Lịch sự kiện đã phê duyệt không bố trí hoạt động trong thời gian này, nhằm đảm bảo học sinh tập trung ôn tập. Học sinh lưu ý cân đối quỹ giờ hoạt động trong các tuần trước kỳ kiểm tra; mục Lịch trên Rodemap hiển thị đợt kiểm tra cùng các sự kiện đã đăng ký, đồng thời cảnh báo khi có sự kiện trùng lịch.',
      },
      {
        kind: 'quote',
        text: 'Đề nghị học sinh hoàn tất đăng ký trước thời hạn và chỉ đăng ký các sự kiện có thể tham gia đầy đủ, qua đó đảm bảo chỗ cho học sinh khác có nhu cầu.',
        source: 'Ban Tổ chức, Hội đồng Học sinh',
      },
    ],
    eventIds: ['ev-011', 'ev-013', 'ev-016', 'ev-023'],
    clubIds: ['robotics', 'hung-bien-tieng-anh', 'khoa-hoc-du-lieu', 'toan-hoc'],
    pinned: true,
  },
  {
    id: 'bt-010',
    slug: 'huong-dan-xac-nhan-tham-gia-va-hoan-thien-ho-so-nang-luc',
    title: 'Hướng dẫn xác nhận tham gia và hoàn thiện Hồ sơ năng lực',
    category: 'guide',
    author: 'Ban Truyền thông',
    publishedAt: '2026-10-19T07:30:00+07:00',
    summary:
      'Bài viết hướng dẫn học sinh xác nhận tham gia sự kiện đã diễn ra, bổ sung vai trò, phần tự đánh giá và minh chứng, sau đó in hoặc xuất Hồ sơ năng lực trên Rodemap.',
    body: [
      {
        kind: 'paragraph',
        text: 'Việc xác nhận tham gia sau mỗi sự kiện giúp học sinh tổng hợp đầy đủ hoạt động của năm học theo từng lĩnh vực. Ban Truyền thông hướng dẫn các bước thực hiện trên Rodemap như sau.',
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
          'Trình bày phần tự đánh giá bằng lời văn của học sinh, gồm vai trò, điều đã học được và kế hoạch tiếp theo.',
          'Bổ sung minh chứng, mỗi dòng một đường dẫn, sau đó chọn Lưu thay đổi.',
        ],
      },
      {
        kind: 'paragraph',
        text: 'Học sinh có thể chọn Đề nghị Mochi soạn bản nháp để tham khảo. Nội dung này được đánh dấu Bản nháp do Mochi đề xuất và chỉ trở thành nội dung của học sinh sau khi được chỉnh sửa.',
      },
      { kind: 'heading', text: 'Bước 3. In và xuất hồ sơ' },
      {
        kind: 'paragraph',
        text: 'Tại trang Hồ sơ, học sinh chọn In hồ sơ (khổ A4) để in hồ sơ trình bày theo khổ giấy A4, hoặc chọn Xuất tệp JSON để lưu dữ liệu hồ sơ dưới dạng tệp. Phần tóm tắt của hồ sơ tổng hợp số hoạt động, tổng số giờ và số lĩnh vực đã tham gia.',
      },
      {
        kind: 'quote',
        text: 'Học sinh xác nhận tham gia ngay sau mỗi sự kiện, qua đó đảm bảo Hồ sơ năng lực được cập nhật đầy đủ và chính xác.',
        source: 'Ban Truyền thông, Hội đồng Học sinh',
      },
    ],
    eventIds: [],
    clubIds: [],
  },
];
