import { PageHead } from '../components/molecules/PageHead';
import { PendingNotice } from '../components/molecules/PendingNotice';

export function OnboardingPage() {
  return (
    <>
      <PageHead eyebrow="Bốn bước" title="Thiết lập hồ sơ" lead="Bốn bước thiết lập giúp Rodemap đề xuất lộ trình phù hợp với khối lớp, lĩnh vực quan tâm, mục tiêu và thời gian của bạn." />
      <PendingNotice description="Quy trình thiết lập gồm bốn điểm dừng trên một tuyến: khối và lớp, lĩnh vực quan tâm, mục tiêu trong năm học, thời gian có thể tham gia." />
    </>
  );
}
