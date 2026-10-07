import './Wordmark.css';

export interface WordmarkProps {
  size?: 'md' | 'lg';
  className?: string;
}

/**
 * "Rodemap" in the display face with its route mark: a short 4-unit line between two
 * stations (origin in ink, destination in signal). No emoji, no gradient.
 */
export function Wordmark({ size = 'md', className }: WordmarkProps) {
  const classes = ['wordmark', size === 'lg' ? 'wordmark--lg' : null, className].filter(Boolean).join(' ');
  return (
    <span className={classes}>
      <svg className="wordmark__mark" viewBox="0 0 32 16" aria-hidden="true" focusable="false">
        <line className="wordmark__line" x1="7" y1="8" x2="25" y2="8" />
        <circle className="wordmark__origin" cx="6.5" cy="8" r="4.5" />
        <circle className="wordmark__stop" cx="25.5" cy="8" r="4.5" />
      </svg>
      <span className="wordmark__text">Rodemap</span>
    </span>
  );
}
