import type { NewsPost } from '../../domain/types';
import { Link } from '../../router';
import { NewsCard } from '../molecules/NewsCard';
import './NewsRelated.css';

export interface NewsRelatedProps {
  posts: readonly NewsPost[];
  title: string;
  headingId: string;
  /** Band style of the section. */
  surface?: boolean;
}

/** "Bài viết liên quan" from the Bản tin Hội đồng Học sinh, as a band under an event or a club. */
export function NewsRelated({ posts, title, headingId, surface = false }: NewsRelatedProps) {
  if (posts.length === 0) return null;
  return (
    <section className={surface ? 'band band--surface' : 'band'} aria-labelledby={headingId}>
      <div className="container news-related">
        <div className="news-related__head">
          <h2 id={headingId} className="news-related__title">
            {title}
          </h2>
          <Link to="/ban-tin" className="news-related__all">
            Xem Bản tin
          </Link>
        </div>
        <ul className="news-related__list">
          {posts.slice(0, 3).map((p) => (
            <li key={p.id}>
              <NewsCard post={p} variant="compact" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
