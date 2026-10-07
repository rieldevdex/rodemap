/** Formal Vietnamese labels for recommendation reasons and warnings ("Vì sao Mochi đề xuất"). */
import { CATEGORY_LABELS } from '../domain/category-labels';
import type { Recommendation, ReasonCode, WarningCode } from '../domain/types';
import { GOALS } from '../data/goals';

export const REASON_LABELS: Record<ReasonCode, string> = {
  top_interest: 'Thuộc lĩnh vực bạn ưu tiên',
  interest: 'Thuộc lĩnh vực bạn quan tâm',
  goal: 'Phù hợp với mục tiêu trong năm học',
  fits_time: 'Phù hợp với thời gian bạn có thể tham gia',
  balances_categories: 'Góp phần cân bằng các lĩnh vực trong lộ trình',
  deadline_soon: 'Hạn đăng ký sắp kết thúc',
  grade_eligible: 'Dành cho khối lớp của bạn',
};

export const WARNING_LABELS: Record<WarningCode, string> = {
  conflict: 'Trùng thời gian với sự kiện đã đăng ký',
  over_budget: 'Vượt quỹ giờ trong tuần',
  outside_availability: 'Ngoài thời gian bạn có thể tham gia',
  few_seats: 'Còn ít chỗ',
};

/** One line per reason, with details (rank, category, goals) where the recommendation carries them. */
export function describeReasons(rec: Recommendation): string[] {
  return rec.reasons.map((code) => {
    if (code === 'top_interest' && rec.topRank !== undefined) {
      return `${REASON_LABELS.top_interest} (ưu tiên ${rec.topRank}: ${CATEGORY_LABELS[rec.event.category]})`;
    }
    if (code === 'goal' && rec.matchedGoals && rec.matchedGoals.length > 0) {
      const names = rec.matchedGoals.map((id) => GOALS.find((g) => g.id === id)?.label ?? id);
      return `${REASON_LABELS.goal}: ${names.join('; ').toLocaleLowerCase('vi')}`;
    }
    return REASON_LABELS[code];
  });
}

export function describeWarnings(rec: Recommendation): string[] {
  return rec.warnings.map((code) => WARNING_LABELS[code]);
}
