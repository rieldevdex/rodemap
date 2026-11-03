// Dữ liệu minh họa phục vụ bản trình diễn. Thay thế bằng dữ liệu chính thức khi triển khai.
import type { SchoolEvent } from '../domain/types';

/**
 * ev-001 … ev-045 (the ids kept): school-wide events of the Hội đồng Học sinh, in chronological
 * order (05/09/2026 – 22/05/2027). Illustrative until the school publishes its calendar.
 * ev-051 … ev-054: approved external academic competitions ("Cuộc thi ngoài trường") in
 * chronological order, published by Phòng Cố vấn Học tập (clubId 'co-van-hoc-tap') with the
 * external `organizer` named. Organisers and competitions are generic placeholders.
 * ev-055 …: events announced by the real clubs. Only their date is known so far (`dateOnly`), so
 * time, place, grades, seats and deadline read "Đang cập nhật" and registration is not open; the
 * clubs complete them through Cổng câu lạc bộ. The sample events of the former demo clubs were
 * removed on 03/11/2026 and their ids (ev-002 … ev-050) are not reused.
 */
export const EVENTS: SchoolEvent[] = [
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
  /* ── Sự kiện của câu lạc bộ ─────────────────────────────────────── */
  {
    id: 'ev-055',
    slug: 'hoi-nghi-seia-khu-vuc-mua-xuan-2027',
    title: 'Hội nghị SEIA khu vực mùa xuân 2027',
    clubId: 'hanoi-vinschool-seia',
    category: 'KN',
    format: 'in_person',
    start: '2027-01-23T00:00:00+07:00',
    end: '2027-01-24T00:00:00+07:00',
    location: '',
    eligibleGrades: [6, 7, 8, 9, 10, 11, 12],
    capacity: 0,
    seatsTaken: 0,
    registrationDeadline: '2027-01-23T00:00:00+07:00',
    summary:
      'Hội nghị SEIA khu vực mùa xuân 2027 (2027 Regional Spring SEIA Conference) do Hanoi Vinschool SEIA thông báo tổ chức vào ngày 23/01/2027. Thời gian cụ thể, địa điểm, đối tượng tham gia và cách thức đăng ký đang được cập nhật.',
    description:
      'Hanoi Vinschool SEIA đã công bố ngày tổ chức hội nghị. Các thông tin còn lại được cập nhật trên vsmcclubs sau khi câu lạc bộ hoàn thiện kế hoạch và mở đăng ký.',
    tags: ['khoi-nghiep', 'lanh-dao', 'huong-nghiep'],
    status: 'approved',
    dateOnly: true,
  },
  {
    id: 'ev-056',
    slug: 'chung-ket-vbis-innovation-challenge-2027',
    title: 'Chung kết Cuộc thi khởi nghiệp cấp trường VBIS Innovation Challenge',
    clubId: 'young-business-creators',
    category: 'KN',
    format: 'in_person',
    start: '2027-01-30T00:00:00+07:00',
    end: '2027-01-31T00:00:00+07:00',
    location: '',
    eligibleGrades: [6, 7, 8, 9, 10, 11, 12],
    capacity: 0,
    seatsTaken: 0,
    registrationDeadline: '2027-01-30T00:00:00+07:00',
    summary:
      'Vòng chung kết VBIS Innovation Challenge, cuộc thi khởi nghiệp cấp trường do Young Business Creators (YBC) tổ chức, diễn ra vào ngày 30/01/2027. Thời gian cụ thể, địa điểm, thể lệ và cách thức đăng ký đang được cập nhật.',
    description:
      'Young Business Creators đã công bố ngày tổ chức vòng chung kết. Các thông tin còn lại được cập nhật trên vsmcclubs sau khi câu lạc bộ hoàn thiện kế hoạch và mở đăng ký.',
    tags: ['khoi-nghiep', 'thi-dau', 'thuyet-trinh'],
    status: 'approved',
    dateOnly: true,
  },
];
