/**
 * Rodemap domain types. Pure data shapes shared by data, domain, state, mochi
 * and UI layers. No React, no DOM.
 */

/* ── Categories ─────────────────────────────────────────────────────── */

export const CATEGORY_CODES = ['HT', 'NT', 'TT', 'TN', 'KN', 'CN', 'TS'] as const;
export type CategoryCode = (typeof CATEGORY_CODES)[number];

export interface Category {
  code: CategoryCode;
  /** UI label, e.g. "Học thuật". */
  name: string;
  /** One formal sentence describing the line. */
  description: string;
}

/* ── Time ───────────────────────────────────────────────────────────── */

/** ISO 8601 date-time with explicit +07:00 offset, e.g. "2026-10-14T14:30:00+07:00". */
export type IsoDateTime = string;
/** Calendar date "YYYY-MM-DD" in Asia/Ho_Chi_Minh. */
export type IsoDate = string;
/** Epoch milliseconds. */
export type Millis = number;

/* ── Clubs and events ───────────────────────────────────────────────── */

/** Khối 6–9 (trung học cơ sở) and 10–12 (trung học phổ thông). */
export type Grade = 6 | 7 | 8 | 9 | 10 | 11 | 12;
export const GRADES: readonly Grade[] = [6, 7, 8, 9, 10, 11, 12];
export const GRADE_LEVELS: readonly { name: string; grades: readonly Grade[] }[] = [
  { name: 'Trung học cơ sở', grades: [6, 7, 8, 9] },
  { name: 'Trung học phổ thông', grades: [10, 11, 12] },
];

export interface Club {
  id: string;
  /** ASCII slug used in URLs. */
  slug: string;
  /** Full name, e.g. "Câu lạc bộ Tranh biện". */
  name: string;
  /** Short name, e.g. "CLB Tranh biện". */
  shortName: string;
  description: string;
  categories: CategoryCode[];
  /** Placeholder contact, e.g. "[Email câu lạc bộ]". */
  contact: string;
}

export type EventFormat = 'in_person' | 'online';
export type EventStatus = 'draft' | 'pending' | 'approved' | 'changes_requested' | 'rejected';

/**
 * A school event. Named SchoolEvent (the prompt's `Event`) to avoid shadowing
 * the DOM `Event` type.
 */
export interface SchoolEvent {
  id: string;
  /** ASCII slug used in URLs. */
  slug: string;
  title: string;
  clubId: string;
  category: CategoryCode;
  format: EventFormat;
  start: IsoDateTime;
  end: IsoDateTime;
  location: string;
  eligibleGrades: Grade[];
  capacity: number;
  /** Seats taken by other students (the demo student is not counted). */
  seatsTaken: number;
  registrationDeadline: IsoDateTime;
  /** Mochi's 2–3 sentence summary, formal Vietnamese. */
  summary: string;
  description: string;
  /** Tag ids from src/data/tags.ts. */
  tags: string[];
  status: EventStatus;
}

/** "Kiểm tra định kỳ" zones and holidays drawn on the RouteMap. */
export interface CalendarPeriod {
  id: string;
  kind: 'exam' | 'holiday';
  label: string;
  start: IsoDate;
  /** Inclusive. */
  end: IsoDate;
}

export interface Tag {
  id: string;
  label: string;
}

/* ── Student ────────────────────────────────────────────────────────── */

export type GoalId =
  | 'leadership'
  | 'study_abroad'
  | 'volunteering'
  | 'fitness'
  | 'academic'
  | 'career'
  | 'arts'
  | 'technology';

export interface Goal {
  id: GoalId;
  label: string;
  /** Tag ids that signal an event serves this goal. */
  tags: string[];
}

export interface Availability {
  /** Monday–Friday, from 16:30. */
  weekdayAfterSchool: boolean;
  /** Saturday and Sunday, all day. */
  weekend: boolean;
}

export interface Profile {
  grade: Grade;
  /** e.g. "11A2". */
  className: string;
  interests: CategoryCode[];
  /** Ordered, at most 3, subset of interests. */
  topInterests: CategoryCode[];
  goals: GoalId[];
  availability: Availability;
  /** Hours per ISO week (Mon–Sun). */
  weeklyHourBudget: number;
  onboardedAt: IsoDateTime;
}

export type RegistrationStatus = 'registered' | 'attended' | 'absent';

export interface Registration {
  eventId: string;
  registeredAt: IsoDateTime;
  status: RegistrationStatus;
}

export type ReflectionSource = 'student' | 'mochi_draft';

export interface PortfolioEntry {
  id: string;
  eventId: string;
  category: CategoryCode;
  /** e.g. "Thành viên tham gia", "Trưởng nhóm hậu cần". */
  role: string;
  hours: number;
  reflection: string;
  /** 'mochi_draft' until the student edits the text. */
  reflectionSource: ReflectionSource;
  evidenceLinks: string[];
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

/* ── Clubs and moderation ───────────────────────────────────────────── */

export type Role = 'student' | 'club' | 'moderator';
export type ReviewActor = 'club' | 'hdhs';
export type ReviewAction = 'submit' | 'resubmit' | 'approve' | 'request_changes' | 'reject';

export interface ReviewNote {
  at: IsoDateTime;
  actor: ReviewActor;
  action: ReviewAction;
  /** Required for request_changes and reject. */
  reason?: string;
}

export interface Submission {
  id: string;
  eventId: string;
  clubId: string;
  submittedAt: IsoDateTime;
  history: ReviewNote[];
}

/** Fields a club fills in the submission form. */
export type EventDraft = Omit<SchoolEvent, 'id' | 'slug' | 'status' | 'seatsTaken'>;

/* ── Derived ────────────────────────────────────────────────────────── */

export type ReasonCode =
  | 'top_interest'
  | 'interest'
  | 'goal'
  | 'grade_eligible'
  | 'fits_time'
  | 'balances_categories'
  | 'deadline_soon';

export type WarningCode = 'conflict' | 'over_budget' | 'outside_availability' | 'few_seats';

export interface Recommendation {
  event: SchoolEvent;
  score: number;
  /** Ordered by importance; drives "Vì sao Mochi đề xuất". */
  reasons: ReasonCode[];
  warnings: WarningCode[];
  /** For 'top_interest': 1-based rank of the matched category. */
  topRank?: number;
  /** For 'goal': matched goal ids. */
  matchedGoals?: GoalId[];
}

export interface Conflict {
  /** Event ids, a < b by start then id. */
  a: string;
  b: string;
  overlapMinutes: number;
}

export type ThemePreference = 'system' | 'light' | 'dark';

/* ── Council newsletter (Bản tin Hội đồng Học sinh) ────────────────── */

export const NEWS_CATEGORIES = ['announcement', 'activity', 'club', 'guide'] as const;
/** Thông báo, Tin hoạt động, Câu lạc bộ, Hướng dẫn. */
export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

/** One block of an article body. */
export type NewsBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'heading'; text: string }
  | { kind: 'list'; items: string[] }
  /** Attributed to a role ("Đại diện Ban chủ nhiệm CLB Tranh biện"), never to a named student. */
  | { kind: 'quote'; text: string; source: string };

/** An article written by the Hội đồng Học sinh. */
export interface NewsPost {
  id: string;
  /** ASCII slug used in URLs (/ban-tin/<slug>). */
  slug: string;
  title: string;
  category: NewsCategory;
  /** The council department that wrote it, e.g. "Ban Truyền thông". Never a student's name. */
  author: string;
  publishedAt: IsoDateTime;
  /** One or two sentences shown on the index and as the article lead. */
  summary: string;
  body: NewsBlock[];
  /** Related events (ids in EVENTS or submitted events). */
  eventIds: string[];
  /** Related clubs (ids in CLUBS). */
  clubIds: string[];
  /** Pinned posts lead the index while they are published. */
  pinned?: boolean;
}

/** Fields the council fills in Soạn bài viết. */
export interface NewsDraft {
  title: string;
  category: NewsCategory;
  author: string;
  summary: string;
  /** Plain text: blank lines separate paragraphs, "## " starts a heading, "- " a list item, "> " a quote. */
  bodyText: string;
  eventIds: string[];
}
