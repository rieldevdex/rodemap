import { CATEGORY_LABELS } from '../../domain/category-labels';
import type { CategoryCode } from '../../domain/types';
import { lineVar } from './lineVar';
import { VisuallyHidden } from './VisuallyHidden';
import './LineBadge.css';

export interface LineBadgeProps {
  code: CategoryCode;
  /** Category name; defaults to the standard label ("Học thuật"…). */
  name?: string;
  /** Show the name next to the code. When hidden it is still read by screen readers. */
  showName?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Two-letter line code on its category color. Color is never the only signal:
 * the code is always visible and the category name is visible or announced.
 */
export function LineBadge({ code, name, showName = false, size = 'md', className }: LineBadgeProps) {
  const label = name ?? CATEGORY_LABELS[code];
  const classes = ['line-badge', size === 'sm' ? 'line-badge--sm' : null, className].filter(Boolean).join(' ');
  return (
    <span className={classes} style={{ '--line': lineVar(code) } as Record<string, string>}>
      <span className="line-badge__code">{code}</span>
      {showName ? <span className="line-badge__name">{label}</span> : <VisuallyHidden>{label}</VisuallyHidden>}
    </span>
  );
}
