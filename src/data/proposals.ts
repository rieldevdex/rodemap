// Dữ liệu chính thức của vsmcclubs. Cập nhật theo hướng dẫn tại README, mục 5.
import type { ActivityProposal, CollaborationProposal, ProposalResponse } from '../domain/types';

/** Students' proposals to Hội đồng Học sinh, as sent through Đề xuất (none yet; the sample ones were removed on 03/11/2026). */
export const ACTIVITY_PROPOSALS: ActivityProposal[] = [];

/** Clubs' proposals to organise an activity together (none yet). */
export const COLLABORATIONS: CollaborationProposal[] = [];

/** Answers already given (the answers given on this browser are kept in AppState). */
export const PROPOSAL_RESPONSES: Record<string, ProposalResponse> = {};
