import { Button } from '../components/atoms/Button';
import { PageHead } from '../components/molecules/PageHead';

export function NotFoundPage() {
  return (
    <>
      <PageHead
        eyebrow="Lỗi 404"
        title="Không tìm thấy trang"
        lead="Đường dẫn không tồn tại hoặc đã được thay đổi. Vui lòng quay lại Trang chủ hoặc tiếp tục khám phá sự kiện."
      >
        <div className="cluster">
          <Button to="/" variant="primary">
            Về Trang chủ
          </Button>
          <Button to="/kham-pha" variant="secondary">
            Khám phá sự kiện
          </Button>
        </div>
      </PageHead>
    </>
  );
}
