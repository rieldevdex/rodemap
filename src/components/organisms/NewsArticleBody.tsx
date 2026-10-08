import type { NewsBlock } from '../../domain/types';
import './NewsArticleBody.css';

export interface NewsArticleBodyProps {
  blocks: readonly NewsBlock[];
  /** Level of the section headings: 2 on the article page, 3 inside the compose preview. */
  headingLevel?: 2 | 3;
}

/** The body of a council article: paragraphs, section headings, lists and attributed quotes. */
export function NewsArticleBody({ blocks, headingLevel = 2 }: NewsArticleBodyProps) {
  const Heading = headingLevel === 3 ? 'h3' : 'h2';
  return (
    <div className="news-body">
      {blocks.map((b, i) => {
        const key = `${b.kind}-${String(i)}`;
        switch (b.kind) {
          case 'heading':
            return <Heading key={key}>{b.text}</Heading>;
          case 'list':
            return (
              <ul key={key}>
                {b.items.map((item, j) => (
                  // Items may repeat, so the position is part of the key.
                  <li key={`${String(j)}-${item}`}>{item}</li>
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
