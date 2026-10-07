/** UI cards that Mochi's tools attach to the conversation. Plain data; rendered by MochiPanel. */
import type { DropReason } from '../domain/planner';

export type MochiCard =
  | {
      kind: 'events';
      title: string;
      eventIds: string[];
      /** Event id → "Vì sao Mochi đề xuất" lines. */
      reasons?: Record<string, string[]>;
      warnings?: Record<string, string[]>;
    }
  | { kind: 'registration'; action: 'register' | 'unregister'; eventId: string }
  | {
      kind: 'plan';
      accepted: string[];
      dropped: { eventId: string; reason: DropReason; conflictWith?: string }[];
      alternatives: { forEventId: string; eventId: string }[];
      hoursByWeek: Record<string, number>;
      budget: number;
    }
  | { kind: 'draft'; eventId: string; reflection: string; role: string }
  | { kind: 'export'; eventIds: string[] };

/** What happened to a card that needs the student's decision. */
export type CardStatus = 'pending' | 'confirmed' | 'dismissed';

export const DROP_REASON_LABELS: Record<DropReason, string> = {
  conflict: 'Trùng lịch',
  over_budget: 'Vượt quỹ giờ trong tuần',
  full: 'Hết chỗ',
  closed: 'Hết hạn đăng ký',
  ineligible: 'Không dành cho khối của bạn',
};
