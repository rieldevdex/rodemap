import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import './StatusTag.css';

export type StatusTone = 'ok' | 'warn' | 'stop' | 'neutral' | 'signal';

const DEFAULT_ICON: Record<StatusTone, IconName> = {
  ok: 'check',
  warn: 'clock',
  stop: 'alert',
  neutral: 'info',
  signal: 'arrow-right',
};

export interface StatusTagProps {
  tone: StatusTone;
  /** The status word, e.g. "Đã đăng ký", "Sắp hết hạn", "Trùng lịch". */
  children: ReactNode;
  /** Overrides the tone's default icon. */
  icon?: IconName;
  className?: string;
}

/** Status = icon + word in a status color. Never color alone, never decoration. */
export function StatusTag({ tone, children, icon, className }: StatusTagProps) {
  const classes = ['status-tag', `status-tag--${tone}`, className].filter(Boolean).join(' ');
  return (
    <span className={classes}>
      <Icon name={icon ?? DEFAULT_ICON[tone]} size="sm" />
      <span className="status-tag__label">{children}</span>
    </span>
  );
}
