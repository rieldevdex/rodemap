import { describe, expect, it } from 'vitest';
import { GOOGLE_CALENDAR_RENDER_URL, googleCalendarUrl } from './gcal';
import { makeEvent } from './test-fixtures';
import type { Club } from './types';

const clubs: Club[] = [
  {
    id: 'tranh-bien',
    kind: 'club',
    slug: 'tranh-bien',
    name: 'Câu lạc bộ Tranh biện',
    shortName: 'CLB Tranh biện',
    description: 'Câu lạc bộ phụ trách các hoạt động tranh biện.',
    categories: ['HT'],
    links: [],
  },
];

const event = makeEvent({
  id: 'ev-tb-2',
  slug: 'tranh-bien-chuyen-de',
  title: 'Tranh biện chuyên đề & thực hành',
  location: 'Phòng 204, nhà B',
  summary: 'Buổi tranh biện theo chuyên đề môi trường.',
});

describe('googleCalendarUrl', () => {
  it('adds a date-only event as an all-day entry', () => {
    const day = makeEvent({ dateOnly: true, start: '2027-01-30T00:00:00+07:00', end: '2027-01-31T00:00:00+07:00' });
    expect(new URL(googleCalendarUrl(day, { clubs })).searchParams.get('dates')).toBe('20270130/20270131');
  });

  it('builds a TEMPLATE link with Vietnam wall-clock dates and ctz', () => {
    const url = new URL(googleCalendarUrl(event, { clubs, baseUrl: 'https://vsmcclubs.site' }));
    expect(`${url.origin}${url.pathname}`).toBe(GOOGLE_CALENDAR_RENDER_URL);
    expect(url.searchParams.get('action')).toBe('TEMPLATE');
    expect(url.searchParams.get('text')).toBe('Tranh biện chuyên đề & thực hành');
    expect(url.searchParams.get('dates')).toBe('20261014T164500/20261014T181500');
    expect(url.searchParams.get('ctz')).toBe('Asia/Ho_Chi_Minh');
    expect(url.searchParams.get('location')).toBe('Phòng 204, nhà B');
    expect(url.searchParams.get('details')).toBe(
      [
        'Buổi tranh biện theo chuyên đề môi trường.',
        'Đơn vị tổ chức: Câu lạc bộ Tranh biện',
        'Thông tin chi tiết: https://vsmcclubs.site/su-kien/tranh-bien-chuyen-de',
      ].join('\n'),
    );
  });

  it('percent-encodes every value (ASCII-only link, & kept inside the title)', () => {
    const raw = googleCalendarUrl(event, { clubs });
    expect(raw).toMatch(/^[\x21-\x7e]+$/);
    expect(raw.startsWith(`${GOOGLE_CALENDAR_RENDER_URL}?action=TEMPLATE&text=`)).toBe(true);
    expect(new URL(raw).searchParams.getAll('text')).toHaveLength(1);
  });

  it('leaves the link out of the details without a base URL', () => {
    const details = new URL(googleCalendarUrl(event, { clubs })).searchParams.get('details');
    expect(details).toBe('Buổi tranh biện theo chuyên đề môi trường.\nĐơn vị tổ chức: Câu lạc bộ Tranh biện');
  });
});
