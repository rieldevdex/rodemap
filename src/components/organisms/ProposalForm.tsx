import { useId, useRef, useState, type ReactNode } from 'react';
import { CATEGORY_LABELS } from '../../domain/category-labels';
import { studentClubs } from '../../domain/clubs';
import { charCount } from '../../domain/moderation';
import { PROPOSAL_LIMITS, proposalMonthLabel, type ActivityDraftErrors, type CollaborationDraftErrors } from '../../domain/proposals';
import {
  CATEGORY_CODES,
  GRADE_LEVELS,
  type ActivityProposalDraft,
  type CategoryCode,
  type Club,
  type CollaborationDraft,
  type Grade,
} from '../../domain/types';
import { Button } from '../atoms/Button';
import './EventSubmissionForm.css';
import './ProposalForm.css';

type Errors<K extends string> = Partial<Record<K, string>>;

/** Ids, error text and the error summary shared by both proposal forms (same pattern as EventSubmissionForm). */
function useFormErrors<K extends string>(order: readonly K[]) {
  const uid = useId();
  const summaryRef = useRef<HTMLDivElement>(null);
  const [errors, setErrors] = useState<Errors<K>>({});
  const id = (field: string) => `${uid}-${field}`;
  const describedBy = (field: K, hint?: string) =>
    [errors[field] ? id(`${field}-error`) : null, hint ?? null].filter(Boolean).join(' ') || undefined;
  const invalid = (field: K) => (errors[field] ? true : undefined);
  const errorText = (field: K): ReactNode =>
    errors[field] ? (
      <span id={id(`${field}-error`)} className="submission-form__error">
        {errors[field]}
      </span>
    ) : null;
  /** Shows the result; focuses the summary when something needs fixing. Returns true when accepted. */
  const report = (result: Errors<K>): boolean => {
    setErrors(result);
    const ok = Object.keys(result).length === 0;
    if (!ok) window.requestAnimationFrame(() => summaryRef.current?.focus());
    return ok;
  };
  const errorList = order.filter((f) => errors[f]);
  const summary =
    errorList.length > 0 ? (
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
    ) : null;
  return { id, describedBy, invalid, errorText, report, summary, clear: () => { setErrors({}); } };
}

function CategorySelect({ id, value, invalid, describedBy, onChange }: { id: string; value: CategoryCode | ''; invalid: true | undefined; describedBy: string | undefined; onChange: (v: CategoryCode | '') => void }) {
  return (
    <select id={id} value={value} aria-invalid={invalid} aria-describedby={describedBy} onChange={(e) => { onChange(e.target.value as CategoryCode | ''); }}>
      <option value="">Chọn lĩnh vực</option>
      {CATEGORY_CODES.map((c) => (
        <option key={c} value={c}>
          {c} – {CATEGORY_LABELS[c]}
        </option>
      ))}
    </select>
  );
}

const L = PROPOSAL_LIMITS;

/* ── Đề xuất hoạt động (học sinh) ─────────────────────────────────── */

const ACTIVITY_FIELDS = ['title', 'category', 'grades', 'clubId', 'description'] as const satisfies readonly (keyof ActivityProposalDraft)[];

export interface ActivityProposalFormProps {
  /** Clubs a student may name as the organiser (optional field); only student clubs are offered. */
  clubs: readonly Club[];
  /** The student's own grade, ticked by default. */
  defaultGrades: readonly Grade[];
  /** Returns validation errors; an empty object means the proposal was sent. */
  onSubmit: (draft: ActivityProposalDraft) => ActivityDraftErrors;
}

/** A student's proposal to Hội đồng Học sinh: what, which field, for which grades, why. */
export function ActivityProposalForm({ clubs, defaultGrades, onSubmit }: ActivityProposalFormProps) {
  const f = useFormErrors(ACTIVITY_FIELDS);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<CategoryCode | ''>('');
  const [grades, setGrades] = useState<Grade[]>([...defaultGrades]);
  const [clubId, setClubId] = useState('');
  const [description, setDescription] = useState('');

  const reset = () => {
    setTitle('');
    setCategory('');
    setGrades([...defaultGrades]);
    setClubId('');
    setDescription('');
    f.clear();
  };

  const submit = () => {
    const draft: ActivityProposalDraft = {
      title: title.trim(),
      category: category === '' ? null : category,
      description: description.trim(),
      grades: [...grades].sort((a, b) => a - b),
      clubId: clubId === '' ? null : clubId,
    };
    if (f.report(onSubmit(draft))) reset();
  };

  return (
    <form
      className="submission-form"
      noValidate
      aria-label="Gửi đề xuất hoạt động"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {f.summary}

      <div className="submission-form__field">
        <label htmlFor={f.id('title')}>Tên hoạt động hoặc sự kiện đề xuất</label>
        <input id={f.id('title')} value={title} maxLength={L.titleMax + 20} aria-invalid={f.invalid('title')} aria-describedby={f.describedBy('title')} onChange={(e) => { setTitle(e.target.value); }} />
        {f.errorText('title')}
      </div>

      <div className="submission-form__grid">
        <div className="submission-form__field">
          <label htmlFor={f.id('category')}>Lĩnh vực</label>
          <CategorySelect id={f.id('category')} value={category} invalid={f.invalid('category')} describedBy={f.describedBy('category')} onChange={setCategory} />
          {f.errorText('category')}
        </div>
        <div className="submission-form__field">
          <label htmlFor={f.id('clubId')}>Câu lạc bộ phù hợp (không bắt buộc)</label>
          <select id={f.id('clubId')} value={clubId} aria-invalid={f.invalid('clubId')} aria-describedby={f.describedBy('clubId')} onChange={(e) => { setClubId(e.target.value); }}>
            <option value="">Chưa xác định</option>
            {studentClubs(clubs).map((c) => (
              <option key={c.id} value={c.id}>
                {c.shortName}
              </option>
            ))}
          </select>
          {f.errorText('clubId')}
        </div>
      </div>

      <fieldset className="submission-form__field submission-form__fieldset" id={f.id('grades')} aria-describedby={f.describedBy('grades')}>
        <legend>Khối dự kiến tham gia</legend>
        <div className="proposal-form__levels">
          {GRADE_LEVELS.map((level) => (
            <div key={level.name} className="proposal-form__level" role="group" aria-label={level.name}>
              <p className="proposal-form__level-name" aria-hidden="true">
                {level.name}
              </p>
              <div className="submission-form__choices">
                {level.grades.map((g) => (
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
            </div>
          ))}
        </div>
        {f.errorText('grades')}
      </fieldset>

      <div className="submission-form__field">
        <label htmlFor={f.id('description')}>
          Nội dung và mục đích ({L.descriptionMin}–{L.descriptionMax} ký tự)
        </label>
        <textarea
          id={f.id('description')}
          rows={5}
          value={description}
          aria-invalid={f.invalid('description')}
          aria-describedby={f.describedBy('description', f.id('description-hint'))}
          onChange={(e) => { setDescription(e.target.value); }}
        />
        <span id={f.id('description-hint')} className="submission-form__count">
          {charCount(description)}/{L.descriptionMax} ký tự · Không ghi họ tên, số điện thoại hoặc địa chỉ thư điện tử.
        </span>
        {f.errorText('description')}
      </div>

      <div className="submission-form__actions">
        <Button type="submit" variant="primary" iconEnd="arrow-right">
          Gửi đề xuất
        </Button>
        <Button variant="quiet" onClick={reset}>
          Đặt lại biểu mẫu
        </Button>
      </div>
    </form>
  );
}

/* ── Đề xuất hợp tác (câu lạc bộ) ─────────────────────────────────── */

const COLLABORATION_FIELDS = ['toClubId', 'title', 'category', 'month', 'description'] as const satisfies readonly (keyof CollaborationDraft)[];

export interface CollaborationFormProps {
  /** The sending club (never offered as its own partner). */
  fromClub: Club;
  /** Possible partners; only student clubs are offered. */
  clubs: readonly Club[];
  /** Months left in the school year: "2026-10", "2026-11"… */
  months: readonly string[];
  /** Returns validation errors; an empty object means the proposal was sent. */
  onSubmit: (draft: CollaborationDraft) => CollaborationDraftErrors;
}

/** A club's proposal to organise an activity together with another club. */
export function CollaborationForm({ fromClub, clubs, months, onSubmit }: CollaborationFormProps) {
  const f = useFormErrors(COLLABORATION_FIELDS);
  const partners = studentClubs(clubs).filter((c) => c.id !== fromClub.id);
  const [toClubId, setToClubId] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<CategoryCode | ''>('');
  const [month, setMonth] = useState('');
  const [description, setDescription] = useState('');

  const reset = () => {
    setToClubId('');
    setTitle('');
    setCategory('');
    setMonth('');
    setDescription('');
    f.clear();
  };

  const submit = () => {
    const draft: CollaborationDraft = {
      toClubId,
      title: title.trim(),
      category: category === '' ? null : category,
      description: description.trim(),
      month,
    };
    if (f.report(onSubmit(draft))) reset();
  };

  return (
    <form
      className="submission-form"
      noValidate
      aria-label="Gửi đề xuất hợp tác"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {f.summary}

      <div className="submission-form__grid">
        <div className="submission-form__field">
          <label htmlFor={f.id('toClubId')}>Câu lạc bộ đối tác</label>
          <select id={f.id('toClubId')} value={toClubId} aria-invalid={f.invalid('toClubId')} aria-describedby={f.describedBy('toClubId')} onChange={(e) => { setToClubId(e.target.value); }}>
            <option value="">Chọn câu lạc bộ</option>
            {partners.map((c) => (
              <option key={c.id} value={c.id}>
                {c.shortName}
              </option>
            ))}
          </select>
          {f.errorText('toClubId')}
        </div>
        <div className="submission-form__field">
          <label htmlFor={f.id('month')}>Thời gian dự kiến</label>
          <select id={f.id('month')} value={month} aria-invalid={f.invalid('month')} aria-describedby={f.describedBy('month')} onChange={(e) => { setMonth(e.target.value); }}>
            <option value="">Chọn tháng</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {proposalMonthLabel(m)}
              </option>
            ))}
          </select>
          {f.errorText('month')}
        </div>
      </div>

      <div className="submission-form__grid">
        <div className="submission-form__field">
          <label htmlFor={f.id('title')}>Tên hoạt động phối hợp</label>
          <input id={f.id('title')} value={title} maxLength={L.titleMax + 20} aria-invalid={f.invalid('title')} aria-describedby={f.describedBy('title')} onChange={(e) => { setTitle(e.target.value); }} />
          {f.errorText('title')}
        </div>
        <div className="submission-form__field">
          <label htmlFor={f.id('category')}>Lĩnh vực</label>
          <CategorySelect id={f.id('category')} value={category} invalid={f.invalid('category')} describedBy={f.describedBy('category')} onChange={setCategory} />
          {f.errorText('category')}
        </div>
      </div>

      <div className="submission-form__field">
        <label htmlFor={f.id('description')}>
          Nội dung hợp tác và phân công dự kiến ({L.descriptionMin}–{L.descriptionMax} ký tự)
        </label>
        <textarea
          id={f.id('description')}
          rows={5}
          value={description}
          aria-invalid={f.invalid('description')}
          aria-describedby={f.describedBy('description', f.id('description-count'))}
          onChange={(e) => { setDescription(e.target.value); }}
        />
        <span id={f.id('description-count')} className="submission-form__count">
          {charCount(description)}/{L.descriptionMax} ký tự
        </span>
        {f.errorText('description')}
      </div>

      <div className="submission-form__actions">
        <Button type="submit" variant="primary" iconEnd="arrow-right">
          Gửi đề xuất hợp tác
        </Button>
        <Button variant="quiet" onClick={reset}>
          Đặt lại biểu mẫu
        </Button>
      </div>
    </form>
  );
}
