import { useState } from 'react';
import { CATEGORIES } from '../../data/categories';
import { Icon } from '../atoms/Icon';
import { LineBadge } from '../atoms/LineBadge';
import './CategoryMarquee.css';

/**
 * The seven category lines travelling slowly across a band (DESIGN.md §6.2 #8). The second copy
 * is aria-hidden; hovering or focusing pauses it and "Tạm dừng" stops it (WCAG 2.2.2). Under
 * reduced motion it is a still, wrapped row.
 */
export function CategoryMarquee() {
  const [paused, setPaused] = useState(false);
  const row = (hidden: boolean) => (
    <ul className="marquee__row" aria-hidden={hidden || undefined} aria-label={hidden ? undefined : 'Bảy lĩnh vực'}>
      {CATEGORIES.map((c) => (
        <li key={c.code}>
          <LineBadge code={c.code} showName />
        </li>
      ))}
    </ul>
  );
  return (
    <div className="marquee" data-paused={paused}>
      <div className="marquee__viewport">
        <div className="marquee__track">
          {row(false)}
          {row(true)}
        </div>
      </div>
      <button
        type="button"
        className="marquee__toggle"
        aria-pressed={paused}
        onClick={() => {
          setPaused((v) => !v);
        }}
      >
        <Icon name={paused ? 'arrow-right' : 'minus'} size="sm" />
        <span>{paused ? 'Tiếp tục' : 'Tạm dừng'}</span>
      </button>
    </div>
  );
}
