import { describe, expect, it } from 'vitest';
import { applyReview, canTransition, reviewNeedsReason } from './moderation';
import type { Submission } from './types';

const sub: Submission = {
  id: 'sub-1',
  eventId: 'ev-x',
  clubId: 'tranh-bien',
  submittedAt: '2026-10-05T10:00:00+07:00',
  history: [{ at: '2026-10-05T10:00:00+07:00', actor: 'club', action: 'submit' }],
};
const at = '2026-10-06T09:00:00+07:00';

describe('canTransition / reviewNeedsReason', () => {
  it('allows only the defined transitions', () => {
    expect(canTransition('draft', 'submit')).toBe(true);
    expect(canTransition('pending', 'approve')).toBe(true);
    expect(canTransition('approved', 'approve')).toBe(false);
    expect(canTransition('changes_requested', 'resubmit')).toBe(true);
    expect(canTransition('rejected', 'resubmit')).toBe(false);
  });
  it('requires reasons for request_changes and reject only', () => {
    expect(reviewNeedsReason('reject')).toBe(true);
    expect(reviewNeedsReason('request_changes')).toBe(true);
    expect(reviewNeedsReason('approve')).toBe(false);
  });
});

describe('applyReview', () => {
  it('approves a pending submission and records an HĐHS note', () => {
    const r = applyReview(sub, 'pending', 'approve', at);
    expect(r.status).toBe('approved');
    expect(r.submission.history.at(-1)).toEqual({ at, actor: 'hdhs', action: 'approve' });
    expect(sub.history).toHaveLength(1);
  });
  it('records a trimmed reason when requesting changes or rejecting', () => {
    const r = applyReview(sub, 'pending', 'request_changes', at, '  Bổ sung địa điểm cụ thể.  ');
    expect(r.status).toBe('changes_requested');
    expect(r.submission.history.at(-1)).toEqual({ at, actor: 'hdhs', action: 'request_changes', reason: 'Bổ sung địa điểm cụ thể.' });
    expect(applyReview(sub, 'pending', 'reject', at, 'Trùng lịch kiểm tra.').status).toBe('rejected');
  });
  it('lets the club resubmit after changes were requested', () => {
    const r = applyReview(sub, 'changes_requested', 'resubmit', at);
    expect(r.status).toBe('pending');
    expect(r.submission.history.at(-1)?.actor).toBe('club');
  });
  it('throws on invalid transitions and missing reasons', () => {
    expect(() => applyReview(sub, 'approved', 'approve', at)).toThrow(/Invalid transition/);
    expect(() => applyReview(sub, 'pending', 'reject', at, '   ')).toThrow(/reason/);
    expect(() => applyReview(sub, 'pending', 'reject', at)).toThrow(/reason/);
  });
});
