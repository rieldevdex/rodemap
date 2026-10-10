import { describe, expect, it } from 'vitest';
import { DEFAULT_MOCHI_MODEL, isMochiResponse, resolveEffort, resolveModel, supportsServerFallback } from './relay';

describe('relay settings', () => {
  it('defaults to Claude Haiku 5.5 at low effort', () => {
    expect(DEFAULT_MOCHI_MODEL).toBe('claude-haiku-5-5');
    expect(resolveModel(undefined)).toBe('claude-haiku-5-5');
    expect(resolveModel('  ')).toBe('claude-haiku-5-5');
    expect(resolveModel(' claude-opus-5-5 ')).toBe('claude-opus-5-5');
    expect(resolveEffort('high')).toBe('high');
    expect(resolveEffort('max')).toBe('low');
    expect(resolveEffort(undefined)).toBe('low');
  });

  it('uses the server-side fallback only where the model has one', () => {
    expect(supportsServerFallback('claude-haiku-5-5')).toBe(false);
    expect(supportsServerFallback('claude-opus-5-5')).toBe(true);
    expect(supportsServerFallback('claude-sonnet-5-5')).toBe(true);
  });

  it('recognises relay responses', () => {
    expect(isMochiResponse({ ok: true, content: [], stopReason: null, model: 'm' })).toBe(true);
    expect(isMochiResponse({ ok: false, error: 'offline' })).toBe(true);
    expect(isMochiResponse({ ok: false, error: 'teapot' })).toBe(false);
    expect(isMochiResponse({ msg: 'Invalid JWT' })).toBe(false);
    expect(isMochiResponse(null)).toBe(false);
  });
});
