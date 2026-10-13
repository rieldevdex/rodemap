import { describe, expect, it } from 'vitest';
import { CLUB_KIND_LABELS, isStudentClub, publisherFactLabel, studentClubs } from './clubs';
import type { ClubKind } from './types';

describe('club kinds', () => {
  const list: { id: string; kind: ClubKind }[] = [
    { id: 'hdhs', kind: 'council' },
    { id: 'co-van-hoc-tap', kind: 'office' },
    { id: 'inkstep', kind: 'club' },
    { id: 'tranh-bien', kind: 'club' },
  ];

  it('labels every kind', () => {
    expect(CLUB_KIND_LABELS).toEqual({ club: 'Câu lạc bộ', council: 'Tổ chức đại diện học sinh', office: 'Đơn vị của nhà trường' });
  });

  it('keeps only student clubs, in order', () => {
    expect(isStudentClub({ kind: 'club' })).toBe(true);
    expect(isStudentClub({ kind: 'council' })).toBe(false);
    expect(isStudentClub({ kind: 'office' })).toBe(false);
    expect(studentClubs(list).map((c) => c.id)).toEqual(['inkstep', 'tranh-bien']);
    expect(list).toHaveLength(4);
  });

  it('names who stands behind an event', () => {
    expect(publisherFactLabel('club', false)).toBe('Câu lạc bộ phụ trách');
    expect(publisherFactLabel(undefined, false)).toBe('Câu lạc bộ phụ trách');
    expect(publisherFactLabel('council', false)).toBe('Đơn vị phụ trách');
    expect(publisherFactLabel('office', false)).toBe('Đơn vị phụ trách');
    expect(publisherFactLabel('office', true)).toBe('Nguồn thông tin');
    expect(publisherFactLabel(undefined, true)).toBe('Nguồn thông tin');
  });
});
