/** Every state change in Rodemap. Timestamps and ids are created by the caller so the reducer stays pure. */
import type {
  ActivityProposal,
  AppearanceMode,
  CollaborationProposal,
  GuestPicks,
  InteractivityLevel,
  IsoDate,
  IsoDateTime,
  NewsPost,
  PortfolioEntry,
  Profile,
  ProposalResponse,
  Role,
  SchoolEvent,
  Submission,
  TextDensity,
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
  | { type: 'news/publish'; post: NewsPost }
  | { type: 'news/remove'; id: string }
  | { type: 'proposal/submit'; proposal: ActivityProposal }
  | { type: 'proposal/toggleSupport'; id: string }
  | { type: 'collaboration/submit'; proposal: CollaborationProposal }
  | { type: 'proposal/respond'; id: string; response: ProposalResponse }
  | { type: 'proposal/withdraw'; id: string }
  | { type: 'role/set'; role: Role }
  | { type: 'club/setActive'; clubId: string }
  | { type: 'guest/setPicks'; picks: GuestPicks }
  | { type: 'theme/set'; theme: ThemePreference }
  | { type: 'appearance/setMode'; mode: AppearanceMode }
  | { type: 'appearance/setDensity'; density: TextDensity }
  | { type: 'appearance/setInteractivity'; level: InteractivityLevel }
  | { type: 'demo/setToday'; date: IsoDate | null }
  | { type: 'demo/setMochiOffline'; offline: boolean }
  | { type: 'demo/reset' };
