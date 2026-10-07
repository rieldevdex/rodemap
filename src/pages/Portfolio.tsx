import { PageHead } from '../components/molecules/PageHead';
import { PendingNotice } from '../components/molecules/PendingNotice';

export function PortfolioPage() {
  return (
    <>
      <PageHead eyebrow="Hoạt động đã tham gia" title="Hồ sơ năng lực" lead="Tổng hợp hoạt động đã tham gia theo lĩnh vực, kèm vai trò, số giờ, phần tự đánh giá và minh chứng." />
      <PendingNotice description="Hồ sơ năng lực gồm sơ đồ số giờ theo lĩnh vực, các mục hoạt động, bản in khổ A4 và tệp JSON." />
    </>
  );
}
