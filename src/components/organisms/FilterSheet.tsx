import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Icon } from '../atoms/Icon';
import './FilterSheet.css';

export interface FilterSheetProps {
  open: boolean;
  title: string;
  /** Escape, the close button or a tap on the scrim: discard and close. */
  onClose: () => void;
  children: ReactNode;
  /** Live summary above the actions, e.g. "12 sự kiện phù hợp" (announced politely). */
  status?: ReactNode;
  /** Footer actions ("Xóa bộ lọc", "Áp dụng"). */
  actions: ReactNode;
  closeLabel?: string;
}

/**
 * Bottom sheet for filters on phones and tablets, built on the native modal <dialog>: focus
 * stays inside while open, Escape closes it, and focus returns to the opener on close.
 */
export function FilterSheet({ open, title, onClose, children, status, actions, closeLabel = 'Đóng' }: FilterSheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const returnFocus = useRef<Element | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnFocus.current = document.activeElement;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
      if (returnFocus.current instanceof HTMLElement) returnFocus.current.focus();
    }
  }, [open]);

  // A press on the scrim (outside the panel) closes the sheet, like Escape.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return undefined;
    const onPointerDown = (e: PointerEvent) => {
      if (e.target === dialog) onClose();
    };
    dialog.addEventListener('pointerdown', onPointerDown);
    return () => {
      dialog.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open, onClose]);

  return (
    <dialog
      ref={ref}
      className="filter-sheet"
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="filter-sheet__panel">
        <div className="filter-sheet__head">
          <h2 id={titleId} className="filter-sheet__title">
            {title}
          </h2>
          <button type="button" className="filter-sheet__close" onClick={onClose}>
            <Icon name="x" />
            <span>{closeLabel}</span>
          </button>
        </div>
        <div className="filter-sheet__body">{open ? children : null}</div>
        <div className="filter-sheet__foot">
          {status === undefined ? null : (
            <p className="filter-sheet__status" aria-live="polite" aria-atomic="true">
              {status}
            </p>
          )}
          <div className="filter-sheet__actions">{actions}</div>
        </div>
      </div>
    </dialog>
  );
}
