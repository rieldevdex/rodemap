import { describe, expect, it } from 'vitest';
import { toMillis } from './dates';
import {
  DEFAULT_PORTFOLIO_ROLE,
  attendedWithoutEntry,
  entryFromEvent,
  groupByCategory,
  hoursByCategory,
  pendingAttendance,
  portfolioJson,
  totalHours,
} from './portfolio';
import { makeEvent, makeProfile, reg } from './test-fixtures';
import type { Club, PortfolioEntry, SchoolEvent } from './types';

const now = toMillis('2026-10-20T09:00:00+07:00');

let n = 0;
const entry = (overrides: Partial<PortfolioEntry> = {}): PortfolioEntry => {
  n += 1;
  return {
    id: `pe-${String(n).padStart(2, '0')}`,
    eventId: `ev-${String(n)}`,
    category: 'HT',
    role: DEFAULT_PORTFOLIO_ROLE,
    hours: 1,
    reflection: '',
    reflectionSource: 'student',
    evidenceLinks: [],
    createdAt: '2026-10-15T09:00:00+07:00',
    updatedAt: '2026-10-15T09:00:00+07:00',
    ...overrides,
  };
};

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

const past = (id: string, day: string, extra: Partial<SchoolEvent> = {}): SchoolEvent =>
  makeEvent({ id, start: `2026-10-${day}T16:45:00+07:00`, end: `2026-10-${day}T18:15:00+07:00`, ...extra });

describe('hoursByCategory / totalHours / groupByCategory', () => {
  const entries = [
    entry({ id: 'x1', category: 'TN', hours: 0.1 }),
    entry({ id: 'x2', category: 'HT', hours: 1.5 }),
    entry({ id: 'x3', category: 'TN', hours: 0.2 }),
  ];

  it('totals hours per category with all seven keys, free of float noise', () => {
    expect(hoursByCategory(entries)).toEqual({ HT: 1.5, NT: 0, TT: 0, TN: 0.3, KN: 0, CN: 0, TS: 0 });
    expect(hoursByCategory([])).toEqual({ HT: 0, NT: 0, TT: 0, TN: 0, KN: 0, CN: 0, TS: 0 });
    expect(totalHours(entries)).toBe(1.8);
    expect(totalHours([])).toBe(0);
  });

  it('groups non-empty categories in CATEGORY_CODES order, keeping entry order', () => {
    expect(groupByCategory(entries).map((g) => [g.category, g.entries.map((e) => e.id), g.hours])).toEqual([
      ['HT', ['x2'], 1.5],
      ['TN', ['x1', 'x3'], 0.3],
    ]);
    expect(groupByCategory([])).toEqual([]);
  });
});

describe('entryFromEvent', () => {
  it('creates a student entry with the default role and the event hours', () => {
    const e = makeEvent({ id: 'ev-hp', category: 'TN' });
    expect(entryFromEvent(e, { id: 'pe-new', now })).toEqual({
      id: 'pe-new',
      eventId: 'ev-hp',
      category: 'TN',
      role: 'Thành viên tham gia',
      hours: 1.5,
      reflection: '',
      reflectionSource: 'student',
      evidenceLinks: [],
      createdAt: '2026-10-20T09:00:00+07:00',
      updatedAt: '2026-10-20T09:00:00+07:00',
    });
  });
});

describe('pendingAttendance / attendedWithoutEntry', () => {
  const events = [
    past('p-reg-late', '16'),
    past('p-reg', '12'),
    past('p-att', '13'),
    past('p-abs', '14'),
    past('p-reg-entry', '15'),
    past('p-none', '15'),
    past('p-att-entry', '11'),
    makeEvent({ id: 'future-reg', start: '2026-10-28T16:45:00+07:00', end: '2026-10-28T18:15:00+07:00' }),
  ];
  const regs = [
    reg('p-reg-late'),
    reg('p-reg'),
    reg('p-att', 'attended'),
    reg('p-abs', 'absent'),
    reg('p-reg-entry'),
    reg('p-att-entry', 'attended'),
    reg('future-reg'),
  ];
  const entries = [entry({ eventId: 'p-reg-entry' }), entry({ eventId: 'p-att-entry' })];

  it('lists past events still marked registered and without an entry, by start', () => {
    expect(pendingAttendance(events, regs, entries, now).map((e) => e.id)).toEqual(['p-reg', 'p-reg-late']);
    expect(pendingAttendance(events, regs, entries, toMillis('2026-10-01')).map((e) => e.id)).toEqual([]);
  });

  it('lists attended events without an entry', () => {
    expect(attendedWithoutEntry(events, regs, entries).map((e) => e.id)).toEqual(['p-att']);
    expect(attendedWithoutEntry(events, regs, [...entries, entry({ eventId: 'p-att' })])).toEqual([]);
  });
});

describe('portfolioJson', () => {
  const events = [
    past('ev-b', '12', { title: 'Tọa đàm hướng nghiệp', category: 'KN' }),
    past('ev-a', '05', { title: 'Tranh biện mở rộng' }),
    past('ev-c', '12', { title: 'Ngày hội tình nguyện', clubId: 'clb-khac', category: 'TN' }),
  ];
  const entries = [
    entry({ id: 'pe-z', eventId: 'ev-gone-2', category: 'NT', hours: 2 }),
    entry({ id: 'pe-c', eventId: 'ev-c', category: 'TN', hours: 3, evidenceLinks: ['https://example.org/anh'] }),
    entry({ id: 'pe-b', eventId: 'ev-b', category: 'KN', hours: 1.5, reflection: 'Bản nháp.', reflectionSource: 'mochi_draft' }),
    entry({ id: 'pe-a', eventId: 'ev-a', category: 'HT', hours: 1.5, reflection: 'Em đã chuẩn bị luận điểm.' }),
    entry({ id: 'pe-y', eventId: 'ev-gone-1', category: 'NT', hours: 1 }),
  ];
  const json = portfolioJson(entries, events, clubs, makeProfile(), now);

  it('exports version 1 with totals and only grade and class of the student', () => {
    expect(json.version).toBe(1);
    expect(json.generatedAt).toBe('2026-10-20T09:00:00+07:00');
    expect(json.student).toEqual({ grade: 11, className: '11A2' });
    expect(json.totals).toEqual({ hours: 9, byCategory: { HT: 1.5, NT: 3, TT: 0, TN: 3, KN: 1.5, CN: 0, TS: 0 } });
    expect(portfolioJson(entries, events, clubs, null, now).student).toBeNull();
  });

  it('lists entries chronologically, then by id, with unknown events last', () => {
    expect(json.entries.map((e) => e.event.title)).toEqual([
      'Tranh biện mở rộng',
      'Tọa đàm hướng nghiệp',
      'Ngày hội tình nguyện',
      'ev-gone-1',
      'ev-gone-2',
    ]);
  });

  it('describes each entry with event facts, reflection status and evidence', () => {
    expect(json.entries[0]).toEqual({
      event: { title: 'Tranh biện mở rộng', club: 'Câu lạc bộ Tranh biện', category: 'HT', date: '2026-10-05' },
      role: 'Thành viên tham gia',
      hours: 1.5,
      reflection: 'Em đã chuẩn bị luận điểm.',
      reflectionStatus: 'Do học sinh biên soạn',
      evidenceLinks: [],
    });
    expect(json.entries[1]?.reflectionStatus).toBe('Bản nháp do Mochi đề xuất');
    expect(json.entries[2]?.event).toEqual({ title: 'Ngày hội tình nguyện', club: null, category: 'TN', date: '2026-10-12' });
    expect(json.entries[2]?.evidenceLinks).toEqual(['https://example.org/anh']);
    expect(json.entries[2]?.evidenceLinks).not.toBe(entries[1]?.evidenceLinks);
    expect(json.entries[3]?.event).toEqual({ title: 'ev-gone-1', club: null, category: 'NT', date: null });
  });

  it('serialises to JSON without loss', () => {
    expect(JSON.parse(JSON.stringify(json))).toEqual(json);
  });
});
