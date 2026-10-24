import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { INTERACTIVITY_LEVELS, type AppearanceMode, type InteractivityLevel, type TextDensity, type ThemePreference } from '../../domain/types';
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

/** Mức độ tương tác (DESIGN.md §6.3): what each step adds, in the slider's order. */
const LEVELS: Record<InteractivityLevel, { name: string; text: string }> = {
  none: { name: 'Không', text: 'Không có chuyển động hay hiệu ứng; mọi chức năng vẫn hoạt động đầy đủ.' },
  slight: { name: 'Nhẹ', text: 'Chỉ phản hồi khi nhấn, di chuột và mở bảng.' },
  medium: { name: 'Vừa', text: 'Thêm chuyển cảnh trên Trang chủ và tô sáng tuyến trên bản đồ.' },
  extreme: {
    name: 'Tối đa',
    text: 'Thêm chuyển tiếp từ thẻ sang trang sự kiện, phím tắt J và K, thử quỹ giờ và rung phản hồi trên điện thoại.',
  },
};

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
 * Mật độ nội dung) and the Mức độ tương tác slider with its performance caution. Arrow keys move within a group; Escape or a click outside closes the panel
 * and Escape returns focus to the button. Choices apply at once and are kept on this device.
 */
export function AppearancePicker() {
  const { mode, theme, density, interactivity, recommended, reducedMotion, setMode, setTheme, setDensity, setInteractivity } = useAppearance();
  const { pathname } = useRoute();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const uid = useId();
  const panelId = `${uid}-panel`;
  const titleId = `${uid}-title`;
  const levelId = `${uid}-level`;
  const levelHelpId = `${uid}-level-help`;
  const levelIndex = INTERACTIVITY_LEVELS.indexOf(interactivity);

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

          <div className="appearance__group">
            <label className="appearance__legend" htmlFor={levelId}>
              Mức độ tương tác
            </label>
            <input
              id={levelId}
              className="appearance__range"
              type="range"
              min={0}
              max={INTERACTIVITY_LEVELS.length - 1}
              step={1}
              value={levelIndex}
              aria-valuetext={`${LEVELS[interactivity].name}. ${LEVELS[interactivity].text}`}
              aria-describedby={levelHelpId}
              onChange={(e) => {
                const next = INTERACTIVITY_LEVELS[Number(e.target.value)];
                if (next !== undefined) setInteractivity(next);
              }}
            />
            <ol className="appearance__ticks" aria-hidden="true">
              {INTERACTIVITY_LEVELS.map((level) => (
                <li key={level} data-current={level === interactivity}>
                  {LEVELS[level].name}
                </li>
              ))}
            </ol>
            <p className="appearance__level-text">{LEVELS[interactivity].text}</p>
            <div className="appearance__caution" id={levelHelpId}>
              <Icon name="alert" size="sm" />
              <p>
                Mức tương tác càng cao, trang càng sử dụng nhiều tài nguyên xử lý, bộ nhớ và pin của thiết bị; trên thiết bị cấu hình thấp, trang có thể
                phản hồi chậm hơn.
                {recommended === null ? null : ' Thiết bị này có cấu hình hạn chế hoặc đang bật chế độ tiết kiệm dữ liệu; Rodemap khuyến nghị mức Nhẹ.'}
                {reducedMotion ? ' Thiết bị đang yêu cầu giảm chuyển động: chuyển động luôn tắt ở mọi mức, còn tô sáng tuyến và phím tắt vẫn hoạt động.' : null}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
