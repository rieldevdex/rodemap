/*
 * Masked line reveal for display headings (DESIGN.md §6.2 #12).
 * Adapted from React Bits "SplitText" (https://reactbits.dev, MIT + Commons Clause,
 * Copyright (c) 2026 David Haz): GSAP SplitText with line masks and autoSplit, reverted on
 * unmount. Rodemap splits by line only (never by letter, so Vietnamese diacritics and screen
 * readers keep whole words), rises once from behind each line, and takes its timing from tokens.
 */
import { useGSAP } from '@gsap/react';
import { useRef, type ReactNode } from 'react';
import { gsap, motionEase, motionSeconds, prefersReducedMotion, SplitText } from './gsap';
import './SplitLines.css';

gsap.registerPlugin(useGSAP);

export interface SplitLinesProps {
  as?: 'h1' | 'h2' | 'p';
  children: ReactNode;
  className?: string;
  id?: string;
  tabIndex?: number;
  /** 'load' rises on the first frame (the hero); 'view' rises once when it scrolls into view. */
  trigger?: 'load' | 'view';
}

export function SplitLines({ as: Tag = 'h2', children, className, id, tabIndex, trigger = 'view' }: SplitLinesProps) {
  const ref = useRef<HTMLHeadingElement & HTMLParagraphElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || prefersReducedMotion()) return undefined;
      let observer: IntersectionObserver | null = null;
      let played = trigger === 'load';
      let current: gsap.core.Tween | null = null;
      // autoSplit re-splits when the fonts arrive or the width changes and carries the tween's
      // progress over, so the heading can be split before the first paint (no flash, no replay).
      const split = SplitText.create(el, {
        type: 'lines',
        mask: 'lines',
        linesClass: 'split-lines__line',
        autoSplit: true,
        // A GSAP tween is thenable, which the rule reads as a promise; returning it is how
        // SplitText carries the animation over to the next split.
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        onSplit: (self) => {
          const tween = gsap.from(self.lines, {
            // Far enough below the mask that stacked diacritics (Ấ, Ể) stay hidden too.
            yPercent: 150,
            duration: motionSeconds('--dur-reveal'),
            ease: motionEase('--ease-expo'),
            stagger: motionSeconds('--stagger-line'),
            paused: !played,
          });
          current = tween;
          if (trigger === 'view' && observer === null) {
            observer = new IntersectionObserver(
              (entries) => {
                if (!entries.some((e) => e.isIntersecting)) return;
                observer?.disconnect();
                played = true;
                current?.play();
              },
              { rootMargin: '0% 0% -12% 0%' },
            );
            observer.observe(el);
          }
          return tween;
        },
      });
      return () => {
        observer?.disconnect();
        split.revert();
      };
    },
    { scope: ref, dependencies: [trigger] },
  );

  return (
    <Tag ref={ref} className={className ? `split-lines ${className}` : 'split-lines'} id={id} tabIndex={tabIndex}>
      {children}
    </Tag>
  );
}
