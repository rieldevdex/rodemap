import type { ReactNode } from 'react';
import { Mochi, type MochiState } from '../organisms/Mochi';
import './MochiNote.css';

export interface MochiNoteProps {
  /** Mono caps label, e.g. "Mochi tóm tắt". */
  label: string;
  children: ReactNode;
  figure?: MochiState;
  /** Small print under the text, e.g. the data source. */
  footnote?: string;
  className?: string;
}

/** A short text attributed to Mochi, with a small Mochi figure. */
export function MochiNote({ label, children, figure = 'idle', footnote, className }: MochiNoteProps) {
  return (
    <aside className={['mochi-note', className].filter(Boolean).join(' ')} aria-label={label}>
      <div className="mochi-note__figure">
        <Mochi state={figure} />
      </div>
      <div className="mochi-note__body">
        <p className="mochi-note__label">{label}</p>
        <div className="mochi-note__text">{children}</div>
        {footnote ? <p className="mochi-note__footnote">{footnote}</p> : null}
      </div>
    </aside>
  );
}
