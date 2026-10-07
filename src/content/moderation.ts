/** Labels for submission statuses and review actions (Cổng câu lạc bộ, Kiểm duyệt). */
import type { EventStatus, ReviewAction } from '../domain/types';

export const STATUS_LABELS: Record<EventStatus, { label: string; tone: 'ok' | 'warn' | 'stop' | 'neutral' }> = {
  draft: { label: 'Bản nháp', tone: 'neutral' },
  pending: { label: 'Chờ duyệt', tone: 'neutral' },
  approved: { label: 'Đã duyệt', tone: 'ok' },
  changes_requested: { label: 'Cần chỉnh sửa', tone: 'warn' },
  rejected: { label: 'Từ chối', tone: 'stop' },
};

export const ACTION_LABELS: Record<ReviewAction, string> = {
  submit: 'Câu lạc bộ gửi sự kiện',
  resubmit: 'Câu lạc bộ gửi lại sau chỉnh sửa',
  approve: 'HĐHS phê duyệt',
  request_changes: 'HĐHS yêu cầu chỉnh sửa',
  reject: 'HĐHS từ chối',
};
