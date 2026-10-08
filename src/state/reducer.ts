/** The single pure reducer for AppState. Invalid actions return the same state object. */
import { EVENTS } from '../data/events';
import { NEWS } from '../data/news';
import { RESERVED_NEWS_SLUGS } from '../domain/news';
import { applyReview, canTransition } from '../domain/moderation';
import type { EventStatus, Registration, SchoolEvent } from '../domain/types';
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

    case 'role/set':
      return state.role === action.role ? state : { ...state, role: action.role };

    case 'club/setActive':
      return state.activeClubId === action.clubId ? state : { ...state, activeClubId: action.clubId };

    case 'theme/set':
      return state.theme === action.theme ? state : { ...state, theme: action.theme };

    case 'demo/setToday':
      return state.demoToday === action.date ? state : { ...state, demoToday: action.date };

    case 'demo/setMochiOffline':
      return state.mochiForcedOffline === action.offline ? state : { ...state, mochiForcedOffline: action.offline };

    case 'demo/reset': {
      // Presentation settings survive a reset; demo data returns to the illustrative seed.
      const seed = createSeedState();
      return { ...seed, theme: state.theme, demoToday: state.demoToday, mochiForcedOffline: state.mochiForcedOffline };
    }

    default:
      // Unknown actions (e.g. from an older persisted build) leave the state untouched.
      return state;
  }
}
