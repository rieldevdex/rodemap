/** Giao diện: appearance mode, brightness, text density and interactivity level. */
import { useCallback } from 'react';
import { flushSync } from 'react-dom';
import { recommendedLevel } from '../domain/interactivity';
import type { AppearanceMode, InteractivityLevel, TextDensity, ThemePreference } from '../domain/types';
import { applyAppearance, applyTheme, prefersReducedMotion, readDeviceSignals, setRippleOrigin, withViewTransition } from './effects';
import { useAppState, useDispatch } from './hooks';

export interface Appearance {
  mode: AppearanceMode;
  theme: ThemePreference;
  density: TextDensity;
  interactivity: InteractivityLevel;
  /** "Nhẹ" when the device looks constrained (few cores, little memory, Data Saver), else null. */
  recommended: InteractivityLevel | null;
  /** The device asks for reduced motion: movement stays off at every level. */
  reducedMotion: boolean;
  /** Colour changes grow from `origin` (the control that was used) as a ripple (DESIGN.md §6.2 #6). */
  setMode: (mode: AppearanceMode, origin: HTMLElement | null) => void;
  setTheme: (theme: ThemePreference, origin: HTMLElement | null) => void;
  /** Text density changes no colour, so it applies at once without a ripple. */
  setDensity: (density: TextDensity) => void;
  setInteractivity: (level: InteractivityLevel) => void;
}

/** Read once per page load: these do not change while the page is open. */
let deviceAdvice: { recommended: InteractivityLevel | null; reducedMotion: boolean } | null = null;
function adviceForDevice(): { recommended: InteractivityLevel | null; reducedMotion: boolean } {
  deviceAdvice ??= { recommended: recommendedLevel(readDeviceSignals()), reducedMotion: prefersReducedMotion() };
  return deviceAdvice;
}

export function useAppearance(): Appearance {
  const { mode, theme, density, interactivity } = useAppState();
  const dispatch = useDispatch();

  const setMode = useCallback(
    (next: AppearanceMode, origin: HTMLElement | null) => {
      setRippleOrigin(origin);
      withViewTransition(() => {
        flushSync(() => {
          dispatch({ type: 'appearance/setMode', mode: next });
        });
        applyAppearance(next, density, interactivity);
      });
    },
    [dispatch, density, interactivity],
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

  const setInteractivity = useCallback(
    (next: InteractivityLevel) => {
      dispatch({ type: 'appearance/setInteractivity', level: next });
    },
    [dispatch],
  );

  return { mode, theme, density, interactivity, ...adviceForDevice(), setMode, setTheme, setDensity, setInteractivity };
}
