/*
 * A figure that counts up once when it comes into view (DESIGN.md §6.2 #16, home page only).
 * Adapted from React Bits "CountUp" (https://reactbits.dev, MIT + Commons Clause,
 * Copyright (c) 2026 David Haz): the visible digits are aria-hidden and the real value is read
 * out once; tabular figures keep the width steady. Rodemap drives it with GSAP and the motion
 * tokens instead of motion/react, and formats numbers the Vietnamese way.
 */
import { useGSAP } from '@gsap/react';
import { useRef } from 'react';
import { gsap, motionEase, motionSeconds, prefersReducedMotion } from './gsap';

gsap.registerPlugin(useGSAP);

const format = new Intl.NumberFormat('vi-VN');

export function CountUp({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const digits = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      const shown = digits.current;
      // Already on the first screen, or reduced motion: the value is shown as it is.
      if (!el || !shown || prefersReducedMotion() || el.getBoundingClientRect().top < window.innerHeight) return undefined;
      const counter = { n: 0 };
      shown.textContent = format.format(0);
      const observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((e) => e.isIntersecting)) return;
          observer.disconnect();
          gsap.to(counter, {
            n: value,
            duration: motionSeconds('--dur-count'),
            ease: motionEase('--ease-expo'),
            onUpdate: () => {
              shown.textContent = format.format(Math.round(counter.n));
            },
          });
        },
        { rootMargin: '0% 0% -10% 0%' },
      );
      observer.observe(el);
      return () => {
        observer.disconnect();
        shown.textContent = format.format(value);
      };
    },
    { scope: ref, dependencies: [value] },
  );

  return (
    <span ref={ref} className={className ? `count-up ${className}` : 'count-up'}>
      <span className="visually-hidden">{format.format(value)}</span>
      <span ref={digits} aria-hidden="true">
        {format.format(value)}
      </span>
    </span>
  );
}
