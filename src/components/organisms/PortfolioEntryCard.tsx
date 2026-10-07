import { useId, useState } from 'react';
import { formatHours } from '../../domain/text';
import type { PortfolioEntry } from '../../domain/types';
import { Link } from '../../router';
import { Button } from '../atoms/Button';
import { LineBadge } from '../atoms/LineBadge';
import { MonoTime } from '../atoms/MonoTime';
import { StatusTag } from '../atoms/StatusTag';
import { ConfirmDialog } from '../molecules/ConfirmDialog';
import './PortfolioEntryCard.css';

export interface PortfolioEntryCardProps {
  entry: PortfolioEntry;
  eventTitle: string;
  eventHref: string | null;
  clubName: string;
  dateLabel: string;
  dateTime: string;
  onSave: (patch: Pick<PortfolioEntry, 'role' | 'hours' | 'reflection' | 'evidenceLinks'>) => void;
  onRemove: () => void;
  onAskMochi: () => void;
}

const URL_RE = /^https?:\/\/[^\s]+$/i;

/** One portfolio entry: read view for print, edit form on screen. */
export function PortfolioEntryCard({
  entry,
  eventTitle,
  eventHref,
  clubName,
  dateLabel,
  dateTime,
  onSave,
  onRemove,
  onAskMochi,
}: PortfolioEntryCardProps) {
  const uid = useId();
  const [editing, setEditing] = useState(false);
  const [role, setRole] = useState(entry.role);
  const [hours, setHours] = useState(formatHours(entry.hours));
  const [reflection, setReflection] = useState(entry.reflection);
  const [links, setLinks] = useState(entry.evidenceLinks.join('\n'));
  const [errors, setErrors] = useState<Partial<Record<'role' | 'hours' | 'links', string>>>({});
  const [confirmRemove, setConfirmRemove] = useState(false);
  const isDraft = entry.reflectionSource === 'mochi_draft';

  const startEdit = () => {
    setRole(entry.role);
    setHours(formatHours(entry.hours));
    setReflection(entry.reflection);
    setLinks(entry.evidenceLinks.join('\n'));
    setErrors({});
    setEditing(true);
  };

  const save = () => {
    const parsedHours = Number(hours.replace(',', '.'));
    const linkList = links
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const next: typeof errors = {};
    if (role.trim() === '') next.role = 'Vui lòng nhập vai trò.';
    if (!Number.isFinite(parsedHours) || parsedHours <= 0 || parsedHours > 200) next.hours = 'Số giờ cần là số dương, tối đa 200.';
    if (linkList.some((l) => !URL_RE.test(l))) next.links = 'Mỗi dòng cần là một đường dẫn bắt đầu bằng http:// hoặc https://.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    onSave({ role: role.trim(), hours: Math.round(parsedHours * 4) / 4, reflection: reflection.trim(), evidenceLinks: linkList });
    setEditing(false);
  };

  return (
    <article className="portfolio-entry" style={{ '--line': `var(--line-${entry.category.toLowerCase()})` } as Record<string, string>}>
      <header className="portfolio-entry__head">
        <div className="portfolio-entry__meta">
          <LineBadge code={entry.category} size="sm" />
          <MonoTime dateTime={dateTime}>{dateLabel}</MonoTime>
          <span>{clubName}</span>
        </div>
        <h3 className="portfolio-entry__title">
          {eventHref ? (
            <Link className="portfolio-entry__link" to={eventHref}>
              {eventTitle}
            </Link>
          ) : (
            eventTitle
          )}
        </h3>
      </header>

      {!editing ? (
        <>
          <dl className="portfolio-entry__facts">
            <div>
              <dt>Vai trò</dt>
              <dd>{entry.role}</dd>
            </div>
            <div>
              <dt>Số giờ</dt>
              <dd className="mono">{formatHours(entry.hours)}</dd>
            </div>
          </dl>
          <div className="portfolio-entry__reflection">
            <p className="portfolio-entry__label">
              Tự đánh giá
              {isDraft ? (
                <StatusTag tone="warn" icon="info">
                  Bản nháp do Mochi đề xuất
                </StatusTag>
              ) : null}
            </p>
            {entry.reflection.trim() === '' ? (
              <p className="portfolio-entry__empty">Chưa có phần tự đánh giá. Bạn có thể tự viết hoặc nhờ Mochi đề xuất bản nháp.</p>
            ) : (
              <p className={isDraft ? 'portfolio-entry__text portfolio-entry__text--draft' : 'portfolio-entry__text'}>{entry.reflection}</p>
            )}
          </div>
          {entry.evidenceLinks.length > 0 ? (
            <div>
              <p className="portfolio-entry__label">Minh chứng</p>
              <ul className="portfolio-entry__links">
                {entry.evidenceLinks.map((l) => (
                  <li key={l}>
                    <a href={l} target="_blank" rel="noopener noreferrer">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="portfolio-entry__actions no-print">
            <Button size="sm" variant="secondary" onClick={startEdit}>
              Chỉnh sửa
            </Button>
            <Button size="sm" variant="quiet" onClick={onAskMochi}>
              Đề nghị Mochi soạn bản nháp
            </Button>
            <Button
              size="sm"
              variant="quiet"
              onClick={() => {
                setConfirmRemove(true);
              }}
            >
              Xóa mục
            </Button>
          </div>
        </>
      ) : (
        <form
          className="portfolio-entry__form no-print"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div className="portfolio-entry__row">
            <label className="portfolio-entry__field">
              <span className="portfolio-entry__label">Vai trò</span>
              <input
                value={role}
                aria-invalid={errors.role ? true : undefined}
                aria-describedby={errors.role ? `${uid}-role` : undefined}
                onChange={(e) => {
                  setRole(e.target.value);
                }}
              />
              {errors.role ? (
                <span id={`${uid}-role`} className="portfolio-entry__error">
                  {errors.role}
                </span>
              ) : null}
            </label>
            <label className="portfolio-entry__field portfolio-entry__field--short">
              <span className="portfolio-entry__label">Số giờ</span>
              <input
                inputMode="decimal"
                value={hours}
                aria-invalid={errors.hours ? true : undefined}
                aria-describedby={errors.hours ? `${uid}-hours` : undefined}
                onChange={(e) => {
                  setHours(e.target.value);
                }}
              />
              {errors.hours ? (
                <span id={`${uid}-hours`} className="portfolio-entry__error">
                  {errors.hours}
                </span>
              ) : null}
            </label>
          </div>
          <label className="portfolio-entry__field">
            <span className="portfolio-entry__label">
              Tự đánh giá
              {isDraft ? <StatusTag tone="warn" icon="info">Bản nháp do Mochi đề xuất</StatusTag> : null}
            </span>
            <textarea
              rows={6}
              value={reflection}
              aria-describedby={`${uid}-hint`}
              onChange={(e) => {
                setReflection(e.target.value);
              }}
            />
            <span id={`${uid}-hint`} className="portfolio-entry__hint">
              Trình bày bằng lời văn của bạn: vai trò, điều đã học được và kế hoạch tiếp theo. Bản nháp chỉ trở thành nội dung
              của bạn sau khi được chỉnh sửa.
            </span>
          </label>
          <label className="portfolio-entry__field">
            <span className="portfolio-entry__label">Minh chứng (mỗi dòng một đường dẫn)</span>
            <textarea
              rows={3}
              value={links}
              aria-invalid={errors.links ? true : undefined}
              aria-describedby={errors.links ? `${uid}-links` : undefined}
              onChange={(e) => {
                setLinks(e.target.value);
              }}
            />
            {errors.links ? (
              <span id={`${uid}-links`} className="portfolio-entry__error">
                {errors.links}
              </span>
            ) : null}
          </label>
          <div className="portfolio-entry__actions">
            <Button size="sm" variant="primary" type="submit">
              Lưu thay đổi
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setEditing(false);
              }}
            >
              Hủy chỉnh sửa
            </Button>
          </div>
        </form>
      )}

      <ConfirmDialog
        open={confirmRemove}
        title="Xóa mục khỏi hồ sơ năng lực"
        confirmLabel="Xóa mục"
        tone="stop"
        onConfirm={() => {
          setConfirmRemove(false);
          onRemove();
        }}
        onCancel={() => {
          setConfirmRemove(false);
        }}
      >
        <p>Mục “{eventTitle}” cùng phần tự đánh giá và minh chứng sẽ bị xóa khỏi hồ sơ trên trình duyệt này.</p>
      </ConfirmDialog>
    </article>
  );
}
