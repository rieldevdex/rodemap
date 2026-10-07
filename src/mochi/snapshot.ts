/** The compact data snapshot sent with each student message (a text block the model treats as data). */
import { CATEGORY_LABELS } from '../domain/category-labels';
import { formatLongDate, formatTimeRange, toIsoDate } from '../domain/dates';
import { eventEnd, eventStart, isPast } from '../domain/events';
import type { Millis } from '../domain/types';
import { GOALS } from '../data/goals';
import type { AppState } from '../state/schema';
import { selectPendingAttendance, selectPublicEvents, selectUpcomingMine } from '../state/selectors';
import { eventBrief } from './tools/executors';
import { MAX_SNAPSHOT_CHARS, SNAPSHOT_TAG } from './server/validate';

const CANDIDATES = 14;

/**
 * Builds the <du_lieu_rodemap> block. The first message of a conversation carries
 * candidate events too; later messages carry only what may have changed.
 */
export function buildSnapshot(state: AppState, now: Millis, full: boolean): string {
  const p = state.profile;
  const ctx = { state, now };
  const data: Record<string, unknown> = {
    today: formatLongDate(now),
    today_iso: toIsoDate(now),
    profile: p
      ? {
          grade: p.grade,
          class: p.className,
          interests: p.interests.map((c) => CATEGORY_LABELS[c]),
          top_interests: p.topInterests.map((c) => CATEGORY_LABELS[c]),
          goals: p.goals.map((g) => GOALS.find((x) => x.id === g)?.label ?? g),
          availability: [
            p.availability.weekdayAfterSchool ? 'từ Thứ Hai đến Thứ Sáu, từ 16:30' : null,
            p.availability.weekend ? 'cuối tuần' : null,
          ].filter(Boolean),
          weekly_hour_budget: p.weeklyHourBudget,
        }
      : null,
    my_upcoming_events: selectUpcomingMine(state, now).map((e) => ({
      id: e.id,
      title: e.title,
      date: formatLongDate(eventStart(e)),
      time: formatTimeRange(eventStart(e), eventEnd(e)),
    })),
    awaiting_attendance_confirmation: selectPendingAttendance(state, now).map((e) => ({ id: e.id, title: e.title })),
  };
  if (full) {
    data.candidate_events = selectPublicEvents(state)
      .filter((e) => !isPast(e, now))
      .slice(0, CANDIDATES)
      .map((e) => {
        const b = eventBrief(e, ctx);
        return { id: b.id, title: b.title, category: b.category, club: b.club, date: b.date, time: b.time, seats_left: b.seats_left, registration_deadline: b.registration_deadline, status: b.status };
      });
  }
  let json = JSON.stringify(data);
  // Stay inside the server's limit: drop candidates first, then trim the plan.
  if (SNAPSHOT_TAG.length + json.length + 20 > MAX_SNAPSHOT_CHARS) {
    delete data.candidate_events;
    json = JSON.stringify(data);
  }
  return `${SNAPSHOT_TAG}${json}</du_lieu_rodemap>`;
}
