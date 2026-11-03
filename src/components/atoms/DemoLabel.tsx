import './DemoLabel.css';

export const DEMO_LABEL_TEXT = 'Dữ liệu minh họa';

export interface DemoLabelProps {
  /** Defaults to "Dữ liệu minh họa". */
  text?: string;
  className?: string;
}

/** The honest marker on content that is still illustrative (HĐHS events, competitions, articles, the sample student). */
export function DemoLabel({ text = DEMO_LABEL_TEXT, className }: DemoLabelProps) {
  return (
    <span className={className ? `demo-label ${className}` : 'demo-label'}>
      <svg className="demo-label__mark" viewBox="0 0 16 8" aria-hidden="true" focusable="false">
        <line x1="3" y1="4" x2="13" y2="4" />
        <circle cx="3" cy="4" r="2.5" />
        <circle cx="13" cy="4" r="2.5" />
      </svg>
      <span className="demo-label__text">{text}</span>
    </span>
  );
}
