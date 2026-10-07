import type { ReactNode } from 'react';
import type { CategoryCode } from '../../domain/types';
import { Icon } from './Icon';
import { lineVar } from './lineVar';
import './Chip.css';

export interface ChipProps {
  children: ReactNode;
  /** Adds the 4-unit category edge on the left (pair it with the category code or name in the label). */
  code?: CategoryCode;
  /** Toggle chip: renders <button aria-pressed>. Omit for a static chip. */
  pressed?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

/** Pill label; with `pressed` it becomes a toggle button (filters). */
export function Chip({ children, code, pressed, onClick, disabled, className }: ChipProps) {
  const classes = ['chip', code ? 'chip--edge' : null, pressed === undefined ? null : 'chip--toggle', className]
    .filter(Boolean)
    .join(' ');
  const style = code ? ({ '--chip-line': lineVar(code) } as Record<string, string>) : undefined;
  if (pressed === undefined) {
    return (
      <span className={classes} style={style}>
        {children}
      </span>
    );
  }
  return (
    <button type="button" className={classes} style={style} aria-pressed={pressed} onClick={onClick} disabled={disabled}>
      {pressed ? <Icon name="check" size="sm" /> : null}
      <span>{children}</span>
    </button>
  );
}
