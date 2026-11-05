import { PageHead } from '../components/molecules/PageHead';
import { PRIVACY_POLICY, TERMS_OF_SERVICE, type LegalDocument } from '../content/legal';
import { SCHOOL } from '../data/school';
import { Link } from '../router';
import './About.css';
import { DocumentSection } from './DocumentSection';

/** A policy page laid out like Giới thiệu: table of contents beside numbered sections. */
function LegalPage({ doc, other }: { doc: LegalDocument; other: { to: string; label: string } }) {
  const tocId = 'legal-toc';
  return (
    <div className="proposal">
      <PageHead eyebrow={`Hội đồng Học sinh ${SCHOOL.name} · Có hiệu lực từ ngày ${doc.effective}`} title={doc.title} lead={doc.lead} />
      <div className="band band--surface">
        <div className="container proposal__layout">
          <nav className="proposal__toc no-print" aria-labelledby={tocId}>
            <p id={tocId} className="proposal__toc-title">
              Mục lục
            </p>
            <ol>
              {doc.sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`}>
                    <span className="proposal__numeral">{s.numeral}.</span> {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <article className="proposal__body" aria-label={doc.title}>
            {doc.sections.map((s) => (
              <DocumentSection key={s.id} section={s} />
            ))}
            <footer className="proposal__signature">
              <p className="proposal__label">Đơn vị vận hành</p>
              <p className="proposal__signature-name">Hội đồng Học sinh</p>
              <p>{SCHOOL.name}</p>
              <p>
                Xem thêm: <Link to={other.to}>{other.label}</Link>
              </p>
            </footer>
          </article>
        </div>
      </div>
    </div>
  );
}

/** Chính sách quyền riêng tư (/quyen-rieng-tu), also linked from the Google sign-in consent screen. */
export function PrivacyPage() {
  return <LegalPage doc={PRIVACY_POLICY} other={{ to: '/dieu-khoan', label: TERMS_OF_SERVICE.title }} />;
}

/** Điều khoản sử dụng (/dieu-khoan), also linked from the Google sign-in consent screen. */
export function TermsPage() {
  return <LegalPage doc={TERMS_OF_SERVICE} other={{ to: '/quyen-rieng-tu', label: PRIVACY_POLICY.title }} />;
}
