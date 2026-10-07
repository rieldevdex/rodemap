import { describe, expect, it } from 'vitest';
import { CATEGORY_LABELS } from './category-labels';
import { toMillis } from './dates';
import {
  DEFAULT_CALENDAR_NAME,
  ICS_MAX_LINE_OCTETS,
  buildIcs,
  escapeText,
  eventDetails,
  eventUrl,
  foldLine,
  icsFileName,
  icsLocalDateTime,
  icsUtcDateTime,
  utf8Length,
} from './ics';
import { makeEvent } from './test-fixtures';
import type { Club, SchoolEvent } from './types';

const now = toMillis('2026-10-14T09:00:00+07:00');
const encoder = new TextEncoder();
const octets = (s: string): number => encoder.encode(s).length;

const clubs: Club[] = [
  {
    id: 'tranh-bien',
    slug: 'tranh-bien',
    name: 'Câu lạc bộ Tranh biện',
    shortName: 'CLB Tranh biện',
    description: 'Câu lạc bộ phụ trách các hoạt động tranh biện.',
    categories: ['HT'],
    contact: '[Email câu lạc bộ]',
  },
];

const debate = makeEvent({
  id: 'ev-tranh-bien-1',
  slug: 'tranh-bien-mo-rong',
  title: 'Tranh biện mở rộng; vòng 1, khối 10',
  location: 'Phòng 204, nhà B',
  summary: 'Buổi tranh biện theo thể thức mở rộng.\nĐăng ký theo đội.',
});
const later = makeEvent({
  id: 'ev-cn-1',
  slug: 'hoi-thao-du-lieu',
  title: 'Hội thảo Dữ liệu',
  category: 'CN',
  clubId: 'clb-chua-co',
  location: '',
  start: '2026-10-20T17:00:00+07:00',
  end: '2026-10-20T19:00:00+07:00',
});

/** Undoes RFC 5545 folding. */
const unfold = (ics: string): string => ics.replace(/\r\n /g, '');
/** Undoes TEXT escaping. */
const unescapeText = (v: string): string =>
  v.replace(/\\([\\;,nN])/g, (_m, c: string) => (c === 'n' || c === 'N' ? '\n' : c));
/** Logical (unfolded) content lines. */
const logicalLines = (ics: string): string[] => unfold(ics).split('\r\n').slice(0, -1);
const prop = (ics: string, name: string): string[] =>
  logicalLines(ics)
    .filter((l) => l.startsWith(`${name}:`) || l.startsWith(`${name};`))
    .map((l) => l.slice(l.indexOf(':') + 1));

describe('date-time values', () => {
  it('formats Vietnam wall-clock and UTC stamps', () => {
    const t = toMillis('2026-10-14T16:45:00+07:00');
    expect(icsLocalDateTime(t)).toBe('20261014T164500');
    expect(icsUtcDateTime(t)).toBe('20261014T094500Z');
    // Just after midnight in Vietnam is still the previous day in UTC.
    expect(icsLocalDateTime(toMillis('2026-10-15T00:30:00+07:00'))).toBe('20261015T003000');
    expect(icsUtcDateTime(toMillis('2026-10-15T00:30:00+07:00'))).toBe('20261014T173000Z');
  });
});

describe('escapeText', () => {
  it('escapes backslash, semicolon, comma and every kind of line break', () => {
    expect(escapeText('a\\b;c,d\ne\r\nf\rg')).toBe('a\\\\b\\;c\\,d\\ne\\nf\\ng');
    expect(escapeText('Không có ký tự đặc biệt')).toBe('Không có ký tự đặc biệt');
  });
});

describe('utf8Length / foldLine', () => {
  it('counts UTF-8 octets per code point', () => {
    expect(utf8Length('a')).toBe(1);
    expect(utf8Length('ư')).toBe(2);
    expect(utf8Length('ạ')).toBe(3);
    expect(utf8Length(String.fromCodePoint(0x1d400))).toBe(4);
  });

  it('leaves lines of up to 75 octets alone', () => {
    const line = 'a'.repeat(ICS_MAX_LINE_OCTETS);
    expect(foldLine(line)).toBe(line);
    expect(foldLine('')).toBe('');
  });

  it('folds with CRLF + one space; continuation lines carry at most 74 octets', () => {
    const folded = foldLine('a'.repeat(150));
    expect(folded.split('\r\n')).toEqual(['a'.repeat(75), ` ${'a'.repeat(74)}`, ' a']);
  });

  it('never splits a multi-byte character', () => {
    expect(foldLine(`${'a'.repeat(74)}ạb`).split('\r\n')).toEqual(['a'.repeat(74), ' ạb']);
    const astral = String.fromCodePoint(0x1d400);
    const physical = foldLine(`${'a'.repeat(73)}${astral}${astral}`).split('\r\n');
    expect(physical).toEqual(['a'.repeat(73), ` ${astral}${astral}`]);
  });
});

describe('eventUrl / eventDetails', () => {
  it('joins the base URL and the event path, ignoring trailing slashes', () => {
    expect(eventUrl('https://rodemap.example', 'abc')).toBe('https://rodemap.example/su-kien/abc');
    expect(eventUrl('https://rodemap.example//', 'abc')).toBe('https://rodemap.example/su-kien/abc');
  });

  it('lists summary, organiser and link when known', () => {
    expect(eventDetails(debate, clubs, 'https://rodemap.example')).toBe(
      [
        debate.summary,
        'Đơn vị tổ chức: Câu lạc bộ Tranh biện',
        'Thông tin chi tiết: https://rodemap.example/su-kien/tranh-bien-mo-rong',
      ].join('\n'),
    );
    expect(eventDetails(later, clubs)).toBe(later.summary);
    expect(eventDetails(later, clubs, '')).toBe(later.summary);
  });
});

describe('buildIcs', () => {
  const ics = buildIcs([later, debate], { now, clubs, baseUrl: 'https://rodemap.example/' });

  it('ends every line, including the last, with CRLF and has no bare line breaks', () => {
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
  });

  it('writes the calendar header and the Asia/Ho_Chi_Minh VTIMEZONE', () => {
    expect(logicalLines(ics).slice(0, 16)).toEqual([
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Rodemap//Ban trinh dien//VI',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${DEFAULT_CALENDAR_NAME}`,
      'X-WR-TIMEZONE:Asia/Ho_Chi_Minh',
      'BEGIN:VTIMEZONE',
      'TZID:Asia/Ho_Chi_Minh',
      'BEGIN:STANDARD',
      'DTSTART:19700101T000000',
      'TZOFFSETFROM:+0700',
      'TZOFFSETTO:+0700',
      'TZNAME:ICT',
      'END:STANDARD',
      'END:VTIMEZONE',
    ]);
  });

  it('writes one VEVENT per event, sorted by start, with all properties', () => {
    const lines = logicalLines(ics);
    const first = lines.indexOf('BEGIN:VEVENT');
    expect(lines.slice(first, first + 11)).toEqual([
      'BEGIN:VEVENT',
      'UID:ev-tranh-bien-1@rodemap.app',
      'DTSTAMP:20261014T020000Z',
      'DTSTART;TZID=Asia/Ho_Chi_Minh:20261014T164500',
      'DTEND;TZID=Asia/Ho_Chi_Minh:20261014T181500',
      'SUMMARY:Tranh biện mở rộng\\; vòng 1\\, khối 10',
      'LOCATION:Phòng 204\\, nhà B',
      `DESCRIPTION:${escapeText(eventDetails(debate, clubs, 'https://rodemap.example'))}`,
      `CATEGORIES:${CATEGORY_LABELS.HT}`,
      'URL:https://rodemap.example/su-kien/tranh-bien-mo-rong',
      'END:VEVENT',
    ]);
    expect(prop(ics, 'UID')).toEqual(['ev-tranh-bien-1@rodemap.app', 'ev-cn-1@rodemap.app']);
    expect(lines.filter((l) => l === 'BEGIN:VEVENT')).toHaveLength(2);
    expect(lines.filter((l) => l === 'END:VEVENT')).toHaveLength(2);
  });

  it('omits LOCATION when empty and the organiser when the club is unknown', () => {
    const second = logicalLines(ics).slice(logicalLines(ics).lastIndexOf('BEGIN:VEVENT'));
    expect(second.some((l) => l.startsWith('LOCATION'))).toBe(false);
    expect(second).toContain(`CATEGORIES:${CATEGORY_LABELS.CN}`);
    expect(second.find((l) => l.startsWith('DESCRIPTION:'))).not.toContain('Đơn vị tổ chức');
  });

  it('omits URL and links without a base URL; escapes a custom calendar name', () => {
    const plain = buildIcs([debate], { now, clubs, calendarName: 'Lịch học kỳ I, khối 10' });
    expect(prop(plain, 'URL')).toEqual([]);
    expect(prop(plain, 'DESCRIPTION')[0]).not.toContain('Thông tin chi tiết');
    expect(prop(plain, 'X-WR-CALNAME')).toEqual(['Lịch học kỳ I\\, khối 10']);
  });

  it('writes an empty calendar when there are no events', () => {
    const empty = buildIcs([], { now, clubs });
    expect(empty).not.toContain('BEGIN:VEVENT');
    expect(logicalLines(empty).at(-1)).toBe('END:VCALENDAR');
  });

  it('is deterministic and keeps UIDs stable across calls, input order and edits', () => {
    expect(buildIcs([debate, later], { now, clubs, baseUrl: 'https://rodemap.example/' })).toBe(ics);
    const edited = buildIcs([{ ...debate, title: 'Tranh biện mở rộng (đã cập nhật)' }], { now, clubs });
    expect(prop(edited, 'UID')).toEqual(['ev-tranh-bien-1@rodemap.app']);
  });

  it('folds long Vietnamese text at 75 octets and unfolding restores the original', () => {
    const title =
      'Hội thảo chuyên đề phát triển kỹ năng nghiên cứu khoa học, tổng hợp tài liệu và trình bày kết quả; ' +
      'đồng thời hướng dẫn học sinh xây dựng đề cương nghiên cứu theo quy định của nhà trường \\ năm học 2026–2027';
    const summary = Array.from({ length: 6 }, () => 'Chương trình góp phần nâng cao năng lực tự học của học sinh.').join('\n');
    const long: SchoolEvent = { ...debate, title, summary };
    const out = buildIcs([long], { now, clubs, baseUrl: 'https://rodemap.example' });
    const physical = out.split('\r\n').slice(0, -1);
    for (const line of physical) expect(octets(line)).toBeLessThanOrEqual(ICS_MAX_LINE_OCTETS);
    expect(physical.some((l) => l.startsWith(' '))).toBe(true);
    expect(unescapeText(prop(out, 'SUMMARY')[0] ?? '')).toBe(title);
    expect(unescapeText(prop(out, 'DESCRIPTION')[0] ?? '')).toBe(eventDetails(long, clubs, 'https://rodemap.example'));
  });
});

describe('icsFileName', () => {
  it('uses the date in Vietnam', () => {
    expect(icsFileName(now)).toBe('rodemap-lich-ca-nhan-2026-10-14.ics');
    expect(icsFileName(toMillis('2026-10-15T00:30:00+07:00'))).toBe('rodemap-lich-ca-nhan-2026-10-15.ics');
  });
});
