/*
 * Section entrance (DESIGN.md §6.2 #7): the parts of a section arrive in reading order, once.
 * Adapted from React Bits "AnimatedContent" (https://reactbits.dev, MIT + Commons Clause,
 * Copyright (c) 2026 David Haz): GSAP from/to on the children with a stagger, settled with
 * clearProps. Rodemap triggers it with an IntersectionObserver instead of ScrollTrigger, never
 * hides anything already on the first screen, and takes travel and timing from tokens.
 */
import { useGSAP } from '@gsap/react';
import { useRef, type ReactNode } from 'react';
import { gsap, motionEase, motionSeconds, motionOff } from './gsap';

gsap.registerPlugin(useGSAP);

export interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Rendered element; the direct children are what arrive one after another. */
  as?: 'div' | 'ol' | 'ul';
}

export function Reveal({ children, className, as: Tag = 'div' }: RevealProps) {
  const ref = useRef<HTMLDivElement & HTMLOListElement & HTMLUListElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      // Already on the first screen, or reduced motion: shown as it is.
      if (!el || motionOff() || el.getBoundingClientRect().top < window.innerHeight) return undefined;
      const parts = Array.from(el.children);
      const rise = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--rise')) || 0;
      gsap.set(parts, { opacity: 0, y: rise });
      const observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((e) => e.isIntersecting)) return;
          observer.disconnect();
          gsap.to(parts, {
            opacity: 1,
            y: 0,
            duration: motionSeconds('--dur-reveal'),
            ease: motionEase('--ease-expo'),
            stagger: motionSeconds('--stagger-item'),
            clearProps: 'opacity,transform',
          });
        },
        { rootMargin: '0% 0% -12% 0%' },
      );
      observer.observe(el);
      return () => {
        observer.disconnect();
      };
    },
    { scope: ref },
  );

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
