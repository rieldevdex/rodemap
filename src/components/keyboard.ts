/** Keyboard helpers shared by components (shortcuts must never interrupt typing). */
import { useEffect, type RefObject } from 'react';

const TEXT_INPUT_EXCLUDED = new Set(['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file', 'image']);

/** True while focus is in a text field. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  return target instanceof HTMLInputElement && !TEXT_INPUT_EXCLUDED.has(target.type);
}

/**
 * Accelerators for a list of events (Nielsen's heuristic 7, DESIGN.md §6.3, "Tối đa"): J moves
 * focus to the next item's link, K to the previous one, Enter opens it as any link does. Off
 * while typing, with a modifier key, or when `enabled` is false (WCAG 2.1.4: single-key
 * shortcuts can be turned off — the interactivity level is that switch).
 */
export function useListAccelerators(ref: RefObject<HTMLElement | null>, enabled: boolean, itemSelector = '.station-card__link'): void {
  useEffect(() => {
    if (!enabled) return undefined;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target)) return;
      const key = e.key.toLowerCase();
      if (key !== 'j' && key !== 'k') return;
      const items = Array.from(ref.current?.querySelectorAll<HTMLElement>(itemSelector) ?? []).filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      e.preventDefault();
      const current = items.findIndex((el) => el === document.activeElement);
      const next = current < 0 ? 0 : key === 'j' ? Math.min(items.length - 1, current + 1) : Math.max(0, current - 1);
      const target = items[next];
      target?.focus();
      target?.scrollIntoView({ block: 'nearest' });
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [ref, enabled, itemSelector]);
}
