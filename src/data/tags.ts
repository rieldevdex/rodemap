// Dữ liệu minh họa phục vụ bản trình diễn. Thay thế bằng dữ liệu chính thức khi triển khai.
import type { Tag } from '../domain/types';

export const TAGS: Tag[] = [
  { id: 'lanh-dao', label: 'Lãnh đạo' },
  { id: 'du-hoc', label: 'Du học' },
  { id: 'tinh-nguyen', label: 'Tình nguyện' },
  { id: 'the-chat', label: 'Thể chất' },
  { id: 'thi-dau', label: 'Thi đấu' },
  { id: 'hoc-thuat', label: 'Học thuật' },
  { id: 'nghien-cuu', label: 'Nghiên cứu' },
  { id: 'huong-nghiep', label: 'Hướng nghiệp' },
  { id: 'nghe-thuat', label: 'Nghệ thuật' },
  { id: 'cong-nghe', label: 'Công nghệ' },
  { id: 'tieng-anh', label: 'Tiếng Anh' },
  { id: 'thuyet-trinh', label: 'Thuyết trình' },
  { id: 'lam-viec-nhom', label: 'Làm việc nhóm' },
  { id: 'moi-truong', label: 'Môi trường' },
  { id: 'cong-dong', label: 'Cộng đồng' },
  { id: 'khoi-nghiep', label: 'Khởi nghiệp' },
  { id: 'du-lieu', label: 'Dữ liệu' },
  { id: 'thiet-ke', label: 'Thiết kế' },
  { id: 'truyen-thong', label: 'Truyền thông' },
  { id: 'van-hoa', label: 'Văn hóa' },
];

const LABEL_BY_ID = new Map(TAGS.map((t) => [t.id, t.label]));

/** The Vietnamese label of a tag; unknown ids are shown as they are. */
export function tagLabel(id: string): string {
  return LABEL_BY_ID.get(id) ?? id;
}
