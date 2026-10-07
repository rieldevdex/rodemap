import { useId, useState, type ReactNode } from 'react';
import type { DateWindow, DeadlineFilter } from '../../domain/filters';
import type { CategoryCode, EventFormat, Grade } from '../../domain/types';
import { Chip } from '../atoms/Chip';
import { Icon } from '../atoms/Icon';
import { VisuallyHidden } from '../atoms/VisuallyHidden';
import { FilterGroup } from '../molecules/FilterGroup';
import './FilterRail.css';

/** The filter fields the rail edits (the search text lives outside the rail). */
export interface FilterRailValue {
  categories: CategoryCode[];
  clubIds: string[];
  grades: Grade[];
  window: DateWindow;
  format: EventFormat | 'all';
  hasSeats: boolean;
  deadline: DeadlineFilter;
  includePast: boolean;
}

export interface FacetOption<T> {
  value: T;
  label: string;
  /** Events this option would show with the other filters unchanged. */
  count: number;
}

export interface FilterRailOptions {
  categories: FacetOption<CategoryCode>[];
  clubs: FacetOption<string>[];
  grades: FacetOption<Grade>[];
  windows: FacetOption<DateWindow>[];
  formats: FacetOption<EventFormat | 'all'>[];
  deadlines: FacetOption<DeadlineFilter>[];
}

export interface FilterRailProps<V extends FilterRailValue> {
  value: V;
  options: FilterRailOptions;
  onChange: (next: V) => void;
  /** 'rail' = desktop column with its own heading; 'sheet' = inside the phone bottom sheet. */
  variant?: 'rail' | 'sheet';
  /** Rail heading text (rail variant). */
  title?: string;
  /** Extra content in the rail head, e.g. the number of active filters. */
  headExtra?: ReactNode;
  /** Clubs shown before "Hiển thị toàn bộ" (selected clubs always stay visible). */
  clubPreview?: number;
}

function toggle<T>(list: readonly T[], item: T, order: readonly T[]): T[] {
  const next = list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
  return order.filter((x) => next.includes(x));
}

function Count({ value }: { value: number }) {
  return (
    <span className="filter-rail__count" data-zero={value === 0}>
      {value}
      <VisuallyHidden> sự kiện</VisuallyHidden>
    </span>
  );
}

interface StationChoicesProps<T extends string> {
  name: string;
  options: FacetOption<T>[];
  value: T;
  onSelect: (value: T) => void;
}

/** Single choice drawn as stations on a short line; each station is a native radio input. */
function StationChoices<T extends string>({ name, options, value, onSelect }: StationChoicesProps<T>) {
  return (
    <ul className="filter-rail__stations">
      {options.map((o) => (
        <li key={o.value} className="filter-rail__station">
          <label className="filter-rail__choice">
            <input
              className="filter-rail__radio"
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => {
                onSelect(o.value);
              }}
            />
            <span className="filter-rail__choice-label">{o.label}</span>
            <Count value={o.count} />
          </label>
        </li>
      ))}
    </ul>
  );
}

/**
 * Filters for "Khám phá sự kiện": lĩnh vực, câu lạc bộ, khối, thời gian, hình thức, hạn đăng ký
 * and tình trạng. Presentational: the value and the facet counts come in through props and every
 * change goes out through `onChange` (applied at once in the rail, held as a draft in the sheet).
 */
export function FilterRail<V extends FilterRailValue>({
  value,
  options,
  onChange,
  variant = 'rail',
  title = 'Bộ lọc',
  headExtra,
  clubPreview = 6,
}: FilterRailProps<V>) {
  const id = useId();
  const titleId = `${id}-title`;
  const clubListId = `${id}-clubs`;
  const [showAllClubs, setShowAllClubs] = useState(false);

  const categoryOrder = options.categories.map((o) => o.value);
  const clubOrder = options.clubs.map((o) => o.value);
  const gradeOrder = options.grades.map((o) => o.value);
  const visibleClubs = showAllClubs
    ? options.clubs
    : options.clubs.filter((o, i) => i < clubPreview || value.clubIds.includes(o.value));
  const hiddenClubs = options.clubs.length - visibleClubs.length;

  const groups = (
    <>
      <FilterGroup
        title="Lĩnh vực"
        selectedCount={value.categories.length}
        onClear={() => {
          onChange({ ...value, categories: [] });
        }}
      >
        <ul className="filter-rail__chips">
          {options.categories.map((o) => (
            <li key={o.value}>
              <Chip
                className="filter-rail__chip"
                code={o.value}
                pressed={value.categories.includes(o.value)}
                onClick={() => {
                  onChange({ ...value, categories: toggle(value.categories, o.value, categoryOrder) });
                }}
              >
                <span className="filter-rail__code">{o.value}</span> <span className="filter-rail__chip-name">{o.label}</span>
                <Count value={o.count} />
              </Chip>
            </li>
          ))}
        </ul>
      </FilterGroup>

      <FilterGroup
        title="Câu lạc bộ"
        selectedCount={value.clubIds.length}
        onClear={() => {
          onChange({ ...value, clubIds: [] });
        }}
      >
        <ul id={clubListId} className="filter-rail__checks">
          {visibleClubs.map((o) => (
            <li key={o.value}>
              <label className="filter-rail__check">
                <input
                  className="filter-rail__checkbox"
                  type="checkbox"
                  checked={value.clubIds.includes(o.value)}
                  onChange={() => {
                    onChange({ ...value, clubIds: toggle(value.clubIds, o.value, clubOrder) });
                  }}
                />
                <span className="filter-rail__check-label">{o.label}</span>
                <Count value={o.count} />
              </label>
            </li>
          ))}
        </ul>
        {options.clubs.length > clubPreview ? (
          <button
            type="button"
            className="filter-rail__more"
            aria-expanded={showAllClubs}
            aria-controls={clubListId}
            onClick={() => {
              setShowAllClubs((v) => !v);
            }}
          >
            <Icon name={showAllClubs ? 'chevron-up' : 'chevron-down'} size="sm" />
            {showAllClubs ? 'Thu gọn danh sách' : `Hiển thị thêm ${hiddenClubs} câu lạc bộ`}
          </button>
        ) : null}
      </FilterGroup>

      <FilterGroup
        title="Khối được phép tham gia"
        selectedCount={value.grades.length}
        onClear={() => {
          onChange({ ...value, grades: [] });
        }}
      >
        <ul className="filter-rail__grades">
          {options.grades.map((o) => (
            <li key={o.value}>
              <Chip
                className="filter-rail__chip filter-rail__grade"
                pressed={value.grades.includes(o.value)}
                onClick={() => {
                  onChange({ ...value, grades: toggle(value.grades, o.value, gradeOrder) });
                }}
              >
                <VisuallyHidden>Khối </VisuallyHidden>
                <span className="filter-rail__grade-number">{o.value}</span>
                <VisuallyHidden>, {o.count} sự kiện</VisuallyHidden>
              </Chip>
            </li>
          ))}
        </ul>
      </FilterGroup>

      <FilterGroup title="Thời gian" role="radiogroup">
        <StationChoices
          name={`${id}-window`}
          options={options.windows}
          value={value.window}
          onSelect={(w) => {
            onChange({ ...value, window: w });
          }}
        />
      </FilterGroup>

      <FilterGroup title="Hình thức" role="radiogroup">
        <StationChoices
          name={`${id}-format`}
          options={options.formats}
          value={value.format}
          onSelect={(f) => {
            onChange({ ...value, format: f });
          }}
        />
      </FilterGroup>

      <FilterGroup title="Hạn đăng ký" role="radiogroup">
        <StationChoices
          name={`${id}-deadline`}
          options={options.deadlines}
          value={value.deadline}
          onSelect={(d) => {
            onChange({ ...value, deadline: d });
          }}
        />
      </FilterGroup>

      <FilterGroup title="Tình trạng">
        <ul className="filter-rail__checks">
          <li>
            <label className="filter-rail__check">
              <input
                className="filter-rail__checkbox"
                type="checkbox"
                checked={value.hasSeats}
                onChange={(e) => {
                  onChange({ ...value, hasSeats: e.target.checked });
                }}
              />
              <span className="filter-rail__check-label">Chỉ hiển thị sự kiện còn chỗ</span>
            </label>
          </li>
          <li>
            <label className="filter-rail__check">
              <input
                className="filter-rail__checkbox"
                type="checkbox"
                checked={value.includePast}
                onChange={(e) => {
                  onChange({ ...value, includePast: e.target.checked });
                }}
              />
              <span className="filter-rail__check-label">Hiển thị sự kiện đã diễn ra</span>
            </label>
          </li>
        </ul>
      </FilterGroup>
    </>
  );

  if (variant === 'sheet') {
    return <div className="filter-rail filter-rail--sheet">{groups}</div>;
  }
  return (
    <aside className="filter-rail filter-rail--rail" aria-labelledby={titleId}>
      <div className="filter-rail__head">
        <h2 id={titleId} className="filter-rail__title">
          {title}
        </h2>
        {headExtra}
      </div>
      {groups}
    </aside>
  );
}
