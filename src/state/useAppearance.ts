/** Giao diện: the appearance mode, brightness and text density, applied with the theme ripple. */
import { useCallback } from 'react';
import { flushSync } from 'react-dom';
import type { AppearanceMode, TextDensity, ThemePreference } from '../domain/types';
import { applyAppearance, applyTheme, setRippleOrigin, withViewTransition } from './effects';
import { useAppState, useDispatch } from './hooks';

export interface Appearance {
  mode: AppearanceMode;
  theme: ThemePreference;
  density: TextDensity;
  /** Colour changes grow from `origin` (the control that was used) as a ripple (DESIGN.md §6.2 #6). */
  setMode: (mode: AppearanceMode, origin: HTMLElement | null) => void;
  setTheme: (theme: ThemePreference, origin: HTMLElement | null) => void;
  /** Text density changes no colour, so it applies at once without a ripple. */
  setDensity: (density: TextDensity) => void;
}

export function useAppearance(): Appearance {
  const { mode, theme, density } = useAppState();
  const dispatch = useDispatch();

  const setMode = useCallback(
    (next: AppearanceMode, origin: HTMLElement | null) => {
      setRippleOrigin(origin);
      withViewTransition(() => {
        flushSync(() => {
          dispatch({ type: 'appearance/setMode', mode: next });
        });
        applyAppearance(next, density);
      });
    },
    [dispatch, density],
  );

  const setTheme = useCallback(
    (next: ThemePreference, origin: HTMLElement | null) => {
      setRippleOrigin(origin);
      withViewTransition(() => {
        flushSync(() => {
          dispatch({ type: 'theme/set', theme: next });
        });
        applyTheme(next);
      });
    },
    [dispatch],
  );

  const setDensity = useCallback(
    (next: TextDensity) => {
      dispatch({ type: 'appearance/setDensity', density: next });
    },
    [dispatch],
  );

  return { mode, theme, density, setMode, setTheme, setDensity };
}
