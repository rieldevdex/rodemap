/**
 * Vietnamese UI labels of the seven category lines, for domain modules that must not
 * depend on src/data (e.g. the .ics CATEGORIES property). Kept identical to
 * `CATEGORIES[].name` in src/data/categories.ts.
 */
import type { CategoryCode } from './types';

export const CATEGORY_LABELS: Record<CategoryCode, string> = {
  HT: 'Học thuật',
  NT: 'Nghệ thuật – Văn hóa',
  TT: 'Thể thao',
  TN: 'Tình nguyện – Cộng đồng',
  KN: 'Kỹ năng – Hướng nghiệp',
  CN: 'Công nghệ – Sáng tạo',
  TS: 'Sự kiện toàn trường',
};
