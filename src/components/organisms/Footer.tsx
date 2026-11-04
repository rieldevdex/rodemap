import { SCHOOL } from '../../data/school';
import { Link } from '../../router';
import { Wordmark } from '../atoms/Wordmark';
import './Footer.css';

/** Site footer: hairline band with the product line, links and the council that runs vsmcclubs. */
export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div className="footer__brand">
          <Wordmark />
          <p className="footer__about">
            vsmcclubs tổng hợp sự kiện của các câu lạc bộ trên một lộ trình thống nhất, đồng thời hỗ trợ học sinh xây
            dựng lộ trình cá nhân và hồ sơ năng lực.
          </p>
        </div>
        <nav className="footer__nav" aria-label="Liên kết cuối trang">
          <ul className="footer__links">
            <li>
              <Link to="/gioi-thieu">Giới thiệu</Link>
            </li>
            <li>
              <Link to="/cau-lac-bo">Câu lạc bộ</Link>
            </li>
            <li>
              <Link to="/ban-tin">Bản tin</Link>
            </li>
            <li>
              <Link to="/de-xuat">Đề xuất hoạt động</Link>
            </li>
            <li>
              <Link to="/kham-pha">Khám phá sự kiện</Link>
            </li>
            <li>
              <Link to="/hdhs">Không gian HĐHS</Link>
            </li>
          </ul>
        </nav>
        <div className="footer__meta">
          <p>Do Hội đồng Học sinh vận hành</p>
          <p>
            {SCHOOL.name} · Năm học {SCHOOL.schoolYear}
          </p>
        </div>
      </div>
    </footer>
  );
}
