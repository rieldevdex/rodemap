import type { ReactNode } from 'react';
import type { CategoryCode } from '../../domain/types';
import { LineBadge } from '../atoms/LineBadge';
import { StatusTag, type StatusTone } from '../atoms/StatusTag';
import './ProposalCard.css';

export interface ProposalCardProps {
  category: CategoryCode;
  title: string;
  description: string;
  /** Who sent it and when, e.g. "Học sinh khối 7 · 14/09/2026". */
  meta: ReactNode;
  /** Extra facts: grades, the club named, the planned month. */
  details?: readonly string[];
  status: { label: string; tone: StatusTone };
  /** The answer, when there is one. */
  response?: { heading: string; note: string } | null;
  /** Support count or other aside, shown next to the status. */
  aside?: ReactNode;
  /** Buttons for the current role (support, answer, withdraw). */
  actions?: ReactNode;
  headingLevel?: 3 | 4;
}

/** One proposal: line badge, title, description, sender, status and the answer. */
export function ProposalCard({ category, title, description, meta, details = [], status, response = null, aside, actions, headingLevel = 3 }: ProposalCardProps) {
  const Heading = headingLevel === 4 ? 'h4' : 'h3';
  return (
    <article className="proposal-card">
      <div className="proposal-card__head">
        <LineBadge code={category} size="sm" showName />
        <StatusTag tone={status.tone}>{status.label}</StatusTag>
      </div>
      <Heading className="proposal-card__title">{title}</Heading>
      <p className="proposal-card__description">{description}</p>
      {details.length > 0 ? (
        <ul className="proposal-card__details">
          {details.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      ) : null}
      <p className="proposal-card__meta">{meta}</p>
      {response ? (
        <div className="proposal-card__response">
          <p className="proposal-card__response-heading">{response.heading}</p>
          {response.note === '' ? null : <p>{response.note}</p>}
        </div>
      ) : null}
      {aside !== undefined || actions !== undefined ? (
        <div className="proposal-card__foot">
          {aside === undefined ? null : <div className="proposal-card__aside">{aside}</div>}
          {actions === undefined ? null : <div className="proposal-card__actions">{actions}</div>}
        </div>
      ) : null}
    </article>
  );
}
