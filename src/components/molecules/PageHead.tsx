import type { ReactNode } from 'react';
import { MAIN_HEADING_ID } from '../../router';

export interface PageHeadProps {
  eyebrow: ReactNode;
  title: string;
  /** Shown in every density unless `leadShort` is given (then only in Đầy đủ). */
  lead?: ReactNode;
  /**
   * One formal sentence for Gọn (DESIGN.md §10). With it, the lead is prose: Gọn shows this
   * sentence and Tối giản shows neither. Leave it out when the lead carries facts.
   */
  leadShort?: ReactNode;
  /** Extra content under the lead: actions, meta, demo label. */
  children?: ReactNode;
  /** The heading a card title is carried into at "Tối đa" (router/morph.ts). */
  morphTarget?: boolean;
}

/** The standard page head: eyebrow, display h1 (focus target after navigation), lead. */
export function PageHead({ eyebrow, title, lead, leadShort, children, morphTarget = false }: PageHeadProps) {
  return (
    <header className="page-head">
      <div className="container page-head__inner">
        <p className="page-head__eyebrow">{eyebrow}</p>
        <h1 id={MAIN_HEADING_ID} className="page-head__title" tabIndex={-1} data-morph-target={morphTarget ? '' : undefined}>
          {title}
        </h1>
        {lead === undefined ? null : <p className={leadShort === undefined ? 'page-head__lead' : 'page-head__lead density-full-only'}>{lead}</p>}
        {leadShort === undefined ? null : <p className="page-head__lead density-compact-only">{leadShort}</p>}
        {children}
      </div>
    </header>
  );
}
