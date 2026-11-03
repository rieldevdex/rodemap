/**
 * Publishers on vsmcclubs and the wording that depends on their kind: student clubs, the Hội đồng
 * Học sinh and school offices such as Phòng Cố vấn Học tập. Pure.
 */
import type { Club, ClubKind, ClubLinkKind } from './types';

/** How a publisher is introduced on its own page and in the club list. */
export const CLUB_KIND_LABELS: Record<ClubKind, string> = {
  club: 'Câu lạc bộ',
  council: 'Tổ chức đại diện học sinh',
  office: 'Đơn vị của nhà trường',
};

/**
 * A student club. Only clubs may be named in a student's proposal, or send and receive a
 * collaboration proposal; the council and the offices publish but take no part in Đề xuất.
 */
export function isStudentClub(club: Pick<Club, 'kind'>): boolean {
  return club.kind === 'club';
}

/** The student clubs of a list, in list order. */
export function studentClubs<T extends Pick<Club, 'kind'>>(clubs: readonly T[]): T[] {
  return clubs.filter(isStudentClub);
}

/**
 * Label of the fact naming who stands behind an event: "Câu lạc bộ phụ trách" for a club,
 * "Đơn vị phụ trách" for the council or an office, "Nguồn thông tin" when the event is an
 * external competition relayed by its publisher. An unknown publisher reads as a club.
 */
export function publisherFactLabel(kind: ClubKind | undefined, external: boolean): string {
  if (external) return 'Nguồn thông tin';
  return kind === undefined || kind === 'club' ? 'Câu lạc bộ phụ trách' : 'Đơn vị phụ trách';
}

/** Network names as their owners write them. */
export const CLUB_LINK_LABELS: Record<ClubLinkKind, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
};

/** A placeholder in brackets ("[Email Hội đồng Học sinh]") stands in until the school provides an address. */
export function isPlaceholderEmail(email: string): boolean {
  return /^\[.+\]$/u.test(email.trim());
}

/** A real address the page may link with mailto:, or null for none or a placeholder. */
export function mailableEmail(club: Pick<Club, 'email'>): string | null {
  return club.email === undefined || isPlaceholderEmail(club.email) ? null : club.email;
}

/** True when the club has published neither an email address nor a page. */
export function hasNoContact(club: Pick<Club, 'email' | 'links'>): boolean {
  return club.email === undefined && club.links.length === 0;
}
