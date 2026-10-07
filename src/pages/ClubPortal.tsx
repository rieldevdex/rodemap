import { PageHead } from '../components/molecules/PageHead';
import { PendingNotice } from '../components/molecules/PendingNotice';

export function ClubPortalPage() {
  return (
    <>
      <PageHead eyebrow="Dành cho câu lạc bộ" title="Cổng câu lạc bộ" lead="Đại diện câu lạc bộ gửi sự kiện mới và theo dõi trạng thái kiểm duyệt." />
      <PendingNotice description="Cổng câu lạc bộ gồm biểu mẫu gửi sự kiện có kiểm tra tính hợp lệ và danh sách sự kiện đã gửi theo trạng thái." />
    </>
  );
}
