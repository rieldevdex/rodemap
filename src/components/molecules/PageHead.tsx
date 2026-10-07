import type { ReactNode } from 'react';
import { MAIN_HEADING_ID } from '../../router';

export interface PageHeadProps {
  eyebrow: ReactNode;
  title: string;
  lead?: ReactNode;
  /** Extra content under the lead: actions, meta, demo label. */
  children?: ReactNode;
}

/** The standard page head: mono eyebrow, display h1 (focus target after navigation), lead. */
export function PageHead({ eyebrow, title, lead, children }: PageHeadProps) {
  return (
    <header className="page-head">
      <div className="container page-head__inner">
        <p className="page-head__eyebrow">{eyebrow}</p>
        <h1 id={MAIN_HEADING_ID} className="page-head__title" tabIndex={-1}>
          {title}
        </h1>
        {lead === undefined ? null : <p className="page-head__lead">{lead}</p>}
        {children}
      </div>
    </header>
  );
}
