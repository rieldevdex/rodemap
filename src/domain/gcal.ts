/** Google Calendar public event-template link (no login, no OAuth). Pure. */
import { TIME_ZONE } from './dates';
import { eventEnd, eventStart } from './events';
import { eventDetails, icsLocalDateTime } from './ics';
import type { Club, SchoolEvent } from './types';

export const GOOGLE_CALENDAR_RENDER_URL = 'https://calendar.google.com/calendar/render';

/**
 * https://calendar.google.com/calendar/render?action=TEMPLATE&text=…&dates=YYYYMMDDTHHMMSS/…&ctz=Asia/Ho_Chi_Minh&details=…&location=…
 * `dates` holds Vietnam wall-clock times, interpreted in `ctz`.
 */
export function googleCalendarUrl(e: SchoolEvent, opts: { clubs: Club[]; baseUrl?: string }): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates: `${icsLocalDateTime(eventStart(e))}/${icsLocalDateTime(eventEnd(e))}`,
    ctz: TIME_ZONE,
    details: eventDetails(e, opts.clubs, opts.baseUrl),
    location: e.location,
  });
  return `${GOOGLE_CALENDAR_RENDER_URL}?${params.toString()}`;
}
