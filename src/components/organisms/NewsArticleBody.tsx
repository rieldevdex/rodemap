import type { NewsBlock } from '../../domain/types';
import './NewsArticleBody.css';

/** The body of a council article: paragraphs, section headings (h2), lists and attributed quotes. */
export function NewsArticleBody({ blocks }: { blocks: readonly NewsBlock[] }) {
  return (
    <div className="news-body">
      {blocks.map((b, i) => {
        const key = `${b.kind}-${String(i)}`;
        switch (b.kind) {
          case 'heading':
            return <h2 key={key}>{b.text}</h2>;
          case 'list':
            return (
              <ul key={key}>
                {b.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            );
          case 'quote':
            return (
              <figure key={key} className="news-body__quote">
                <blockquote>
                  <p>{b.text}</p>
                </blockquote>
                {b.source === '' ? null : <figcaption>{b.source}</figcaption>}
              </figure>
            );
          default:
            return <p key={key}>{b.text}</p>;
        }
      })}
    </div>
  );
}
