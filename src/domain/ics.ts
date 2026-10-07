/**
 * iCalendar (RFC 5545) export of the student's events, in Asia/Ho_Chi_Minh. Pure:
 * the same input always yields the same text (events sorted by start then id,
 * DTSTAMP from `opts.now`, UIDs derived from event ids).
 */
import { CATEGORY_LABELS } from './category-labels';
import { TIME_ZONE, VN_OFFSET_MS, toIsoDate } from './dates';
import { eventEnd, eventStart, sortByStart } from './events';
import type { Club, Millis, SchoolEvent } from './types';

export const ICS_PRODID = '-//Rodemap//Ban trinh dien//VI';
export const ICS_UID_DOMAIN = 'rodemap.app';
export const DEFAULT_CALENDAR_NAME = 'Lịch cá nhân Rodemap';
/** Maximum octets per physical content line, excluding the CRLF (RFC 5545 §3.1). */
export const ICS_MAX_LINE_OCTETS = 75;
const CRLF = '\r\n';

export interface IcsOptions {
  now: Millis;
  clubs: Club[];
  calendarName?: string;
  /** Site origin, e.g. "https://rodemap.example"; adds event links when given. */
  baseUrl?: string;
}

/** "2026-10-14T16:45:00.000Z" → "20261014T164500" */
function compactIso(iso: string): string {
  return iso.slice(0, 19).replace(/[-:]/g, '');
}

/** Vietnam wall-clock time "20261014T164500", for TZID-qualified values. */
export function icsLocalDateTime(ms: Millis): string {
  return compactIso(new Date(ms + VN_OFFSET_MS).toISOString());
}

/** UTC time "20261014T094500Z". */
export function icsUtcDateTime(ms: Millis): string {
  return `${compactIso(new Date(ms).toISOString())}Z`;
}

/** Escapes a TEXT value: backslash, semicolon, comma and line breaks (RFC 5545 §3.3.11). */
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/** UTF-8 octets of one code point (as produced by iterating a string). */
export function utf8Length(ch: string): number {
  if (ch.length > 1) return 4; // surrogate pair: a code point outside the BMP
  const code = ch.charCodeAt(0);
  if (code < 0x80) return 1;
  return code < 0x800 ? 2 : 3;
}

/**
 * Folds one content line so that no physical line exceeds 75 octets. Continuation lines
 * start with a single space (counted in the 75). Multi-byte characters are never split.
 */
export function foldLine(line: string): string {
  const parts: string[] = [];
  let current = '';
  let octets = 0;
  for (const ch of line) {
    const n = utf8Length(ch);
    if (octets + n > ICS_MAX_LINE_OCTETS) {
      parts.push(current);
      current = ' ';
      octets = 1;
    }
    current += ch;
    octets += n;
  }
  parts.push(current);
  return parts.join(CRLF);
}

/** Public page of an event: `${baseUrl}/su-kien/${slug}` (trailing slashes of baseUrl ignored). */
export function eventUrl(baseUrl: string, slug: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/su-kien/${slug}`;
}

/** Plain-text description shared by .ics and Google Calendar: summary, organiser, link. */
export function eventDetails(e: SchoolEvent, clubs: readonly Club[], baseUrl?: string): string {
  const lines = [e.summary];
  const club = clubs.find((c) => c.id === e.clubId);
  if (club) lines.push(`Đơn vị tổ chức: ${club.name}`);
  if (baseUrl) lines.push(`Thông tin chi tiết: ${eventUrl(baseUrl, e.slug)}`);
  return lines.join('\n');
}

function eventLines(e: SchoolEvent, stamp: string, opts: IcsOptions): string[] {
  const lines = [
    'BEGIN:VEVENT',
    `UID:${e.id}@${ICS_UID_DOMAIN}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;TZID=${TIME_ZONE}:${icsLocalDateTime(eventStart(e))}`,
    `DTEND;TZID=${TIME_ZONE}:${icsLocalDateTime(eventEnd(e))}`,
    `SUMMARY:${escapeText(e.title)}`,
  ];
  if (e.location.trim() !== '') lines.push(`LOCATION:${escapeText(e.location)}`);
  lines.push(`DESCRIPTION:${escapeText(eventDetails(e, opts.clubs, opts.baseUrl))}`);
  lines.push(`CATEGORIES:${escapeText(CATEGORY_LABELS[e.category])}`);
  if (opts.baseUrl) lines.push(`URL:${eventUrl(opts.baseUrl, e.slug)}`);
  lines.push('END:VEVENT');
  return lines;
}

/** A complete VCALENDAR with one VEVENT per event. Every line, including the last, ends with CRLF. */
export function buildIcs(events: SchoolEvent[], opts: IcsOptions): string {
  const stamp = icsUtcDateTime(opts.now);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${ICS_PRODID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(opts.calendarName ?? DEFAULT_CALENDAR_NAME)}`,
    `X-WR-TIMEZONE:${TIME_ZONE}`,
    'BEGIN:VTIMEZONE',
    `TZID:${TIME_ZONE}`,
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    'TZOFFSETFROM:+0700',
    'TZOFFSETTO:+0700',
    'TZNAME:ICT',
    'END:STANDARD',
    'END:VTIMEZONE',
  ];
  for (const e of sortByStart(events)) lines.push(...eventLines(e, stamp, opts));
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join(CRLF) + CRLF;
}

/** "rodemap-lich-ca-nhan-2026-10-14.ics" (date of `now` in Vietnam). */
export function icsFileName(now: Millis): string {
  return `rodemap-lich-ca-nhan-${toIsoDate(now)}.ics`;
}
