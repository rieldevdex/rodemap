import { PageHead } from '../components/molecules/PageHead';
import { PendingNotice } from '../components/molecules/PendingNotice';

export function ProposalPage() {
  return (
    <>
      <PageHead eyebrow="Đề xuất tranh cử Hội đồng Học sinh nhiệm kỳ 2026–2027" title="Đề án xây dựng nền tảng Rodemap" lead="Vấn đề, giải pháp, kế hoạch triển khai, nguồn lực, bảo vệ dữ liệu học sinh và cam kết của ứng cử viên." />
      <PendingNotice description="Trang đề án trình bày đầy đủ các phần theo hướng dẫn bầu cử: vấn đề, giải pháp, kế hoạch triển khai, nguồn lực và tính khả thi, bảo vệ dữ liệu học sinh, cam kết." />
    </>
  );
}
