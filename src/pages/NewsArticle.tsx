import { useState } from 'react';
import { Button } from '../components/atoms/Button';
import { DemoLabel } from '../components/atoms/DemoLabel';
import { LineBadge } from '../components/atoms/LineBadge';
import { MonoTime } from '../components/atoms/MonoTime';
import { ConfirmDialog } from '../components/molecules/ConfirmDialog';
import { NewsCard } from '../components/molecules/NewsCard';
import { PageHead } from '../components/molecules/PageHead';
import { StationCard } from '../components/molecules/StationCard';
import { NewsArticleBody } from '../components/organisms/NewsArticleBody';
import { formatLongDate, formatTime, toMillis } from '../domain/dates';
import { deadlineDaysLeft, isPast, registrationState, seatsLeft } from '../domain/events';
import { groupByIssue, NEWS_CATEGORY_LABELS, readingMinutes, relatedPosts } from '../domain/news';
import type { Club, SchoolEvent } from '../domain/types';
import { Link, MAIN_HEADING_ID, useDocumentTitle, useNavigate, useRoute } from '../router';
import { copyText, printPage } from '../state/effects';
import { selectNews, selectNewsBySlug } from '../state/selectors';
import { useCatalog } from '../state/useCatalog';
import { EventRegistration } from './connected/EventRegistration';
import './NewsArticle.css';

export function NewsArticlePage() {
  const { params } = useRoute();
  const navigate = useNavigate();
  const { state, dispatch, now, eventById, clubById, clubName } = useCatalog();
  const [status, setStatus] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(false);
  const post = selectNewsBySlug(state, params.slug ?? '', now);
  useDocumentTitle(post?.title ?? null);

  if (!post) {
    return (
      <PageHead
        eyebrow="Bản tin Hội đồng Học sinh"
        title="Không tìm thấy bài viết"
        lead="Bài viết không tồn tại, chưa đến ngày phát hành hoặc đã được gỡ khỏi bản tin."
      >
        <div className="cluster">
          <Button to="/ban-tin" variant="primary">
            Xem toàn bộ bản tin
          </Button>
        </div>
      </PageHead>
    );
  }

  const published = toMillis(post.publishedAt);
  const issue = groupByIssue([post])[0];
  const events = post.eventIds.map(eventById).filter((e): e is SchoolEvent => e?.status === 'approved');
  const clubs = post.clubIds.map(clubById).filter((c): c is Club => c !== undefined);
  const related = relatedPosts(post, selectNews(state, now));
  const ownDemoPost = state.newsPosts.some((p) => p.id === post.id);

  const copyLink = () => {
    void copyText(`${window.location.origin}/ban-tin/${post.slug}`).then((ok) => {
      setStatus(ok ? 'Đã sao chép liên kết bài viết.' : 'Trình duyệt không cho phép sao chép; vui lòng sao chép địa chỉ trên thanh địa chỉ.');
    });
  };

  return (
    <div className="news-article">
      <PageHead
        eyebrow={
          <>
            <Link to="/ban-tin" className="news-article__crumb">
              Bản tin
            </Link>
            {issue ? (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  Số {issue.number} · {issue.label}
                </span>
              </>
            ) : null}
            <span aria-hidden="true">·</span>
            <span className="news-article__category">{NEWS_CATEGORY_LABELS[post.category]}</span>
          </>
        }
        title={post.title}
        lead={post.summary}
      >
        <p className="news-article__byline">
          <span>{post.author}, Hội đồng Học sinh</span>
          <span aria-hidden="true">·</span>
          <MonoTime dateTime={post.publishedAt}>
            {formatLongDate(published)}, {formatTime(published)}
          </MonoTime>
          <span aria-hidden="true">·</span>
          <span>Đọc {readingMinutes(post)} phút</span>
        </p>
        <div className="cluster no-print">
          <Button variant="secondary" size="sm" iconStart="print" onClick={printPage}>
            In bài viết
          </Button>
          <Button variant="quiet" size="sm" iconStart="link" onClick={copyLink}>
            Sao chép liên kết
          </Button>
          {state.role === 'moderator' && ownDemoPost ? (
            <Button
              variant="quiet"
              size="sm"
              iconStart="trash"
              onClick={() => {
                setConfirmRemove(true);
              }}
            >
              Gỡ bài viết
            </Button>
          ) : null}
          <DemoLabel />
        </div>
        <p className="news-article__status" role="status">
          {status}
        </p>
      </PageHead>

      <div className="band band--surface">
        <div className="container news-article__layout">
          <article className="news-article__body" aria-labelledby={MAIN_HEADING_ID}>
            <NewsArticleBody blocks={post.body} />
            <p className="news-article__sign">
              {post.author}
              <br />
              Hội đồng Học sinh
            </p>
          </article>

          {events.length > 0 || clubs.length > 0 ? (
            <aside className="news-article__aside no-print" aria-label="Thông tin liên quan">
              {events.length > 0 ? (
                <section className="news-article__panel" aria-labelledby="news-events">
                  <h2 id="news-events" className="news-article__h2">
                    Sự kiện được nhắc đến
                  </h2>
                  <ul className="news-article__events">
                    {events.map((e) => (
                      <li key={e.id}>
                        <StationCard
                          event={e}
                          clubName={clubName(e.clubId)}
                          state={registrationState(e, state.registrations, now)}
                          seatsLeft={seatsLeft(e, state.registrations)}
                          deadlineDays={deadlineDaysLeft(e, now)}
                          variant="compact"
                          actions={isPast(e, now) ? undefined : <EventRegistration eventId={e.id} size="sm" />}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              {clubs.length > 0 ? (
                <section className="news-article__panel" aria-labelledby="news-clubs">
                  <h2 id="news-clubs" className="news-article__h2">
                    Câu lạc bộ liên quan
                  </h2>
                  <ul className="news-article__clubs">
                    {clubs.map((c) => (
                      <li key={c.id}>
                        <Link to={`/cau-lac-bo/${c.slug}`}>{c.name}</Link>
                        <span className="news-article__club-lines">
                          {c.categories.map((code) => (
                            <LineBadge key={code} code={code} size="sm" />
                          ))}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </aside>
          ) : null}
        </div>
      </div>

      {related.length > 0 ? (
        <section className="band no-print" aria-labelledby="news-related">
          <div className="container news-article__related">
            <h2 id="news-related" className="news-article__h2">
              Bài viết liên quan
            </h2>
            <ul className="news-article__related-list">
              {related.map((p) => (
                <li key={p.id}>
                  <NewsCard post={p} variant="compact" />
                </li>
              ))}
            </ul>
            <Link to="/ban-tin" className="news-article__all">
              Xem toàn bộ bản tin
            </Link>
          </div>
        </section>
      ) : null}

      <ConfirmDialog
        open={confirmRemove}
        title="Gỡ bài viết khỏi bản tin?"
        confirmLabel="Gỡ bài viết"
        tone="stop"
        onCancel={() => {
          setConfirmRemove(false);
        }}
        onConfirm={() => {
          setConfirmRemove(false);
          dispatch({ type: 'news/remove', id: post.id });
          navigate('/ban-tin');
        }}
      >
        <p>Bài viết “{post.title}” sẽ không còn hiển thị với học sinh. Thao tác này chỉ áp dụng cho bài viết đăng trong bản trình diễn.</p>
      </ConfirmDialog>
    </div>
  );
}
