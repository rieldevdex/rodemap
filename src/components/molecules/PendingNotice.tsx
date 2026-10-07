import { Button } from '../atoms/Button';
import './PendingNotice.css';

export interface PendingNoticeProps {
  /** What this screen will contain, one formal sentence. */
  description: string;
}

/** Temporary notice for screens scheduled for a later milestone; always offers a way forward. */
export function PendingNotice({ description }: PendingNoticeProps) {
  return (
    <section className="band band--surface" aria-labelledby="pending-notice-title">
      <div className="container">
        <div className="pending-notice">
        <h2 id="pending-notice-title" className="pending-notice__title">
          Màn hình đang được hoàn thiện
        </h2>
        <p className="pending-notice__body">{description}</p>
        <div className="cluster">
          <Button to="/tong-quan" variant="secondary" iconEnd="arrow-right">
            Về trang Tổng quan
          </Button>
        </div>
        </div>
      </div>
    </section>
  );
}
