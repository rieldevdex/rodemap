import { VisuallyHidden } from '../atoms/VisuallyHidden';
import './StepLine.css';

export interface StepLineStep {
  id: string;
  label: string;
}

export interface StepLineProps {
  steps: readonly StepLineStep[];
  /** Index of the current step. */
  current: number;
  /** Accessible name of the step navigation. */
  label: string;
  /** Completed steps become buttons that call this with their index. */
  onSelect?: ((index: number) => void) | undefined;
}

/**
 * Multi-step progress drawn as stations on one line (DESIGN.md §1): the travelled part of the
 * line is "your route" (signal, thick), the rest is a plain rule.
 */
export function StepLine({ steps, current, label, onSelect }: StepLineProps) {
  return (
    <nav className="step-line" aria-label={label}>
      <ol className="step-line__list">
        {steps.map((step, i) => {
          const state = i < current ? 'done' : i === current ? 'current' : 'todo';
          const content = (
            <>
              <span className="step-line__dot" aria-hidden="true" />
              <span className="step-line__num">{String(i + 1).padStart(2, '0')}</span>
              <span className="step-line__label">{step.label}</span>
              {state === 'done' ? <VisuallyHidden>, đã hoàn tất</VisuallyHidden> : null}
            </>
          );
          return (
            <li key={step.id} className={`step-line__step step-line__step--${state}`} aria-current={state === 'current' ? 'step' : undefined}>
              {state === 'done' && onSelect ? (
                <button
                  type="button"
                  className="step-line__item step-line__button"
                  onClick={() => {
                    onSelect(i);
                  }}
                >
                  {content}
                </button>
              ) : (
                <span className="step-line__item">{content}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
