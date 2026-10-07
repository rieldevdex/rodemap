import { useEffect, useId, useRef, useState } from 'react';
import { CLUBS } from '../../data/clubs';
import { formatDate, SCHOOL_YEAR, toMillis } from '../../domain/dates';
import type { IsoDate, Role } from '../../domain/types';
import { useRoute } from '../../router/Router';
import { useAppState, useDispatch } from '../../state/hooks';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { VisuallyHidden } from '../atoms/VisuallyHidden';
import './AccountMenu.css';

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'student', label: 'Học sinh' },
  { value: 'club', label: 'Câu lạc bộ' },
  { value: 'moderator', label: 'HĐHS' },
];

const THEME_LABEL = { system: 'Theo cài đặt hệ thống', light: 'Giao diện sáng', dark: 'Giao diện tối' } as const;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** "14/10/2026", or null when the stored value is not a valid date. */
function demoDateLabel(date: IsoDate): string | null {
  if (!ISO_DATE_RE.test(date)) return null;
  try {
    return formatDate(toMillis(date));
  } catch {
    return null;
  }
}

type FocusTarget = 'confirm' | 'reset' | null;

/**
 * "Tài khoản minh họa": the demo control panel (role, club, demo date, Mochi offline,
 * theme, reset). A disclosure: Escape or a click outside closes it; Escape returns focus
 * to the button.
 */
export function AccountMenu() {
  const state = useAppState();
  const dispatch = useDispatch();
  const { pathname } = useRoute();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [status, setStatus] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const resetRef = useRef<HTMLButtonElement>(null);
  const focusAfterRender = useRef<FocusTarget>(null);
  const uid = useId();
  const panelId = `${uid}-panel`;
  const titleId = `${uid}-title`;
  const clubId = `${uid}-club`;
  const dateId = `${uid}-date`;
  const dateHelpId = `${uid}-date-help`;
  const confirmTextId = `${uid}-confirm`;

  // Close on navigation (derived from the previous path during render).
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setOpen(false);
    setConfirming(false);
    setStatus('');
  }

  useEffect(() => {
    if (!open) return undefined;
    const close = (returnFocus: boolean) => {
      setOpen(false);
      setConfirming(false);
      setStatus('');
      if (returnFocus) buttonRef.current?.focus();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      close(true);
    };
    const onPointerDown = (e: PointerEvent) => {
      const root = rootRef.current;
      if (root && e.target instanceof Node && !root.contains(e.target)) close(false);
    };
    const onFocusOut = (e: FocusEvent) => {
      const root = rootRef.current;
      if (root && e.relatedTarget instanceof Node && !root.contains(e.relatedTarget)) close(false);
    };
    const root = rootRef.current;
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    root?.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
      root?.removeEventListener('focusout', onFocusOut);
    };
  }, [open]);

  // Keep keyboard focus on the reset step that replaced the focused button.
  useEffect(() => {
    const target = focusAfterRender.current;
    focusAfterRender.current = null;
    if (target === 'confirm') confirmRef.current?.focus();
    else if (target === 'reset') resetRef.current?.focus();
  }, [confirming]);

  const toggle = () => {
    if (open) {
      setOpen(false);
      setConfirming(false);
      setStatus('');
    } else {
      setOpen(true);
    }
  };

  const startReset = () => {
    setStatus('');
    focusAfterRender.current = 'confirm';
    setConfirming(true);
  };

  const cancelReset = () => {
    focusAfterRender.current = 'reset';
    setConfirming(false);
  };

  const confirmReset = () => {
    dispatch({ type: 'demo/reset' });
    focusAfterRender.current = 'reset';
    setConfirming(false);
    setStatus('Đã khôi phục dữ liệu minh họa.');
  };

  const dateLabel = state.demoToday === null ? null : demoDateLabel(state.demoToday);

  return (
    <div className="account-menu" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="account-menu__button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
      >
        <Icon name="user" />
        <VisuallyHidden>Tài khoản minh họa</VisuallyHidden>
        <Icon name="chevron-down" size="sm" className="account-menu__chevron" />
      </button>

      {open ? (
        <div id={panelId} className="account-menu__panel" role="group" aria-labelledby={titleId}>
          <div className="account-menu__head">
            <p className="account-menu__title" id={titleId}>
              Tài khoản minh họa
            </p>
            <span className="account-menu__badge">Tính năng trình diễn</span>
          </div>
          <p className="account-menu__note">
            Các thiết lập dưới đây phục vụ bản trình diễn và chỉ được lưu trên trình duyệt này.
          </p>

          <fieldset className="account-menu__section">
            <legend className="account-menu__label">Vai trò trình diễn</legend>
            <div className="account-menu__roles">
              {ROLE_OPTIONS.map((option) => (
                <label key={option.value} className="account-menu__role">
                  <input
                    type="radio"
                    name={`${uid}-role`}
                    value={option.value}
                    checked={state.role === option.value}
                    onChange={() => {
                      dispatch({ type: 'role/set', role: option.value });
                    }}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {state.role === 'club' ? (
            <div className="account-menu__section">
              <label className="account-menu__label" htmlFor={clubId}>
                Câu lạc bộ phụ trách
              </label>
              <select
                id={clubId}
                className="account-menu__control"
                value={state.activeClubId}
                onChange={(e) => {
                  dispatch({ type: 'club/setActive', clubId: e.target.value });
                }}
              >
                {CLUBS.map((club) => (
                  <option key={club.id} value={club.id}>
                    {club.shortName}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="account-menu__section">
            <label className="account-menu__label" htmlFor={dateId}>
              Ngày minh họa
            </label>
            <div className="account-menu__row">
              <input
                id={dateId}
                type="date"
                className="account-menu__control"
                value={state.demoToday ?? ''}
                min={SCHOOL_YEAR.start}
                max={SCHOOL_YEAR.end}
                aria-describedby={dateHelpId}
                onChange={(e) => {
                  const value = e.target.value;
                  dispatch({ type: 'demo/setToday', date: value === '' ? null : value });
                }}
              />
              {state.demoToday === null ? null : (
                <Button
                  variant="quiet"
                  size="sm"
                  onClick={() => {
                    dispatch({ type: 'demo/setToday', date: null });
                  }}
                >
                  Theo ngày thực tế
                </Button>
              )}
            </div>
            <p className="account-menu__help" id={dateHelpId}>
              {dateLabel === null
                ? 'Để trống để theo ngày thực tế.'
                : `Rodemap đang hiển thị dữ liệu theo ngày ${dateLabel}.`}
            </p>
          </div>

          <div className="account-menu__section">
            <label className="account-menu__check">
              <input
                type="checkbox"
                checked={state.mochiForcedOffline}
                onChange={(e) => {
                  dispatch({ type: 'demo/setMochiOffline', offline: e.target.checked });
                }}
              />
              <span>Buộc Mochi hoạt động ngoại tuyến</span>
            </label>
          </div>

          <div className="account-menu__section">
            <p className="account-menu__label">Giao diện</p>
            <div className="account-menu__row account-menu__row--wrap" role="group" aria-label="Chọn giao diện">
              {(['light', 'dark', 'system'] as const).map((theme) => (
                <Button
                  key={theme}
                  variant="secondary"
                  size="sm"
                  aria-pressed={state.theme === theme}
                  onClick={() => {
                    dispatch({ type: 'theme/set', theme });
                  }}
                >
                  {THEME_LABEL[theme]}
                </Button>
              ))}
            </div>
          </div>

          <div className="account-menu__section account-menu__section--reset">
            {confirming ? (
              <div className="account-menu__confirm" role="group" aria-labelledby={confirmTextId}>
                <p id={confirmTextId} className="account-menu__confirm-text">
                  Hồ sơ, đăng ký, hồ sơ năng lực và sự kiện đã gửi trên trình duyệt này sẽ trở về dữ liệu minh họa ban
                  đầu. Bạn xác nhận khôi phục?
                </p>
                <div className="account-menu__row">
                  <Button ref={confirmRef} variant="primary" size="sm" onClick={confirmReset}>
                    Xác nhận khôi phục
                  </Button>
                  <Button variant="secondary" size="sm" onClick={cancelReset}>
                    Hủy
                  </Button>
                </div>
              </div>
            ) : (
              <Button ref={resetRef} variant="secondary" size="sm" block onClick={startReset}>
                Khôi phục dữ liệu minh họa
              </Button>
            )}
            <p className="account-menu__status" role="status">
              {status}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
