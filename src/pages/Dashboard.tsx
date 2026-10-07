import { PageHead } from '../components/molecules/PageHead';
import { PendingNotice } from '../components/molecules/PendingNotice';

export function DashboardPage() {
  return (
    <>
      <PageHead eyebrow="Bảng tin cá nhân" title="Tổng quan" lead="Các sự kiện sắp diễn ra, lộ trình của bạn và những hạn đăng ký cần lưu ý trong tuần." />
      <PendingNotice description="Bảng tin gồm bảng sự kiện sắp diễn ra, tóm tắt lộ trình, hạn đăng ký trong tuần, đề xuất của Mochi và bản tin tuần." />
    </>
  );
}
