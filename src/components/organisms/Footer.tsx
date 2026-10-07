import { SCHOOL } from '../../data/school';
import { Link } from '../../router';
import { DemoLabel } from '../atoms/DemoLabel';
import { Wordmark } from '../atoms/Wordmark';
import './Footer.css';

/** Site footer: hairline band with the permanent demo label and the campaign context. */
export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div className="footer__brand">
          <Wordmark />
          <p className="footer__about">
            Rodemap tổng hợp sự kiện của các câu lạc bộ trên một lộ trình thống nhất, đồng thời hỗ trợ học sinh xây
            dựng lộ trình cá nhân và hồ sơ năng lực.
          </p>
          <DemoLabel />
        </div>
        <nav className="footer__nav" aria-label="Liên kết cuối trang">
          <ul className="footer__links">
            <li>
              <Link to="/de-an">Đề án</Link>
            </li>
            <li>
              <Link to="/cau-lac-bo">Câu lạc bộ</Link>
            </li>
            <li>
              <Link to="/kham-pha">Khám phá sự kiện</Link>
            </li>
          </ul>
        </nav>
        <div className="footer__meta">
          <p>Đề xuất tranh cử Hội đồng Học sinh nhiệm kỳ 2026–2027</p>
          <p>
            {SCHOOL.name} · Năm học {SCHOOL.schoolYear}
          </p>
        </div>
      </div>
    </footer>
  );
}
