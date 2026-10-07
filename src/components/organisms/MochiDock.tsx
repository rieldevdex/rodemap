import { forwardRef } from 'react';
import { Mochi, type MochiState } from './Mochi';
import './MochiDock.css';

export interface MochiDockProps {
  open: boolean;
  figure: MochiState;
  offline: boolean;
  onToggle: () => void;
}

/** Mochi waiting at the bottom-right: a 56px figure (not a chat bubble) that opens the panel. */
export const MochiDock = forwardRef<HTMLButtonElement, MochiDockProps>(function MochiDock({ open, figure, offline, onToggle }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={['mochi-dock', open ? 'mochi-dock--open' : ''].filter(Boolean).join(' ')}
      aria-expanded={open}
      aria-haspopup="dialog"
      onClick={onToggle}
    >
      <span className="mochi-dock__figure">
        <Mochi state={figure} />
      </span>
      <span className="mochi-dock__label">{open ? 'Đóng Mochi' : 'Hỏi Mochi'}</span>
      {offline ? <span className="visually-hidden"> (chế độ ngoại tuyến)</span> : null}
    </button>
  );
});
