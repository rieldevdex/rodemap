import { Button } from '../components/atoms/Button';
import { PageHead } from '../components/molecules/PageHead';
import { ABOUT_LEAD, ABOUT_PHASES, ABOUT_SECTIONS, ABOUT_TITLE, PLAN_SECTION } from '../content/about';
import { SCHOOL } from '../data/school';
import './About.css';
import { DocumentSection as Section } from './DocumentSection';

/** Giới thiệu: what vsmcclubs is, how the council runs it and how student data is handled. */
export function AboutPage() {
  const [first, second, ...rest] = ABOUT_SECTIONS;
  const toc = [...ABOUT_SECTIONS.slice(0, 2), PLAN_SECTION, ...ABOUT_SECTIONS.slice(2)];

  return (
    <div className="proposal">
      <PageHead eyebrow={`Hội đồng Học sinh ${SCHOOL.name} · Năm học ${SCHOOL.schoolYear}`} title={ABOUT_TITLE} lead={ABOUT_LEAD}>
        <div className="cluster no-print">
          <Button to="/tong-quan" variant="primary" iconEnd="arrow-right">
            Dùng thử vsmcclubs
          </Button>
          <Button to="/cau-lac-bo" variant="secondary">
            Xem danh sách câu lạc bộ
          </Button>
        </div>
      </PageHead>

      <div className="band band--surface">
        <div className="container proposal__layout">
          <nav className="proposal__toc no-print" aria-labelledby="proposal-toc">
            <p id="proposal-toc" className="proposal__toc-title">
              Mục lục
            </p>
            <ol>
              {toc.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`}>
                    <span className="proposal__numeral">{s.numeral}.</span> {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <article className="proposal__body" aria-label={ABOUT_TITLE}>
            {first ? <Section section={first} /> : null}
            {second ? <Section section={second} /> : null}

            <section className="proposal__section proposal__section--wide" id={PLAN_SECTION.id} aria-labelledby={`${PLAN_SECTION.id}-title`}>
              <h2 id={`${PLAN_SECTION.id}-title`} className="proposal__h2">
                <span className="proposal__numeral">{PLAN_SECTION.numeral}.</span> {PLAN_SECTION.title}
              </h2>
              <p className="proposal__p">
                Hội đồng Học sinh triển khai vsmcclubs theo hai giai đoạn trong năm học 2026–2027, mỗi giai đoạn có mục tiêu và kết quả cụ thể.
                Thời gian cụ thể của từng hoạt động được thống nhất với Phòng Công tác Học sinh.
              </p>
              <ol className="proposal__phases">
                {ABOUT_PHASES.map((phase) => (
                  <li key={phase.id} className="proposal__phase">
                    <span className="proposal__phase-dot" aria-hidden="true" />
                    <div className="proposal__phase-body">
                      <p className="proposal__phase-meta">
                        <span>{phase.label}</span>
                        <span className="proposal__phase-timing">{phase.timing}</span>
                      </p>
                      <h3 className="proposal__h3">{phase.title}</h3>
                      <div className="proposal__phase-columns">
                        <div>
                          <p className="proposal__label">Mục tiêu</p>
                          <ul>
                            {phase.goals.map((g) => (
                              <li key={g}>{g}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="proposal__label">Kết quả dự kiến</p>
                          <ul>
                            {phase.outputs.map((o) => (
                              <li key={o}>{o}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            {rest.map((s) => (
              <Section key={s.id} section={s} />
            ))}

            <footer className="proposal__signature">
              <p className="proposal__label">Đơn vị vận hành</p>
              <p className="proposal__signature-name">Hội đồng Học sinh</p>
              <p>{SCHOOL.name}</p>
            </footer>
          </article>
        </div>
      </div>
    </div>
  );
}
