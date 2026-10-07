import { CATEGORY_LABELS } from '../../domain/category-labels';
import { formatHours } from '../../domain/text';
import { CATEGORY_CODES, type CategoryCode } from '../../domain/types';
import { LineBadge } from '../atoms/LineBadge';
import { lineVar } from '../atoms/lineVar';
import './RouteSummary.css';

export interface RouteSummaryProps {
  hours: Record<CategoryCode, number>;
  total: number;
  /** Accessible title of the diagram. */
  title?: string;
}

const WIDTH = 600;
const Y = 18;

/**
 * Hours per category drawn as one route: each category is a segment of the line,
 * proportional to its hours, with a station at every change of line. The list below
 * carries the same numbers as text.
 */
export function RouteSummary({ hours, total, title = 'Số giờ theo lĩnh vực' }: RouteSummaryProps) {
  const present = CATEGORY_CODES.filter((c) => hours[c] > 0);
  const usable = WIDTH - 24;
  const segments = present.reduce<{ code: CategoryCode; x1: number; x2: number }[]>((acc, code) => {
    const x1 = acc.at(-1)?.x2 ?? 12;
    const length = total > 0 ? (hours[code] / total) * usable : 0;
    return [...acc, { code, x1, x2: x1 + length }];
  }, []);
  return (
    <figure className="route-summary">
      <figcaption className="route-summary__caption">
        <span>{title}</span>
        <span className="route-summary__total">
          Tổng cộng <span className="mono">{formatHours(total)}</span> giờ
        </span>
      </figcaption>
      {total > 0 ? (
        <svg className="route-summary__svg" viewBox={`0 0 ${WIDTH} 36`} aria-hidden="true" focusable="false">
          {segments.map((s) => (
            <line key={s.code} className="route-summary__segment" style={{ '--lane-color': lineVar(s.code) } as Record<string, string>} x1={s.x1} y1={Y} x2={s.x2} y2={Y} />
          ))}
          {segments.map((s, i) => (
            <circle key={`stop-${s.code}`} className={i === 0 ? 'route-summary__stop route-summary__stop--start' : 'route-summary__stop'} cx={s.x1} cy={Y} r="6" />
          ))}
          <circle className="route-summary__stop route-summary__stop--end" cx={segments.at(-1)?.x2 ?? 12} cy={Y} r="7" />
        </svg>
      ) : (
        <p className="route-summary__empty">Chưa có số giờ hoạt động nào được ghi nhận.</p>
      )}
      <ul className="route-summary__list">
        {CATEGORY_CODES.map((code) => (
          <li key={code} className={hours[code] > 0 ? 'route-summary__item' : 'route-summary__item route-summary__item--zero'}>
            <LineBadge code={code} size="sm" />
            <span className="route-summary__name">{CATEGORY_LABELS[code]}</span>
            <span className="route-summary__hours mono">{formatHours(hours[code])} giờ</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
