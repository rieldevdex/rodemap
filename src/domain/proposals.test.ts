import { describe, expect, it } from 'vitest';
import { toMillis } from './dates';
import {
  ACTIVITY_STATUS_LABELS,
  activityProposalFromDraft,
  COLLABORATION_STATUS_LABELS,
  collaborationFromDraft,
  hasContactDetails,
  newestCollaborations,
  PROPOSAL_LIMITS,
  proposalMonthLabel,
  proposalMonths,
  proposalStatus,
  rankActivityProposals,
  responseError,
  supportCount,
  validateActivityDraft,
  validateCollaborationDraft,
} from './proposals';
import type { ActivityProposal, ActivityProposalDraft, CollaborationDraft, CollaborationProposal, ProposalResponse } from './types';

const now = toMillis('2026-10-07T09:00:00+07:00');
const clubs = new Set(['inkstep', 'robotics', 'toan-hoc']);

function proposal(overrides: Partial<ActivityProposal> = {}): ActivityProposal {
  return {
    id: 'dx-t01',
    title: 'Giải Cờ vua học sinh',
    category: 'TT',
    description: 'Đề xuất tổ chức giải Cờ vua dành cho học sinh toàn trường vào buổi chiều thứ Bảy.',
    grades: [6, 7],
    clubId: null,
    authorGrade: 7,
    submittedAt: '2026-10-01T19:00:00+07:00',
    supporters: 3,
    ...overrides,
  };
}

function collaboration(overrides: Partial<CollaborationProposal> = {}): CollaborationProposal {
  return {
    id: 'ht-t01',
    fromClubId: 'robotics',
    toClubId: 'inkstep',
    title: 'Ngày hội Công nghệ học đường',
    category: 'CN',
    description: 'Hai câu lạc bộ phối hợp tổ chức ngày hội trình diễn robot và sản phẩm học tập.',
    month: '2026-12',
    submittedAt: '2026-10-01T19:00:00+07:00',
    ...overrides,
  };
}

const accepted = (by = 'hdhs'): ProposalResponse => ({ status: 'accepted', at: '2026-10-05T16:00:00+07:00', by, note: '', assignedClubId: null });
const declined = (by = 'hdhs'): ProposalResponse => ({ status: 'declined', at: '2026-10-05T16:00:00+07:00', by, note: 'Chưa phù hợp với kế hoạch.', assignedClubId: null });

describe('labels', () => {
  it('names each status for students and for clubs', () => {
    expect(ACTIVITY_STATUS_LABELS).toEqual({ pending: 'Đang xem xét', accepted: 'Đã tiếp nhận', declined: 'Chưa tiếp nhận' });
    expect(COLLABORATION_STATUS_LABELS).toEqual({ pending: 'Chờ phản hồi', accepted: 'Đã đồng ý hợp tác', declined: 'Đã từ chối' });
  });
});

describe('contact details', () => {
  it('spots phone numbers and e-mail addresses', () => {
    expect(hasContactDetails('Liên hệ 0912345678 để trao đổi')).toBe(true);
    expect(hasContactDetails('Gọi +84 912 345 678')).toBe(true);
    expect(hasContactDetails('Gửi thư tới hocsinh@example.com')).toBe(true);
    expect(hasContactDetails('Giải đấu dành cho 120 học sinh khối 10–12 năm 2026')).toBe(false);
  });
});

describe('activity drafts', () => {
  const valid: ActivityProposalDraft = {
    title: 'Giải Cờ vua học sinh',
    category: 'TT',
    description: 'Đề xuất tổ chức giải Cờ vua dành cho học sinh toàn trường vào buổi chiều thứ Bảy.',
    grades: [6, 7],
    clubId: 'toan-hoc',
  };

  it('accepts a complete draft', () => {
    expect(validateActivityDraft(valid, clubs)).toEqual({});
    expect(validateActivityDraft({ ...valid, clubId: null }, clubs)).toEqual({});
  });

  it('reports every field', () => {
    const L = PROPOSAL_LIMITS;
    expect(validateActivityDraft({ title: 'Ngắn', category: null, description: 'Ngắn.', grades: [], clubId: 'khong-co' }, clubs)).toEqual({
      title: `Tên hoạt động cần có từ ${String(L.titleMin)} đến ${String(L.titleMax)} ký tự.`,
      category: 'Vui lòng chọn lĩnh vực.',
      description: `Phần mô tả cần có từ ${String(L.descriptionMin)} đến ${String(L.descriptionMax)} ký tự.`,
      grades: 'Vui lòng chọn ít nhất một khối dự kiến tham gia.',
      clubId: 'Câu lạc bộ đã chọn không tồn tại.',
    });
    expect(validateActivityDraft({ ...valid, category: 'XX' as never, grades: [5 as never] }, clubs)).toEqual({
      category: 'Vui lòng chọn lĩnh vực.',
      grades: 'Danh sách khối không hợp lệ.',
    });
  });

  it('refuses contact details', () => {
    const errors = validateActivityDraft({ ...valid, description: `${valid.description} Liên hệ 0912345678.` }, clubs);
    expect(errors.description).toBe('Vui lòng không ghi số điện thoại, địa chỉ thư điện tử hoặc thông tin cá nhân.');
  });

  it('builds the proposal: trimmed, grades sorted once, no supporters yet', () => {
    const p = activityProposalFromDraft({ ...valid, title: `  ${valid.title} `, grades: [7, 6, 7] }, { id: 'dx-n01', now, authorGrade: 8 });
    expect(p).toEqual({
      id: 'dx-n01',
      title: valid.title,
      category: 'TT',
      description: valid.description,
      grades: [6, 7],
      clubId: 'toan-hoc',
      authorGrade: 8,
      submittedAt: '2026-10-07T09:00:00+07:00',
      supporters: 0,
    });
    expect(activityProposalFromDraft({ ...valid, category: null }, { id: 'x', now, authorGrade: 8 }).category).toBe('TS');
  });
});

describe('collaboration drafts', () => {
  const valid: CollaborationDraft = {
    toClubId: 'inkstep',
    title: 'Ngày hội Công nghệ học đường',
    category: 'CN',
    description: 'Hai câu lạc bộ phối hợp tổ chức ngày hội trình diễn robot và sản phẩm học tập.',
    month: '2026-12',
  };
  const ctx = { fromClubId: 'robotics', knownClubIds: clubs, now };

  it('lists the months left in the school year', () => {
    const months = proposalMonths(now);
    expect(months[0]).toBe('2026-10');
    expect(months.at(-1)).toBe('2027-05');
    expect(months).toHaveLength(8);
    expect(proposalMonths(toMillis('2026-08-01T09:00:00+07:00'))[0]).toBe('2026-09');
    expect(proposalMonths(toMillis('2027-06-15T09:00:00+07:00'))).toEqual([]);
    expect(proposalMonthLabel('2027-01')).toBe('Tháng 1/2027');
  });

  it('accepts a complete draft', () => {
    expect(validateCollaborationDraft(valid, ctx)).toEqual({});
  });

  it('reports every field', () => {
    expect(validateCollaborationDraft({ toClubId: '', title: 'Ngắn', category: null, description: 'Ngắn.', month: '2026-09' }, ctx)).toEqual({
      toClubId: 'Vui lòng chọn câu lạc bộ đối tác.',
      title: 'Tên hoạt động cần có từ 8 đến 100 ký tự.',
      category: 'Vui lòng chọn lĩnh vực.',
      description: 'Nội dung hợp tác cần có từ 40 đến 600 ký tự.',
      month: 'Vui lòng chọn tháng dự kiến trong năm học.',
    });
    expect(validateCollaborationDraft({ ...valid, toClubId: 'robotics' }, ctx).toClubId).toBe('Câu lạc bộ đối tác cần khác câu lạc bộ gửi đề xuất.');
    expect(validateCollaborationDraft({ ...valid, category: 'XX' as never }, ctx).category).toBe('Vui lòng chọn lĩnh vực.');
  });

  it('builds the proposal from the sending club', () => {
    expect(collaborationFromDraft({ ...valid, title: ` ${valid.title} ` }, { id: 'ht-n01', now, fromClubId: 'robotics' })).toEqual({
      id: 'ht-n01',
      fromClubId: 'robotics',
      toClubId: 'inkstep',
      title: valid.title,
      category: 'CN',
      description: valid.description,
      month: '2026-12',
      submittedAt: '2026-10-07T09:00:00+07:00',
    });
    expect(collaborationFromDraft({ ...valid, category: null }, { id: 'x', now, fromClubId: 'robotics' }).category).toBe('TS');
  });
});

describe('answers', () => {
  it('requires a reason to decline and caps the note', () => {
    expect(responseError('declined', 'Ngắn')).toBe('Vui lòng nêu lý do, tối thiểu 10 ký tự.');
    expect(responseError('declined', 'Chưa phù hợp với kế hoạch.')).toBeNull();
    expect(responseError('accepted', '')).toBeNull();
    expect(responseError('accepted', 'a'.repeat(301))).toBe('Phần phản hồi tối đa 300 ký tự.');
  });

  it('reads the status of a proposal', () => {
    expect(proposalStatus('dx-t01', {})).toBe('pending');
    expect(proposalStatus('dx-t01', { 'dx-t01': accepted() })).toBe('accepted');
  });
});

describe('ordering and support', () => {
  it("adds the demo student's support", () => {
    expect(supportCount(proposal(), [])).toBe(3);
    expect(supportCount(proposal(), ['dx-t01'])).toBe(4);
  });

  it('puts pending first, then the most supported, then the newest', () => {
    const a = proposal({ id: 'a', supporters: 5 });
    const b = proposal({ id: 'b', supporters: 9 });
    const c = proposal({ id: 'c', supporters: 50 });
    const d = proposal({ id: 'd', supporters: 5, submittedAt: '2026-10-03T19:00:00+07:00' });
    const e = proposal({ id: 'e', supporters: 70 });
    const f = proposal({ id: 'f', supporters: 5 });
    const g = proposal({ id: 'g', supporters: 5 });
    const order = rankActivityProposals([g, a, b, c, d, e, f], { c: accepted(), e: declined() }, ['a']).map((p) => p.id);
    expect(order).toEqual(['b', 'a', 'd', 'f', 'g', 'c', 'e']);
  });

  it('lists collaborations newest first', () => {
    const older = collaboration({ id: 'b', submittedAt: '2026-09-01T19:00:00+07:00' });
    const newer = collaboration({ id: 'c' });
    const tie = collaboration({ id: 'a' });
    expect(newestCollaborations([older, newer, tie]).map((p) => p.id)).toEqual(['a', 'c', 'b']);
  });
});
