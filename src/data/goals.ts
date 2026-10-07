// Dữ liệu minh họa phục vụ bản trình diễn. Thay thế bằng dữ liệu chính thức khi triển khai.
import type { Goal } from '../domain/types';

export const GOALS: Goal[] = [
  { id: 'leadership', label: 'Phát triển kỹ năng lãnh đạo', tags: ['lanh-dao', 'thuyet-trinh', 'lam-viec-nhom'] },
  { id: 'study_abroad', label: 'Chuẩn bị hồ sơ du học', tags: ['du-hoc', 'tieng-anh', 'nghien-cuu'] },
  { id: 'volunteering', label: 'Tham gia hoạt động tình nguyện', tags: ['tinh-nguyen', 'cong-dong', 'moi-truong'] },
  { id: 'fitness', label: 'Rèn luyện thể chất', tags: ['the-chat', 'thi-dau'] },
  { id: 'academic', label: 'Nâng cao năng lực học thuật', tags: ['hoc-thuat', 'nghien-cuu'] },
  { id: 'career', label: 'Định hướng nghề nghiệp', tags: ['huong-nghiep', 'khoi-nghiep'] },
  { id: 'arts', label: 'Phát triển năng khiếu nghệ thuật', tags: ['nghe-thuat', 'van-hoa', 'thiet-ke'] },
  { id: 'technology', label: 'Phát triển năng lực công nghệ', tags: ['cong-nghe', 'du-lieu'] },
];
