import { useSyncExternalStore } from 'react';
import { useDispatch, useSelector } from '../../state/hooks';
import { Icon } from '../atoms/Icon';
import { VisuallyHidden } from '../atoms/VisuallyHidden';
import './ThemeToggle.css';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function subscribe(onChange: () => void): () => void {
  const mq = window.matchMedia(DARK_QUERY);
  mq.addEventListener('change', onChange);
  return () => {
    mq.removeEventListener('change', onChange);
  };
}

function systemPrefersDark(): boolean {
  return window.matchMedia(DARK_QUERY).matches;
}

/** True while the operating system asks for a dark appearance (updates live). */
export function useSystemDark(): boolean {
  return useSyncExternalStore(subscribe, systemPrefersDark, () => false);
}

/**
 * Dark-appearance toggle. aria-pressed reflects the effective theme (explicit choice or
 * system setting); pressing it stores the opposite explicit theme. "Theo cài đặt hệ thống"
 * lives in the account menu.
 */
export function ThemeToggle() {
  const theme = useSelector((s) => s.theme);
  const dispatch = useDispatch();
  const systemDark = useSystemDark();
  const dark = theme === 'dark' || (theme === 'system' && systemDark);
  return (
    <button
      type="button"
      className="theme-toggle"
      aria-pressed={dark}
      title="Giao diện tối"
      onClick={() => {
        dispatch({ type: 'theme/set', theme: dark ? 'light' : 'dark' });
      }}
    >
      <Icon name={dark ? 'sun' : 'moon'} />
      <VisuallyHidden>Giao diện tối</VisuallyHidden>
    </button>
  );
}
