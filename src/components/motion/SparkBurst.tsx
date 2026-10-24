/*
 * A small burst of line sparks after "Xác nhận" registers an event (DESIGN.md §6.2 #10).
 * Adapted from React Bits "ClickSpark" (https://reactbits.dev, MIT + Commons Clause,
 * Copyright (c) 2026 David Haz): line sparks radiating from the control and fading as they
 * travel. Rodemap draws twelve DOM sparks in the event's category colour and moves them with
 * GSAP (transform and opacity only); decorative, never under reduced motion.
 */
import { useGSAP } from '@gsap/react';
import { useRef, type CSSProperties } from 'react';
import { gsap, motionEase, motionSeconds, prefersReducedMotion } from './gsap';
import './SparkBurst.css';

gsap.registerPlugin(useGSAP);

const SPARKS = Array.from({ length: 12 }, (_, i) => i);

/** Bursts each time `play` grows (0 draws nothing). */
export function SparkBurst({ play }: { play: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || play === 0 || prefersReducedMotion()) return;
      const sparks = el.querySelectorAll('.spark-burst__ray');
      const reach = parseFloat(getComputedStyle(el).getPropertyValue('--spark-reach')) || 0;
      gsap.fromTo(
        sparks,
        { opacity: 1, scaleY: 0.2, y: 0 },
        { opacity: 0, scaleY: 1, y: -reach, duration: motionSeconds('--dur-spark'), ease: motionEase('--ease-out') },
      );
    },
    { scope: ref, dependencies: [play] },
  );

  return (
    <span ref={ref} className="spark-burst" aria-hidden="true">
      {SPARKS.map((i) => (
        <span key={i} className="spark-burst__arm" style={{ '--i': i } as CSSProperties}>
          <span className="spark-burst__ray" />
        </span>
      ))}
    </span>
  );
}
