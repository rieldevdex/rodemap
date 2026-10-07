import { PageHead } from '../components/molecules/PageHead';
import { PendingNotice } from '../components/molecules/PendingNotice';

export function CalendarPage() {
  return (
    <>
      <PageHead eyebrow="Lịch cá nhân" title="Lịch của tôi" lead="Các sự kiện bạn đã đăng ký theo tháng và theo tuần, kèm cảnh báo trùng lịch." />
      <PendingNotice description="Lịch cá nhân gồm chế độ xem tháng và tuần, cảnh báo trùng lịch, xuất tệp .ics và liên kết Google Calendar." />
    </>
  );
}
