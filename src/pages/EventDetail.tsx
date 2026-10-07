import { PageHead } from '../components/molecules/PageHead';
import { PendingNotice } from '../components/molecules/PendingNotice';

export function EventDetailPage() {
  return (
    <>
      <PageHead eyebrow="Sự kiện" title="Chi tiết sự kiện" lead="Thông tin đầy đủ về sự kiện, phần tóm tắt của Mochi và các thao tác đăng ký." />
      <PendingNotice description="Trang chi tiết gồm thông tin sự kiện, tóm tắt của Mochi, số chỗ, hạn đăng ký, cảnh báo trùng lịch và các thao tác đăng ký." />
    </>
  );
}
