import { useId, useState, type ReactNode, type SyntheticEvent } from 'react';
import { Button } from '../../components/atoms/Button';
import { StatusTag, type StatusTone } from '../../components/atoms/StatusTag';
import { ConfirmDialog } from '../../components/molecules/ConfirmDialog';
import '../../components/organisms/EventSubmissionForm.css';
import { formatDate, formatTime } from '../../domain/dates';
import {
  BONUS_KINDS,
  BONUS_LABELS,
  BONUS_POINTS,
  canDecide,
  canEditScore,
  canSendFeedback,
  draftFor,
  feedbackDeadline,
  formatMonth,
  formatPoints,
  FRAMEWORK_LABELS,
  frameworkFor,
  GRADE_CONSEQUENCES,
  GRADE_LABELS,
  LEAD_KEYS,
  LEAD_LABELS,
  LEAD_WEIGHTS,
  leadSuggestions,
  memberTasksInMonth,
  monthKeyOf,
  PENALTY_MAX,
  PENALTY_MIN,
  rowResult,
  scoringWindow,
  seesWholeSheet,
  SHEET_STATUS_LABELS,
  sheetActions,
  shiftMonth,
  taskStats,
  unscoredMembers,
  validateScoreDraft,
  visibleRows,
  type BonusKind,
  type Grade,
  type MonthKey,
  type ScoreDraft,
  type ScoreResult,
  type SheetAction,
  type SheetStatus,
  type TaskStats,
  type WsScore,
  type WsScoreSheet,
} from '../../domain/scores';
import type { Millis } from '../../domain/types';
import { membersOf, type WsMember, type WsSnapshot } from '../../domain/workspace';
import { useScoreSheet, type ScoreSheetState } from '../../workspace/useScores';
import { formatDue } from './WorkspaceTasks';

interface Props {
  snapshot: WsSnapshot;
  me: WsMember;
  now: Millis;
}

const GRADE_TONES: Record<Grade, StatusTone> = { xuat_sac: 'ok', tot: 'ok', dat: 'neutral', can_cai_thien: 'warn', khong_dat: 'stop' };
const SHEET_TONES: Record<SheetStatus, StatusTone> = { draft: 'warn', published: 'signal', final: 'ok' };

const nameOf = (snapshot: WsSnapshot, id: string | null) => snapshot.members.find((m) => m.id === id)?.fullName ?? 'Thành viên';
const at = (ms: Millis) => `${formatTime(ms)} · ${formatDate(ms)}`;

/** The task figures of a member for the month: frozen once published, live while scoring. */
function statsFor(snapshot: WsSnapshot, row: WsScore | undefined, memberId: string, month: MonthKey): TaskStats {
  return row?.stats ?? taskStats(memberTasksInMonth(snapshot.tasks, memberId, month));
}

/* ── The breakdown of one score ───────────────────────────────────── */

function Breakdown({ result }: { result: ScoreResult }) {
  return (
    <div className="ws-table-wrap">
      <table className="ws-table ws-score__table">
        <caption className="visually-hidden">Chi tiết điểm</caption>
        <thead>
          <tr>
            <th scope="col">Tiêu chí</th>
            <th scope="col">Điểm</th>
            <th scope="col">Tối đa</th>
          </tr>
        </thead>
        <tbody>
          {result.parts.map((p) => (
            <tr key={p.key}>
              <th scope="row">{p.label}</th>
              <td className="mono">{formatPoints(p.value)}</td>
              <td className="mono">{p.max}</td>
            </tr>
          ))}
          <tr>
            <th scope="row">Điểm cơ bản</th>
            <td className="mono">{formatPoints(result.base)}</td>
            <td className="mono">100</td>
          </tr>
          <tr>
            <th scope="row">Điểm cộng</th>
            <td className="mono">+{formatPoints(result.bonus)}</td>
            <td className="mono">15</td>
          </tr>
          <tr>
            <th scope="row">Điểm trừ</th>
            <td className="mono">−{formatPoints(result.penalty)}</td>
            <td />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function ScoreCard({ snapshot, sheet, member, row, result, children }: { snapshot: WsSnapshot; sheet: WsScoreSheet; member: WsMember; row: WsScore; result: ScoreResult; children?: ReactNode }) {
  const stats = statsFor(snapshot, row, member.id, sheet.month);
  return (
    <article className="ws-score stack stack--md" aria-label={`Điểm ${formatMonth(sheet.month)}: ${member.fullName}`}>
      <div className="cluster cluster--between">
        <div>
          <h3 className="ws-form__title">{member.fullName}</h3>
          <p className="workspace__note">{FRAMEWORK_LABELS[row.framework]}</p>
        </div>
        <div className="ws-score__total">
          <span className="ws-score__number mono">{formatPoints(result.total)}</span>
          <StatusTag tone={GRADE_TONES[result.grade]}>{GRADE_LABELS[result.grade]}</StatusTag>
        </div>
      </div>
      <p className="workspace__note">{GRADE_CONSEQUENCES[result.grade]}</p>
      <Breakdown result={result} />
      <dl className="ws-task__facts">
        {row.framework === 'member' ? (
          <div>
            <dt>Căn cứ A, B, C</dt>
            <dd>
              {stats.assigned} công việc có hạn trong tháng, hoàn thành {stats.done}, đúng hạn {formatPoints(stats.onTimeCredit)}
              {row.stats === null ? ' (tính theo công việc hiện tại)' : ''}
            </dd>
          </div>
        ) : null}
        {row.attendance ? (
          <div>
            <dt>Chuyên cần</dt>
            <dd>
              Có mặt {row.attendance.present}, vắng có phép {row.attendance.excused}, trên {row.attendance.required} buổi bắt buộc
            </dd>
          </div>
        ) : null}
        {row.bonuses.map((b, i) => (
          <div key={`b-${String(i)}`}>
            <dt>Điểm cộng +{BONUS_POINTS[b.kind]}</dt>
            <dd>
              {BONUS_LABELS[b.kind]}: {b.note}
            </dd>
          </div>
        ))}
        {row.penalties.map((p, i) => (
          <div key={`p-${String(i)}`}>
            <dt>Điểm trừ −{p.points}</dt>
            <dd>{p.reason}</dd>
          </div>
        ))}
        {row.note === '' ? null : (
          <div>
            <dt>Nhận xét</dt>
            <dd>{row.note}</dd>
          </div>
        )}
        <div>
          <dt>Người chấm</dt>
          <dd>
            {nameOf(snapshot, row.scoredBy)}
            {row.scoredAt === null ? '' : `, ${formatDue(row.scoredAt)}`}
          </dd>
        </div>
        {row.feedback === '' ? null : (
          <div>
            <dt>Phản hồi của thành viên</dt>
            <dd>{row.feedback}</dd>
          </div>
        )}
        {row.decision === '' ? null : (
          <div>
            <dt>Ý kiến của Ban điều hành</dt>
            <dd>{row.decision}</dd>
          </div>
        )}
      </dl>
      {children}
    </article>
  );
}

/* ── Feedback by the member ───────────────────────────────────────── */

function FeedbackForm({ scores, deadline }: { scores: ScoreSheetState; deadline: Millis }) {
  const id = useId();
  const [text, setText] = useState('');
  const [sent, setSent] = useState('');
  const submit = (e: SyntheticEvent) => {
    e.preventDefault();
    void scores.sendFeedback(text).then((ok) => {
      if (!ok) return;
      setText('');
      setSent('Đã gửi phản hồi tới Ban điều hành.');
    });
  };
  return (
    <form className="submission-form stack stack--sm" aria-label="Phản hồi về điểm" onSubmit={submit} noValidate>
      <div className="submission-form__field">
        <label htmlFor={`${id}-feedback`}>Phản hồi về điểm (nếu có), gửi trước {at(deadline)}</label>
        <textarea
          id={`${id}-feedback`}
          rows={3}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
          }}
        />
      </div>
      <div className="cluster">
        <Button type="submit" variant="secondary" disabled={scores.busy || text.trim().length < 10}>
          Gửi phản hồi
        </Button>
      </div>
      <p className="workspace__note" role="status">
        {sent}
      </p>
    </form>
  );
}

/* ── Scoring form ─────────────────────────────────────────────────── */

function NumberField({ label, value, onChange, min, max, step, hint }: { label: string; value: number; onChange: (n: number) => void; min: number; max: number; step: number; hint?: string }) {
  const id = useId();
  return (
    <div className="submission-form__field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={Number.isNaN(value) ? '' : value}
        aria-describedby={hint === undefined ? undefined : `${id}-hint`}
        onChange={(e) => {
          onChange(e.target.value === '' ? Number.NaN : Number(e.target.value));
        }}
      />
      {hint === undefined ? null : (
        <span id={`${id}-hint`} className="submission-form__hint">
          {hint}
        </span>
      )}
    </div>
  );
}

function ScoreForm({ snapshot, sheet, scores, member, row, onClose }: { snapshot: WsSnapshot; sheet: WsScoreSheet; scores: ScoreSheetState; member: WsMember; row: WsScore | undefined; onClose: () => void }) {
  const id = useId();
  const framework = frameworkFor(member);
  const suggested = leadSuggestions(snapshot.tasks, snapshot.requests, member.departmentId, sheet.month);
  const [draft, setDraft] = useState<ScoreDraft>(() => draftFor(member.id, row, suggested));
  const [shown, setShown] = useState(false);
  const errors = validateScoreDraft(draft, framework);
  const stats = statsFor(snapshot, row, member.id, sheet.month);
  const preview = rowResult({ ...(row ?? emptyRow(member.id)), framework, attendance: draft.attendance, cooperation: draft.cooperation, lead: draft.lead, bonuses: draft.bonuses, penalties: draft.penalties, scoredAt: 'preview' }, stats);
  const set = (patch: Partial<ScoreDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
  };
  const submit = (e: SyntheticEvent) => {
    e.preventDefault();
    setShown(true);
    if (Object.keys(errors).length > 0) return;
    void scores.save({ ...draft, note: draft.note.trim() }).then((ok) => {
      if (ok) onClose();
    });
  };
  const err = (key: keyof typeof errors) =>
    shown && errors[key] ? (
      <p id={`${id}-${key}-error`} className="submission-form__error">
        {errors[key]}
      </p>
    ) : null;
  const describedBy = (key: keyof typeof errors) => (shown && errors[key] ? `${id}-${key}-error` : undefined);

  return (
    <form className="submission-form ws-form stack stack--md" aria-label={`Chấm điểm ${member.fullName}`} onSubmit={submit} noValidate>
      <div>
        <h3 className="ws-form__title">Chấm điểm: {member.fullName}</h3>
        <p className="workspace__note">
          {FRAMEWORK_LABELS[framework]} · {formatMonth(sheet.month)}
        </p>
      </div>
      {framework === 'member' ? (
        <>
          <p className="submission-form__hint">
            A, B, C được tính tự động từ {stats.assigned} công việc có hạn trong tháng: hoàn thành {stats.done}, đúng hạn {formatPoints(stats.onTimeCredit)}, chất lượng trung bình{' '}
            {stats.qualityCount === 0 ? 'chưa có' : formatPoints(Math.round((stats.qualitySum / stats.qualityCount) * 100) / 100)}.
          </p>
          <fieldset className="submission-form__field submission-form__fieldset" aria-describedby={describedBy('attendance')}>
            <legend>D. Chuyên cần (họp ban, họp chung và sự kiện được phân công)</legend>
            <div className="submission-form__grid">
              <NumberField
                label="Số buổi bắt buộc"
                value={draft.attendance.required}
                min={0}
                max={60}
                step={1}
                onChange={(n) => {
                  set({ attendance: { ...draft.attendance, required: n } });
                }}
              />
              <NumberField
                label="Số buổi có mặt"
                value={draft.attendance.present}
                min={0}
                max={60}
                step={1}
                onChange={(n) => {
                  set({ attendance: { ...draft.attendance, present: n } });
                }}
              />
              <NumberField
                label="Số buổi vắng có phép"
                value={draft.attendance.excused}
                min={0}
                max={60}
                step={1}
                hint="Báo trước ít nhất 24 giờ."
                onChange={(n) => {
                  set({ attendance: { ...draft.attendance, excused: n } });
                }}
              />
            </div>
            {err('attendance')}
          </fieldset>
          <NumberField
            label="E. Hợp tác và thái độ (0 đến 10)"
            value={draft.cooperation}
            min={0}
            max={10}
            step={0.5}
            hint="Phản hồi tin nhắn công việc trong 24 giờ, hỗ trợ đồng đội, tuân thủ quy trình, thái độ khi nhận phản hồi."
            onChange={(n) => {
              set({ cooperation: n });
            }}
          />
          {err('cooperation')}
        </>
      ) : (
        <fieldset className="submission-form__field submission-form__fieldset" aria-describedby={describedBy('lead')}>
          <legend>Tiêu chí của trưởng ban</legend>
          <div className="submission-form__grid">
            {LEAD_KEYS.map((k) => (
              <NumberField
                key={k}
                label={`${LEAD_LABELS[k]} (tối đa ${String(LEAD_WEIGHTS[k])})`}
                value={draft.lead[k]}
                min={0}
                max={LEAD_WEIGHTS[k]}
                step={0.5}
                {...(k === 'results' || k === 'quality' || k === 'coordination' ? { hint: `Gợi ý từ dữ liệu công việc và phiếu yêu cầu: ${formatPoints(suggested[k])}` } : {})}
                onChange={(n) => {
                  set({ lead: { ...draft.lead, [k]: n } });
                }}
              />
            ))}
          </div>
          {err('lead')}
        </fieldset>
      )}

      <fieldset className="submission-form__field submission-form__fieldset" aria-describedby={describedBy('bonuses')}>
        <legend>Điểm cộng (tối đa +15 mỗi tháng, hỗ trợ ban khác tối đa +6)</legend>
        {draft.bonuses.map((b, i) => (
          <div key={`b-${String(i)}`} className="ws-entry">
            <div className="submission-form__field">
              <label htmlFor={`${id}-bk-${String(i)}`}>Trường hợp</label>
              <select
                id={`${id}-bk-${String(i)}`}
                value={b.kind}
                onChange={(e) => {
                  set({ bonuses: draft.bonuses.map((x, j) => (j === i ? { ...x, kind: e.target.value as BonusKind } : x)) });
                }}
              >
                {BONUS_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {BONUS_LABELS[k]} (+{BONUS_POINTS[k]})
                  </option>
                ))}
              </select>
            </div>
            <div className="submission-form__field">
              <label htmlFor={`${id}-bn-${String(i)}`}>Căn cứ</label>
              <input
                id={`${id}-bn-${String(i)}`}
                value={b.note}
                onChange={(e) => {
                  set({ bonuses: draft.bonuses.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)) });
                }}
              />
            </div>
            <Button
              size="sm"
              variant="quiet"
              onClick={() => {
                set({ bonuses: draft.bonuses.filter((_, j) => j !== i) });
              }}
            >
              Bỏ<span className="visually-hidden"> điểm cộng {i + 1}</span>
            </Button>
          </div>
        ))}
        <div className="cluster">
          <Button
            size="sm"
            variant="secondary"
            iconStart="plus"
            onClick={() => {
              set({ bonuses: [...draft.bonuses, { kind: 'support', note: '' }] });
            }}
          >
            Thêm điểm cộng
          </Button>
        </div>
        {err('bonuses')}
      </fieldset>

      <fieldset className="submission-form__field submission-form__fieldset" aria-describedby={describedBy('penalties')}>
        <legend>
          Điểm trừ (từ {PENALTY_MIN} đến {PENALTY_MAX} điểm, Ban điều hành rà soát trước khi công bố)
        </legend>
        {draft.penalties.map((p, i) => (
          <div key={`p-${String(i)}`} className="ws-entry">
            <NumberField
              label="Số điểm trừ"
              value={p.points}
              min={PENALTY_MIN}
              max={PENALTY_MAX}
              step={1}
              onChange={(n) => {
                set({ penalties: draft.penalties.map((x, j) => (j === i ? { ...x, points: n } : x)) });
              }}
            />
            <div className="submission-form__field">
              <label htmlFor={`${id}-pr-${String(i)}`}>Vi phạm</label>
              <input
                id={`${id}-pr-${String(i)}`}
                value={p.reason}
                onChange={(e) => {
                  set({ penalties: draft.penalties.map((x, j) => (j === i ? { ...x, reason: e.target.value } : x)) });
                }}
              />
            </div>
            <Button
              size="sm"
              variant="quiet"
              onClick={() => {
                set({ penalties: draft.penalties.filter((_, j) => j !== i) });
              }}
            >
              Bỏ<span className="visually-hidden"> điểm trừ {i + 1}</span>
            </Button>
          </div>
        ))}
        <div className="cluster">
          <Button
            size="sm"
            variant="secondary"
            iconStart="plus"
            onClick={() => {
              set({ penalties: [...draft.penalties, { points: 10, reason: '' }] });
            }}
          >
            Thêm điểm trừ
          </Button>
        </div>
        {err('penalties')}
      </fieldset>

      <div className="submission-form__field">
        <label htmlFor={`${id}-note`}>Căn cứ và nhận xét</label>
        <textarea
          id={`${id}-note`}
          rows={3}
          value={draft.note}
          aria-describedby={describedBy('note')}
          onChange={(e) => {
            set({ note: e.target.value });
          }}
        />
        {err('note')}
      </div>

      <p className="ws-score__preview" role="status">
        {preview === null || Object.keys(errors).length > 0
          ? 'Nhập đủ các ô để xem tổng điểm dự kiến.'
          : `Tổng điểm dự kiến: ${formatPoints(preview.total)} điểm, xếp loại ${GRADE_LABELS[preview.grade]}.`}
      </p>
      {scores.error === '' ? null : (
        <p className="submission-form__error" role="alert">
          {scores.error}
        </p>
      )}
      <div className="submission-form__actions cluster">
        <Button type="submit" variant="primary" disabled={scores.busy}>
          Lưu điểm
        </Button>
        <Button type="button" variant="quiet" onClick={onClose}>
          Hủy
        </Button>
      </div>
    </form>
  );
}

function emptyRow(memberId: string): WsScore {
  return {
    memberId,
    framework: 'member',
    attendance: null,
    cooperation: null,
    lead: null,
    bonuses: [],
    penalties: [],
    note: '',
    scoredBy: null,
    scoredAt: null,
    stats: null,
    feedback: '',
    feedbackAt: null,
    decision: '',
    decidedBy: null,
    decidedAt: null,
  };
}

/* ── BĐH answers feedback ─────────────────────────────────────────── */

function DecisionDialog({ snapshot, scores, row, onClose }: { snapshot: WsSnapshot; scores: ScoreSheetState; row: WsScore | null; onClose: () => void }) {
  const id = useId();
  const [text, setText] = useState('');
  if (row === null) return null;
  const close = () => {
    setText('');
    onClose();
  };
  return (
    <ConfirmDialog
      open
      title={`Trả lời phản hồi: ${nameOf(snapshot, row.memberId)}`}
      confirmLabel="Gửi ý kiến"
      confirmDisabled={scores.busy || text.trim().length < 10}
      onConfirm={() => {
        void scores.decide(row.memberId, text).then((ok) => {
          if (ok) close();
        });
      }}
      onCancel={close}
    >
      <div className="submission-form stack stack--sm">
        <p>{row.feedback}</p>
        <div className="submission-form__field">
          <label htmlFor={`${id}-decision`}>Ý kiến của Ban điều hành (tối thiểu 10 ký tự)</label>
          <textarea
            id={`${id}-decision`}
            rows={3}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
            }}
          />
        </div>
        <p className="submission-form__hint">Nếu cần điều chỉnh điểm, Ban điều hành cập nhật điểm của thành viên trước khi chốt bảng điểm.</p>
        {scores.error === '' ? null : (
          <p className="submission-form__error" role="alert">
            {scores.error}
          </p>
        )}
      </div>
    </ConfirmDialog>
  );
}

/* ── The tab ──────────────────────────────────────────────────────── */

function statusNote(sheet: WsScoreSheet, now: Millis): string {
  if (sheet.status === 'draft') {
    const { from, to } = scoringWindow(sheet.month);
    const when = `từ ngày ${formatDate(from)} đến hết ngày ${formatDate(to - 1)}`;
    return `Trưởng ban chấm thành viên trong ban, Ban điều hành chấm trưởng ban và đánh giá chéo ${when}${now >= from && now < to ? ' (đang trong thời gian chấm)' : ''}. Ban Nhân sự kiểm tra trước khi Ban điều hành công bố.`;
  }
  const deadline = feedbackDeadline(sheet);
  if (sheet.status === 'published' && deadline !== null) {
    return now < deadline
      ? `Thành viên xem điểm của mình và gửi phản hồi trước ${at(deadline)}. Ban điều hành trả lời phản hồi rồi chốt bảng điểm.`
      : 'Thời hạn phản hồi đã kết thúc. Ban điều hành trả lời phản hồi rồi chốt bảng điểm.';
  }
  return sheet.finalizedAt === null ? 'Bảng điểm đã chốt.' : `Bảng điểm đã chốt lúc ${formatDue(sheet.finalizedAt)}.`;
}

const ACTION_TEXT: Record<SheetAction, { label: string; title: string; body: string }> = {
  publish: {
    label: 'Công bố bảng điểm',
    title: 'Công bố bảng điểm',
    body: 'Điểm A, B, C được chốt theo công việc hiện tại. Mỗi thành viên xem được điểm của mình và có 3 ngày để gửi phản hồi. Sau khi công bố, chỉ Ban điều hành điều chỉnh được điểm.',
  },
  finalize: {
    label: 'Chốt bảng điểm',
    title: 'Chốt bảng điểm',
    body: 'Điểm A, B, C được cập nhật lần cuối theo công việc hiện tại. Sau khi chốt, bảng điểm không thể chỉnh sửa và không nhận thêm phản hồi.',
  },
};

/** "Bảng điểm": the monthly points of the Masterplan, scored by the heads and BĐH, published, answered and finalised. */
export function WorkspaceScores({ snapshot, me, now }: Props) {
  const [month, setMonth] = useState<MonthKey>(() => monthKeyOf(now));
  const scores = useScoreSheet(month);
  const [editing, setEditing] = useState<string | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [deciding, setDeciding] = useState<WsScore | null>(null);
  const [confirm, setConfirm] = useState<SheetAction | null>(null);
  const thisMonth = monthKeyOf(now);
  const sheet = scores.sheet;

  const go = (delta: number) => {
    setMonth((m) => shiftMonth(m, delta));
    setEditing(null);
    setViewing(null);
  };

  const nav = (
    <div className="stack stack--sm">
      <h2 className="workspace__h2" aria-live="polite">
        Bảng điểm {formatMonth(month)}
      </h2>
      <div className="cluster cluster--sm">
        <Button
          variant="quiet"
          size="sm"
          iconStart="chevron-left"
          onClick={() => {
            go(-1);
          }}
        >
          Tháng trước
        </Button>
        <Button
          variant="quiet"
          size="sm"
          iconEnd="chevron-right"
          disabled={month >= thisMonth}
          onClick={() => {
            go(1);
          }}
        >
          Tháng sau
        </Button>
      </div>
    </div>
  );

  if (sheet === null) {
    return (
      <div className="stack stack--lg">
        {nav}
        {scores.error === '' ? (
          <p className="workspace__note" role="status">
            Đang tải bảng điểm…
          </p>
        ) : (
          <div className="stack stack--sm">
            <p className="workspace__error" role="alert">
              {scores.error}
            </p>
            <div className="cluster">
              <Button variant="secondary" onClick={scores.reload}>
                Thử lại
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const rowOf = (id: string) => sheet.scores.find((s) => s.memberId === id);
  const resultOf = (m: WsMember) => rowResult(rowOf(m.id), statsFor(snapshot, rowOf(m.id), m.id, sheet.month));
  const rows = visibleRows(sheet, me, snapshot.members, snapshot.hrAssignments).filter((m) => m.id !== me.id);
  const unscored = unscoredMembers(sheet, snapshot.members);
  const mine = sheet.status === 'draft' ? undefined : rowOf(me.id);
  const mineResult = mine === undefined ? null : resultOf(me);
  const deadline = feedbackDeadline(sheet);
  const editingMember = snapshot.members.find((m) => m.id === editing);
  const viewingMember = snapshot.members.find((m) => m.id === viewing);
  const viewingRow = viewingMember ? rowOf(viewingMember.id) : undefined;
  const viewingResult = viewingMember ? resultOf(viewingMember) : null;
  const actions = sheetActions(sheet, me);

  return (
    <div className="stack stack--xl">
      <div className="stack stack--md">
        {nav}
        <div className="cluster cluster--sm">
          <StatusTag tone={SHEET_TONES[sheet.status]}>{SHEET_STATUS_LABELS[sheet.status]}</StatusTag>
          {sheet.status === 'draft' && (seesWholeSheet(me) || rows.length > 0) ? (
            <span className="workspace__note">
              Đã chấm {snapshot.members.filter((m) => m.status === 'active').length - unscored.length}/{snapshot.members.filter((m) => m.status === 'active').length} thành viên
            </span>
          ) : null}
        </div>
        <p className="workspace__note">{statusNote(sheet, now)}</p>
        {actions.length > 0 ? (
          <div className="stack stack--sm">
            <div className="cluster">
              {actions.map((a) => (
                <Button
                  key={a}
                  variant="primary"
                  disabled={scores.busy || (a === 'publish' && unscored.length > 0)}
                  onClick={() => {
                    setConfirm(a);
                  }}
                >
                  {ACTION_TEXT[a].label}
                </Button>
              ))}
            </div>
            {actions.includes('publish') && unscored.length > 0 ? (
              <p className="workspace__note">Chưa chấm: {unscored.map((m) => m.fullName).join(', ')}.</p>
            ) : null}
          </div>
        ) : null}
        {scores.error !== '' && editing === null && deciding === null ? (
          <p className="workspace__error" role="alert">
            {scores.error}
          </p>
        ) : null}
      </div>

      {mine && mineResult ? (
        <section className="stack stack--md" aria-labelledby="ws-my-score">
          <h2 id="ws-my-score" className="workspace__h2">
            Điểm của tôi
          </h2>
          <ScoreCard snapshot={snapshot} sheet={sheet} member={me} row={mine} result={mineResult}>
            {deadline !== null && canSendFeedback(sheet, me, now) ? <FeedbackForm scores={scores} deadline={deadline} /> : null}
          </ScoreCard>
        </section>
      ) : null}

      {editingMember ? (
        <ScoreForm
          key={`${sheet.month}-${editingMember.id}`}
          snapshot={snapshot}
          sheet={sheet}
          scores={scores}
          member={editingMember}
          row={rowOf(editingMember.id)}
          onClose={() => {
            setEditing(null);
          }}
        />
      ) : null}

      {viewingMember && viewingRow && viewingResult && editing === null ? (
        <ScoreCard snapshot={snapshot} sheet={sheet} member={viewingMember} row={viewingRow} result={viewingResult}>
          <div className="cluster">
            <Button
              size="sm"
              variant="quiet"
              onClick={() => {
                setViewing(null);
              }}
            >
              Đóng
            </Button>
          </div>
        </ScoreCard>
      ) : null}

      {rows.length === 0 ? (
        mine === undefined ? (
          <p className="workspace__note">{sheet.status === 'draft' ? 'Bảng điểm tháng này chưa được công bố.' : 'Bạn chưa có điểm trong tháng này.'}</p>
        ) : null
      ) : (
        snapshot.departments.map((d) => {
          const list = membersOf(rows, d.id);
          if (list.length === 0) return null;
          return (
            <section key={d.id} className="stack stack--sm" aria-labelledby={`ws-scores-${d.id}`}>
              <h2 id={`ws-scores-${d.id}`} className="workspace__h2">
                {d.name}
              </h2>
              <div className="ws-table-wrap">
                <table className="ws-table">
                  <caption className="visually-hidden">
                    Điểm {formatMonth(sheet.month)}, {d.name}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Thành viên</th>
                      <th scope="col">Khung chấm</th>
                      <th scope="col">Cơ bản</th>
                      <th scope="col">Cộng</th>
                      <th scope="col">Trừ</th>
                      <th scope="col">Tổng</th>
                      <th scope="col">Xếp loại</th>
                      <th scope="col">
                        <span className="visually-hidden">Thao tác</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((m) => {
                      const row = rowOf(m.id);
                      const result = resultOf(m);
                      const editable = canEditScore(sheet, me, m);
                      return (
                        <tr key={m.id}>
                          <th scope="row">
                            {m.fullName}
                            {row && row.feedback !== '' ? <span className="ws-score__flag"> · Có phản hồi</span> : null}
                          </th>
                          <td>{FRAMEWORK_LABELS[frameworkFor(m)]}</td>
                          <td className="mono">{result ? formatPoints(result.base) : '—'}</td>
                          <td className="mono">{result ? `+${formatPoints(result.bonus)}` : '—'}</td>
                          <td className="mono">{result ? `−${formatPoints(result.penalty)}` : '—'}</td>
                          <td className="mono">
                            <strong>{result ? formatPoints(result.total) : '—'}</strong>
                          </td>
                          <td>{result ? <StatusTag tone={GRADE_TONES[result.grade]}>{GRADE_LABELS[result.grade]}</StatusTag> : <StatusTag tone="neutral">Chưa chấm</StatusTag>}</td>
                          <td>
                            <div className="cluster cluster--sm">
                              {editable ? (
                                <Button
                                  size="sm"
                                  variant={result ? 'quiet' : 'secondary'}
                                  onClick={() => {
                                    setViewing(null);
                                    setEditing(m.id);
                                  }}
                                >
                                  {result ? 'Cập nhật' : 'Chấm điểm'}
                                  <span className="visually-hidden"> {m.fullName}</span>
                                </Button>
                              ) : null}
                              {result ? (
                                <Button
                                  size="sm"
                                  variant="quiet"
                                  onClick={() => {
                                    setEditing(null);
                                    setViewing(m.id);
                                  }}
                                >
                                  Chi tiết<span className="visually-hidden"> {m.fullName}</span>
                                </Button>
                              ) : null}
                              {row && canDecide(sheet, me, row) ? (
                                <Button
                                  size="sm"
                                  variant="quiet"
                                  onClick={() => {
                                    setDeciding(row);
                                  }}
                                >
                                  Trả lời phản hồi<span className="visually-hidden"> {m.fullName}</span>
                                </Button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })
      )}

      <DecisionDialog
        snapshot={snapshot}
        scores={scores}
        row={deciding}
        onClose={() => {
          setDeciding(null);
        }}
      />
      {confirm === null ? null : (
        <ConfirmDialog
          open
          title={`${ACTION_TEXT[confirm].title} ${formatMonth(sheet.month)}`}
          confirmLabel={ACTION_TEXT[confirm].label}
          confirmDisabled={scores.busy}
          onConfirm={() => {
            void scores.act(confirm).then((ok) => {
              if (ok) setConfirm(null);
            });
          }}
          onCancel={() => {
            setConfirm(null);
          }}
        >
          <div className="stack stack--sm">
            <p>{ACTION_TEXT[confirm].body}</p>
            {confirm === 'finalize' && deadline !== null && now < deadline ? <p className="submission-form__hint">Thời hạn phản hồi của thành viên còn đến {at(deadline)}.</p> : null}
            {scores.error === '' ? null : (
              <p className="submission-form__error" role="alert">
                {scores.error}
              </p>
            )}
          </div>
        </ConfirmDialog>
      )}
    </div>
  );
}
