import { useId, useRef, useState, type ReactNode } from 'react';
import { CATEGORY_LABELS } from '../../domain/category-labels';
import { CATEGORY_CODES, GRADES, type CategoryCode, type EventDraft, type EventFormat, type Grade, type Tag } from '../../domain/types';
import { Button } from '../atoms/Button';
import './EventSubmissionForm.css';

export type DraftErrors = Partial<Record<keyof EventDraft, string>>;

export interface EventSubmissionFormProps {
  clubId: string;
  defaultCategory: CategoryCode;
  tags: Tag[];
  /** Values to start from (resubmission); dates as IsoDateTime with +07:00. */
  initial?: EventDraft | undefined;
  submitLabel: string;
  /** Returns validation errors; an empty object means the draft was accepted. */
  onSubmit: (draft: EventDraft) => DraftErrors;
  onCancel?: (() => void) | undefined;
}

/** "2026-10-21T16:45:00+07:00" → "2026-10-21T16:45" for datetime-local inputs. */
function toLocalInput(iso: string | undefined): string {
  return iso ? iso.slice(0, 16) : '';
}

/** datetime-local values are wall-clock times in Vietnam: append the fixed +07:00 offset. */
function fromLocalInput(value: string): string {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) ? `${value}:00+07:00` : value;
}

const FIELD_ORDER: (keyof EventDraft)[] = [
  'title',
  'category',
  'format',
  'start',
  'end',
  'registrationDeadline',
  'location',
  'eligibleGrades',
  'capacity',
  'summary',
  'description',
];

/** The club's event submission form, validated before it is sent to HĐHS. */
export function EventSubmissionForm({ clubId, defaultCategory, tags, initial, submitLabel, onSubmit, onCancel }: EventSubmissionFormProps) {
  const uid = useId();
  const summaryRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [category, setCategory] = useState<CategoryCode>(initial?.category ?? defaultCategory);
  const [format, setFormat] = useState<EventFormat>(initial?.format ?? 'in_person');
  const [start, setStart] = useState(toLocalInput(initial?.start));
  const [end, setEnd] = useState(toLocalInput(initial?.end));
  const [deadline, setDeadline] = useState(toLocalInput(initial?.registrationDeadline));
  const [location, setLocation] = useState(initial?.location ?? '');
  const [grades, setGrades] = useState<Grade[]>(initial?.eligibleGrades ?? [10, 11, 12]);
  const [capacity, setCapacity] = useState(initial ? String(initial.capacity) : '');
  const [summary, setSummary] = useState(initial?.summary ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [chosenTags, setChosenTags] = useState<string[]>(initial?.tags ?? []);
  const [errors, setErrors] = useState<DraftErrors>({});

  const id = (field: string) => `${uid}-${field}`;
  const describedBy = (field: keyof EventDraft, hint?: string) =>
    [errors[field] ? id(`${field}-error`) : null, hint ?? null].filter(Boolean).join(' ') || undefined;
  const errorText = (field: keyof EventDraft): ReactNode =>
    errors[field] ? (
      <span id={id(`${field}-error`)} className="submission-form__error">
        {errors[field]}
      </span>
    ) : null;

  const reset = () => {
    setTitle('');
    setCategory(defaultCategory);
    setFormat('in_person');
    setStart('');
    setEnd('');
    setDeadline('');
    setLocation('');
    setGrades([10, 11, 12]);
    setCapacity('');
    setSummary('');
    setDescription('');
    setChosenTags([]);
    setErrors({});
  };

  const submit = () => {
    const draft: EventDraft = {
      title: title.trim(),
      clubId,
      category,
      format,
      start: fromLocalInput(start),
      end: fromLocalInput(end),
      registrationDeadline: fromLocalInput(deadline),
      location: location.trim(),
      eligibleGrades: [...grades].sort(),
      capacity: capacity.trim() === '' ? Number.NaN : Number(capacity),
      summary: summary.trim(),
      description: description.trim(),
      tags: chosenTags,
    };
    const result = onSubmit(draft);
    setErrors(result);
    if (Object.keys(result).length > 0) {
      window.requestAnimationFrame(() => summaryRef.current?.focus());
    } else if (!initial) {
      reset();
    }
  };

  const errorList = FIELD_ORDER.filter((f) => errors[f]);

  return (
    <form
      className="submission-form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {errorList.length > 0 ? (
        <div className="submission-form__summary" ref={summaryRef} tabIndex={-1} role="alert">
          <p className="submission-form__summary-title">Biểu mẫu còn {errorList.length} nội dung cần điều chỉnh:</p>
          <ul>
            {errorList.map((f) => (
              <li key={f}>
                <a href={`#${id(f)}`}>{errors[f]}</a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="submission-form__field">
        <label htmlFor={id('title')}>Tên sự kiện</label>
        <input id={id('title')} value={title} aria-invalid={errors.title ? true : undefined} aria-describedby={describedBy('title')} onChange={(e) => { setTitle(e.target.value); }} />
        {errorText('title')}
      </div>

      <div className="submission-form__grid">
        <div className="submission-form__field">
          <label htmlFor={id('category')}>Lĩnh vực</label>
          <select id={id('category')} value={category} onChange={(e) => { setCategory(e.target.value as CategoryCode); }}>
            {CATEGORY_CODES.map((c) => (
              <option key={c} value={c}>
                {c} – {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <fieldset className="submission-form__field submission-form__fieldset">
          <legend>Hình thức</legend>
          <div className="submission-form__choices">
            {(['in_person', 'online'] as const).map((f) => (
              <label key={f} className="submission-form__choice">
                <input type="radio" name={id('format')} value={f} checked={format === f} onChange={() => { setFormat(f); }} />
                {f === 'in_person' ? 'Trực tiếp' : 'Trực tuyến'}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="submission-form__grid submission-form__grid--three">
        <div className="submission-form__field">
          <label htmlFor={id('start')}>Thời gian bắt đầu</label>
          <input id={id('start')} type="datetime-local" value={start} aria-invalid={errors.start ? true : undefined} aria-describedby={describedBy('start')} onChange={(e) => { setStart(e.target.value); }} />
          {errorText('start')}
        </div>
        <div className="submission-form__field">
          <label htmlFor={id('end')}>Thời gian kết thúc</label>
          <input id={id('end')} type="datetime-local" value={end} aria-invalid={errors.end ? true : undefined} aria-describedby={describedBy('end')} onChange={(e) => { setEnd(e.target.value); }} />
          {errorText('end')}
        </div>
        <div className="submission-form__field">
          <label htmlFor={id('registrationDeadline')}>Hạn đăng ký</label>
          <input id={id('registrationDeadline')} type="datetime-local" value={deadline} aria-invalid={errors.registrationDeadline ? true : undefined} aria-describedby={describedBy('registrationDeadline')} onChange={(e) => { setDeadline(e.target.value); }} />
          {errorText('registrationDeadline')}
        </div>
      </div>
      <p className="submission-form__hint">Thời gian được tính theo giờ Việt Nam (GMT+7).</p>

      <div className="submission-form__grid">
        <div className="submission-form__field">
          <label htmlFor={id('location')}>Địa điểm</label>
          <input id={id('location')} value={location} aria-invalid={errors.location ? true : undefined} aria-describedby={describedBy('location')} onChange={(e) => { setLocation(e.target.value); }} />
          {errorText('location')}
        </div>
        <div className="submission-form__field">
          <label htmlFor={id('capacity')}>Số lượng chỗ</label>
          <input id={id('capacity')} type="number" inputMode="numeric" min={1} max={2000} value={capacity} aria-invalid={errors.capacity ? true : undefined} aria-describedby={describedBy('capacity')} onChange={(e) => { setCapacity(e.target.value); }} />
          {errorText('capacity')}
        </div>
      </div>

      <fieldset className="submission-form__field submission-form__fieldset" aria-describedby={describedBy('eligibleGrades')} id={id('eligibleGrades')}>
        <legend>Khối được tham gia</legend>
        <div className="submission-form__choices">
          {GRADES.map((g) => (
            <label key={g} className="submission-form__choice">
              <input
                type="checkbox"
                checked={grades.includes(g)}
                onChange={() => {
                  setGrades((list) => (list.includes(g) ? list.filter((x) => x !== g) : [...list, g]));
                }}
              />
              Khối {g}
            </label>
          ))}
        </div>
        {errorText('eligibleGrades')}
      </fieldset>

      <div className="submission-form__field">
        <label htmlFor={id('summary')}>Tóm tắt (40–400 ký tự)</label>
        <textarea id={id('summary')} rows={3} value={summary} aria-invalid={errors.summary ? true : undefined} aria-describedby={describedBy('summary', id('summary-count'))} onChange={(e) => { setSummary(e.target.value); }} />
        <span id={id('summary-count')} className="submission-form__count">
          {summary.trim().length}/400 ký tự
        </span>
        {errorText('summary')}
      </div>

      <div className="submission-form__field">
        <label htmlFor={id('description')}>Mô tả chi tiết (tối thiểu 80 ký tự)</label>
        <textarea id={id('description')} rows={5} value={description} aria-invalid={errors.description ? true : undefined} aria-describedby={describedBy('description', id('description-count'))} onChange={(e) => { setDescription(e.target.value); }} />
        <span id={id('description-count')} className="submission-form__count">
          {description.trim().length} ký tự
        </span>
        {errorText('description')}
      </div>

      <fieldset className="submission-form__field submission-form__fieldset">
        <legend>Chủ đề (không bắt buộc)</legend>
        <div className="submission-form__choices submission-form__choices--wrap">
          {tags.map((t) => (
            <label key={t.id} className="submission-form__choice submission-form__choice--tag">
              <input
                type="checkbox"
                checked={chosenTags.includes(t.id)}
                onChange={() => {
                  setChosenTags((list) => (list.includes(t.id) ? list.filter((x) => x !== t.id) : [...list, t.id]));
                }}
              />
              {t.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="submission-form__actions">
        <Button type="submit" variant="primary" iconEnd="arrow-right">
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button variant="secondary" onClick={onCancel}>
            Hủy chỉnh sửa
          </Button>
        ) : (
          <Button variant="quiet" onClick={reset}>
            Làm mới biểu mẫu
          </Button>
        )}
      </div>
    </form>
  );
}
