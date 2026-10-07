/** Defensive readers for tool inputs (the model's JSON is validated before any tool runs). */
import { CATEGORY_CODES, type CategoryCode } from '../../domain/types';

export class ToolInputError extends Error {}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function asRecord(input: unknown): Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) throw new ToolInputError('Input must be an object.');
  return input as Record<string, unknown>;
}

export function optString(o: Record<string, unknown>, key: string, max = 500): string | undefined {
  const v = o[key];
  if (v === undefined || v === null) return undefined;
  if (typeof v !== 'string') throw new ToolInputError(`${key} must be a string.`);
  const t = v.trim();
  if (t.length > max) throw new ToolInputError(`${key} is too long.`);
  return t === '' ? undefined : t;
}

export function reqString(o: Record<string, unknown>, key: string, max = 500): string {
  const v = optString(o, key, max);
  if (v === undefined) throw new ToolInputError(`${key} is required.`);
  return v;
}

export function optBool(o: Record<string, unknown>, key: string): boolean | undefined {
  const v = o[key];
  if (v === undefined || v === null) return undefined;
  if (typeof v !== 'boolean') throw new ToolInputError(`${key} must be a boolean.`);
  return v;
}

export function optInt(o: Record<string, unknown>, key: string, min: number, max: number): number | undefined {
  const v = o[key];
  if (v === undefined || v === null) return undefined;
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new ToolInputError(`${key} must be a number.`);
  return Math.min(max, Math.max(min, Math.round(v)));
}

export function optNumber(o: Record<string, unknown>, key: string, min: number, max: number): number | undefined {
  const v = o[key];
  if (v === undefined || v === null) return undefined;
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new ToolInputError(`${key} must be a number.`);
  return Math.min(max, Math.max(min, v));
}

export function optDate(o: Record<string, unknown>, key: string): string | undefined {
  const v = optString(o, key, 10);
  if (v === undefined) return undefined;
  if (!DATE_RE.test(v)) throw new ToolInputError(`${key} must be YYYY-MM-DD.`);
  return v;
}

export function optEnum<T extends string>(o: Record<string, unknown>, key: string, allowed: readonly T[]): T | undefined {
  const v = optString(o, key, 40);
  if (v === undefined) return undefined;
  if (!(allowed as readonly string[]).includes(v)) throw new ToolInputError(`${key} must be one of ${allowed.join(', ')}.`);
  return v as T;
}

export function reqEnum<T extends string>(o: Record<string, unknown>, key: string, allowed: readonly T[]): T {
  const v = optEnum(o, key, allowed);
  if (v === undefined) throw new ToolInputError(`${key} is required.`);
  return v;
}

export function optStringArray(o: Record<string, unknown>, key: string, maxItems = 10): string[] | undefined {
  const v = o[key];
  if (v === undefined || v === null) return undefined;
  if (!Array.isArray(v) || v.some((x) => typeof x !== 'string')) throw new ToolInputError(`${key} must be an array of strings.`);
  return (v as string[]).slice(0, maxItems).map((s) => s.trim()).filter(Boolean);
}

export function optCategories(o: Record<string, unknown>, key: string): CategoryCode[] | undefined {
  const v = optStringArray(o, key, 7);
  if (v === undefined) return undefined;
  const bad = v.find((c) => !(CATEGORY_CODES as readonly string[]).includes(c));
  if (bad !== undefined) throw new ToolInputError(`Unknown category ${bad}.`);
  return v as CategoryCode[];
}
