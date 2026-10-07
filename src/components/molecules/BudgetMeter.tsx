import { formatHours } from '../../domain/text';
import './BudgetMeter.css';

export interface BudgetMeterProps {
  used: number;
  budget: number;
  label: string;
}

const W = 240;
const Y = 10;

/** Hours used this week vs the weekly budget, drawn as a route with one stop per hour. */
export function BudgetMeter({ used, budget, label }: BudgetMeterProps) {
  const stops = Math.max(1, Math.round(budget));
  const step = (W - 16) / stops;
  const share = budget > 0 ? Math.min(1, used / budget) : 0;
  const over = used > budget;
  return (
    <div className={over ? 'budget-meter budget-meter--over' : 'budget-meter'}>
      <p className="budget-meter__text">
        <span className="budget-meter__label">{label}</span>
        <span className="budget-meter__value">
          <span className="mono">{formatHours(used)}</span> / <span className="mono">{formatHours(budget)}</span> giờ
        </span>
      </p>
      <svg className="budget-meter__svg" viewBox={`0 0 ${W} 20`} aria-hidden="true" focusable="false">
        <line className="budget-meter__track" x1="8" y1={Y} x2={W - 8} y2={Y} />
        <line className="budget-meter__fill" x1="8" y1={Y} x2={8 + share * (W - 16)} y2={Y} />
        {Array.from({ length: stops + 1 }, (_, i) => (
          <circle key={i} className={i * step <= share * (W - 16) + 0.01 ? 'budget-meter__stop budget-meter__stop--on' : 'budget-meter__stop'} cx={8 + i * step} cy={Y} r="4" />
        ))}
      </svg>
      <p className="budget-meter__note">
        {over ? `Vượt ${formatHours(used - budget)} giờ so với quỹ giờ trong tuần.` : `Còn ${formatHours(Math.max(0, budget - used))} giờ trong quỹ giờ tuần này.`}
      </p>
    </div>
  );
}
