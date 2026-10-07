import { describe, expect, it, vi } from 'vitest';
import { requestMochi, subscribeMochi } from './mochiBridge';

describe('mochiBridge', () => {
  it('delivers requests to subscribers until they unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeMochi(listener);
    requestMochi({ kind: 'event', eventId: 'ev-012' });
    expect(listener).toHaveBeenCalledWith({ kind: 'event', eventId: 'ev-012' });
    unsubscribe();
    requestMochi({ kind: 'open' });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
