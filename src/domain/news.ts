/** Bản tin Hội đồng Học sinh: publication, issues, search, related posts and the compose draft. Pure. */
import { formatMonthYear, SCHOOL_YEAR, toIsoDateTime, toMillis, vnParts } from './dates';
import { charCount, slugify } from './moderation';
import { matchesQuery } from './text';
import { NEWS_CATEGORIES, type Millis, type NewsBlock, type NewsCategory, type NewsDraft, type NewsPost } from './types';

export const NEWS_CATEGORY_LABELS: Record<NewsCategory, string> = {
  announcement: 'Thông báo',
  activity: 'Tin hoạt động',
  club: 'Câu lạc bộ',
  guide: 'Hướng dẫn',
};

export const NEWS_LIMITS = {
  titleMin: 8,
  titleMax: 120,
  summaryMin: 40,
  summaryMax: 300,
  bodyMin: 120,
  bodyMax: 6000,
  authorMax: 60,
  maxEvents: 4,
} as const;

/** Reading speed used for "đọc N phút". */
export const WORDS_PER_MINUTE = 200;

/** Path segments under /ban-tin that are pages, never article slugs. */
export const RESERVED_NEWS_SLUGS: readonly string[] = ['soan-bai'];

/* ── Text ───────────────────────────────────────────────────────────── */

/** Every text of the body in reading order, one block per line (search, reading time). */
export function newsBodyText(blocks: readonly NewsBlock[]): string {
  return blocks
    .map((b) => {
      if (b.kind === 'list') return b.items.join('\n');
      if (b.kind === 'quote') return `${b.text}\n${b.source}`;
      return b.text;
    })
    .join('\n');
}

/** Whole minutes to read title, summary and body at WORDS_PER_MINUTE; at least 1. */
export function readingMinutes(post: Pick<NewsPost, 'title' | 'summary' | 'body'>): number {
  const words = `${post.title} ${post.summary} ${newsBodyText(post.body)}`.split(/\s+/).filter((w) => w !== '').length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

const QUOTE_SOURCE = /\s+[—–-]\s+(?=[^—–-]+$)/;

/**
 * Parses the compose text: blank lines separate blocks; "## " starts a heading; consecutive
 * "- " lines form a list; "> " starts a quote whose source follows the last " — "; anything
 * else is a paragraph (its lines joined with spaces). Empty blocks are dropped.
 */
export function parseNewsBody(text: string): NewsBlock[] {
  const blocks: NewsBlock[] = [];
  for (const chunk of text.replace(/\r\n?/g, '\n').split(/\n\s*\n/)) {
    const lines = chunk
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l !== '');
    const first = lines[0];
    if (first === undefined) continue;
    if (first === '##' || first.startsWith('## ')) {
      blocks.push({ kind: 'heading', text: first.slice(2).trim() });
      const rest = lines.slice(1).join('\n');
      if (rest !== '') blocks.push(...parseNewsBody(rest));
    } else if (lines.every((l) => l === '-' || l.startsWith('- '))) {
      blocks.push({ kind: 'list', items: lines.map((l) => l.slice(1).trim()).filter((l) => l !== '') });
    } else if (first.startsWith('> ')) {
      const joined = lines.map((l) => (l.startsWith('> ') ? l.slice(2) : l).trim()).join(' ');
      const match = QUOTE_SOURCE.exec(joined);
      blocks.push(
        match
          ? { kind: 'quote', text: joined.slice(0, match.index).trim(), source: joined.slice(match.index + match[0].length).trim() }
          : { kind: 'quote', text: joined, source: '' },
      );
    } else {
      blocks.push({ kind: 'paragraph', text: lines.join(' ') });
    }
  }
  return blocks.filter((b) => (b.kind === 'list' ? b.items.length > 0 : b.text !== ''));
}

/** The compose text for a body: parseNewsBody(bodyToText(blocks)) gives the blocks back. */
export function bodyToText(blocks: readonly NewsBlock[]): string {
  return blocks
    .map((b) => {
      if (b.kind === 'heading') return `## ${b.text}`;
      if (b.kind === 'list') return b.items.map((i) => `- ${i}`).join('\n');
      if (b.kind === 'quote') return b.source === '' ? `> ${b.text}` : `> ${b.text} — ${b.source}`;
      return b.text;
    })
    .join('\n\n');
}

/* ── Publication ────────────────────────────────────────────────────── */

export function isPublished(post: NewsPost, now: Millis): boolean {
  return toMillis(post.publishedAt) <= now;
}

function newestFirst(a: NewsPost, b: NewsPost): number {
  return toMillis(b.publishedAt) - toMillis(a.publishedAt) || a.id.localeCompare(b.id);
}

/** Posts published at or before `now`, newest first (then id); a repeated id keeps its last copy. */
export function publishedPosts(posts: readonly NewsPost[], now: Millis): NewsPost[] {
  const byId = new Map(posts.map((p) => [p.id, p]));
  return [...byId.values()].filter((p) => isPublished(p, now)).sort(newestFirst);
}

/** The post that leads the index: the newest pinned one, otherwise the newest. */
export function leadPost(posts: readonly NewsPost[]): NewsPost | undefined {
  const sorted = [...posts].sort(newestFirst);
  return sorted.find((p) => p.pinned === true) ?? sorted[0];
}

/* ── Issues (one per month of the school year) ──────────────────────── */

export interface NewsIssue {
  /** "2026-10" */
  key: string;
  /** 1 for September of the school year, 2 for October… (at least 1). */
  number: number;
  /** "Tháng 10/2026" */
  label: string;
  posts: NewsPost[];
}

/** Issue number of the month containing `ms`, counted from the first month of SCHOOL_YEAR. */
export function issueNumber(ms: Millis): number {
  const p = vnParts(ms);
  const s = vnParts(toMillis(SCHOOL_YEAR.start));
  return Math.max(1, (p.year - s.year) * 12 + (p.month - s.month) + 1);
}

/** Posts grouped by month of publication, newest month first, posts newest first. */
export function groupByIssue(posts: readonly NewsPost[]): NewsIssue[] {
  const issues = new Map<string, NewsIssue>();
  for (const post of [...posts].sort(newestFirst)) {
    const ms = toMillis(post.publishedAt);
    const p = vnParts(ms);
    const key = `${String(p.year)}-${String(p.month).padStart(2, '0')}`;
    const issue = issues.get(key) ?? { key, number: issueNumber(ms), label: formatMonthYear(ms), posts: [] };
    issue.posts.push(post);
    issues.set(key, issue);
  }
  return [...issues.values()];
}

/* ── Search and relations ───────────────────────────────────────────── */

export interface NewsFilter {
  category: NewsCategory | null;
  query: string;
}

/** Category match, then every folded query token in title, summary, author or body. Order kept. */
export function filterPosts(posts: readonly NewsPost[], filter: NewsFilter): NewsPost[] {
  return posts.filter(
    (p) =>
      (filter.category === null || p.category === filter.category) &&
      matchesQuery(`${p.title}\n${p.summary}\n${p.author}\n${newsBodyText(p.body)}`, filter.query),
  );
}

/**
 * Other posts sharing events (2 points each), clubs (2 each) or the category (1), best first,
 * then newest; posts that share nothing are left out.
 */
export function relatedPosts(post: NewsPost, posts: readonly NewsPost[], limit = 3): NewsPost[] {
  return posts
    .filter((p) => p.id !== post.id)
    .map((p) => ({
      p,
      score:
        2 * p.eventIds.filter((id) => post.eventIds.includes(id)).length +
        2 * p.clubIds.filter((id) => post.clubIds.includes(id)).length +
        (p.category === post.category ? 1 : 0),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || newestFirst(a.p, b.p))
    .slice(0, Math.max(0, limit))
    .map((x) => x.p);
}

export function postsAboutEvent(posts: readonly NewsPost[], eventId: string): NewsPost[] {
  return posts.filter((p) => p.eventIds.includes(eventId));
}

export function postsAboutClub(posts: readonly NewsPost[], clubId: string): NewsPost[] {
  return posts.filter((p) => p.clubIds.includes(clubId));
}

/* ── Compose ────────────────────────────────────────────────────────── */

export type NewsDraftErrors = Partial<Record<keyof NewsDraft, string>>;

/** Formal Vietnamese messages per field; an empty object means the draft can be published. */
export function validateNewsDraft(d: NewsDraft, knownEventIds: ReadonlySet<string>): NewsDraftErrors {
  const L = NEWS_LIMITS;
  const errors: NewsDraftErrors = {};
  const title = charCount(d.title);
  if (title < L.titleMin || title > L.titleMax) errors.title = `Tiêu đề cần có từ ${String(L.titleMin)} đến ${String(L.titleMax)} ký tự.`;
  if (!(NEWS_CATEGORIES as readonly string[]).includes(d.category)) errors.category = 'Vui lòng chọn chuyên mục.';
  const author = charCount(d.author);
  if (author === 0 || author > L.authorMax) errors.author = 'Vui lòng chọn ban phụ trách bài viết.';
  const summary = charCount(d.summary);
  if (summary < L.summaryMin || summary > L.summaryMax) {
    errors.summary = `Phần tóm tắt cần có từ ${String(L.summaryMin)} đến ${String(L.summaryMax)} ký tự.`;
  }
  const body = charCount(newsBodyText(parseNewsBody(d.bodyText)));
  if (body < L.bodyMin || body > L.bodyMax) errors.bodyText = `Nội dung cần có từ ${String(L.bodyMin)} đến ${String(L.bodyMax)} ký tự.`;
  if (d.eventIds.length > L.maxEvents) {
    errors.eventIds = `Mỗi bài viết liên kết tối đa ${String(L.maxEvents)} sự kiện.`;
  } else if (d.eventIds.some((id) => !knownEventIds.has(id)) || new Set(d.eventIds).size !== d.eventIds.length) {
    errors.eventIds = 'Danh sách sự kiện liên quan không hợp lệ.';
  }
  return errors;
}

/** slugify(title), with "-2", "-3"… appended while it is taken or reserved. */
export function uniqueNewsSlug(title: string, taken: ReadonlySet<string>): string {
  const base = slugify(title);
  const used = (s: string) => taken.has(s) || RESERVED_NEWS_SLUGS.includes(s);
  if (!used(base)) return base;
  let n = 2;
  while (used(`${base}-${String(n)}`)) n += 1;
  return `${base}-${String(n)}`;
}

/** The published post for a valid draft; clubs come from the related events' organisers. */
export function postFromDraft(
  d: NewsDraft,
  opts: { id: string; now: Millis; takenSlugs: ReadonlySet<string>; clubOfEvent: (eventId: string) => string | undefined },
): NewsPost {
  const clubIds = [...new Set(d.eventIds.flatMap((id) => opts.clubOfEvent(id) ?? []))];
  return {
    id: opts.id,
    slug: uniqueNewsSlug(d.title, opts.takenSlugs),
    title: d.title.trim(),
    category: d.category,
    author: d.author.trim(),
    publishedAt: toIsoDateTime(opts.now),
    summary: d.summary.trim(),
    body: parseNewsBody(d.bodyText),
    eventIds: [...d.eventIds],
    clubIds,
  };
}
