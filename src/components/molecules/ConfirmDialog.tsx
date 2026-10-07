import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Button } from '../atoms/Button';
import './ConfirmDialog.css';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** "stop" styles the confirm button for destructive actions (cancel a registration, reject). */
  tone?: 'default' | 'stop';
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * A modal confirmation sheet built on the native <dialog>: focus is trapped while open,
 * Escape cancels, and focus returns to the element that opened it. Bottom sheet on phones.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = 'Quay lại',
  tone = 'default',
  confirmDisabled = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
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

  return (
    <dialog
      ref={ref}
      className="confirm-dialog"
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
    >
      <div className="confirm-dialog__body">
        <h2 id={titleId} className="confirm-dialog__title">
          {title}
        </h2>
        <div className="confirm-dialog__content">{children}</div>
        <div className="confirm-dialog__actions">
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            variant="primary"
            className={tone === 'stop' ? 'confirm-dialog__confirm--stop' : undefined}
            disabled={confirmDisabled}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
