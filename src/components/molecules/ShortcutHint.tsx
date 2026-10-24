import './ShortcutHint.css';

/** Tells keyboard users about J / K on an event list (shown at "Tối đa" only, DESIGN.md §6.3). */
export function ShortcutHint() {
  return (
    <p className="shortcut-hint">
      Phím tắt: <kbd>J</kbd> và <kbd>K</kbd> chuyển giữa các sự kiện, <kbd>Enter</kbd> mở trang sự kiện.
    </p>
  );
}
