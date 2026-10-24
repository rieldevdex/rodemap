import { describe, expect, it } from 'vitest';
import { atLeast, movementAllowed, recommendedLevel } from './interactivity';

describe('interactivity levels', () => {
  it('orders the levels from none to extreme', () => {
    expect(atLeast('extreme', 'medium')).toBe(true);
    expect(atLeast('medium', 'medium')).toBe(true);
    expect(atLeast('slight', 'medium')).toBe(false);
    expect(atLeast('none', 'none')).toBe(true);
    expect(atLeast('none', 'slight')).toBe(false);
  });

  it('never allows movement when the device asks for reduced motion', () => {
    expect(movementAllowed('extreme', 'medium', false)).toBe(true);
    expect(movementAllowed('extreme', 'medium', true)).toBe(false);
    expect(movementAllowed('slight', 'slight', false)).toBe(true);
    expect(movementAllowed('slight', 'medium', false)).toBe(false);
  });

  it('advises Nhẹ on a constrained device and nothing otherwise', () => {
    expect(recommendedLevel({ cores: 8, memoryGb: 8, saveData: false })).toBeNull();
    expect(recommendedLevel({ cores: undefined, memoryGb: undefined, saveData: false })).toBeNull();
    expect(recommendedLevel({ cores: 4, memoryGb: 8, saveData: false })).toBe('slight');
    expect(recommendedLevel({ cores: 8, memoryGb: 2, saveData: false })).toBe('slight');
    expect(recommendedLevel({ cores: 8, memoryGb: 8, saveData: true })).toBe('slight');
  });
});
