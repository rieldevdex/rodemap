import { useState } from 'react';
import { formatDate, formatLongDate, formatTime, formatTimeRange, toMillis } from '../../domain/dates';
import type { RegistrationState } from '../../domain/events';
import type { SchoolEvent } from '../../domain/types';
import { Button } from '../atoms/Button';
import { LineBadge } from '../atoms/LineBadge';
import { MonoTime } from '../atoms/MonoTime';
import { StatusTag } from '../atoms/StatusTag';
import { ConfirmDialog } from '../molecules/ConfirmDialog';
import './RegistrationControl.css';

export interface RegistrationControlProps {
  event: SchoolEvent;
  clubName: string;
  state: RegistrationState;
  seatsLeft: number;
  conflicts: SchoolEvent[];
  overBudget: boolean;
  eligible: boolean;
  canRegister: boolean;
  canUnregister: boolean;
  onRegister: () => void;
  onUnregister: () => void;
  size?: 'sm' | 'md';
}

const BLOCKED: Partial<Record<RegistrationState, string>> = {
  full: 'Sự kiện đã hết chỗ.',
  closed: 'Đã hết hạn đăng ký.',
  past: 'Sự kiện đã diễn ra.',
  attended: 'Bạn đã tham gia sự kiện này.',
};

/**
 * "Đăng ký" / "Hủy đăng ký" with a confirmation sheet listing the time, place,
 * seats, conflicts and budget. Nothing changes until the student presses "Xác nhận".
 */
export function RegistrationControl({
  event,
  clubName,
  state,
  seatsLeft,
  conflicts,
  overBudget,
  eligible,
  canRegister,
  canUnregister,
  onRegister,
  onUnregister,
  size = 'md',
}: RegistrationControlProps) {
  const [dialog, setDialog] = useState<'register' | 'unregister' | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const start = toMillis(event.start);
  const end = toMillis(event.end);

  const close = () => {
    setDialog(null);
  };
  const confirm = () => {
    if (dialog === 'register') {
      onRegister();
      setAnnouncement(`Đã đăng ký sự kiện ${event.title}.`);
    } else if (dialog === 'unregister') {
      onUnregister();
      setAnnouncement(`Đã hủy đăng ký sự kiện ${event.title}.`);
    }
    setDialog(null);
  };

  let control;
  if (canRegister) {
    control = (
      <Button
        size={size}
        variant="primary"
        onClick={() => {
          setDialog('register');
        }}
      >
        Đăng ký
      </Button>
    );
  } else if (canUnregister) {
    control = (
      <Button
        size={size}
        variant="secondary"
        onClick={() => {
          setDialog('unregister');
        }}
      >
        Hủy đăng ký
      </Button>
    );
  } else if (!eligible && state === 'open') {
    control = <StatusTag tone="neutral">Sự kiện dành cho khối {event.eligibleGrades.join(', ')}</StatusTag>;
  } else {
    const reason = BLOCKED[state];
    control = reason ? <StatusTag tone={state === 'attended' ? 'ok' : 'neutral'}>{reason}</StatusTag> : null;
  }

  return (
    <div className="registration-control">
      {control}
      <span className="visually-hidden" role="status">
        {announcement}
      </span>
      <ConfirmDialog
        open={dialog !== null}
        title={dialog === 'unregister' ? 'Xác nhận hủy đăng ký' : 'Xác nhận đăng ký'}
        confirmLabel="Xác nhận"
        tone={dialog === 'unregister' ? 'stop' : 'default'}
        onConfirm={confirm}
        onCancel={close}
      >
        <div className="registration-control__event">
          <LineBadge code={event.category} showName size="sm" />
          <p className="registration-control__title">{event.title}</p>
          <p className="registration-control__club">{clubName}</p>
        </div>
        <dl className="registration-control__facts">
          <div>
            <dt>Thời gian</dt>
            <dd>
              <MonoTime dateTime={event.start}>
                {formatLongDate(start)} · {formatTimeRange(start, end)}
              </MonoTime>
            </dd>
          </div>
          <div>
            <dt>Địa điểm</dt>
            <dd>{event.format === 'online' ? `Trực tuyến · ${event.location}` : event.location}</dd>
          </div>
          {dialog === 'register' ? (
            <>
              <div>
                <dt>Số chỗ còn lại</dt>
                <dd>
                  <span className="mono">{seatsLeft}</span> / <span className="mono">{event.capacity}</span>
                </dd>
              </div>
              <div>
                <dt>Hạn đăng ký</dt>
                <dd>
                  <MonoTime dateTime={event.registrationDeadline}>
                    {formatDate(toMillis(event.registrationDeadline))} · {formatTime(toMillis(event.registrationDeadline))}
                  </MonoTime>
                </dd>
              </div>
            </>
          ) : null}
        </dl>
        {dialog === 'register' && conflicts.length > 0 ? (
          <div className="registration-control__warning">
            <StatusTag tone="stop">Trùng lịch</StatusTag>
            <ul>
              {conflicts.map((c) => (
                <li key={c.id}>
                  {c.title} ({formatTimeRange(toMillis(c.start), toMillis(c.end))})
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {dialog === 'register' && overBudget ? (
          <div className="registration-control__warning">
            <StatusTag tone="warn">Vượt quỹ giờ trong tuần</StatusTag>
          </div>
        ) : null}
        <p className="registration-control__note">
          {dialog === 'unregister'
            ? 'Sau khi hủy, chỗ của bạn sẽ được mở lại cho học sinh khác đăng ký.'
            : 'Thao tác chỉ được thực hiện sau khi bạn nhấn Xác nhận.'}
        </p>
      </ConfirmDialog>
    </div>
  );
}
