/**
 * Mức độ tương tác (DESIGN.md §6.3): comparing levels and the level a device is advised to use.
 * Pure.
 */
import { INTERACTIVITY_LEVELS, type InteractivityLevel } from './types';

/** True when `level` is `min` or richer: atLeast('extreme', 'medium') → true. */
export function atLeast(level: InteractivityLevel, min: InteractivityLevel): boolean {
  return INTERACTIVITY_LEVELS.indexOf(level) >= INTERACTIVITY_LEVELS.indexOf(min);
}

/**
 * Movement (anything beyond an instant state change) may run at `min`: the chosen level allows
 * it and the device does not ask for reduced motion, which always wins (WCAG 2.3.3).
 */
export function movementAllowed(level: InteractivityLevel, min: InteractivityLevel, reducedMotion: boolean): boolean {
  return !reducedMotion && atLeast(level, min);
}

/** What the browser says about the device (unknown values are undefined). */
export interface DeviceSignals {
  /** navigator.hardwareConcurrency */
  cores: number | undefined;
  /** navigator.deviceMemory, in GB (Chromium only, rounded down by the browser) */
  memoryGb: number | undefined;
  /** navigator.connection.saveData (Data Saver) */
  saveData: boolean;
}

/** Up to this many logical cores or GB of memory, a device counts as constrained. */
export const CONSTRAINED_CORES = 4;
export const CONSTRAINED_MEMORY_GB = 4;

/**
 * Adaptive loading (web.dev): on a device with few cores, little memory or Data Saver on,
 * Rodemap advises "Nhẹ". Null when nothing points to a constrained device.
 */
export function recommendedLevel(signals: DeviceSignals): InteractivityLevel | null {
  const fewCores = signals.cores !== undefined && signals.cores <= CONSTRAINED_CORES;
  const littleMemory = signals.memoryGb !== undefined && signals.memoryGb <= CONSTRAINED_MEMORY_GB;
  return signals.saveData || fewCores || littleMemory ? 'slight' : null;
}
