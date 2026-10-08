import { useMemo, useState } from 'react';
import { Button } from '../components/atoms/Button';
import { DemoLabel } from '../components/atoms/DemoLabel';
import { MonoTime } from '../components/atoms/MonoTime';
import { NewsCard } from '../components/molecules/NewsCard';
import { PageHead } from '../components/molecules/PageHead';
import { SearchField } from '../components/molecules/SearchField';
import { SCHOOL } from '../data/school';
import { formatDate, toMillis } from '../domain/dates';
import { filterPosts, groupByIssue, leadPost, NEWS_CATEGORY_LABELS } from '../domain/news';
import { CATEGORY_CODES, NEWS_CATEGORIES, type CategoryCode, type NewsCategory, type NewsPost } from '../domain/types';
import { Link } from '../router';
import { selectNews } from '../state/selectors';
import { useCatalog } from '../state/useCatalog';
import './News.css';

export function NewsPage() {
  const { state, now, eventById } = useCatalog();
  const [category, setCategory] = useState<NewsCategory | null>(null);
  const [query, setQuery] = useState('');
  const news = useMemo(() => selectNews(state, now), [state, now]);

  const filtering = category !== null || query.trim() !== '';
  const lead = filtering ? undefined : leadPost(news);
  const current = groupByIssue(news)[0];
  const inThisIssue = current ? current.posts.filter((p) => p.id !== lead?.id) : [];
  const shown = filterPosts(
    news.filter((p) => p.id !== lead?.id),
    { category, query },
  );
  const issues = groupByIssue(shown);

  const linesOf = (p: NewsPost): CategoryCode[] => {
    const codes = new Set(
      p.eventIds.flatMap((id) => {
        const e = eventById(id);
        return e?.status === 'approved' ? [e.category] : [];
      }),
    );
    return CATEGORY_CODES.filter((c) => codes.has(c));
  };

  return (
    <div className="news">
      <PageHead
        eyebrow={
          current ? (
            <>
              <span>Số {current.number}</span>
              <span aria-hidden="true">·</span>
              <span>{current.label}</span>
            </>
          ) : (
            'Hội đồng Học sinh'
          )
        }
        title="Bản tin Hội đồng Học sinh"
        lead="Thông báo, tin hoạt động, giới thiệu câu lạc bộ và hướng dẫn sử dụng Rodemap do Hội đồng Học sinh biên soạn và phát hành hằng tháng."
      >
        <p className="news__dateline">
          {SCHOOL.name} · Năm học {SCHOOL.schoolYear}
        </p>
        <div className="cluster">
          {state.role === 'moderator' ? (
            <Button to="/ban-tin/soan-bai" variant="primary" iconStart="plus">
              Soạn bài viết
            </Button>
          ) : null}
          <DemoLabel />
        </div>
      </PageHead>

      <div className="band band--surface">
        <div className="container news__inner">
          {lead ? (
            <section className="news__front" aria-labelledby="news-front">
              <h2 id="news-front" className="visually-hidden">
                Tin tiêu điểm
              </h2>
              <NewsCard post={lead} variant="lead" lines={linesOf(lead)} />
              {inThisIssue.length > 0 && current ? (
                <nav className="news__contents" aria-labelledby="news-contents">
                  <p id="news-contents" className="news__contents-title">
                    Trong số {current.number}
                  </p>
                  <ol>
                    {inThisIssue.map((p) => (
                      <li key={p.id}>
                        <span className="news__contents-kicker">{NEWS_CATEGORY_LABELS[p.category]}</span>
                        <Link to={`/ban-tin/${p.slug}`}>{p.title}</Link>
                        <MonoTime dateTime={p.publishedAt}>{formatDate(toMillis(p.publishedAt))}</MonoTime>
                      </li>
                    ))}
                  </ol>
                </nav>
              ) : null}
            </section>
          ) : null}

          <div className="news__toolbar">
            <div className="news__filters" role="group" aria-label="Lọc theo chuyên mục">
              <button
                type="button"
                className="news__filter"
                aria-pressed={category === null}
                onClick={() => {
                  setCategory(null);
                }}
              >
                Tất cả
              </button>
              {NEWS_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="news__filter"
                  aria-pressed={category === c}
                  onClick={() => {
                    setCategory(category === c ? null : c);
                  }}
                >
                  {NEWS_CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>
            <SearchField
              label="Tìm trong bản tin"
              value={query}
              onChange={setQuery}
              placeholder="Tiêu đề, nội dung, ban phụ trách"
              className="news__search"
            />
          </div>

          <p className="news__count" role="status">
            {filtering ? (
              <>
                <span className="mono">{shown.length}</span> bài viết
                {category ? ` thuộc chuyên mục ${NEWS_CATEGORY_LABELS[category]}` : ''}
                {query.trim() === '' ? '' : ` phù hợp với “${query.trim()}”`}
              </>
            ) : (
              <>
                <span className="mono">{news.length}</span> bài viết đã phát hành
              </>
            )}
          </p>

          {issues.length === 0 ? (
            <div className="news__empty">
              <p>
                {news.length === 0
                  ? 'Hội đồng Học sinh chưa phát hành bài viết nào trong năm học này.'
                  : 'Chưa có bài viết phù hợp với chuyên mục hoặc từ khóa đã chọn.'}
              </p>
              {filtering ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setCategory(null);
                    setQuery('');
                  }}
                >
                  Xem toàn bộ bản tin
                </Button>
              ) : null}
            </div>
          ) : (
            issues.map((issue) => (
              <section key={issue.key} className="news__issue" aria-labelledby={`issue-${issue.key}`}>
                <h2 id={`issue-${issue.key}`} className="news__issue-title">
                  <span className="news__issue-station" aria-hidden="true" />
                  <span>Số {issue.number}</span>
                  <span className="news__issue-month">{issue.label}</span>
                </h2>
                <ol className="news__columns">
                  {issue.posts.map((p) => (
                    <li key={p.id}>
                      <NewsCard post={p} lines={linesOf(p)} />
                    </li>
                  ))}
                </ol>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
