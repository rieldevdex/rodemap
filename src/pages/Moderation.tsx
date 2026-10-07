import { PageHead } from '../components/molecules/PageHead';
import { PendingNotice } from '../components/molecules/PendingNotice';

export function ModerationPage() {
  return (
    <>
      <PageHead eyebrow="Dành cho Hội đồng Học sinh" title="Kiểm duyệt" lead="Hội đồng Học sinh xem xét sự kiện do câu lạc bộ gửi và phê duyệt, yêu cầu chỉnh sửa hoặc từ chối kèm lý do." />
      <PendingNotice description="Hàng chờ kiểm duyệt gồm các thao tác phê duyệt, yêu cầu chỉnh sửa và từ chối kèm lý do bắt buộc." />
    </>
  );
}
