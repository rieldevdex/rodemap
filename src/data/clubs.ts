// Dữ liệu chính thức của vsmcclubs. Cập nhật theo hướng dẫn tại README, mục 5.
// Danh sách câu lạc bộ theo danh sách chính thức của nhà trường (cập nhật ngày 03/11/2026).
import type { Club } from '../domain/types';

/**
 * 22 publishers: Hội đồng Học sinh (kind 'council', school-wide events), Phòng Cố vấn Học tập
 * (kind 'office', external academic competitions it relays from the organisers), then the 20 real
 * student clubs of Vinschool Smart City (kind 'club'), in the order of the school's club list.
 * Descriptions follow what each club wrote, in formal third person; the categories are the closest
 * lines. Only the club's own email address and public pages are listed: never the names or
 * personal addresses of student leaders or advisers.
 */
export const CLUBS: Club[] = [
  {
    id: 'hdhs',
    kind: 'council',
    slug: 'hdhs',
    name: 'Hội đồng Học sinh',
    shortName: 'HĐHS',
    description:
      'Hội đồng Học sinh là tổ chức đại diện cho học sinh toàn trường, phụ trách điều phối các sự kiện toàn trường và kết nối hoạt động giữa các câu lạc bộ. Bên cạnh đó, Hội đồng tiếp nhận và kiểm duyệt sự kiện do các câu lạc bộ đề xuất trước khi công bố tới học sinh.',
    categories: ['TS', 'KN'],
    email: '[Email Hội đồng Học sinh]',
    links: [],
  },
  {
    id: 'co-van-hoc-tap',
    kind: 'office',
    slug: 'phong-co-van-hoc-tap',
    name: 'Phòng Cố vấn Học tập',
    shortName: 'Phòng Cố vấn Học tập',
    description:
      'Phòng Cố vấn Học tập tư vấn cho học sinh về định hướng học tập, lựa chọn môn học và lộ trình chuẩn bị cho bậc đại học. Phòng cập nhật trên vsmcclubs thông tin các cuộc thi học thuật ngoài trường, gồm thể lệ, hạn đăng ký và cách thức Phòng hỗ trợ học sinh hoàn thiện hồ sơ dự thi.',
    categories: ['HT'],
    email: '[Email Phòng Cố vấn Học tập]',
    links: [],
  },
  {
    id: 'bot-va-bo',
    kind: 'club',
    slug: 'bot-va-bo',
    name: 'Câu lạc bộ Bột và Bơ',
    shortName: 'Bột và Bơ',
    description:
      'Bột và Bơ là câu lạc bộ làm bánh đầu tiên tại Vinschool Smart City, nơi các thành viên yêu thích bánh ngọt cùng học hỏi, thực hành và thử sức với những công thức mới. Bên cạnh hoạt động làm bánh, câu lạc bộ tổ chức các hoạt động gây quỹ và thiện nguyện nhằm lan tỏa những giá trị tốt đẹp tới cộng đồng.',
    categories: ['KN', 'TN'],
    email: 'botvabosmc@gmail.com',
    links: [
      { kind: 'facebook', url: 'https://www.facebook.com/share/1BM5ozKaa7/' },
      { kind: 'tiktok', url: 'https://www.tiktok.com/@bt.b016' },
    ],
  },
  {
    id: 'goc-xi-xao',
    kind: 'club',
    slug: 'goc-xi-xao',
    name: 'Câu lạc bộ Phát thanh và Truyền thông Góc Xì Xào',
    shortName: 'Góc Xì Xào',
    description:
      'Góc Xì Xào là câu lạc bộ Phát thanh và Truyền thông, lan tỏa những câu chuyện, thông tin và khoảnh khắc trong trường học qua các chương trình phát thanh và nội dung truyền thông sáng tạo. Câu lạc bộ hướng tới trở thành tiếng nói gần gũi của học sinh, góp phần kết nối mọi người và mang lại năng lượng tích cực cho cộng đồng Vinschool.',
    categories: ['NT', 'KN'],
    email: 'gocxixao@gmail.com',
    links: [
      { kind: 'facebook', url: 'https://www.facebook.com/share/1EpC1kx5xC/' },
      { kind: 'tiktok', url: 'https://www.tiktok.com/@gocxixao_smc' },
    ],
  },
  {
    id: 'fluorescence-the-lab',
    kind: 'club',
    slug: 'fluorescence-the-lab',
    name: 'Fluorescence the Lab',
    shortName: 'Fluorescence the Lab',
    description:
      'Fluorescence the Lab là câu lạc bộ Khoa học – STEM – Nghiên cứu – Trải nghiệm – Giáo dục cộng đồng, quy tụ những học sinh yêu thích khám phá khoa học thông qua nghiên cứu, thực hành và thử nghiệm. Thông qua các dự án nghiên cứu, hội thảo, sự kiện khoa học, hoạt động STEM và dự án cộng đồng, câu lạc bộ xây dựng môi trường để mỗi thành viên đặt câu hỏi, thử sức với điều mới và tạo ra giá trị từ sự tò mò của mình.',
    categories: ['HT', 'CN'],
    email: 'fluorescencethelab@gmail.com',
    links: [
      { kind: 'facebook', url: 'https://www.facebook.com/share/1CB6ygNU7K/' },
    ],
  },
  {
    id: 'the-papillon',
    kind: 'club',
    slug: 'the-papillon',
    name: 'The Papillon',
    shortName: 'The Papillon',
    description:
      'The Papillon là câu lạc bộ nhảy đầu tiên tại Vinschool Smart City, quy tụ những học sinh có chung tình yêu với âm nhạc, vũ đạo và sân khấu. Sau bốn mùa hoạt động, câu lạc bộ bước vào thế hệ thứ năm với mục tiêu tiếp tục biến niềm đam mê thành những tiết mục biểu diễn mang dấu ấn tuổi trẻ.',
    categories: ['NT'],
    email: 'thepapillonxoxo@gmail.com',
    links: [
      { kind: 'facebook', url: 'https://www.facebook.com/share/1JnTJfVRdf/' },
    ],
  },
  {
    id: 'psyched-club',
    kind: 'club',
    slug: 'psyched-club',
    name: 'Psyched Club',
    shortName: 'Psyched Club',
    description:
      'Psyched Club là câu lạc bộ Tâm lý học hướng tới học sinh trên địa bàn Hà Nội, với mong muốn đưa tâm lý học đến gần hơn với những câu chuyện và trải nghiệm của tuổi học trò. Ở thế hệ thứ tư, câu lạc bộ tiếp nối tinh thần khám phá, lắng nghe và kết nối, giúp mỗi học sinh có thêm góc nhìn về bản thân và nuôi dưỡng sự thấu hiểu.',
    categories: ['HT', 'KN'],
    email: 'psychedvsmc@gmail.com',
    links: [
      { kind: 'facebook', url: 'https://www.facebook.com/share/1BZYM9p7QV/' },
    ],
  },
  {
    id: 'hanoi-vinschool-seia',
    kind: 'club',
    slug: 'hanoi-vinschool-seia',
    name: 'Hanoi Vinschool SEIA',
    shortName: 'Hanoi Vinschool SEIA',
    description:
      'Hanoi Vinschool SEIA trực thuộc Vietnam SEIA, tổ chức học sinh liên trường cấp quốc gia, đồng hành cùng các nhà lãnh đạo và khởi nghiệp trẻ trong các lĩnh vực quản trị, tiếp thị, tài chính và nhà hàng – khách sạn. Với tinh thần “do học sinh, vì học sinh”, tổ chức xây dựng môi trường học tập tích cực và mở rộng kết nối đối tác nhằm phát triển hệ sinh thái kinh doanh trẻ tại Việt Nam.',
    categories: ['KN'],
    email: 'hanoivinschoolseia@gmail.com',
    links: [],
  },
  {
    id: 'novaris-project',
    kind: 'club',
    slug: 'novaris-project',
    name: 'Novaris Project',
    shortName: 'Novaris Project',
    description:
      'Novaris Project là câu lạc bộ Công nghệ và Tài chính – Kinh doanh tại Vinschool Smart City, tạo môi trường chủ động và chuyên nghiệp để học sinh yêu thích kinh doanh hoặc kỹ thuật phần mềm thử sức với công việc thực tiễn và các cuộc thi. Câu lạc bộ đồng thời lan tỏa niềm đam mê kinh doanh và công nghệ tới học sinh ngoài trường thông qua dự án “Rạng Đông” dành cho học sinh Trường THCS Phật Tích, tỉnh Bắc Ninh.',
    categories: ['CN', 'KN'],
    email: 'clbnovarisproject@gmail.com',
    links: [
      { kind: 'facebook', url: 'https://www.facebook.com/profile.php?id=61592532744151' },
    ],
  },
  {
    id: 'humans-of-vinschool-smart-city',
    kind: 'club',
    slug: 'humans-of-vinschool-smart-city',
    name: 'Humans of Vinschool Smart City',
    shortName: 'Humans of Vinschool Smart City',
    description:
      'Humans of Vinschool Smart City là câu lạc bộ truyền thông kết nối và lan tỏa những câu chuyện, hình ảnh đẹp về con người trong cộng đồng Vinschool Smart City. Câu lạc bộ tổ chức các hoạt động giao lưu, hỗ trợ cộng đồng và ghi lại những khoảnh khắc, câu chuyện ý nghĩa của học sinh, giáo viên và nhân viên nhà trường.',
    categories: ['NT', 'TN'],
    email: 'humansofvinschoolsmartcity@gmail.com',
    links: [
      { kind: 'facebook', url: 'https://www.facebook.com/profile.php?id=61564742377738' },
    ],
  },
  {
    id: 'kat-music-club',
    kind: 'club',
    slug: 'kat-music-club',
    name: 'KAT Music Club',
    shortName: 'KAT Music Club',
    description:
      'KAT Music Club là câu lạc bộ âm nhạc do học sinh chủ trì, hoạt động theo hình thức ban nhạc và quy tụ những học sinh có chung niềm đam mê âm nhạc. Câu lạc bộ là nơi các thành viên cùng chơi nhạc, luyện tập và biểu diễn, đồng thời giao lưu, kết nối và phát triển khả năng âm nhạc của mỗi cá nhân.',
    categories: ['NT'],
    email: 'katmusicclub@gmail.com',
    links: [],
  },
  {
    id: 'mentis-club',
    kind: 'club',
    slug: 'mentis-club',
    name: 'Mentis Club',
    shortName: 'Mentis Club',
    description:
      'Mentis Club là câu lạc bộ nghiên cứu tâm lý học ứng dụng, tập trung phân tích cách con người suy nghĩ, ra quyết định và phản ứng trước áp lực học tập và xã hội. Câu lạc bộ thực hiện nghiên cứu theo phương pháp khoa học, khảo sát dữ liệu và tạo điều kiện để thành viên tiếp xúc thực tế với môi trường chuyên môn.',
    categories: ['HT'],
    email: 'mentisclubthptvinsmc@gmail.com',
    links: [
      { kind: 'facebook', url: 'https://www.facebook.com/profile.php?id=61590945860368' },
    ],
  },
  {
    id: 'vinschool-debate-society',
    kind: 'club',
    slug: 'vinschool-debate-society',
    name: 'Vinschool Debate Society (VDS)',
    shortName: 'Vinschool Debate Society',
    description:
      'Vinschool Debate Society (VDS) là câu lạc bộ tranh biện tạo môi trường năng động để học sinh Vinschool Smart City giao lưu với các thành viên và bạn đồng trang lứa, qua đó phát triển tư duy phản biện, bồi dưỡng kiến thức xã hội và sự tự tin khi nói trước đông người. Câu lạc bộ kết nối các thành viên để cùng tham gia các cuộc thi tranh biện trong và ngoài nhà trường.',
    categories: ['KN', 'HT'],
    email: 'vinschooldebatesociety@gmail.com',
    links: [
      { kind: 'facebook', url: 'https://www.facebook.com/VDS.clubs/' },
    ],
  },
  {
    id: 'young-business-creators',
    kind: 'club',
    slug: 'young-business-creators',
    name: 'Young Business Creators (YBC)',
    shortName: 'Young Business Creators',
    description:
      'Young Business Creators (YBC) là câu lạc bộ kinh doanh – khởi nghiệp, tạo môi trường để học sinh phát triển tư duy kinh doanh, sáng tạo ý tưởng và hiện thực hóa dự án của riêng mình. Thông qua các hội thảo kỹ năng, cuộc thi kinh doanh và buổi thuyết trình ý tưởng, câu lạc bộ giúp học sinh trải nghiệm khởi nghiệp thực tế và lan tỏa tinh thần đổi mới.',
    categories: ['KN'],
    email: 'younggbusinesscreators@gmail.com',
    links: [
      { kind: 'facebook', url: 'https://www.facebook.com/share/17NpwMnWhY/' },
    ],
  },
  {
    id: 'charite',
    kind: 'club',
    slug: 'charite',
    name: 'Câu lạc bộ Charité',
    shortName: 'Charité',
    description:
      'Charité là câu lạc bộ thiện nguyện, cầu nối lan tỏa tình yêu thương từ học sinh tới những hoàn cảnh khó khăn trong cộng đồng. Thông qua các hoạt động gây quỹ và phát cháo hằng tháng, câu lạc bộ tạo điều kiện để học sinh trực tiếp tham gia hoạt động thiện nguyện thiết thực và lan tỏa những giá trị nhân văn.',
    categories: ['TN'],
    email: 'clubcharite@gmail.com',
    links: [
      { kind: 'facebook', url: 'https://www.facebook.com/share/18TFCymJyz/' },
    ],
  },
  {
    id: 'vintervarme',
    kind: 'club',
    slug: 'vintervarme',
    name: 'Câu lạc bộ Vintervarme',
    shortName: 'Vintervarme',
    description:
      'Vintervarme là câu lạc bộ thiện nguyện, phối hợp với Đoàn trường trong một số sự kiện của nhà trường. Câu lạc bộ tạo điều kiện để học sinh tham gia các hoạt động trải nghiệm, giúp đỡ những hoàn cảnh khó khăn, đồng thời rèn luyện kỹ năng xã hội và tích lũy kinh nghiệm.',
    categories: ['TN'],
    links: [
      { kind: 'facebook', url: 'https://www.facebook.com/share/1FAFi5wsFL/' },
    ],
  },
  {
    id: 'vprc',
    kind: 'club',
    slug: 'vprc',
    name: 'Vinschool Psychology Research Club (VPRC)',
    shortName: 'VPRC',
    description:
      'Vinschool Psychology Research Club (VPRC) là câu lạc bộ nghiên cứu tâm lý học đường do học sinh Vinschool Smart City xây dựng, tập trung tìm hiểu những vấn đề gần gũi với đời sống học sinh. Thông qua nghiên cứu, khảo sát và các hoạt động truyền thông, câu lạc bộ giúp học sinh hiểu hơn về bản thân, các mối quan hệ và sức khỏe tinh thần.',
    categories: ['HT'],
    links: [],
  },
  {
    id: 'artemis',
    kind: 'club',
    slug: 'artemis',
    name: 'Artemis Club',
    shortName: 'Artemis',
    description:
      'Artemis là câu lạc bộ Mỹ thuật dành cho học sinh, xây dựng môi trường sáng tạo để các thành viên phát triển khả năng nghệ thuật, thể hiện cá tính và học hỏi qua các hoạt động, dự án và sự kiện mỹ thuật. Bên cạnh chuyên môn, câu lạc bộ chú trọng rèn luyện tinh thần làm việc nhóm, tư duy sáng tạo và kỹ năng tổ chức cho các thành viên.',
    categories: ['NT'],
    links: [
      { kind: 'facebook', url: 'https://www.facebook.com/profile.php?id=61593874895254' },
    ],
  },
  {
    id: 'hanami-shores',
    kind: 'club',
    slug: 'hanami-shores',
    name: 'Hanami Shores',
    shortName: 'Hanami Shores',
    description:
      'Hanami Shores là câu lạc bộ tìm hiểu văn hóa Nhật Bản, tổ chức các hội thảo, gian hàng và sự kiện về văn hóa Nhật Bản. Câu lạc bộ mong muốn lan tỏa những nét văn hóa đặc sắc, mới mẻ của đất nước mặt trời mọc tới học sinh và cộng đồng nhà trường.',
    categories: ['NT'],
    email: 'hanamishoresvsc2526@gmail.com',
    links: [
      { kind: 'facebook', url: 'https://www.facebook.com/share/1EkyuoCqr3/' },
    ],
  },
  {
    id: 'smc-enterprise',
    kind: 'club',
    slug: 'smc-enterprise',
    name: 'SMC Enterprise',
    shortName: 'SMC Enterprise',
    description:
      'Thông tin giới thiệu câu lạc bộ đang được cập nhật. Học sinh quan tâm vui lòng theo dõi trang câu lạc bộ trên vsmcclubs.',
    categories: ['KN'],
    links: [],
  },
  {
    id: 'vinschool-business',
    kind: 'club',
    slug: 'vinschool-business',
    name: 'Câu lạc bộ Vinschool Business',
    shortName: 'Vinschool Business',
    description:
      'Thông tin giới thiệu câu lạc bộ đang được cập nhật. Học sinh quan tâm vui lòng theo dõi trang câu lạc bộ trên vsmcclubs.',
    categories: ['KN'],
    links: [],
  },
  {
    id: 'green-guardian',
    kind: 'club',
    slug: 'green-guardian',
    name: 'Green Guardian',
    shortName: 'Green Guardian',
    description:
      'Green Guardian là câu lạc bộ đưa các vấn đề môi trường toàn cầu đến gần hơn với cộng đồng địa phương thông qua nghiên cứu, truyền thông, hoạt động giáo dục và các dự án thực tế. Bên cạnh việc nâng cao nhận thức, câu lạc bộ tạo không gian để học sinh cùng tìm hiểu, trao đổi và biến mối quan tâm về môi trường thành hành động cụ thể.',
    categories: ['TN'],
    email: 'greenguardian.clb@gmail.com',
    links: [
      { kind: 'facebook', url: 'https://www.facebook.com/profile.php?id=61593971978293' },
      { kind: 'instagram', url: 'https://www.instagram.com/greenguardian.clb/' },
    ],
  },
];
