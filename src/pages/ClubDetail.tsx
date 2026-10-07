import { PageHead } from '../components/molecules/PageHead';
import { PendingNotice } from '../components/molecules/PendingNotice';

export function ClubDetailPage() {
  return (
    <>
      <PageHead eyebrow="Câu lạc bộ" title="Thông tin câu lạc bộ" lead="Mô tả, lĩnh vực hoạt động, sự kiện sắp diễn ra và sự kiện đã tổ chức của câu lạc bộ." />
      <PendingNotice description="Trang câu lạc bộ gồm mô tả, các tuyến lĩnh vực, sự kiện sắp diễn ra và sự kiện đã tổ chức." />
    </>
  );
}
