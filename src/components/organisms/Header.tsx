import { useEffect, useId, useRef, useState } from 'react';
import type { Role } from '../../domain/types';
import { Link } from '../../router/Link';
import { useNavigate, useRoute } from '../../router/Router';
import { pathFor, type RouteName } from '../../router/routes';
import { useSelector } from '../../state/hooks';
import { Icon } from '../atoms/Icon';
import { Wordmark } from '../atoms/Wordmark';
import { AccountMenu } from './AccountMenu';
import { ThemeToggle } from './ThemeToggle';
import './Header.css';

interface NavItem {
  label: string;
  to: RouteName;
  /** Routes that belong to this section (the item is drawn active on all of them). */
  section: RouteName[];
  /** Shown only for this demo role. */
  role?: Role;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Tổng quan', to: 'dashboard', section: ['dashboard'] },
  { label: 'Khám phá', to: 'explore', section: ['explore', 'event'] },
  { label: 'Lộ trình', to: 'route', section: ['route'] },
  { label: 'Lịch', to: 'calendar', section: ['calendar'] },
  { label: 'Hồ sơ', to: 'portfolio', section: ['portfolio'] },
  { label: 'Câu lạc bộ', to: 'clubs', section: ['clubs', 'club'] },
  { label: 'Cổng CLB', to: 'clubPortal', section: ['clubPortal'], role: 'club' },
  { label: 'Kiểm duyệt', to: 'moderation', section: ['moderation'], role: 'moderator' },
];

/**
 * Site header (DESIGN.md §7): wordmark, primary nav, search, theme toggle, account.
 * The active section is marked by a 4-unit signal route segment on the header's rule.
 * Phones (< 720px) fold the nav into the "Danh mục" disclosure.
 */
export function Header() {
  const role = useSelector((s) => s.role);
  const route = useRoute();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const navId = `${useId()}-nav`;
  const explorePath = pathFor('explore');

  // Fold the phone menu after any navigation (derived during render, no effect needed).
  const [seenPath, setSeenPath] = useState(route.pathname);
  if (seenPath !== route.pathname) {
    setSeenPath(route.pathname);
    setMenuOpen(false);
  }

  // Ctrl K / ⌘K opens Khám phá sự kiện (the search lives there).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        navigate(explorePath);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [navigate, explorePath]);

  // Phone menu: Escape returns focus to "Danh mục"; a click outside the header folds it.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    };
    const onPointerDown = (e: PointerEvent) => {
      const header = headerRef.current;
      if (header && e.target instanceof Node && !header.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [menuOpen]);

  const items = NAV_ITEMS.filter((item) => item.role === undefined || item.role === role);

  return (
    <header className="site-header" ref={headerRef}>
      <div className="site-header__inner container">
        <Link to={pathFor('home')} className="site-header__brand" aria-label="Rodemap – Trang chủ">
          <Wordmark />
        </Link>

        <nav id={navId} className="site-nav" data-open={menuOpen} aria-label="Điều hướng chính">
          <ul className="site-nav__list">
            <li className="site-nav__item site-nav__item--search">
              <Link to={explorePath} className="site-nav__link" aria-current={false}>
                <Icon name="search" />
                <span>Tìm kiếm sự kiện</span>
              </Link>
            </li>
            {items.map((item) => {
              const exact = route.name === item.to;
              const active = item.section.includes(route.name);
              return (
                <li key={item.to} className="site-nav__item">
                  <Link
                    to={pathFor(item.to)}
                    className="site-nav__link"
                    data-active={active}
                    aria-current={exact ? 'page' : active ? 'true' : undefined}
                  >
                    <span className="site-nav__label">{item.label}</span>
                    <span className="site-nav__track" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="site-header__actions">
          <button
            type="button"
            className="site-header__search"
            onClick={() => {
              navigate(explorePath);
            }}
          >
            <Icon name="search" />
            <span className="site-header__search-label">Tìm kiếm</span>
            <kbd className="site-header__kbd">Ctrl K</kbd>
          </button>
          <ThemeToggle />
          <AccountMenu />
          <button
            ref={menuButtonRef}
            type="button"
            className="site-header__menu-button"
            aria-expanded={menuOpen}
            aria-controls={navId}
            onClick={() => {
              setMenuOpen((v) => !v);
            }}
          >
            <Icon name={menuOpen ? 'x' : 'menu'} />
            <span>Danh mục</span>
          </button>
        </div>
      </div>
    </header>
  );
}
