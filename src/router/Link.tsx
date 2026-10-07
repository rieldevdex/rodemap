import type { AnchorHTMLAttributes, MouseEvent, Ref } from 'react';
import { useNavigate, useRoute } from './Router';
import { normalizePath } from './routes';

export type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  /** In-app path ("/kham-pha?q=tranh"), hash ("#muc-2") or an external URL. */
  to: string;
  ref?: Ref<HTMLAnchorElement>;
};

const SCHEME_RE = /^[a-z][a-z\d+.-]*:/i;

/** External URLs, protocol-relative URLs and mailto:/tel: links are left to the browser. */
export function isExternalHref(to: string): boolean {
  return SCHEME_RE.test(to) || to.startsWith('//');
}

function isPlainLeftClick(e: MouseEvent<HTMLAnchorElement>): boolean {
  return e.button === 0 && !e.metaKey && !e.altKey && !e.ctrlKey && !e.shiftKey;
}

/**
 * An <a> that navigates with the History API. Marks itself aria-current="page" when its
 * path is the current page (pass aria-current explicitly to override). Modifier clicks,
 * middle clicks, target="_blank", downloads and external links behave natively.
 */
export function Link({ to, onClick, target, rel, ref, children, ...rest }: LinkProps) {
  const navigate = useNavigate();
  const route = useRoute();
  const external = isExternalHref(to);
  const hashOnly = to.startsWith('#');
  const active = !external && !hashOnly && normalizePath(to) === route.pathname;
  const ariaCurrent = rest['aria-current'] ?? (active ? 'page' : undefined);
  const safeRel = target === '_blank' && rel === undefined ? 'noopener noreferrer' : rel;

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || external || hashOnly) return;
    if (!isPlainLeftClick(e)) return;
    if (target !== undefined && target !== '_self') return;
    if (rest.download !== undefined) return;
    e.preventDefault();
    navigate(to);
  };

  return (
    <a {...rest} ref={ref} href={to} target={target} rel={safeRel} aria-current={ariaCurrent} onClick={handleClick}>
      {children}
    </a>
  );
}
