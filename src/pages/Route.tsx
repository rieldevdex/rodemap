import { PageHead } from '../components/molecules/PageHead';
import { PendingNotice } from '../components/molecules/PendingNotice';

export function RoutePage() {
  return (
    <>
      <PageHead eyebrow="Năm học 2026–2027" title="Lộ trình" lead="Toàn bộ năm học được trình bày như một bản đồ tuyến, từ tháng 9/2026 đến tháng 5/2027." />
      <PendingNotice description="Bản đồ lộ trình gồm các tuyến lĩnh vực, điểm dừng sự kiện, các đợt kiểm tra định kỳ và lộ trình của bạn, kèm phiên bản dạng danh sách." />
    </>
  );
}
