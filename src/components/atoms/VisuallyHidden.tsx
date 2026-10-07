import type { ReactNode } from 'react';

export interface VisuallyHiddenProps {
  children: ReactNode;
  id?: string;
}

/** Text for assistive technology only (uses the global .visually-hidden utility from base.css). */
export function VisuallyHidden({ children, id }: VisuallyHiddenProps) {
  return (
    <span className="visually-hidden" id={id}>
      {children}
    </span>
  );
}
