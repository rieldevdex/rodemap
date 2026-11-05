import type { AboutSection } from '../content/about';
import './About.css';

/** "Tổng hợp: một nguồn…" → a bold lead-in and the rest. */
function splitLead(text: string): [string, string] | null {
  const i = text.indexOf(':');
  return i > 0 && i < 24 ? [text.slice(0, i), text.slice(i + 1).trim()] : null;
}

/** One numbered section of Giới thiệu, Chính sách quyền riêng tư or Điều khoản sử dụng. */
export function DocumentSection({ section }: { section: AboutSection }) {
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
