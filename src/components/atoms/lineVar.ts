import type { CategoryCode } from '../../domain/types';

/** CSS custom property of a category line: lineVar('HT') → 'var(--line-ht)'. */
export function lineVar(code: CategoryCode): string {
  return `var(--line-${code.toLowerCase()})`;
}
