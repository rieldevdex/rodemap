import { useId, type ReactNode } from 'react';
import { VisuallyHidden } from '../atoms/VisuallyHidden';
import './FilterGroup.css';

export interface FilterGroupProps {
  /** Group name, e.g. "Lĩnh vực". */
  title: string;
  children: ReactNode;
  /** 'radiogroup' for a set of radio inputs; 'group' otherwise. */
  role?: 'group' | 'radiogroup';
  /** Heading level of the title (h3 under a rail or sheet h2). */
  headingLevel?: 3 | 4;
  /** Number of selected values; shown next to the title when above zero. */
  selectedCount?: number;
  /** Shows "Bỏ chọn" when the group has a selection. */
  onClear?: () => void;
  className?: string;
}

/** A titled, labelled block of filter controls separated from the next one by a hairline. */
export function FilterGroup({
  title,
  children,
  role = 'group',
  headingLevel = 3,
  selectedCount = 0,
  onClear,
  className,
}: FilterGroupProps) {
  const titleId = useId();
  const Heading = headingLevel === 4 ? 'h4' : 'h3';
  const classes = ['filter-group', className].filter(Boolean).join(' ');
  return (
    <div className={classes} role={role} aria-labelledby={titleId}>
      <div className="filter-group__head">
        <Heading id={titleId} className="filter-group__title">
          {title}
          {selectedCount > 0 ? (
            <span className="filter-group__count">
              <VisuallyHidden>, đã chọn </VisuallyHidden>
              {selectedCount}
            </span>
          ) : null}
        </Heading>
        {onClear !== undefined && selectedCount > 0 ? (
          <button type="button" className="filter-group__clear" onClick={onClear}>
            Bỏ chọn<VisuallyHidden> {title.toLowerCase()}</VisuallyHidden>
          </button>
        ) : null}
      </div>
      <div className="filter-group__body">{children}</div>
    </div>
  );
}
