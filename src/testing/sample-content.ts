/**
 * Sample content for tests only: the app never imports this module, so nothing here is shown on
 * vsmcclubs. It keeps the former sample events of the Hội đồng Học sinh and Phòng Cố vấn Học tập,
 * the sample newsletter articles, student proposals and school calendar (all removed from the site
 * on 03/11/2026) and the grade 11 sample student, so flows that need open events (registration, Lộ
 * trình, Lịch, .ics, Mochi, moderation, Đề xuất) can still be exercised. Unit tests see it merged into
 * src/data through src/testing/setup.ts; browser tests load it into the saved state.
 */
import type { ActivityProposal, CalendarPeriod, NewsPost, PortfolioEntry, Profile, ProposalResponse, Registration, SchoolEvent } from '../domain/types';

/** ev-001 … ev-045: council events; ev-051 … ev-054: external competitions relayed by the office. */
export const SAMPLE_EVENTS: SchoolEvent[] = [
  /* ── Hội đồng Học sinh ───────────────────────────────────────────── */
  {
    id: 'ev-001',
    slug: 'le-khai-giang-nam-hoc-2026-2027',
    title: 'Lễ khai giảng năm học 2026–2027',
    clubId: 'hdhs',
    category: 'TS',
    format: 'in_person',
    start: '2026-09-05T07:00:00+07:00',
    end: '2026-09-05T09:30:00+07:00',
    location: 'Sân trường',
    eligibleGrades: [6, 7, 8, 9, 10, 11, 12],
    capacity: 600,
    seatsTaken: 548,
    registrationDeadline: '2026-09-03T23:59:00+07:00',
    summary:
      'Lễ khai giảng chính thức mở đầu năm học 2026–2027, dành cho toàn thể học sinh nhà trường. Học sinh được phổ biến kế hoạch năm học và các nhiệm vụ trọng tâm, đồng thời tham dự lễ tuyên dương học sinh tiêu biểu.',
    description:
      'Chương trình gồm nghi thức chào cờ, diễn văn khai giảng của Ban Giám hiệu, tuyên dương học sinh đạt thành tích xuất sắc năm học trước và phần văn nghệ chào mừng do các câu lạc bộ phụ trách. Học sinh có mặt tại sân trường trước 06:45, mặc đồng phục theo quy định và tập trung theo vị trí của lớp.',
    tags: ['van-hoa', 'cong-dong'],
    status: 'approved',
  },
  {
    id: 'ev-003',
    slug: 'ngay-hoi-cau-lac-bo-nam-hoc-2026-2027',
    title: 'Ngày hội Câu lạc bộ năm học 2026–2027',
    clubId: 'hdhs',
    category: 'TS',
    format: 'in_person',
    start: '2026-09-19T07:30:00+07:00',
    end: '2026-09-19T11:00:00+07:00',
    location: 'Sân trường và Nhà thi đấu đa năng',
    eligibleGrades: [6, 7, 8, 9, 10, 11, 12],
    capacity: 600,
    seatsTaken: 512,
    registrationDeadline: '2026-09-17T23:59:00+07:00',
    summary:
      'Ngày hội giới thiệu hoạt động của các câu lạc bộ trong trường, dành cho học sinh toàn trường, đặc biệt là học sinh khối 6 và khối 10. Học sinh được tìm hiểu kế hoạch hoạt động, trao đổi trực tiếp với ban chủ nhiệm và đăng ký tham gia câu lạc bộ phù hợp.',
    description:
      'Mỗi câu lạc bộ bố trí một gian trưng bày giới thiệu thành tích, kế hoạch hoạt động năm học và tiêu chí tuyển thành viên. Hội đồng Học sinh phụ trách điều phối chương trình, đồng thời tổ chức phần trình diễn của các câu lạc bộ nghệ thuật và thể thao tại sân khấu chính.',
    tags: ['cong-dong', 'lam-viec-nhom', 'van-hoa'],
    status: 'approved',
  },
  {
    id: 'ev-027',
    slug: 'le-ky-niem-ngay-nha-giao-viet-nam-20-11',
    title: 'Lễ kỷ niệm Ngày Nhà giáo Việt Nam 20/11',
    clubId: 'hdhs',
    category: 'TS',
    format: 'in_person',
    start: '2026-11-20T07:00:00+07:00',
    end: '2026-11-20T09:30:00+07:00',
    location: 'Sân trường',
    eligibleGrades: [6, 7, 8, 9, 10, 11, 12],
    capacity: 600,
    seatsTaken: 455,
    registrationDeadline: '2026-11-17T23:59:00+07:00',
    summary:
      'Lễ kỷ niệm Ngày Nhà giáo Việt Nam dành cho toàn thể học sinh, nhằm bày tỏ lòng biết ơn đối với thầy cô giáo. Học sinh tham gia chương trình văn nghệ, nghi thức tri ân và hoạt động tôn vinh các thầy cô có nhiều đóng góp cho nhà trường.',
    description:
      'Chương trình gồm nghi thức chào cờ, diễn văn kỷ niệm, phần tri ân của đại diện học sinh và các tiết mục văn nghệ do các câu lạc bộ nghệ thuật phụ trách. Hội đồng Học sinh điều phối công tác chuẩn bị, đồng thời tổng hợp thư cảm ơn của học sinh gửi tới thầy cô.',
    tags: ['van-hoa', 'cong-dong'],
    status: 'approved',
  },
  {
    id: 'ev-035',
    slug: 'hoi-xuan-dinh-mui-2027',
    title: 'Hội xuân Đinh Mùi 2027',
    clubId: 'hdhs',
    category: 'TS',
    format: 'in_person',
    start: '2027-01-29T07:30:00+07:00',
    end: '2027-01-29T11:00:00+07:00',
    location: 'Sân trường',
    eligibleGrades: [6, 7, 8, 9, 10, 11, 12],
    capacity: 600,
    seatsTaken: 389,
    registrationDeadline: '2027-01-26T23:59:00+07:00',
    summary:
      'Hội xuân chào đón Tết Nguyên đán Đinh Mùi dành cho toàn thể học sinh, gồm gian hàng của các lớp, trò chơi dân gian và chương trình văn nghệ. Học sinh được tham gia các hoạt động văn hóa truyền thống, đồng thời góp phần gây quỹ hỗ trợ học sinh có hoàn cảnh khó khăn.',
    description:
      'Mỗi lớp được bố trí một gian hàng ẩm thực hoặc sản phẩm thủ công; số tiền thu được chuyển vào quỹ hỗ trợ học sinh có hoàn cảnh khó khăn. Hội đồng Học sinh phụ trách điều phối gian hàng, tổ chức khu trò chơi dân gian và hoạt động viết thư pháp đầu xuân.',
    tags: ['van-hoa', 'cong-dong', 'lam-viec-nhom'],
    status: 'approved',
  },
  {
    id: 'ev-040',
    slug: 'hoi-trai-truyen-thong-chao-mung-ngay-thanh-lap-doan',
    title: 'Hội trại truyền thống chào mừng Ngày thành lập Đoàn TNCS Hồ Chí Minh 26/3',
    clubId: 'hdhs',
    category: 'TS',
    format: 'in_person',
    start: '2027-03-26T07:00:00+07:00',
    end: '2027-03-26T16:30:00+07:00',
    location: 'Sân trường',
    eligibleGrades: [10, 11, 12],
    capacity: 600,
    seatsTaken: 402,
    registrationDeadline: '2027-03-23T23:59:00+07:00',
    summary:
      'Hội trại truyền thống chào mừng kỷ niệm Ngày thành lập Đoàn Thanh niên Cộng sản Hồ Chí Minh, dành cho toàn thể học sinh. Học sinh tham gia dựng trại theo lớp, các trò chơi lớn và hội thi văn nghệ, qua đó rèn luyện tinh thần đoàn kết và kỹ năng tổ chức.',
    description:
      'Mỗi lớp thiết kế và dựng một trại theo chủ đề do ban tổ chức công bố, đồng thời tham gia các phần thi cổng trại, trò chơi lớn và văn nghệ. Hội đồng Học sinh phối hợp với Đoàn trường phụ trách điều phối, đảm bảo an toàn và tổng hợp kết quả chấm điểm của các lớp.',
    tags: ['lam-viec-nhom', 'lanh-dao', 'van-hoa'],
    status: 'approved',
  },
  {
    id: 'ev-045',
    slug: 'le-tri-an-va-truong-thanh-hoc-sinh-khoi-12',
    title: 'Lễ tri ân và trưởng thành học sinh khối 12',
    clubId: 'hdhs',
    category: 'TS',
    format: 'in_person',
    start: '2027-05-22T07:30:00+07:00',
    end: '2027-05-22T10:30:00+07:00',
    location: 'Hội trường A',
    eligibleGrades: [12],
    capacity: 450,
    seatsTaken: 341,
    registrationDeadline: '2027-05-18T23:59:00+07:00',
    summary:
      'Lễ tri ân và trưởng thành dành cho học sinh khối 12, đánh dấu chặng đường ba năm học tập và rèn luyện tại trường. Học sinh được bày tỏ lòng biết ơn tới thầy cô, gia đình và nhận lời chúc trước kỳ thi tốt nghiệp trung học phổ thông.',
    description:
      'Chương trình gồm phần trình chiếu kỷ niệm ba năm học, nghi thức tri ân thầy cô và cha mẹ, tuyên dương học sinh tiêu biểu và các tiết mục văn nghệ của khối 12. Hội đồng Học sinh phối hợp với giáo viên chủ nhiệm khối 12 phụ trách công tác chuẩn bị và điều phối chương trình.',
    tags: ['van-hoa', 'cong-dong'],
    status: 'approved',
  },
  /* ── Cuộc thi ngoài trường (Phòng Cố vấn Học tập) ───────────────── */
  {
    id: 'ev-051',
    slug: 'cuoc-thi-y-tuong-kinh-doanh-thpt-vong-so-loai',
    title: 'Cuộc thi Ý tưởng kinh doanh dành cho học sinh trung học phổ thông: Vòng sơ loại trực tuyến',
    clubId: 'co-van-hoc-tap',
    organizer: 'Trường đại học đối tác',
    category: 'HT',
    format: 'online',
    start: '2026-10-31T08:00:00+07:00',
    end: '2026-10-31T11:30:00+07:00',
    location: 'Trực tuyến – Nền tảng của ban tổ chức',
    eligibleGrades: [10, 11, 12],
    capacity: 90,
    seatsTaken: 41,
    registrationDeadline: '2026-10-25T23:59:00+07:00',
    summary:
      'Cuộc thi ngoài trường dành cho các nhóm học sinh trung học phổ thông có ý tưởng kinh doanh gắn với nhu cầu của cộng đồng. Tại vòng sơ loại trực tuyến, mỗi nhóm trình bày ý tưởng trong năm phút và nhận nhận xét của ban giám khảo do đơn vị tổ chức mời.',
    description:
      'Cuộc thi do Trường đại học đối tác tổ chức, gồm vòng sơ loại trực tuyến, vòng bán kết và vòng chung kết tại cơ sở của đơn vị tổ chức. Mỗi nhóm gồm từ hai đến bốn học sinh, nộp bản mô tả ý tưởng theo mẫu của ban tổ chức trước vòng sơ loại. Phòng Cố vấn Học tập cập nhật thông tin cuộc thi trên vsmcclubs; sau khi học sinh đăng ký trên vsmcclubs, Phòng tổng hợp danh sách và hướng dẫn học sinh hoàn thiện hồ sơ dự thi theo các bước của ban tổ chức.',
    tags: ['khoi-nghiep', 'thuyet-trinh', 'lam-viec-nhom'],
    status: 'approved',
  },
  {
    id: 'ev-052',
    slug: 'cuoc-thi-toan-va-khoa-hoc-tu-nhien-thcs',
    title: 'Cuộc thi Toán và Khoa học tự nhiên dành cho học sinh trung học cơ sở',
    clubId: 'co-van-hoc-tap',
    organizer: 'Ban tổ chức cuộc thi cấp thành phố',
    category: 'HT',
    format: 'in_person',
    start: '2026-12-13T08:00:00+07:00',
    end: '2026-12-13T11:00:00+07:00',
    location: 'Địa điểm do ban tổ chức thông báo',
    eligibleGrades: [6, 7, 8, 9],
    capacity: 120,
    seatsTaken: 58,
    registrationDeadline: '2026-12-07T23:59:00+07:00',
    summary:
      'Cuộc thi ngoài trường dành cho học sinh trung học cơ sở yêu thích Toán và các môn Khoa học tự nhiên. Học sinh làm bài thi cá nhân gồm phần trắc nghiệm và phần tự luận, qua đó rèn luyện tư duy giải quyết vấn đề và làm quen với môi trường thi đấu học thuật bên ngoài nhà trường.',
    description:
      'Cuộc thi do ban tổ chức cấp thành phố triển khai, bài thi gồm hai phần Toán và Khoa học tự nhiên với thời gian làm bài một trăm hai mươi phút. Địa điểm thi cụ thể được ban tổ chức thông báo tới từng thí sinh sau khi hồ sơ được xác nhận. Phòng Cố vấn Học tập cập nhật thông tin cuộc thi trên vsmcclubs; sau khi học sinh đăng ký trên vsmcclubs, Phòng tổng hợp danh sách, hoàn thiện hồ sơ đăng ký chung của nhà trường và hướng dẫn học sinh các bước tiếp theo theo quy định của ban tổ chức.',
    tags: ['hoc-thuat', 'thi-dau'],
    status: 'approved',
  },
  {
    id: 'ev-053',
    slug: 'cuoc-thi-nghien-cuu-khoa-hoc-thpt-vong-trinh-bay',
    title: 'Cuộc thi Nghiên cứu khoa học dành cho học sinh trung học phổ thông: Vòng trình bày đề tài',
    clubId: 'co-van-hoc-tap',
    organizer: 'Viện nghiên cứu đối tác',
    category: 'HT',
    format: 'in_person',
    start: '2027-01-23T08:00:00+07:00',
    end: '2027-01-23T16:30:00+07:00',
    location: 'Địa điểm do ban tổ chức thông báo',
    eligibleGrades: [10, 11, 12],
    capacity: 40,
    seatsTaken: 15,
    registrationDeadline: '2027-01-18T23:59:00+07:00',
    summary:
      'Cuộc thi ngoài trường dành cho học sinh trung học phổ thông đã có đề tài nghiên cứu khoa học cá nhân hoặc theo nhóm. Tại vòng trình bày, học sinh báo cáo kết quả nghiên cứu trước hội đồng chuyên môn và nhận góp ý để hoàn thiện đề tài.',
    description:
      'Cuộc thi do Viện nghiên cứu đối tác tổ chức, tiếp nhận đề tài thuộc các lĩnh vực khoa học tự nhiên, khoa học xã hội và kỹ thuật. Mỗi đề tài được trình bày trong mười phút, sau đó hội đồng chuyên môn đặt câu hỏi và nhận xét; học sinh chuẩn bị báo cáo tóm tắt và áp phích theo mẫu của ban tổ chức. Phòng Cố vấn Học tập cập nhật thông tin cuộc thi trên vsmcclubs; sau khi học sinh đăng ký trên vsmcclubs, Phòng tổng hợp danh sách, rà soát hồ sơ đề tài và hướng dẫn học sinh nộp hồ sơ theo các bước của ban tổ chức.',
    tags: ['nghien-cuu', 'hoc-thuat', 'thuyet-trinh'],
    status: 'approved',
  },
  {
    id: 'ev-054',
    slug: 'cuoc-thi-viet-luan-hoc-thuat-bang-tieng-anh-thpt',
    title: 'Cuộc thi Viết luận học thuật bằng tiếng Anh dành cho học sinh trung học phổ thông',
    clubId: 'co-van-hoc-tap',
    organizer: 'Trường đại học đối tác',
    category: 'HT',
    format: 'online',
    start: '2027-03-13T08:30:00+07:00',
    end: '2027-03-13T11:00:00+07:00',
    location: 'Trực tuyến – Nền tảng thi của ban tổ chức',
    eligibleGrades: [10, 11, 12],
    capacity: 150,
    seatsTaken: 46,
    registrationDeadline: '2027-03-08T23:59:00+07:00',
    summary:
      'Cuộc thi ngoài trường đánh giá năng lực lập luận và trình bày quan điểm bằng tiếng Anh theo văn phong học thuật, dành cho học sinh trung học phổ thông. Học sinh viết một bài luận theo đề do ban tổ chức công bố tại buổi thi trực tuyến.',
    description:
      'Cuộc thi do Trường đại học đối tác tổ chức; thí sinh có một trăm hai mươi phút để hoàn thành bài luận từ năm trăm đến bảy trăm từ trên nền tảng thi của ban tổ chức. Bài thi được chấm theo các tiêu chí lập luận, cấu trúc, sử dụng nguồn tham khảo và ngôn ngữ; kết quả được đơn vị tổ chức công bố sau bốn tuần. Phòng Cố vấn Học tập cập nhật thông tin cuộc thi trên vsmcclubs; sau khi học sinh đăng ký trên vsmcclubs, Phòng tổng hợp danh sách và hướng dẫn học sinh tạo tài khoản dự thi, kiểm tra thiết bị theo các bước của ban tổ chức.',
    tags: ['tieng-anh', 'hoc-thuat', 'du-hoc'],
    status: 'approved',
  },
];

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

/** Sample newsletter articles (announcements and activity reports about the sample council events). */
export const SAMPLE_NEWS: NewsPost[] = [
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
];

/** Sample anonymous student proposals (grade only) and the council's answers. */
export const SAMPLE_PROPOSALS: ActivityProposal[] = [
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

export const SAMPLE_PROPOSAL_RESPONSES: Record<string, ProposalResponse> = {
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

/** A sample school calendar: exam periods and the Tết holiday. */
export const SAMPLE_PERIODS: CalendarPeriod[] = [
  { id: 'kt-giua-hk1', kind: 'exam', label: 'Kiểm tra định kỳ giữa học kỳ I', start: '2026-11-02', end: '2026-11-07' },
  { id: 'kt-cuoi-hk1', kind: 'exam', label: 'Kiểm tra định kỳ cuối học kỳ I', start: '2026-12-21', end: '2027-01-02' },
  { id: 'nghi-tet', kind: 'holiday', label: 'Nghỉ Tết Nguyên đán', start: '2027-02-01', end: '2027-02-14' },
  { id: 'kt-giua-hk2', kind: 'exam', label: 'Kiểm tra định kỳ giữa học kỳ II', start: '2027-03-15', end: '2027-03-20' },
  { id: 'kt-cuoi-hk2', kind: 'exam', label: 'Kiểm tra định kỳ cuối học kỳ II', start: '2027-04-26', end: '2027-05-08' },
];
