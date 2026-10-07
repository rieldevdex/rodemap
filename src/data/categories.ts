// Dữ liệu minh họa phục vụ bản trình diễn. Thay thế bằng dữ liệu chính thức khi triển khai.
import { CATEGORY_CODES, type Category, type CategoryCode } from '../domain/types';

const CATEGORY_BY_CODE: Record<CategoryCode, Category> = {
  HT: {
    code: 'HT',
    name: 'Học thuật',
    description: 'Các buổi chuyên đề, cuộc thi và hoạt động ôn luyện nhằm nâng cao kiến thức và phương pháp học tập.',
  },
  NT: {
    code: 'NT',
    name: 'Nghệ thuật – Văn hóa',
    description: 'Các chương trình âm nhạc, mỹ thuật và sân khấu nhằm bồi dưỡng năng khiếu và đời sống văn hóa trong nhà trường.',
  },
  TT: {
    code: 'TT',
    name: 'Thể thao',
    description: 'Các giải đấu, buổi tập luyện và tuyển chọn đội tuyển nhằm rèn luyện thể chất và tinh thần đồng đội.',
  },
  TN: {
    code: 'TN',
    name: 'Tình nguyện – Cộng đồng',
    description: 'Các hoạt động thiện nguyện và bảo vệ môi trường nhằm góp phần phục vụ cộng đồng.',
  },
  KN: {
    code: 'KN',
    name: 'Kỹ năng – Hướng nghiệp',
    description: 'Các buổi tập huấn, tọa đàm và cuộc thi nhằm phát triển kỹ năng mềm và định hướng nghề nghiệp.',
  },
  CN: {
    code: 'CN',
    name: 'Công nghệ – Sáng tạo',
    description: 'Các hội thảo, buổi thực hành và cuộc thi về lập trình, dữ liệu, robot và phát triển sản phẩm.',
  },
  TS: {
    code: 'TS',
    name: 'Sự kiện toàn trường',
    description: 'Các sự kiện do nhà trường và Hội đồng Học sinh tổ chức dành cho toàn thể học sinh.',
  },
};

/** The seven lines of the route map, in CATEGORY_CODES order. */
export const CATEGORIES: Category[] = CATEGORY_CODES.map((code) => CATEGORY_BY_CODE[code]);

export function categoryByCode(code: CategoryCode): Category {
  return CATEGORY_BY_CODE[code];
}
