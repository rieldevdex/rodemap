// Dữ liệu minh họa phục vụ bản trình diễn. Thay thế bằng dữ liệu chính thức khi triển khai.
import type { Club } from '../domain/types';

/** 14 clubs: Hội đồng Học sinh (school-wide events), Inkstep (the one real club) and 12 generic clubs. */
export const CLUBS: Club[] = [
  {
    id: 'hdhs',
    slug: 'hdhs',
    name: 'Hội đồng Học sinh',
    shortName: 'HĐHS',
    description:
      'Hội đồng Học sinh là tổ chức đại diện cho học sinh toàn trường, phụ trách điều phối các sự kiện toàn trường và kết nối hoạt động giữa các câu lạc bộ. Hội đồng đồng thời tiếp nhận và kiểm duyệt sự kiện do các câu lạc bộ đề xuất trước khi công bố tới học sinh.',
    categories: ['TS', 'KN'],
    contact: '[Email Hội đồng Học sinh]',
  },
  {
    id: 'inkstep',
    slug: 'inkstep',
    name: 'Inkstep – Câu lạc bộ Phát triển Sản phẩm Học tập',
    shortName: 'Inkstep',
    description:
      'Inkstep là câu lạc bộ nghiên cứu, thiết kế và phát triển sản phẩm học tập Eighthundred. Câu lạc bộ định kỳ tổ chức các buổi chia sẻ về phát triển sản phẩm, qua đó tạo điều kiện để học sinh tìm hiểu quy trình và tham gia đóng góp cho sản phẩm.',
    categories: ['CN', 'KN'],
    contact: '[Email câu lạc bộ]',
  },
  {
    id: 'tranh-bien',
    slug: 'tranh-bien',
    name: 'Câu lạc bộ Tranh biện',
    shortName: 'CLB Tranh biện',
    description:
      'Câu lạc bộ Tranh biện tổ chức các buổi sinh hoạt, tập huấn và giải đấu nhằm phát triển tư duy phản biện và kỹ năng lập luận của học sinh. Câu lạc bộ phụ trách Giải Tranh biện cấp trường và tuyển chọn đội tuyển tham gia các giải đấu bên ngoài nhà trường.',
    categories: ['KN', 'HT'],
    contact: '[Email câu lạc bộ]',
  },
  {
    id: 'khoa-hoc-du-lieu',
    slug: 'khoa-hoc-du-lieu',
    name: 'Câu lạc bộ Khoa học Dữ liệu',
    shortName: 'CLB Khoa học Dữ liệu',
    description:
      'Câu lạc bộ Khoa học Dữ liệu tạo môi trường để học sinh tìm hiểu phương pháp thu thập, xử lý và phân tích dữ liệu bằng các công cụ phổ biến. Câu lạc bộ tổ chức hội thảo, buổi thực hành và cuộc thi phân tích dữ liệu, đồng thời hỗ trợ học sinh thực hiện đề tài nghiên cứu khoa học.',
    categories: ['CN', 'HT'],
    contact: '[Email câu lạc bộ]',
  },
  {
    id: 'toan-hoc',
    slug: 'toan-hoc',
    name: 'Câu lạc bộ Toán học',
    shortName: 'CLB Toán học',
    description:
      'Câu lạc bộ Toán học tổ chức các buổi chuyên đề và ôn luyện nhằm nâng cao năng lực tư duy toán học của học sinh. Câu lạc bộ phối hợp với tổ Toán hỗ trợ học sinh chuẩn bị cho các kỳ kiểm tra định kỳ và kỳ thi học sinh giỏi.',
    categories: ['HT'],
    contact: '[Email câu lạc bộ]',
  },
  {
    id: 'hung-bien-tieng-anh',
    slug: 'hung-bien-tieng-anh',
    name: 'Câu lạc bộ Hùng biện Tiếng Anh',
    shortName: 'CLB Hùng biện Tiếng Anh',
    description:
      'Câu lạc bộ Hùng biện Tiếng Anh tạo điều kiện để học sinh rèn luyện kỹ năng trình bày và tranh luận bằng tiếng Anh trong môi trường học thuật. Câu lạc bộ tổ chức các buổi luyện tập định kỳ và Cuộc thi Hùng biện Tiếng Anh cấp trường.',
    categories: ['HT', 'KN'],
    contact: '[Email câu lạc bộ]',
  },
  {
    id: 'am-nhac',
    slug: 'am-nhac',
    name: 'Câu lạc bộ Âm nhạc',
    shortName: 'CLB Âm nhạc',
    description:
      'Câu lạc bộ Âm nhạc tập hợp học sinh yêu thích thanh nhạc và khí nhạc, tổ chức tập luyện định kỳ dưới sự hướng dẫn của giáo viên Âm nhạc. Câu lạc bộ phụ trách nhiều tiết mục văn nghệ trong các sự kiện toàn trường và chương trình hòa nhạc cuối học kỳ.',
    categories: ['NT'],
    contact: '[Email câu lạc bộ]',
  },
  {
    id: 'my-thuat',
    slug: 'my-thuat',
    name: 'Câu lạc bộ Mỹ thuật',
    shortName: 'CLB Mỹ thuật',
    description:
      'Câu lạc bộ Mỹ thuật tổ chức các lớp thực hành hội họa, ký họa và thiết kế nhằm bồi dưỡng năng khiếu thẩm mỹ của học sinh. Các tác phẩm của thành viên được trưng bày trong khuôn viên trường và tại các sự kiện của nhà trường.',
    categories: ['NT'],
    contact: '[Email câu lạc bộ]',
  },
  {
    id: 'san-khau',
    slug: 'san-khau',
    name: 'Câu lạc bộ Sân khấu',
    shortName: 'CLB Sân khấu',
    description:
      'Câu lạc bộ Sân khấu dàn dựng tiểu phẩm và chương trình biểu diễn về các chủ đề gắn với đời sống học đường. Câu lạc bộ giúp học sinh phát triển kỹ năng diễn xuất, biên kịch và tổ chức sân khấu, đồng thời góp phần vào công tác tuyên truyền của nhà trường.',
    categories: ['NT'],
    contact: '[Email câu lạc bộ]',
  },
  {
    id: 'bong-ro',
    slug: 'bong-ro',
    name: 'Câu lạc bộ Bóng rổ',
    shortName: 'CLB Bóng rổ',
    description:
      'Câu lạc bộ Bóng rổ tổ chức tập luyện định kỳ, giao hữu và giải đấu cấp trường cho học sinh ở mọi trình độ. Câu lạc bộ đồng thời phụ trách tuyển chọn và huấn luyện đội tuyển bóng rổ của trường.',
    categories: ['TT'],
    contact: '[Email câu lạc bộ]',
  },
  {
    id: 'cau-long',
    slug: 'cau-long',
    name: 'Câu lạc bộ Cầu lông',
    shortName: 'CLB Cầu lông',
    description:
      'Câu lạc bộ Cầu lông tạo môi trường rèn luyện thể chất thường xuyên cho học sinh yêu thích môn cầu lông. Câu lạc bộ tổ chức các buổi tập theo trình độ và giải cầu lông cấp trường ở các nội dung đơn và đôi.',
    categories: ['TT'],
    contact: '[Email câu lạc bộ]',
  },
  {
    id: 'tinh-nguyen-xanh',
    slug: 'tinh-nguyen-xanh',
    name: 'Câu lạc bộ Tình nguyện Xanh',
    shortName: 'CLB Tình nguyện Xanh',
    description:
      'Câu lạc bộ Tình nguyện Xanh triển khai các hoạt động bảo vệ môi trường và thiện nguyện trong khuôn viên trường và tại cộng đồng. Câu lạc bộ phối hợp với các đơn vị địa phương tổ chức chương trình và xác nhận giờ hoạt động tình nguyện cho học sinh.',
    categories: ['TN'],
    contact: '[Email câu lạc bộ]',
  },
  {
    id: 'huong-nghiep',
    slug: 'huong-nghiep',
    name: 'Câu lạc bộ Hướng nghiệp',
    shortName: 'CLB Hướng nghiệp',
    description:
      'Câu lạc bộ Hướng nghiệp cung cấp thông tin về ngành học, nghề nghiệp và tuyển sinh thông qua hội thảo, tọa đàm và ngày hội. Câu lạc bộ hỗ trợ học sinh tìm hiểu năng lực bản thân và xây dựng kế hoạch học tập phù hợp với định hướng nghề nghiệp.',
    categories: ['KN'],
    contact: '[Email câu lạc bộ]',
  },
  {
    id: 'robotics',
    slug: 'robotics',
    name: 'Câu lạc bộ Robotics',
    shortName: 'CLB Robotics',
    description:
      'Câu lạc bộ Robotics hướng dẫn học sinh thiết kế, lắp ráp và lập trình robot thông qua các buổi thực hành theo nhóm. Câu lạc bộ tuyển chọn và đồng hành cùng đội thi robotics của trường tại các cuộc thi dành cho học sinh trung học phổ thông.',
    categories: ['CN'],
    contact: '[Email câu lạc bộ]',
  },
];
