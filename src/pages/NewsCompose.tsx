import { useEffect, useMemo, useRef, useState, type SyntheticEvent } from 'react';
import { Button } from '../components/atoms/Button';
import { DemoLabel } from '../components/atoms/DemoLabel';
import { Icon } from '../components/atoms/Icon';
import { MonoTime } from '../components/atoms/MonoTime';
import { ConfirmDialog } from '../components/molecules/ConfirmDialog';
import { PageHead } from '../components/molecules/PageHead';
import { NewsArticleBody } from '../components/organisms/NewsArticleBody';
import { NEWS_DEPARTMENTS } from '../data/news';
import { formatDate, formatLongDate, toIsoDateTime, toMillis } from '../domain/dates';
import { NEWS_CATEGORY_LABELS, NEWS_LIMITS, newsBodyText, parseNewsBody, postFromDraft, readingMinutes, validateNewsDraft, type NewsDraftErrors } from '../domain/news';
import { charCount } from '../domain/moderation';
import { NEWS_CATEGORIES, type NewsCategory, type NewsDraft } from '../domain/types';
import { useNavigate } from '../router';
import { newId } from '../state/effects';
import { selectNewsSlugs } from '../state/selectors';
import { useCatalog } from '../state/useCatalog';
import './NewsCompose.css';

const FIELDS: (keyof NewsDraft)[] = ['title', 'category', 'author', 'summary', 'bodyText', 'eventIds'];
const fieldId = (f: keyof NewsDraft) => `nc-${f}`;

function emptyDraft(): NewsDraft {
  return { title: '', category: 'announcement', author: NEWS_DEPARTMENTS[0], summary: '', bodyText: '', eventIds: [] };
}

export function NewsComposePage() {
  const { state, dispatch, now, publicEvents, eventById } = useCatalog();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<NewsDraft>(emptyDraft);
  // Errors of the last "Đăng bài", kept until the next one (the summary is not re-announced while typing).
  const [errors, setErrors] = useState<NewsDraftErrors>({});
  const [pick, setPick] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const chosenRef = useRef<HTMLUListElement>(null);
  const pickRef = useRef<HTMLSelectElement>(null);
  /** After adding or removing a related event: index of the "Bỏ" button to focus (-1 = the event picker). */
  const pendingEventFocus = useRef<number | null>(null);

  const known = useMemo(() => new Set(publicEvents.map((e) => e.id)), [publicEvents]);
  const blocks = useMemo(() => parseNewsBody(draft.bodyText), [draft.bodyText]);
  const errorList = FIELDS.filter((f) => errors[f] !== undefined);

  // Keep keyboard focus inside "Sự kiện liên quan" when its buttons are disabled or removed.
  useEffect(() => {
    const index = pendingEventFocus.current;
    if (index === null) return;
    pendingEventFocus.current = null;
    const buttons = chosenRef.current?.querySelectorAll<HTMLButtonElement>('button');
    const picker = pickRef.current;
    if (index >= 0 && buttons && buttons.length > 0) buttons[Math.min(index, buttons.length - 1)]?.focus();
    else if (picker && !picker.disabled) picker.focus();
  }, [draft.eventIds]);

  if (state.role !== 'moderator') {
    return (
      <>
        <PageHead
          eyebrow="Bản tin · Dành cho Hội đồng Học sinh"
          title="Soạn bài viết"
          lead="Thành viên Hội đồng Học sinh soạn và phát hành bài viết cho Bản tin Hội đồng Học sinh."
        />
        <section className="band band--surface">
          <div className="container">
            <div className="stack stack--md news-compose__gate">
              <p>
                Trong bản trình diễn, bạn có thể chuyển sang vai trò HĐHS để soạn bài viết. Vai trò có thể thay đổi tại mục Tài khoản minh họa.
              </p>
              <div className="cluster">
                <Button
                  variant="primary"
                  onClick={() => {
                    dispatch({ type: 'role/set', role: 'moderator' });
                  }}
                >
                  Chuyển sang vai trò HĐHS
                </Button>
                <Button to="/ban-tin" variant="secondary">
                  Xem toàn bộ Bản tin
                </Button>
              </div>
            </div>
          </div>
        </section>
      </>
    );
  }

  const update = (patch: Partial<NewsDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
  };

  const submit = (ev: SyntheticEvent) => {
    ev.preventDefault();
    const found = validateNewsDraft(draft, known);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      // Every failed attempt, the first or a later one, moves focus to the summary.
      window.requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    const post = postFromDraft(draft, {
      id: newId('bt'),
      now,
      takenSlugs: selectNewsSlugs(state),
      clubOfEvent: (id) => eventById(id)?.clubId,
    });
    dispatch({ type: 'news/publish', post });
    navigate(`/ban-tin/${post.slug}`);
  };

  const describedBy = (f: keyof NewsDraft, hint?: string) => [hint, errors[f] === undefined ? null : `${fieldId(f)}-error`].filter(Boolean).join(' ') || undefined;
  const errorText = (f: keyof NewsDraft) =>
    errors[f] === undefined ? null : (
      <p id={`${fieldId(f)}-error`} className="news-compose__error">
        <Icon name="alert" size="sm" />
        <span>{errors[f]}</span>
      </p>
    );

  const chosen = draft.eventIds.flatMap((id) => {
    const e = eventById(id);
    return e ? [e] : [];
  });
  const options = publicEvents.filter((e) => !draft.eventIds.includes(e.id));
  const full = draft.eventIds.length >= NEWS_LIMITS.maxEvents;
  const bodyChars = charCount(newsBodyText(blocks));

  return (
    <div className="news-compose">
      <PageHead
        eyebrow="Bản tin · Dành cho Hội đồng Học sinh"
        title="Soạn bài viết"
        lead="Bài viết được phát hành ngay sau khi bạn nhấn Đăng bài và hiển thị với toàn bộ học sinh tại trang Bản tin."
      >
        <DemoLabel />
      </PageHead>

      <div className="band band--surface">
        <div className="container news-compose__layout">
          <form className="news-compose__form" onSubmit={submit} noValidate aria-labelledby="nc-form-title">
            <h2 id="nc-form-title" className="news-compose__h2">
              Nội dung bài viết
            </h2>

            {errorList.length > 0 ? (
              <div className="news-compose__summary" ref={summaryRef} tabIndex={-1} role="alert">
                <p className="news-compose__summary-title">Bài viết còn {errorList.length} nội dung cần điều chỉnh:</p>
                <ul>
                  {errorList.map((f) => (
                    <li key={f}>
                      <a href={`#${f === 'eventIds' ? 'nc-event-pick' : fieldId(f)}`}>{errors[f]}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="news-compose__field">
              <label htmlFor={fieldId('title')}>Tiêu đề</label>
              <input
                id={fieldId('title')}
                value={draft.title}
                maxLength={NEWS_LIMITS.titleMax + 20}
                aria-invalid={errors.title === undefined ? undefined : true}
                aria-describedby={describedBy('title')}
                onChange={(e) => {
                  update({ title: e.target.value });
                }}
              />
              {errorText('title')}
            </div>

            <div className="news-compose__grid">
              <div className="news-compose__field">
                <label htmlFor={fieldId('category')}>Chuyên mục</label>
                <select
                  id={fieldId('category')}
                  value={draft.category}
                  onChange={(e) => {
                    update({ category: e.target.value as NewsCategory });
                  }}
                >
                  {NEWS_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {NEWS_CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
                {errorText('category')}
              </div>
              <div className="news-compose__field">
                <label htmlFor={fieldId('author')}>Ban phụ trách</label>
                <select
                  id={fieldId('author')}
                  value={draft.author}
                  onChange={(e) => {
                    update({ author: e.target.value });
                  }}
                >
                  {NEWS_DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                {errorText('author')}
              </div>
            </div>

            <div className="news-compose__field">
              <label htmlFor={fieldId('summary')}>Tóm tắt</label>
              <p id="nc-summary-hint" className="news-compose__hint">
                Một đến hai câu hiển thị tại trang Bản tin và ở đầu bài viết.
              </p>
              <textarea
                id={fieldId('summary')}
                rows={3}
                value={draft.summary}
                aria-invalid={errors.summary === undefined ? undefined : true}
                aria-describedby={describedBy('summary', 'nc-summary-hint nc-summary-count')}
                onChange={(e) => {
                  update({ summary: e.target.value });
                }}
              />
              <p id="nc-summary-count" className="news-compose__count">
                {charCount(draft.summary)}/{NEWS_LIMITS.summaryMax} ký tự
              </p>
              {errorText('summary')}
            </div>

            <div className="news-compose__field">
              <label htmlFor={fieldId('bodyText')}>Nội dung</label>
              <div id="nc-body-hint" className="news-compose__hint">
                <p>Để trống một dòng giữa các đoạn văn. Dòng bắt đầu bằng:</p>
                <ul>
                  <li>
                    <code>## </code> là tiêu đề mục;
                  </li>
                  <li>
                    <code>- </code> là một ý trong danh sách;
                  </li>
                  <li>
                    <code>&gt; </code> là trích dẫn, ghi nguồn sau dấu <code> — </code>, ví dụ: Ban chủ nhiệm câu lạc bộ (không ghi họ tên học sinh).
                  </li>
                </ul>
              </div>
              <textarea
                id={fieldId('bodyText')}
                rows={14}
                value={draft.bodyText}
                aria-invalid={errors.bodyText === undefined ? undefined : true}
                aria-describedby={describedBy('bodyText', 'nc-body-hint nc-body-count')}
                onChange={(e) => {
                  update({ bodyText: e.target.value });
                }}
              />
              <p id="nc-body-count" className="news-compose__count">
                {bodyChars} ký tự · đọc khoảng {readingMinutes({ title: draft.title, summary: draft.summary, body: blocks })} phút
              </p>
              {errorText('bodyText')}
            </div>

            <fieldset className="news-compose__fieldset" aria-describedby={describedBy('eventIds', 'nc-events-hint')}>
              <legend>Sự kiện liên quan</legend>
              <p id="nc-events-hint" className="news-compose__hint">
                Tối đa {NEWS_LIMITS.maxEvents} sự kiện đã được phê duyệt. Câu lạc bộ tổ chức các sự kiện này được gắn với bài viết.
              </p>
              {errorText('eventIds')}
              {chosen.length > 0 ? (
                <ul className="news-compose__chosen" ref={chosenRef}>
                  {chosen.map((e, i) => (
                    <li key={e.id}>
                      <span className="news-compose__chosen-date">{formatDate(toMillis(e.start))}</span>
                      <span className="news-compose__chosen-title">{e.title}</span>
                      <Button
                        variant="quiet"
                        size="sm"
                        aria-label={`Bỏ sự kiện “${e.title}”`}
                        onClick={() => {
                          pendingEventFocus.current = draft.eventIds.length > 1 ? i : -1;
                          update({ eventIds: draft.eventIds.filter((id) => id !== e.id) });
                        }}
                      >
                        Bỏ
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="news-compose__pick">
                <label htmlFor="nc-event-pick" className="visually-hidden">
                  Chọn sự kiện
                </label>
                <select
                  id="nc-event-pick"
                  ref={pickRef}
                  value={pick}
                  disabled={full}
                  onChange={(e) => {
                    setPick(e.target.value);
                  }}
                >
                  <option value="">{full ? 'Đã chọn đủ số sự kiện' : 'Chọn sự kiện'}</option>
                  {options.map((e) => (
                    <option key={e.id} value={e.id}>
                      {formatDate(toMillis(e.start))} · {e.title}
                    </option>
                  ))}
                </select>
                <Button
                  variant="secondary"
                  size="sm"
                  iconStart="plus"
                  disabled={full || pick === ''}
                  onClick={() => {
                    if (pick === '') return;
                    // The picker while it can take another event, else the new event's "Bỏ".
                    pendingEventFocus.current = draft.eventIds.length + 1 < NEWS_LIMITS.maxEvents ? -1 : draft.eventIds.length;
                    update({ eventIds: [...draft.eventIds, pick] });
                    setPick('');
                  }}
                >
                  Thêm sự kiện
                </Button>
              </div>
            </fieldset>

            <div className="news-compose__actions">
              <Button type="submit" variant="primary" iconEnd="arrow-right">
                Đăng bài
              </Button>
              <Button
                variant="quiet"
                onClick={() => {
                  setConfirmReset(true);
                }}
              >
                Xóa nội dung
              </Button>
            </div>
          </form>

          <aside className="news-compose__preview" aria-labelledby="nc-preview-title">
            <h2 id="nc-preview-title" className="news-compose__preview-label">
              Xem trước
            </h2>
            <div className="news-compose__sheet">
              <p className="news-compose__preview-kicker">{NEWS_CATEGORY_LABELS[draft.category]}</p>
              <p className="news-compose__preview-title">{draft.title.trim() === '' ? 'Tiêu đề bài viết' : draft.title}</p>
              <p className="news-compose__preview-summary">{draft.summary.trim() === '' ? 'Phần tóm tắt hiển thị tại đây.' : draft.summary}</p>
              <p className="news-compose__preview-meta">
                {draft.author}, Hội đồng Học sinh · <MonoTime dateTime={toIsoDateTime(now)}>{formatLongDate(now)}</MonoTime>
              </p>
              {blocks.length > 0 ? (
                <NewsArticleBody blocks={blocks} headingLevel={3} />
              ) : (
                <p className="news-compose__hint">Nội dung bài viết hiển thị tại đây.</p>
              )}
            </div>
          </aside>
        </div>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Xóa nội dung đang soạn"
        confirmLabel="Xóa nội dung"
        tone="stop"
        onCancel={() => {
          setConfirmReset(false);
        }}
        onConfirm={() => {
          setConfirmReset(false);
          setDraft(emptyDraft());
          setErrors({});
          setPick('');
        }}
      >
        <p>Tiêu đề, tóm tắt, nội dung và sự kiện liên quan đang soạn sẽ bị xóa; chuyên mục và ban phụ trách được đặt lại về giá trị mặc định.</p>
      </ConfirmDialog>
    </div>
  );
}
