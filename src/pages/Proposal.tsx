import { Button } from '../components/atoms/Button';
import { PageHead } from '../components/molecules/PageHead';
import { CANDIDATE, PLAN_SECTION, PROPOSAL_PHASES, PROPOSAL_SECTIONS, PROPOSAL_SUBTITLE, PROPOSAL_TITLE, type ProposalSection } from '../content/proposal';
import { SCHOOL } from '../data/school';
import { printPage } from '../state/effects';
import './Proposal.css';

/** "Tổng hợp: một nguồn…" → a bold lead-in and the rest. */
function splitLead(text: string): [string, string] | null {
  const i = text.indexOf(':');
  return i > 0 && i < 24 ? [text.slice(0, i), text.slice(i + 1).trim()] : null;
}

function Section({ section }: { section: ProposalSection }) {
  return (
    <section className="proposal__section" id={section.id} aria-labelledby={`${section.id}-title`}>
      <h2 id={`${section.id}-title`} className="proposal__h2">
        <span className="proposal__numeral">{section.numeral}.</span> {section.title}
      </h2>
      {section.paragraphs.map((p) => (
        <p key={p} className="proposal__p">
          {p}
        </p>
      ))}
      {section.bullets ? (
        <ul className="proposal__pillars">
          {section.bullets.map((b) => {
            const lead = splitLead(b);
            return (
              <li key={b}>
                {lead ? (
                  <>
                    <strong>{lead[0]}</strong>: {lead[1]}
                  </>
                ) : (
                  b
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}

export function ProposalPage() {
  const [first, second, ...rest] = PROPOSAL_SECTIONS;
  const toc = [...PROPOSAL_SECTIONS.slice(0, 2), PLAN_SECTION, ...PROPOSAL_SECTIONS.slice(2)];

  return (
    <div className="proposal">
      <PageHead eyebrow={`Đề xuất tranh cử Hội đồng Học sinh nhiệm kỳ ${SCHOOL.schoolYear}`} title={PROPOSAL_TITLE} lead={PROPOSAL_SUBTITLE}>
        <dl className="proposal__candidate">
          <div>
            <dt>Ứng cử viên</dt>
            <dd>Nguyễn Thanh Lâm</dd>
          </div>
          <div>
            <dt>Lớp</dt>
            <dd>12A1</dd>
          </div>
          <div>
            <dt>Vị trí ứng tuyển</dt>
            <dd>Chủ Tịch</dd>
          </div>
          <div className="proposal__candidate-message">
            <dt>Thông điệp tranh cử</dt>
            <dd>"Vì tương lai của bạn."</dd>
          </div>
        </dl>
        <div className="cluster no-print">
          <Button variant="primary" iconStart="print" onClick={printPage}>
            In đề án
          </Button>
          <Button to="/thiet-lap" variant="secondary" iconEnd="arrow-right">
            Trải nghiệm bản trình diễn
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

          <article className="proposal__body" aria-label={PROPOSAL_TITLE}>
            {first ? <Section section={first} /> : null}
            {second ? <Section section={second} /> : null}

            <section className="proposal__section proposal__section--wide" id={PLAN_SECTION.id} aria-labelledby={`${PLAN_SECTION.id}-title`}>
              <h2 id={`${PLAN_SECTION.id}-title`} className="proposal__h2">
                <span className="proposal__numeral">{PLAN_SECTION.numeral}.</span> {PLAN_SECTION.title}
              </h2>
              <p className="proposal__p">
                Rodemap được triển khai theo ba giai đoạn, mỗi giai đoạn có mục tiêu và kết quả cụ thể. Thời gian của từng giai đoạn sẽ được xác
                định sau khi trao đổi với Hội đồng Học sinh và Phòng Công tác Học sinh.
              </p>
              <ol className="proposal__phases">
                {PROPOSAL_PHASES.map((phase) => (
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
              <p className="proposal__label">Người đề xuất</p>
              <p className="proposal__signature-name">Nguyễn Thanh Lâm</p>
              <p>
                Lớp 12A1 · {SCHOOL.name}
              </p>
            </footer>
          </article>
        </div>
      </div>
    </div>
  );
}
