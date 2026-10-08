import { formatDate, toMillis } from '../../domain/dates';
import { NEWS_CATEGORY_LABELS, readingMinutes } from '../../domain/news';
import type { CategoryCode, NewsPost } from '../../domain/types';
import { Link } from '../../router';
import { LineBadge } from '../atoms/LineBadge';
import { MonoTime } from '../atoms/MonoTime';
import './NewsCard.css';

export interface NewsCardProps {
  post: NewsPost;
  /** lead: the front-page story; default: a column of the issue; compact: a related-article line. */
  variant?: 'lead' | 'default' | 'compact';
  headingLevel?: 2 | 3;
  /** Category lines of the events the article mentions. */
  lines?: readonly CategoryCode[];
}

/** An article of the Bản tin Hội đồng Học sinh: column kicker, headline, summary and byline. */
export function NewsCard({ post, variant = 'default', headingLevel = 3, lines = [] }: NewsCardProps) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <article className={`news-card news-card--${variant}`}>
      <p className="news-card__kicker">
        <span>{NEWS_CATEGORY_LABELS[post.category]}</span>
        {post.pinned === true && variant === 'lead' ? <span className="news-card__pin">Tin tiêu điểm</span> : null}
      </p>
      <Heading className="news-card__title">
        <Link to={`/ban-tin/${post.slug}`}>{post.title}</Link>
      </Heading>
      {variant === 'compact' ? null : <p className="news-card__summary">{post.summary}</p>}
      <p className="news-card__meta">
        <span>{post.author}</span>
        <span aria-hidden="true">·</span>
        <MonoTime dateTime={post.publishedAt}>{formatDate(toMillis(post.publishedAt))}</MonoTime>
        <span aria-hidden="true">·</span>
        <span>Đọc {readingMinutes(post)} phút</span>
      </p>
      {lines.length > 0 && variant !== 'compact' ? (
        <ul className="news-card__lines" aria-label="Lĩnh vực của các sự kiện được nhắc đến">
          {lines.map((code) => (
            <li key={code}>
              <LineBadge code={code} size="sm" />
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
