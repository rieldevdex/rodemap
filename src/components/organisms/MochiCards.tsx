import { useState } from 'react';
import type { CategoryCode } from '../../domain/types';
import { DROP_REASON_LABELS, type CardStatus, type MochiCard } from '../../mochi/cards';
import { Link } from '../../router';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { LineBadge } from '../atoms/LineBadge';
import { StatusTag } from '../atoms/StatusTag';
import './MochiCards.css';

/** Everything a card needs to show about one event, prepared by the connected layer. */
export interface CardEvent {
  id: string;
  title: string;
  category: CategoryCode;
  club: string;
  when: string;
  location: string;
  status: string;
  href: string;
  conflicts: string[];
  overBudget: boolean;
  googleCalendarUrl: string;
}

export interface MochiCardViewProps {
  card: MochiCard;
  status: CardStatus;
  lookup: (eventId: string) => CardEvent | undefined;
  onConfirmRegistration: (eventId: string, action: 'register' | 'unregister') => void;
  onConfirmPlan: (eventIds: string[]) => void;
  onSaveDraft: (eventId: string, reflection: string, role: string) => void;
  onDismiss: () => void;
  onExport: (eventIds: string[]) => void;
}

function EventLine({ e, reasons, warnings }: { e: CardEvent; reasons?: string[] | undefined; warnings?: string[] | undefined }) {
  return (
    <div className="mochi-card__event">
      <div className="mochi-card__event-top">
        <LineBadge code={e.category} size="sm" />
        <span className="mochi-card__when">{e.when}</span>
      </div>
      <Link className="mochi-card__title" to={e.href}>
        {e.title}
      </Link>
      <p className="mochi-card__meta">
        {e.club} · {e.location} · {e.status}
      </p>
      {reasons && reasons.length > 0 ? (
        <div className="mochi-card__reasons">
          <p className="mochi-card__reasons-label">Vì sao Mochi đề xuất</p>
          <ul>
            {reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {warnings && warnings.length > 0 ? (
        <div className="mochi-card__tags">
          {warnings.map((w) => (
            <StatusTag key={w} tone="warn">
              {w}
            </StatusTag>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Done({ status, confirmed, dismissed }: { status: CardStatus; confirmed: string; dismissed: string }) {
  if (status === 'pending') return null;
  return (
    <p className="mochi-card__done">
      <StatusTag tone={status === 'confirmed' ? 'ok' : 'neutral'}>{status === 'confirmed' ? confirmed : dismissed}</StatusTag>
    </p>
  );
}

/** One Mochi card: a list of events, a confirmation, a plan, a draft or an export. */
export function MochiCardView({
  card,
  status,
  lookup,
  onConfirmRegistration,
  onConfirmPlan,
  onSaveDraft,
  onDismiss,
  onExport,
}: MochiCardViewProps) {
  const [planIds, setPlanIds] = useState<string[]>(card.kind === 'plan' ? card.accepted : []);
  const [draft, setDraft] = useState(card.kind === 'draft' ? card.reflection : '');
  const pending = status === 'pending';

  switch (card.kind) {
    case 'events': {
      const events = card.eventIds.map(lookup).filter((e): e is CardEvent => e !== undefined);
      return (
        <section className="mochi-card" aria-label={card.title}>
          <p className="mochi-card__kicker">{card.title}</p>
          {events.map((e) => (
            <EventLine key={e.id} e={e} reasons={card.reasons?.[e.id]} warnings={card.warnings?.[e.id]} />
          ))}
        </section>
      );
    }
    case 'registration': {
      const e = lookup(card.eventId);
      if (!e) return null;
      const register = card.action === 'register';
      return (
        <section className="mochi-card mochi-card--confirm" aria-label={register ? 'Thẻ xác nhận đăng ký' : 'Thẻ xác nhận hủy đăng ký'}>
          <p className="mochi-card__kicker">{register ? 'Xác nhận đăng ký' : 'Xác nhận hủy đăng ký'}</p>
          <EventLine e={e} />
          {register && e.conflicts.length > 0 ? (
            <div className="mochi-card__tags">
              <StatusTag tone="stop">Trùng lịch</StatusTag>
              <span className="mochi-card__meta">{e.conflicts.join('; ')}</span>
            </div>
          ) : null}
          {register && e.overBudget ? <StatusTag tone="warn">Vượt quỹ giờ trong tuần</StatusTag> : null}
          {pending ? (
            <div className="mochi-card__actions">
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  onConfirmRegistration(card.eventId, card.action);
                }}
              >
                Xác nhận
              </Button>
              <Button size="sm" variant="secondary" onClick={onDismiss}>
                Không thực hiện
              </Button>
            </div>
          ) : (
            <Done status={status} confirmed={register ? 'Đã đăng ký' : 'Đã hủy đăng ký'} dismissed="Không thực hiện" />
          )}
        </section>
      );
    }
    case 'plan': {
      return (
        <section className="mochi-card mochi-card--confirm" aria-label="Kế hoạch do Mochi đề xuất">
          <p className="mochi-card__kicker">Kế hoạch do Mochi đề xuất · quỹ giờ {card.budget} giờ/tuần</p>
          {card.accepted.length === 0 ? <p className="mochi-card__meta">Không có sự kiện nào phù hợp với lịch và quỹ giờ hiện tại.</p> : null}
          {card.accepted.map((id) => {
            const e = lookup(id);
            if (!e) return null;
            const checked = planIds.includes(id);
            return (
              <label key={id} className="mochi-card__check">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={!pending}
                  onChange={() => {
                    setPlanIds((ids) => (checked ? ids.filter((x) => x !== id) : [...ids, id]));
                  }}
                />
                <EventLine e={e} />
              </label>
            );
          })}
          {card.dropped.length > 0 ? (
            <div className="mochi-card__reasons">
              <p className="mochi-card__reasons-label">Không đưa vào kế hoạch</p>
              <ul>
                {card.dropped.map((d) => (
                  <li key={d.eventId}>
                    {lookup(d.eventId)?.title ?? d.eventId}: {DROP_REASON_LABELS[d.reason].toLocaleLowerCase('vi')}
                    {d.conflictWith ? ` với “${lookup(d.conflictWith)?.title ?? d.conflictWith}”` : ''}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {card.alternatives.length > 0 ? (
            <div className="mochi-card__reasons">
              <p className="mochi-card__reasons-label">Phương án thay thế</p>
              <ul>
                {card.alternatives.map((a) => (
                  <li key={a.eventId}>
                    {lookup(a.eventId)?.title ?? a.eventId} (thay cho {lookup(a.forEventId)?.title ?? a.forEventId})
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {pending ? (
            <div className="mochi-card__actions">
              <Button
                size="sm"
                variant="primary"
                disabled={planIds.length === 0}
                onClick={() => {
                  onConfirmPlan(planIds);
                }}
              >
                Xác nhận
              </Button>
              <Button size="sm" variant="secondary" onClick={onDismiss}>
                Không thực hiện
              </Button>
            </div>
          ) : (
            <Done status={status} confirmed="Đã đăng ký theo kế hoạch" dismissed="Không thực hiện" />
          )}
        </section>
      );
    }
    case 'draft': {
      const e = lookup(card.eventId);
      if (!e) return null;
      const fieldId = `draft-${card.eventId}`;
      return (
        <section className="mochi-card mochi-card--confirm" aria-label="Bản nháp do Mochi đề xuất">
          <p className="mochi-card__kicker">Bản nháp do Mochi đề xuất</p>
          <p className="mochi-card__title-static">{e.title}</p>
          <label className="mochi-card__field-label" htmlFor={fieldId}>
            Phần tự đánh giá (vai trò: {card.role})
          </label>
          <textarea
            id={fieldId}
            className="mochi-card__textarea"
            rows={6}
            value={draft}
            readOnly={!pending}
            onChange={(ev) => {
              setDraft(ev.target.value);
            }}
          />
          <p className="mochi-card__meta">Đây là bản nháp; bạn cần chỉnh sửa để phản ánh trải nghiệm của bản thân.</p>
          {pending ? (
            <div className="mochi-card__actions">
              <Button
                size="sm"
                variant="primary"
                disabled={draft.trim() === ''}
                onClick={() => {
                  onSaveDraft(card.eventId, draft, card.role);
                }}
              >
                Lưu bản nháp vào hồ sơ
              </Button>
              <Button size="sm" variant="secondary" onClick={onDismiss}>
                Không lưu
              </Button>
            </div>
          ) : (
            <Done status={status} confirmed="Đã lưu bản nháp" dismissed="Không lưu" />
          )}
        </section>
      );
    }
    case 'export': {
      const events = card.eventIds.map(lookup).filter((e): e is CardEvent => e !== undefined);
      return (
        <section className="mochi-card" aria-label="Xuất lịch">
          <p className="mochi-card__kicker">Xuất lịch · {events.length} sự kiện</p>
          <div className="mochi-card__actions">
            <Button
              size="sm"
              variant="primary"
              iconStart="download"
              onClick={() => {
                onExport(card.eventIds);
              }}
            >
              Tải tệp .ics
            </Button>
          </div>
          <ul className="mochi-card__links">
            {events.map((e) => (
              <li key={e.id}>
                <a href={e.googleCalendarUrl} target="_blank" rel="noopener noreferrer">
                  Thêm “{e.title}” vào Google Calendar
                  <Icon name="external" size="sm" />
                  <span className="visually-hidden"> (mở trong thẻ mới)</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      );
    }
  }
}
