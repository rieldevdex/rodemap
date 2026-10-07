import type { CategoryCode } from '../../domain/types';
import { lineVar } from './lineVar';
import './Station.css';

export type StationVariant = 'normal' | 'interchange' | 'mine';

export interface StationProps {
  variant?: StationVariant;
  /** Category line; defaults to ink (the TS line color) when omitted. */
  code?: CategoryCode;
  /** Accessible name. Omit when the station is decorative (then aria-hidden). */
  label?: string;
  className?: string;
}

/**
 * A route-map station: 14 units (ring in the line color), interchange 20 units with a
 * 3-unit ring, or "mine" (a station on the student's own route: signal ring, line-color core).
 */
export function Station({ variant = 'normal', code, label, className }: StationProps) {
  const classes = ['station', `station--${variant}`, className].filter(Boolean).join(' ');
  const style = code ? ({ '--station-line': lineVar(code) } as Record<string, string>) : undefined;
  const a11y =
    label === undefined ? { 'aria-hidden': true as const } : { role: 'img' as const, 'aria-label': label };
  if (variant === 'interchange') {
    return (
      <svg className={classes} viewBox="0 0 20 20" style={style} focusable="false" {...a11y}>
        <circle className="station__ring" cx="10" cy="10" r="8.5" />
      </svg>
    );
  }
  return (
    <svg className={classes} viewBox="0 0 14 14" style={style} focusable="false" {...a11y}>
      <circle className="station__ring" cx="7" cy="7" r="5.5" />
      {variant === 'mine' ? <circle className="station__core" cx="7" cy="7" r="2" /> : null}
    </svg>
  );
}
