import { PageHead } from '../components/molecules/PageHead';
import { PendingNotice } from '../components/molecules/PendingNotice';

export function ExplorePage() {
  return (
    <>
      <PageHead eyebrow="Sự kiện đã phê duyệt" title="Khám phá sự kiện" lead="Tìm kiếm và lọc sự kiện theo lĩnh vực, câu lạc bộ, khối, thời gian, hình thức và hạn đăng ký." />
      <PendingNotice description="Danh sách sự kiện kèm bộ lọc theo lĩnh vực, câu lạc bộ, khối được tham gia, thời gian, hình thức, số chỗ còn lại và hạn đăng ký." />
    </>
  );
}
