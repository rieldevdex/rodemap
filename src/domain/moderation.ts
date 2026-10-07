/** Moderation workflow for club submissions. Pure. */
import type { EventStatus, IsoDateTime, ReviewAction, ReviewActor, ReviewNote, Submission } from './types';

const TRANSITIONS: Record<ReviewAction, { from: readonly EventStatus[]; to: EventStatus; needsReason: boolean }> = {
  submit: { from: ['draft'], to: 'pending', needsReason: false },
  resubmit: { from: ['changes_requested'], to: 'pending', needsReason: false },
  approve: { from: ['pending'], to: 'approved', needsReason: false },
  request_changes: { from: ['pending'], to: 'changes_requested', needsReason: true },
  reject: { from: ['pending'], to: 'rejected', needsReason: true },
};

export function canTransition(from: EventStatus, action: ReviewAction): boolean {
  return TRANSITIONS[action].from.includes(from);
}

export function reviewNeedsReason(action: ReviewAction): boolean {
  return TRANSITIONS[action].needsReason;
}

/**
 * Applies a review action to a submission whose event currently has `status`.
 * Returns the submission with the new history note and the new event status.
 * Throws on an invalid transition or a missing reason.
 */
export function applyReview(
  sub: Submission,
  status: EventStatus,
  action: ReviewAction,
  at: IsoDateTime,
  reason?: string,
): { submission: Submission; status: EventStatus } {
  const rule = TRANSITIONS[action];
  if (!rule.from.includes(status)) {
    throw new Error(`Invalid transition: ${action} from ${status}`);
  }
  const trimmed = reason?.trim() ?? '';
  if (rule.needsReason && trimmed === '') {
    throw new Error(`A reason is required for ${action}`);
  }
  const actor: ReviewActor = action === 'submit' || action === 'resubmit' ? 'club' : 'hdhs';
  const note: ReviewNote = trimmed === '' ? { at, actor, action } : { at, actor, action, reason: trimmed };
  return {
    submission: { ...sub, history: [...sub.history, note] },
    status: rule.to,
  };
}
