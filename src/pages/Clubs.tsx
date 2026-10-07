import { PageHead } from '../components/molecules/PageHead';
import { PendingNotice } from '../components/molecules/PendingNotice';

export function ClubsPage() {
  return (
    <>
      <PageHead eyebrow="Danh bạ" title="Câu lạc bộ" lead="Danh sách câu lạc bộ cùng lĩnh vực hoạt động và các sự kiện sắp diễn ra." />
      <PendingNotice description="Danh bạ câu lạc bộ gồm mô tả, lĩnh vực hoạt động và các sự kiện sắp diễn ra của từng câu lạc bộ." />
    </>
  );
}
