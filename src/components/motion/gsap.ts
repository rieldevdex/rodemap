/**
 * GSAP set-up for Rodemap's motion layer (DESIGN.md §6). Durations and curves are read from the
 * motion tokens in src/styles/tokens.css, so CSS and GSAP move alike and reduced motion (every
 * duration 0) applies to both; motionOff() also honours the interactivity level.
 */
import { gsap } from 'gsap';
import { movementAllowed } from '../../domain/interactivity';
import { INTERACTIVITY_LEVELS, type InteractivityLevel } from '../../domain/types';
import { CustomEase } from 'gsap/CustomEase';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(CustomEase, SplitText);

export { gsap, SplitText };

function rootStyle(): CSSStyleDeclaration {
  return getComputedStyle(document.documentElement);
}

/** A duration token in seconds: motionSeconds('--dur-reveal') → 0.8. */
export function motionSeconds(token: string): number {
  const value = rootStyle().getPropertyValue(token).trim();
  const amount = parseFloat(value);
  if (Number.isNaN(amount)) return 0;
  return value.endsWith('ms') ? amount / 1000 : amount;
}

const easeCache = new Map<string, string>();

/** A curve token as a GSAP ease: the cubic-bezier of `--ease-expo` becomes CustomEase "rodemap--ease-expo". */
export function motionEase(token: string): string {
  const cached = easeCache.get(token);
  if (cached !== undefined) return cached;
  const points = /\(([^)]+)\)/.exec(rootStyle().getPropertyValue(token))?.[1];
  const name = `rodemap${token}`;
  if (points === undefined) return 'none';
  CustomEase.create(name, points.replace(/\s+/g, ''));
  easeCache.set(token, name);
  return name;
}

/**
 * True when page moments must not move: the level (data-interactivity on <html>) is below
 * "Vừa", or the device asks for reduced motion (DESIGN.md §6.3).
 */
export function motionOff(): boolean {
  const value = document.documentElement.getAttribute('data-interactivity');
  const level: InteractivityLevel = INTERACTIVITY_LEVELS.find((l) => l === value) ?? 'medium';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return !movementAllowed(level, 'medium', reduced);
}
