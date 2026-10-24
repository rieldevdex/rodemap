import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import type { AppearanceMode, TextDensity, ThemePreference } from '../../domain/types';
import { useRoute } from '../../router/Router';
import { useAppearance } from '../../state/useAppearance';
import { Icon, type IconName } from '../atoms/Icon';
import { VisuallyHidden } from '../atoms/VisuallyHidden';
import './AppearancePicker.css';

const MODES: { value: AppearanceMode; name: string; text: string }[] = [
  { value: 'lo-trinh', name: 'Lộ trình', text: 'Bản đồ tuyến, màu tiêu chuẩn' },
  { value: 'ruc-ro', name: 'Rực rỡ', text: 'Mảng màu lớn, tương phản mạnh' },
  { value: 'ap-phich', name: 'Áp phích', text: 'Hai màu mực, chữ khổ hẹp' },
  { value: 'diu-nhe', name: 'Dịu nhẹ', text: 'Màu trầm, góc bo mềm' },
];

const THEMES: { value: ThemePreference; name: string; icon: IconName }[] = [
  { value: 'system', name: 'Theo hệ thống', icon: 'monitor' },
  { value: 'light', name: 'Sáng', icon: 'sun' },
  { value: 'dark', name: 'Tối', icon: 'moon' },
];

const DENSITIES: { value: TextDensity; name: string; text: string }[] = [
  { value: 'full', name: 'Đầy đủ', text: 'Hiển thị toàn bộ nội dung và hướng dẫn.' },
  { value: 'compact', name: 'Gọn', text: 'Rút gọn phần giới thiệu, giữ thông tin chính.' },
  { value: 'minimal', name: 'Tối giản', text: 'Chỉ giữ tiêu đề, thông tin và thao tác.' },
];

/** Each swatch shows the mode's ground, signal and first colour block side by side. */
function swatchStyle(mode: AppearanceMode): CSSProperties {
  return {
    '--sw-1': `var(--preview-${mode}-1)`,
    '--sw-2': `var(--preview-${mode}-2)`,
    '--sw-3': `var(--preview-${mode}-3)`,
  } as CSSProperties;
}

/**
 * "Giao diện" (DESIGN.md §7.3): a non-modal panel with three radio groups (Chế độ màu, Độ sáng,
 * Mật độ nội dung). Arrow keys move within a group; Escape or a click outside closes the panel
 * and Escape returns focus to the button. Choices apply at once and are kept on this device.
 */
export function AppearancePicker() {
  const { mode, theme, density, setMode, setTheme, setDensity } = useAppearance();
  const { pathname } = useRoute();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const uid = useId();
  const panelId = `${uid}-panel`;
  const titleId = `${uid}-title`;

  // Close on navigation (derived from the previous path during render).
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    };
    const onPointerDown = (e: PointerEvent) => {
      const root = rootRef.current;
      if (root && e.target instanceof Node && !root.contains(e.target)) setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  return (
    <div className="appearance" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="appearance__button"
        aria-expanded={open}
        aria-controls={panelId}
        title="Giao diện"
        onClick={() => {
          setOpen((v) => !v);
        }}
      >
        <Icon name="palette" />
        <VisuallyHidden>Giao diện</VisuallyHidden>
      </button>

      {open ? (
        <div id={panelId} className="appearance__panel" role="group" aria-labelledby={titleId}>
          <p className="appearance__title" id={titleId}>
            Giao diện
          </p>

          <fieldset className="appearance__group">
            <legend className="appearance__legend">Chế độ màu</legend>
            <div className="appearance__modes">
              {MODES.map((m) => (
                <label key={m.value} className="appearance__mode">
                  <input
                    className="appearance__input"
                    type="radio"
                    name={`${uid}-mode`}
                    value={m.value}
                    checked={mode === m.value}
                    onChange={(e) => {
                      setMode(m.value, e.currentTarget.closest('label'));
                    }}
                  />
                  <span className="appearance__swatch" style={swatchStyle(m.value)} aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                  <span className="appearance__mode-name">{m.name}</span>
                  <span className="appearance__mode-text">{m.text}</span>
                  <Icon name="check" size="sm" className="appearance__tick" />
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="appearance__group">
            <legend className="appearance__legend">Độ sáng</legend>
            <div className="appearance__segments">
              {THEMES.map((t) => (
                <label key={t.value} className="appearance__segment">
                  <input
                    className="appearance__input"
                    type="radio"
                    name={`${uid}-theme`}
                    value={t.value}
                    checked={theme === t.value}
                    onChange={(e) => {
                      setTheme(t.value, e.currentTarget.closest('label'));
                    }}
                  />
                  <Icon name={t.icon} size="sm" />
                  <span>{t.name}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="appearance__group">
            <legend className="appearance__legend">Mật độ nội dung</legend>
            <div className="appearance__densities">
              {DENSITIES.map((d) => (
                <label key={d.value} className="appearance__density">
                  <input
                    type="radio"
                    name={`${uid}-density`}
                    value={d.value}
                    checked={density === d.value}
                    onChange={() => {
                      setDensity(d.value);
                    }}
                  />
                  <span className="appearance__density-body">
                    <span className="appearance__density-name">{d.name}</span>
                    <span className="appearance__density-text">{d.text}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      ) : null}
    </div>
  );
}
