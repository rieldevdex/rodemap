/** The single pure reducer for AppState. Invalid actions return the same state object. */
import { EVENTS } from '../data/events';
import { NEWS } from '../data/news';
import { ACTIVITY_PROPOSALS, COLLABORATIONS, PROPOSAL_RESPONSES } from '../data/proposals';
import { cleanGuestPicks, sameGuestPicks } from '../domain/guest';
import { RESERVED_NEWS_SLUGS } from '../domain/news';
import { applyReview, canTransition } from '../domain/moderation';
import { APPEARANCE_MODES, INTERACTIVITY_LEVELS, TEXT_DENSITIES, type EventStatus, type Registration, type SchoolEvent } from '../domain/types';
import type { Action } from './actions';
import { createSeedState, type AppState } from './schema';

/** Current status of an event, honouring moderation overrides and edited copies. */
export function effectiveStatus(state: AppState, eventId: string): EventStatus | undefined {
  const override = state.moderation[eventId];
  if (override) return override;
  const submitted = state.submittedEvents.find((e) => e.id === eventId);
  if (submitted) return submitted.status;
  return EVENTS.find((e) => e.id === eventId)?.status;
}

function setRegistration(regs: Registration[], eventId: string, patch: Partial<Registration>): Registration[] {
  return regs.map((r) => (r.eventId === eventId ? { ...r, ...patch } : r));
}

function upsertById<T extends { id: string }>(items: T[], item: T): T[] {
  return items.some((i) => i.id === item.id) ? items.map((i) => (i.id === item.id ? item : i)) : [...items, item];
}

function upsertEvent(events: SchoolEvent[], event: SchoolEvent): SchoolEvent[] {
  return upsertById(events, event);
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'profile/complete':
      return { ...state, profile: action.profile };

    case 'profile/clear':
      return state.profile === null ? state : { ...state, profile: null };

    case 'registration/register': {
      const existing = state.registrations.find((r) => r.eventId === action.eventId);
      if (existing?.status === 'registered' || existing?.status === 'attended') return state;
      if (existing) {
        return {
          ...state,
          registrations: setRegistration(state.registrations, action.eventId, { status: 'registered', registeredAt: action.at }),
        };
      }
      return {
        ...state,
        registrations: [...state.registrations, { eventId: action.eventId, registeredAt: action.at, status: 'registered' }],
      };
    }

    case 'registration/unregister': {
      const existing = state.registrations.find((r) => r.eventId === action.eventId);
      if (existing?.status !== 'registered') return state;
      return { ...state, registrations: state.registrations.filter((r) => r.eventId !== action.eventId) };
    }

    case 'registration/markAttended': {
      const existing = state.registrations.find((r) => r.eventId === action.eventId);
      if (!existing || existing.status === 'attended') return state;
      const hasEntry = state.portfolio.some((p) => p.eventId === action.eventId);
      return {
        ...state,
        registrations: setRegistration(state.registrations, action.eventId, { status: 'attended' }),
        portfolio: hasEntry ? state.portfolio : [...state.portfolio, action.entry],
      };
    }

    case 'registration/markAbsent': {
      const existing = state.registrations.find((r) => r.eventId === action.eventId);
      if (existing?.status !== 'registered') return state;
      return { ...state, registrations: setRegistration(state.registrations, action.eventId, { status: 'absent' }) };
    }

    case 'portfolio/upsert':
      return { ...state, portfolio: upsertById(state.portfolio, action.entry) };

    case 'portfolio/remove':
      if (!state.portfolio.some((p) => p.id === action.id)) return state;
      return { ...state, portfolio: state.portfolio.filter((p) => p.id !== action.id) };

    case 'submission/create':
      if (state.submissions.some((s) => s.id === action.submission.id)) return state;
      return {
        ...state,
        submittedEvents: upsertEvent(state.submittedEvents, { ...action.event, status: 'pending' }),
        moderation: { ...state.moderation, [action.event.id]: 'pending' },
        submissions: [...state.submissions, action.submission],
      };

    case 'submission/resubmit': {
      const sub = state.submissions.find((s) => s.id === action.submissionId);
      if (sub?.eventId !== action.event.id) return state;
      const status = effectiveStatus(state, sub.eventId);
      if (!status || !canTransition(status, 'resubmit')) return state;
      const result = applyReview(sub, status, 'resubmit', action.at);
      return {
        ...state,
        submittedEvents: upsertEvent(state.submittedEvents, { ...action.event, status: result.status }),
        moderation: { ...state.moderation, [sub.eventId]: result.status },
        submissions: state.submissions.map((s) => (s.id === sub.id ? result.submission : s)),
      };
    }

    case 'moderation/review': {
      const sub = state.submissions.find((s) => s.id === action.submissionId);
      if (!sub) return state;
      const status = effectiveStatus(state, sub.eventId);
      if (!status || !canTransition(status, action.action)) return state;
      if (action.action !== 'approve' && (action.reason?.trim() ?? '') === '') return state;
      const result = applyReview(sub, status, action.action, action.at, action.reason);
      return {
        ...state,
        moderation: { ...state.moderation, [sub.eventId]: result.status },
        submissions: state.submissions.map((s) => (s.id === sub.id ? result.submission : s)),
      };
    }

    case 'news/publish': {
      const all = [...NEWS, ...state.newsPosts];
      const { post } = action;
      if (all.some((p) => p.id === post.id || p.slug === post.slug) || RESERVED_NEWS_SLUGS.includes(post.slug)) return state;
      return { ...state, newsPosts: [...state.newsPosts, post] };
    }

    case 'news/remove':
      return state.newsPosts.some((p) => p.id === action.id) ? { ...state, newsPosts: state.newsPosts.filter((p) => p.id !== action.id) } : state;

    case 'proposal/submit': {
      const { proposal } = action;
      if ([...ACTIVITY_PROPOSALS, ...state.proposals, ...COLLABORATIONS, ...state.collaborations].some((p) => p.id === proposal.id)) return state;
      return { ...state, proposals: [...state.proposals, proposal] };
    }

    case 'proposal/toggleSupport': {
      // Other students' proposals only: a proposal sent in this browser is the student's own.
      if (!ACTIVITY_PROPOSALS.some((p) => p.id === action.id) || state.proposals.some((p) => p.id === action.id)) return state;
      const supported = state.supportedProposals.includes(action.id)
        ? state.supportedProposals.filter((id) => id !== action.id)
        : [...state.supportedProposals, action.id];
      return { ...state, supportedProposals: supported };
    }

    case 'collaboration/submit': {
      const { proposal } = action;
      if (proposal.fromClubId === proposal.toClubId) return state;
      if ([...ACTIVITY_PROPOSALS, ...state.proposals, ...COLLABORATIONS, ...state.collaborations].some((p) => p.id === proposal.id)) return state;
      return { ...state, collaborations: [...state.collaborations, proposal] };
    }

    case 'proposal/respond': {
      const { id, response } = action;
      if (PROPOSAL_RESPONSES[id] !== undefined || state.proposalResponses[id] !== undefined) return state;
      if (response.status === 'declined' && response.note.trim() === '') return state;
      const activity = [...ACTIVITY_PROPOSALS, ...state.proposals].some((p) => p.id === id);
      const collaboration = [...COLLABORATIONS, ...state.collaborations].find((p) => p.id === id);
      // HĐHS answers students; only the receiving club answers a collaboration.
      if (activity ? response.by !== 'hdhs' : collaboration?.toClubId !== response.by) return state;
      return { ...state, proposalResponses: { ...state.proposalResponses, [id]: response } };
    }

    case 'proposal/withdraw': {
      // Only what was sent in this browser, and only while nobody has answered it.
      if (state.proposalResponses[action.id] !== undefined) return state;
      if (state.proposals.some((p) => p.id === action.id)) return { ...state, proposals: state.proposals.filter((p) => p.id !== action.id) };
      if (state.collaborations.some((p) => p.id === action.id)) return { ...state, collaborations: state.collaborations.filter((p) => p.id !== action.id) };
      return state;
    }

    case 'role/set':
      return state.role === action.role ? state : { ...state, role: action.role };

    case 'club/setActive':
      return state.activeClubId === action.clubId ? state : { ...state, activeClubId: action.clubId };

    case 'guest/setPicks': {
      const picks = cleanGuestPicks(action.picks);
      return sameGuestPicks(picks, state.guestPicks) ? state : { ...state, guestPicks: picks };
    }

    case 'theme/set':
      return state.theme === action.theme ? state : { ...state, theme: action.theme };

    case 'appearance/setMode':
      return state.mode === action.mode || !APPEARANCE_MODES.includes(action.mode) ? state : { ...state, mode: action.mode };

    case 'appearance/setDensity':
      return state.density === action.density || !TEXT_DENSITIES.includes(action.density) ? state : { ...state, density: action.density };

    case 'appearance/setInteractivity':
      return state.interactivity === action.level || !INTERACTIVITY_LEVELS.includes(action.level) ? state : { ...state, interactivity: action.level };

    case 'demo/setToday':
      return state.demoToday === action.date ? state : { ...state, demoToday: action.date };

    case 'demo/setMochiOffline':
      return state.mochiForcedOffline === action.offline ? state : { ...state, mochiForcedOffline: action.offline };

    case 'demo/reset': {
      // Presentation settings survive a reset; the profile and the student's data are cleared,
      // so Rodemap asks for a new profile before anything else.
      const seed = createSeedState();
      return {
        ...seed,
        theme: state.theme,
        mode: state.mode,
        density: state.density,
        interactivity: state.interactivity,
        demoToday: state.demoToday,
        mochiForcedOffline: state.mochiForcedOffline,
      };
    }

    default:
      // Unknown actions (e.g. from an older persisted build) leave the state untouched.
      return state;
  }
}
