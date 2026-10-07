import type { ReactNode } from 'react';
import './MonoTime.css';

export interface MonoTimeProps {
  /** Machine-readable value: "2026-10-14", "2026-10-14T07:30:00+07:00" or "07:30". */
  dateTime: string;
  /** Formatted text from src/domain/dates.ts, e.g. "Th 4 · 14/10" or "07:30". */
  children: ReactNode;
  className?: string;
}

/** A date or time in JetBrains Mono with tabular figures. */
export function MonoTime({ dateTime, children, className }: MonoTimeProps) {
  return (
    <time className={className ? `mono-time ${className}` : 'mono-time'} dateTime={dateTime}>
      {children}
    </time>
  );
}
