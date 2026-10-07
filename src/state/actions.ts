/** Every state change in Rodemap. Timestamps and ids are created by the caller so the reducer stays pure. */
import type {
  IsoDate,
  IsoDateTime,
  PortfolioEntry,
  Profile,
  Role,
  SchoolEvent,
  Submission,
  ThemePreference,
} from '../domain/types';

export type ModerationDecision = 'approve' | 'request_changes' | 'reject';

export type Action =
  | { type: 'profile/complete'; profile: Profile }
  | { type: 'profile/clear' }
  | { type: 'registration/register'; eventId: string; at: IsoDateTime }
  | { type: 'registration/unregister'; eventId: string }
  | { type: 'registration/markAttended'; eventId: string; entry: PortfolioEntry }
  | { type: 'registration/markAbsent'; eventId: string }
  | { type: 'portfolio/upsert'; entry: PortfolioEntry }
  | { type: 'portfolio/remove'; id: string }
  | { type: 'submission/create'; event: SchoolEvent; submission: Submission }
  | { type: 'submission/resubmit'; submissionId: string; event: SchoolEvent; at: IsoDateTime }
  | { type: 'moderation/review'; submissionId: string; action: ModerationDecision; reason?: string; at: IsoDateTime }
  | { type: 'role/set'; role: Role }
  | { type: 'club/setActive'; clubId: string }
  | { type: 'theme/set'; theme: ThemePreference }
  | { type: 'demo/setToday'; date: IsoDate | null }
  | { type: 'demo/setMochiOffline'; offline: boolean }
  | { type: 'demo/reset' };
