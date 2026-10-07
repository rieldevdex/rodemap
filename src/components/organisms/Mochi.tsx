import './Mochi.css';

export type MochiState = 'idle' | 'listening' | 'thinking' | 'answering' | 'celebrating' | 'error';

export interface MochiProps {
  state?: MochiState;
  /** Accessible name; omit when the figure is decorative (e.g. inside a labelled button). */
  title?: string;
  className?: string;
}

/**
 * Mochi — Rodemap's companion. An original rabbit built from simple geometry:
 * a daifuku-shaped body (wider at the bottom), two ears drawn as parallel lane
 * lines (the left tip bends forward), oval eyes, blush, a small curved smile and
 * a route-station badge. Every state is a CSS transform of these same parts.
 *
 * Outline technique: each shape is drawn twice — an outline pass with a
 * non-scaling stroke of 2 × --mochi-stroke, then a fill pass on top — so only
 * the outer half of the stroke shows (exactly --mochi-stroke at any size) and
 * overlapping parts merge without inner seams.
 */
export function Mochi({ state = 'idle', title, className }: MochiProps) {
  const labelled = title !== undefined;
  return (
    <svg
      className={['mochi', className].filter(Boolean).join(' ')}
      data-state={state}
      viewBox="0 0 100 120"
      role={labelled ? 'img' : undefined}
      aria-label={title}
      aria-hidden={labelled ? undefined : true}
      focusable="false"
    >
      <g className="mochi__figure">
        <g className="mochi__ear mochi__ear--left">
          <rect className="mochi__line" x="31.5" y="26" width="13" height="40" rx="6.5" />
          <rect className="mochi__line" x="31.5" y="8" width="13" height="28" rx="6.5" transform="rotate(-34 38 31)" />
          <rect className="mochi__fill" x="31.5" y="26" width="13" height="40" rx="6.5" />
          <rect className="mochi__fill" x="31.5" y="8" width="13" height="28" rx="6.5" transform="rotate(-34 38 31)" />
          <rect className="mochi__inner" x="35.25" y="31" width="5.5" height="27" rx="2.75" />
          <rect className="mochi__inner" x="35.25" y="14" width="5.5" height="20" rx="2.75" transform="rotate(-34 38 31)" />
        </g>
        <g className="mochi__ear mochi__ear--right">
          <rect className="mochi__line" x="55.5" y="4" width="13" height="62" rx="6.5" />
          <rect className="mochi__fill" x="55.5" y="4" width="13" height="62" rx="6.5" />
          <rect className="mochi__inner" x="59.25" y="11" width="5.5" height="45" rx="2.75" />
        </g>
        <g className="mochi__body">
          <path
            className="mochi__line"
            d="M50 54C73 54 90 72 90 93C90 106 81 113 67 113H33C19 113 10 106 10 93C10 72 27 54 50 54Z"
          />
          <path
            className="mochi__fill"
            d="M50 54C73 54 90 72 90 93C90 106 81 113 67 113H33C19 113 10 106 10 93C10 72 27 54 50 54Z"
          />
        </g>
        <g className="mochi__cheeks">
          <ellipse className="mochi__inner" cx="30" cy="91" rx="5.5" ry="3.2" />
          <ellipse className="mochi__inner" cx="70" cy="91" rx="5.5" ry="3.2" />
        </g>
        <g className="mochi__eyes">
          <ellipse className="mochi__eye" cx="40" cy="83" rx="3.1" ry="4.1" />
          <ellipse className="mochi__eye" cx="60" cy="83" rx="3.1" ry="4.1" />
        </g>
        <path className="mochi__mouth" d="M45.5 90.5Q50 94.5 54.5 90.5" />
        <g className="mochi__badge">
          <circle className="mochi__badge-ring" cx="50" cy="104" r="5.2" />
          <circle className="mochi__badge-dot" cx="50" cy="104" r="2" />
        </g>
      </g>
    </svg>
  );
}
