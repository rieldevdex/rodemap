import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { ChatItem } from '../../mochi/conversation';
import { MAX_USER_CHARS } from '../../mochi/protocol';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { StatusTag } from '../atoms/StatusTag';
import { Mochi, type MochiState } from './Mochi';
import './MochiPanel.css';

export interface MochiPanelProps {
  open: boolean;
  items: ChatItem[];
  busy: boolean;
  mode: 'online' | 'offline';
  figure: MochiState;
  suggestions: string[];
  onSend: (text: string) => void;
  onClose: () => void;
  onNewConversation: () => void;
  renderCard: (item: Extract<ChatItem, { role: 'card' }>) => ReactNode;
}

/** Renders Mochi's plain text: blank lines separate paragraphs, "– " lines become a list. */
function MochiText({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n{2,}/).map((block, i) => {
        const lines = block.split('\n');
        const isList = lines.every((l) => /^\s*[–-]\s/.test(l));
        return isList ? (
          <ul key={i} className="mochi-panel__list">
            {lines.map((l) => (
              <li key={l}>{l.replace(/^\s*[–-]\s/, '')}</li>
            ))}
          </ul>
        ) : (
          <p key={i}>{block}</p>
        );
      })}
    </>
  );
}

/**
 * Mochi's side panel (desktop) / bottom sheet (phone): a transcript drawn as a route,
 * cards that wait for the student's confirmation, and a labelled message field.
 */
export function MochiPanel({
  open,
  items,
  busy,
  mode,
  figure,
  suggestions,
  onSend,
  onClose,
  onNewConversation,
  renderCard,
}: MochiPanelProps) {
  const titleId = useId();
  const fieldId = useId();
  const counterId = useId();
  const [draft, setDraft] = useState('');
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) fieldRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [items.length, busy]);

  if (!open) return null;

  const submit = () => {
    const text = draft.trim();
    if (text === '' || busy) return;
    onSend(text);
    setDraft('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div
      className="mochi-panel"
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
    >
      <header className="mochi-panel__head">
        <div className="mochi-panel__figure">
          <Mochi state={figure} />
        </div>
        <div className="mochi-panel__heading">
          <h2 id={titleId} className="mochi-panel__title">
            Mochi
          </h2>
          <p className="mochi-panel__subtitle">Trợ lý đồng hành của Rodemap</p>
        </div>
        <div className="mochi-panel__tools">
          {mode === 'offline' ? <StatusTag tone="neutral">Chế độ ngoại tuyến</StatusTag> : null}
          <Button size="sm" variant="quiet" onClick={onNewConversation}>
            Cuộc trò chuyện mới
          </Button>
          <button type="button" className="mochi-panel__close" onClick={onClose}>
            <Icon name="x" />
            <span className="visually-hidden">Đóng Mochi</span>
          </button>
        </div>
      </header>

      <div className="mochi-panel__log" ref={logRef} aria-live="polite" aria-relevant="additions" aria-busy={busy}>
        {items.length === 0 ? (
          <div className="mochi-panel__entry mochi-panel__entry--mochi">
            <p className="mochi-panel__who">Mochi</p>
            <div className="mochi-panel__text">
              <p>
                Xin chào, Mochi là trợ lý đồng hành của Rodemap. Mochi có thể đề xuất sự kiện phù hợp, chuẩn bị thẻ xác
                nhận đăng ký, tổng hợp lịch cá nhân, tóm tắt sự kiện và đề xuất bản nháp cho hồ sơ năng lực.
              </p>
              <p className="mochi-panel__fine">
                Mochi chỉ sử dụng dữ liệu của Rodemap, không lưu nội dung trò chuyện và không yêu cầu thông tin cá nhân.
                Mọi thao tác đăng ký đều cần bạn nhấn Xác nhận.
              </p>
            </div>
          </div>
        ) : null}
        {items.map((item) => {
          switch (item.role) {
            case 'student':
              return (
                <div key={item.id} className="mochi-panel__entry mochi-panel__entry--student">
                  <p className="mochi-panel__who">Bạn</p>
                  <p className="mochi-panel__text">{item.text}</p>
                </div>
              );
            case 'mochi':
              return (
                <div key={item.id} className="mochi-panel__entry mochi-panel__entry--mochi">
                  <p className="mochi-panel__who">Mochi{item.mode === 'offline' ? ' · ngoại tuyến' : ''}</p>
                  <div className="mochi-panel__text">
                    <MochiText text={item.text} />
                  </div>
                </div>
              );
            case 'card':
              return (
                <div key={item.id} className="mochi-panel__entry mochi-panel__entry--card">
                  {renderCard(item)}
                </div>
              );
            case 'notice':
              return (
                <p key={item.id} className="mochi-panel__notice">
                  <Icon name="info" size="sm" />
                  <span>{item.text}</span>
                </p>
              );
          }
        })}
        {busy ? (
          <p className="mochi-panel__busy" role="status">
            Mochi đang xử lý yêu cầu…
          </p>
        ) : null}
      </div>

      <div className="mochi-panel__compose">
        {suggestions.length > 0 ? (
          <ul className="mochi-panel__suggestions" aria-label="Gợi ý câu hỏi">
            {suggestions.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  className="mochi-panel__suggestion"
                  disabled={busy}
                  onClick={() => {
                    onSend(s);
                  }}
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <form
          className="mochi-panel__form"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <label className="mochi-panel__label" htmlFor={fieldId}>
            Nhắn Mochi
          </label>
          <textarea
            id={fieldId}
            ref={fieldRef}
            className="mochi-panel__field"
            rows={2}
            maxLength={MAX_USER_CHARS}
            value={draft}
            aria-describedby={counterId}
            placeholder="Ví dụ: Gợi ý sự kiện tuần tới"
            onChange={(e) => {
              setDraft(e.target.value);
            }}
            onKeyDown={onKeyDown}
          />
          <div className="mochi-panel__form-row">
            <span id={counterId} className="mochi-panel__counter">
              {draft.length}/{MAX_USER_CHARS} ký tự
            </span>
            <Button type="submit" size="sm" variant="primary" iconEnd="arrow-right" disabled={busy || draft.trim() === ''}>
              Gửi
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
