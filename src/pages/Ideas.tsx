import { useId, useState, type ReactNode } from 'react';
import { Button } from '../components/atoms/Button';
import { Chip } from '../components/atoms/Chip';
import { DemoLabel } from '../components/atoms/DemoLabel';
import { LineBadge } from '../components/atoms/LineBadge';
import type { StatusTone } from '../components/atoms/StatusTag';
import { StatusTag } from '../components/atoms/StatusTag';
import { VisuallyHidden } from '../components/atoms/VisuallyHidden';
import { ConfirmDialog } from '../components/molecules/ConfirmDialog';
import { PageHead } from '../components/molecules/PageHead';
import { ProposalCard } from '../components/molecules/ProposalCard';
import { SetupInvite } from '../components/molecules/SetupInvite';
import { ActivityProposalForm, CollaborationForm } from '../components/organisms/ProposalForm';
import { CLUBS } from '../data/clubs';
import { studentClubs } from '../domain/clubs';
import { formatDate, toIsoDateTime, toMillis } from '../domain/dates';
import { gradesLabel } from '../domain/events';
import { charCount } from '../domain/moderation';
import {
  ACTIVITY_STATUS_LABELS,
  activityProposalFromDraft,
  COLLABORATION_STATUS_LABELS,
  collaborationFromDraft,
  PROPOSAL_LIMITS,
  proposalMonthLabel,
  proposalMonths,
  responseError,
  validateActivityDraft,
  validateCollaborationDraft,
} from '../domain/proposals';
import type { ActivityProposalDraft, Club, CollaborationDraft, ProposalResponse, ProposalStatus } from '../domain/types';
import { useSetupHref } from '../router/Router';
import { newId } from '../state/effects';
import {
  selectActivityProposals,
  selectClubCollaborations,
  selectCollaborations,
  selectProposalsForClub,
  type ActivityProposalView,
  type CollaborationView,
} from '../state/selectors';
import { useCatalog, type Catalog } from '../state/useCatalog';
import './Ideas.css';

const TONES: Record<ProposalStatus, StatusTone> = { pending: 'neutral', accepted: 'ok', declined: 'stop' };
/**
 * Student clubs only: the clubs a student proposal can name or be handed to, and the only ones that
 * send or receive collaboration proposals. HĐHS reviews proposals (offered separately) and the
 * offices (Phòng Cố vấn Học tập) take no part in Đề xuất.
 */
const STUDENT_CLUBS = studentClubs(CLUBS);
const KNOWN_CLUB_IDS: ReadonlySet<string> = new Set(STUDENT_CLUBS.map((c) => c.id));
const EYEBROW = 'Đề xuất · Năm học 2026–2027';

function SentOn({ at }: { at: string }) {
  return (
    <>
      Gửi ngày <time dateTime={at}>{formatDate(toMillis(at))}</time>
    </>
  );
}

function StatusNote({ text }: { text: string }) {
  return text === '' ? null : (
    <p className="ideas__status">
      <StatusTag tone="ok">Đã ghi nhận</StatusTag> {text}
    </p>
  );
}

/* ── Cards ───────────────────────────────────────────────────────────── */

function activityResponse(view: ActivityProposalView, clubName: Catalog['clubName']) {
  const r = view.response;
  if (!r) return null;
  const assigned = r.status === 'accepted' && r.assignedClubId ? ` · Câu lạc bộ phụ trách: ${clubName(r.assignedClubId)}` : '';
  return { heading: `Hội đồng Học sinh phản hồi ngày ${formatDate(toMillis(r.at))}${assigned}`, note: r.note };
}

function ActivityCard({ view, catalog, actions, showSupport = true }: { view: ActivityProposalView; catalog: Catalog; actions?: ReactNode; showSupport?: boolean }) {
  const p = view.proposal;
  const details = [gradesLabel(p.grades), p.clubId ? `Câu lạc bộ đề xuất: ${catalog.clubName(p.clubId)}` : 'Chưa đề xuất câu lạc bộ cụ thể'];
  return (
    <ProposalCard
      category={p.category}
      title={p.title}
      description={p.description}
      details={details}
      meta={
        <>
          {view.mine ? 'Đề xuất của bạn' : `Học sinh khối ${String(p.authorGrade)}`} · <SentOn at={p.submittedAt} />
        </>
      }
      status={{ label: ACTIVITY_STATUS_LABELS[view.status], tone: TONES[view.status] }}
      response={activityResponse(view, catalog.clubName)}
      aside={
        showSupport ? (
          <>
            <span className="mono">{view.support}</span> học sinh ủng hộ
          </>
        ) : undefined
      }
      actions={actions}
    />
  );
}

function CollaborationCard({ view, catalog, meta, actions }: { view: CollaborationView; catalog: Catalog; meta: string; actions?: ReactNode }) {
  const p = view.proposal;
  const r = view.response;
  return (
    <ProposalCard
      category={p.category}
      title={p.title}
      description={p.description}
      details={[`Thời gian dự kiến: ${proposalMonthLabel(p.month)}`]}
      meta={
        <>
          {meta} · <SentOn at={p.submittedAt} />
        </>
      }
      status={{ label: COLLABORATION_STATUS_LABELS[view.status], tone: TONES[view.status] }}
      response={r ? { heading: `${catalog.clubName(r.by)} phản hồi ngày ${formatDate(toMillis(r.at))}`, note: r.note } : null}
      actions={actions}
    />
  );
}

function CardList({ children, label }: { children: ReactNode; label: string }) {
  return (
    <ul className="ideas__grid" aria-label={label}>
      {children}
    </ul>
  );
}

/* ── Dialogs ─────────────────────────────────────────────────────────── */

interface AnswerTarget {
  id: string;
  title: string;
  kind: 'activity' | 'collaboration';
  status: ProposalResponse['status'];
  /** The club the student named (activity) — the default club to hand an accepted proposal to. */
  clubId: string | null;
}

const ANSWER_COPY = {
  activity: {
    accepted: { title: 'Tiếp nhận đề xuất', confirm: 'Tiếp nhận', note: 'Phản hồi gửi học sinh (không bắt buộc)' },
    declined: { title: 'Không tiếp nhận đề xuất', confirm: 'Không tiếp nhận', note: 'Lý do (bắt buộc)' },
  },
  collaboration: {
    accepted: { title: 'Đồng ý hợp tác', confirm: 'Đồng ý hợp tác', note: 'Ghi chú gửi câu lạc bộ đề xuất (không bắt buộc)' },
    declined: { title: 'Từ chối đề xuất hợp tác', confirm: 'Từ chối', note: 'Lý do (bắt buộc)' },
  },
} as const;

/** Accept or decline one proposal. A decline always carries a reason. */
function AnswerDialog({ target, onAnswer, onCancel }: { target: AnswerTarget | null; onAnswer: (note: string, assignedClubId: string | null) => void; onCancel: () => void }) {
  const uid = useId();
  const [seen, setSeen] = useState<AnswerTarget | null>(null);
  const [note, setNote] = useState('');
  const [clubId, setClubId] = useState('');
  const [error, setError] = useState('');
  if (seen !== target) {
    setSeen(target);
    setNote('');
    setError('');
    setClubId(target?.clubId ?? '');
  }
  const copy = target ? ANSWER_COPY[target.kind][target.status] : null;
  const confirm = () => {
    if (!target) return;
    const problem = responseError(target.status, note);
    if (problem !== null) {
      setError(problem);
      return;
    }
    onAnswer(note.trim(), target.kind === 'activity' && target.status === 'accepted' && clubId !== '' ? clubId : null);
  };
  return (
    <ConfirmDialog
      open={target !== null}
      title={copy?.title ?? ''}
      confirmLabel={copy?.confirm ?? ''}
      tone={target?.status === 'declined' ? 'stop' : 'default'}
      onConfirm={confirm}
      onCancel={onCancel}
    >
      <p className="ideas__dialog-title">{target?.title}</p>
      {target?.kind === 'activity' && target.status === 'accepted' ? (
        <div className="ideas__field">
          <label htmlFor={`${uid}-club`}>Đơn vị phụ trách triển khai</label>
          <select
            id={`${uid}-club`}
            value={clubId}
            onChange={(e) => {
              setClubId(e.target.value);
            }}
          >
            <option value="">Hội đồng Học sinh</option>
            {STUDENT_CLUBS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.shortName}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div className="ideas__field">
        <label htmlFor={`${uid}-note`}>{copy?.note}</label>
        <textarea
          id={`${uid}-note`}
          rows={4}
          value={note}
          aria-invalid={error !== '' ? true : undefined}
          aria-describedby={[error !== '' ? `${uid}-error` : null, `${uid}-count`].filter(Boolean).join(' ')}
          onChange={(e) => {
            setNote(e.target.value);
            setError('');
          }}
        />
        <span id={`${uid}-count`} className="ideas__count">
          {charCount(note)}/{PROPOSAL_LIMITS.noteMax} ký tự
        </span>
        {error !== '' ? (
          <span id={`${uid}-error`} className="ideas__error">
            {error}
          </span>
        ) : null}
      </div>
      <p className="ideas__muted">
        {target?.kind === 'activity'
          ? 'Phản hồi được hiển thị cùng đề xuất để học sinh gửi đề xuất và học sinh ủng hộ cùng theo dõi.'
          : 'Câu lạc bộ gửi đề xuất sẽ nhận được phản hồi này trên trang Đề xuất hợp tác.'}
      </p>
    </ConfirmDialog>
  );
}

function WithdrawDialog({ target, onConfirm, onCancel }: { target: { id: string; title: string } | null; onConfirm: () => void; onCancel: () => void }) {
  return (
    <ConfirmDialog open={target !== null} title="Rút đề xuất" confirmLabel="Rút đề xuất" tone="stop" onConfirm={onConfirm} onCancel={onCancel}>
      <p className="ideas__dialog-title">{target?.title}</p>
      <p>Đề xuất sẽ được gỡ khỏi danh sách và không được xem xét. Thao tác này không thể hoàn tác.</p>
    </ConfirmDialog>
  );
}

/* ── Học sinh ────────────────────────────────────────────────────────── */

type StatusFilter = 'all' | ProposalStatus;
const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'pending', label: ACTIVITY_STATUS_LABELS.pending },
  { value: 'accepted', label: ACTIVITY_STATUS_LABELS.accepted },
  { value: 'declined', label: ACTIVITY_STATUS_LABELS.declined },
];

function StudentIdeas({ catalog }: { catalog: Catalog }) {
  const { state, dispatch, now } = catalog;
  const [status, setStatus] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [withdrawing, setWithdrawing] = useState<{ id: string; title: string } | null>(null);
  const views = selectActivityProposals(state);
  const mine = views.filter((v) => v.mine);
  const others = views.filter((v) => !v.mine);
  const shown = filter === 'all' ? others : others.filter((v) => v.status === filter);
  const grade = state.profile?.grade;
  // A visitor reads the proposals; sending and supporting wait for the profile (DESIGN.md §7.2).
  const guest = state.profile === null;
  const setupHref = useSetupHref();

  const submit = (draft: ActivityProposalDraft) => {
    const errors = validateActivityDraft(draft, KNOWN_CLUB_IDS);
    if (Object.keys(errors).length > 0 || grade === undefined) return errors;
    dispatch({ type: 'proposal/submit', proposal: activityProposalFromDraft(draft, { id: newId('dx'), now, authorGrade: grade }) });
    setStatus(`Đã gửi đề xuất “${draft.title}”. Hội đồng Học sinh sẽ xem xét và phản hồi trên trang này.`);
    return {};
  };

  return (
    <>
      <PageHead
        eyebrow={EYEBROW}
        title="Đề xuất hoạt động"
        lead="Học sinh đề xuất hoạt động hoặc sự kiện mong muốn được tổ chức trong năm học. Hội đồng Học sinh xem xét, phản hồi kèm lý do và chuyển đề xuất được tiếp nhận tới câu lạc bộ phù hợp."
      >
        <DemoLabel />
      </PageHead>

      <p className="visually-hidden" role="status">
        {status}
      </p>

      <section className="band band--surface" aria-labelledby="ideas-form">
        <div className="container ideas__layout">
          <div className="stack stack--md">
            <h2 id="ideas-form" className="ideas__title">
              Gửi đề xuất
            </h2>
            {guest ? (
              <SetupInvite
                headingLevel={3}
                title="Thiết lập hồ sơ để gửi đề xuất"
                text="Đề xuất được gửi kèm khối của người gửi, vì vậy học sinh cần thiết lập hồ sơ trước khi gửi hoặc ủng hộ đề xuất. Bạn vẫn có thể xem các đề xuất và phản hồi của Hội đồng Học sinh bên dưới."
                to={setupHref}
              />
            ) : (
              <>
                <StatusNote text={status} />
                <ActivityProposalForm clubs={STUDENT_CLUBS} defaultGrades={grade === undefined ? [] : [grade]} onSubmit={submit} />
              </>
            )}
          </div>
          <aside className="ideas__aside" aria-label="Nguyên tắc gửi đề xuất">
            <h3>Nguyên tắc gửi đề xuất</h3>
            <ol>
              <li>Đề xuất được hiển thị kèm khối của người gửi, không hiển thị họ tên.</li>
              <li>Không ghi số điện thoại, địa chỉ thư điện tử hoặc thông tin cá nhân trong đề xuất.</li>
              <li>Hội đồng Học sinh phản hồi mọi đề xuất kèm lý do và giao câu lạc bộ phụ trách khi tiếp nhận.</li>
              <li>Học sinh có thể ủng hộ đề xuất của học sinh khác để Hội đồng Học sinh nắm được mức độ quan tâm.</li>
            </ol>
          </aside>
        </div>
      </section>

      {mine.length > 0 ? (
        <section className="band" aria-labelledby="ideas-mine">
          <div className="container stack stack--md">
            <h2 id="ideas-mine" className="ideas__title">
              Đề xuất bạn đã gửi
            </h2>
            <CardList label="Đề xuất bạn đã gửi">
              {mine.map((v) => (
                <li key={v.proposal.id}>
                  <ActivityCard
                    view={v}
                    catalog={catalog}
                    showSupport={false}
                    actions={
                      v.status === 'pending' ? (
                        <Button
                          size="sm"
                          variant="quiet"
                          iconStart="trash"
                          onClick={() => {
                            setWithdrawing({ id: v.proposal.id, title: v.proposal.title });
                          }}
                        >
                          Rút đề xuất
                        </Button>
                      ) : undefined
                    }
                  />
                </li>
              ))}
            </CardList>
          </div>
        </section>
      ) : null}

      <section className={mine.length > 0 ? 'band band--surface' : 'band'} aria-labelledby="ideas-all">
        <div className="container stack stack--md">
          <h2 id="ideas-all" className="ideas__title">
            Đề xuất của học sinh
          </h2>
          <div className="ideas__filters" role="group" aria-label="Lọc theo trạng thái">
            {FILTERS.map((f) => (
              <Chip
                key={f.value}
                pressed={filter === f.value}
                onClick={() => {
                  setFilter(f.value);
                }}
              >
                {f.label} <span className="mono">{f.value === 'all' ? others.length : others.filter((v) => v.status === f.value).length}</span>
              </Chip>
            ))}
          </div>
          {shown.length === 0 ? (
            <p className="ideas__muted">Không có đề xuất nào ở trạng thái này.</p>
          ) : (
            <CardList label="Đề xuất của học sinh">
              {shown.map((v) => (
                <li key={v.proposal.id}>
                  <ActivityCard
                    view={v}
                    catalog={catalog}
                    actions={
                      v.status === 'pending' && !guest ? (
                        <Chip
                          pressed={v.supportedByMe}
                          onClick={() => {
                            dispatch({ type: 'proposal/toggleSupport', id: v.proposal.id });
                          }}
                        >
                          Ủng hộ<VisuallyHidden> đề xuất “{v.proposal.title}”</VisuallyHidden>
                        </Chip>
                      ) : v.response?.assignedClubId ? (
                        <ClubLink club={catalog.clubById(v.response.assignedClubId)} />
                      ) : undefined
                    }
                  />
                </li>
              ))}
            </CardList>
          )}
        </div>
      </section>

      <WithdrawDialog
        target={withdrawing}
        onCancel={() => {
          setWithdrawing(null);
        }}
        onConfirm={() => {
          if (!withdrawing) return;
          dispatch({ type: 'proposal/withdraw', id: withdrawing.id });
          setStatus(`Đã rút đề xuất “${withdrawing.title}”.`);
          setWithdrawing(null);
        }}
      />
    </>
  );
}

function ClubLink({ club }: { club: Club | undefined }) {
  return club ? (
    <Button size="sm" variant="quiet" iconEnd="arrow-right" to={`/cau-lac-bo/${club.slug}`}>
      Xem {club.shortName}
    </Button>
  ) : null;
}

/* ── Hội đồng Học sinh ───────────────────────────────────────────────── */

function ModeratorIdeas({ catalog }: { catalog: Catalog }) {
  const { state, dispatch, now, clubName } = catalog;
  const [status, setStatus] = useState('');
  const [answering, setAnswering] = useState<AnswerTarget | null>(null);
  const views = selectActivityProposals(state);
  const pending = views.filter((v) => v.status === 'pending');
  const answered = views.filter((v) => v.status !== 'pending');
  const collaborations = selectCollaborations(state);

  const ask = (v: ActivityProposalView, answer: ProposalResponse['status']) => {
    setAnswering({ id: v.proposal.id, title: v.proposal.title, kind: 'activity', status: answer, clubId: v.proposal.clubId });
  };

  return (
    <>
      <PageHead
        eyebrow="Dành cho Hội đồng Học sinh"
        title="Đề xuất hoạt động"
        lead="Hội đồng Học sinh xem xét đề xuất của học sinh, tiếp nhận và giao đơn vị phụ trách, hoặc phản hồi lý do chưa tiếp nhận."
      >
        <p className="ideas__count">
          <span className="mono">{pending.length}</span> đề xuất đang chờ xem xét
        </p>
      </PageHead>

      <p className="visually-hidden" role="status">
        {status}
      </p>

      <section className="band band--surface" aria-labelledby="ideas-pending">
        <div className="container stack stack--md">
          <h2 id="ideas-pending" className="ideas__title">
            Đề xuất cần xem xét
          </h2>
          <StatusNote text={status} />
          {pending.length === 0 ? (
            <p className="ideas__muted">Không có đề xuất nào đang chờ xem xét. Đề xuất mới của học sinh sẽ xuất hiện tại đây.</p>
          ) : (
            <CardList label="Đề xuất cần xem xét">
              {pending.map((v) => (
                <li key={v.proposal.id}>
                  <ActivityCard
                    view={v}
                    catalog={catalog}
                    actions={
                      <>
                        <Button
                          size="sm"
                          variant="primary"
                          iconStart="check"
                          onClick={() => {
                            ask(v, 'accepted');
                          }}
                        >
                          Tiếp nhận<VisuallyHidden> đề xuất “{v.proposal.title}”</VisuallyHidden>
                        </Button>
                        <Button
                          size="sm"
                          variant="quiet"
                          onClick={() => {
                            ask(v, 'declined');
                          }}
                        >
                          Không tiếp nhận<VisuallyHidden> đề xuất “{v.proposal.title}”</VisuallyHidden>
                        </Button>
                      </>
                    }
                  />
                </li>
              ))}
            </CardList>
          )}
        </div>
      </section>

      <section className="band" aria-labelledby="ideas-answered">
        <div className="container stack stack--md">
          <h2 id="ideas-answered" className="ideas__title">
            Đề xuất đã phản hồi
          </h2>
          <CardList label="Đề xuất đã phản hồi">
            {answered.map((v) => (
              <li key={v.proposal.id}>
                <ActivityCard view={v} catalog={catalog} />
              </li>
            ))}
          </CardList>
        </div>
      </section>

      <section className="band band--surface" aria-labelledby="ideas-collaborations">
        <div className="container stack stack--md">
          <h2 id="ideas-collaborations" className="ideas__title">
            Đề xuất hợp tác giữa các câu lạc bộ
          </h2>
          <p className="ideas__muted">Câu lạc bộ trao đổi và thống nhất trực tiếp với nhau. Sự kiện phối hợp được gửi qua Cổng câu lạc bộ để Hội đồng Học sinh kiểm duyệt.</p>
          <CardList label="Đề xuất hợp tác giữa các câu lạc bộ">
            {collaborations.map((v) => (
              <li key={v.proposal.id}>
                <CollaborationCard view={v} catalog={catalog} meta={`${clubName(v.proposal.fromClubId)} đề xuất tới ${clubName(v.proposal.toClubId)}`} />
              </li>
            ))}
          </CardList>
        </div>
      </section>

      <AnswerDialog
        target={answering}
        onCancel={() => {
          setAnswering(null);
        }}
        onAnswer={(note, assignedClubId) => {
          if (!answering) return;
          dispatch({ type: 'proposal/respond', id: answering.id, response: { status: answering.status, at: toIsoDateTime(now), by: 'hdhs', note, assignedClubId } });
          setStatus(
            answering.status === 'accepted'
              ? `Đã tiếp nhận đề xuất “${answering.title}”${assignedClubId ? ` và giao ${clubName(assignedClubId)} phụ trách` : ''}.`
              : `Đã phản hồi chưa tiếp nhận đề xuất “${answering.title}”.`,
          );
          setAnswering(null);
        }}
      />
    </>
  );
}

/* ── Câu lạc bộ ──────────────────────────────────────────────────────── */

function ClubIdeas({ catalog, club }: { catalog: Catalog; club: Club }) {
  const { state, dispatch, now, clubName } = catalog;
  const [status, setStatus] = useState('');
  const [answering, setAnswering] = useState<AnswerTarget | null>(null);
  const [withdrawing, setWithdrawing] = useState<{ id: string; title: string } | null>(null);
  const { incoming, outgoing } = selectClubCollaborations(state, club.id);
  const related = selectProposalsForClub(state, club.id);
  const months = proposalMonths(now);

  const submit = (draft: CollaborationDraft) => {
    const errors = validateCollaborationDraft(draft, { fromClubId: club.id, knownClubIds: KNOWN_CLUB_IDS, now });
    if (Object.keys(errors).length > 0) return errors;
    dispatch({ type: 'collaboration/submit', proposal: collaborationFromDraft(draft, { id: newId('ht'), now, fromClubId: club.id }) });
    setStatus(`Đã gửi đề xuất hợp tác “${draft.title}” tới ${clubName(draft.toClubId)}.`);
    return {};
  };

  const portalLink = (
    <Button size="sm" variant="quiet" iconEnd="arrow-right" to="/cong-cau-lac-bo">
      Gửi sự kiện qua Cổng CLB
    </Button>
  );

  return (
    <>
      <PageHead
        eyebrow={
          <>
            Đề xuất hợp tác · {club.shortName}
            {club.categories.map((c) => (
              <LineBadge key={c} code={c} size="sm" />
            ))}
          </>
        }
        title="Đề xuất hợp tác"
        lead="Câu lạc bộ đề xuất phối hợp tổ chức hoạt động với câu lạc bộ khác. Sau khi hai bên thống nhất, câu lạc bộ chủ trì gửi sự kiện qua Cổng câu lạc bộ để Hội đồng Học sinh kiểm duyệt."
      >
        <div className="ideas__club">
          <label htmlFor="ideas-club-select">Câu lạc bộ đại diện</label>
          <select
            id="ideas-club-select"
            value={club.id}
            onChange={(e) => {
              dispatch({ type: 'club/setActive', clubId: e.target.value });
              setStatus('');
            }}
          >
            {STUDENT_CLUBS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.shortName}
              </option>
            ))}
          </select>
        </div>
      </PageHead>

      <p className="visually-hidden" role="status">
        {status}
      </p>

      <section className="band band--surface" aria-labelledby="ideas-collab-form">
        <div className="container ideas__layout">
          <div className="stack stack--md">
            <h2 id="ideas-collab-form" className="ideas__title">
              Gửi đề xuất hợp tác
            </h2>
            <StatusNote text={status} />
            <CollaborationForm key={club.id} fromClub={club} clubs={STUDENT_CLUBS} months={months} onSubmit={submit} />
          </div>
          <aside className="ideas__aside" aria-label="Quy trình hợp tác">
            <h3>Quy trình hợp tác</h3>
            <ol>
              <li>Câu lạc bộ gửi đề xuất hợp tác tới câu lạc bộ đối tác.</li>
              <li>Câu lạc bộ đối tác đồng ý hoặc từ chối kèm lý do.</li>
              <li>Sau khi thống nhất, câu lạc bộ chủ trì gửi sự kiện qua Cổng câu lạc bộ để Hội đồng Học sinh kiểm duyệt.</li>
            </ol>
          </aside>
        </div>
      </section>

      <section className="band" aria-labelledby="ideas-incoming">
        <div className="container stack stack--md">
          <h2 id="ideas-incoming" className="ideas__title">
            Đề xuất hợp tác nhận được
          </h2>
          {incoming.length === 0 ? (
            <p className="ideas__muted">{club.shortName} chưa nhận được đề xuất hợp tác nào.</p>
          ) : (
            <CardList label="Đề xuất hợp tác nhận được">
              {incoming.map((v) => (
                <li key={v.proposal.id}>
                  <CollaborationCard
                    view={v}
                    catalog={catalog}
                    meta={`Từ ${clubName(v.proposal.fromClubId)}`}
                    actions={
                      v.status === 'pending' ? (
                        <>
                          <Button
                            size="sm"
                            variant="primary"
                            iconStart="check"
                            onClick={() => {
                              setAnswering({ id: v.proposal.id, title: v.proposal.title, kind: 'collaboration', status: 'accepted', clubId: null });
                            }}
                          >
                            Đồng ý hợp tác<VisuallyHidden> “{v.proposal.title}”</VisuallyHidden>
                          </Button>
                          <Button
                            size="sm"
                            variant="quiet"
                            onClick={() => {
                              setAnswering({ id: v.proposal.id, title: v.proposal.title, kind: 'collaboration', status: 'declined', clubId: null });
                            }}
                          >
                            Từ chối<VisuallyHidden> đề xuất “{v.proposal.title}”</VisuallyHidden>
                          </Button>
                        </>
                      ) : v.status === 'accepted' ? (
                        portalLink
                      ) : undefined
                    }
                  />
                </li>
              ))}
            </CardList>
          )}
        </div>
      </section>

      <section className="band band--surface" aria-labelledby="ideas-outgoing">
        <div className="container stack stack--md">
          <h2 id="ideas-outgoing" className="ideas__title">
            Đề xuất hợp tác đã gửi
          </h2>
          {outgoing.length === 0 ? (
            <p className="ideas__muted">{club.shortName} chưa gửi đề xuất hợp tác nào. Đề xuất đã gửi sẽ được liệt kê tại đây cùng phản hồi của câu lạc bộ đối tác.</p>
          ) : (
            <CardList label="Đề xuất hợp tác đã gửi">
              {outgoing.map((v) => (
                <li key={v.proposal.id}>
                  <CollaborationCard
                    view={v}
                    catalog={catalog}
                    meta={`Gửi tới ${clubName(v.proposal.toClubId)}`}
                    actions={
                      v.status === 'accepted' ? (
                        portalLink
                      ) : v.mine && v.status === 'pending' ? (
                        <Button
                          size="sm"
                          variant="quiet"
                          iconStart="trash"
                          onClick={() => {
                            setWithdrawing({ id: v.proposal.id, title: v.proposal.title });
                          }}
                        >
                          Rút đề xuất
                        </Button>
                      ) : undefined
                    }
                  />
                </li>
              ))}
            </CardList>
          )}
        </div>
      </section>

      <section className="band" aria-labelledby="ideas-related">
        <div className="container stack stack--md">
          <h2 id="ideas-related" className="ideas__title">
            Đề xuất của học sinh liên quan tới câu lạc bộ
          </h2>
          {related.length === 0 ? (
            <p className="ideas__muted">Chưa có đề xuất nào của học sinh nêu tên hoặc được Hội đồng Học sinh giao cho {club.shortName}.</p>
          ) : (
            <CardList label="Đề xuất của học sinh liên quan tới câu lạc bộ">
              {related.map((v) => (
                <li key={v.proposal.id}>
                  <ActivityCard view={v} catalog={catalog} />
                </li>
              ))}
            </CardList>
          )}
        </div>
      </section>

      <AnswerDialog
        target={answering}
        onCancel={() => {
          setAnswering(null);
        }}
        onAnswer={(note) => {
          if (!answering) return;
          dispatch({ type: 'proposal/respond', id: answering.id, response: { status: answering.status, at: toIsoDateTime(now), by: club.id, note, assignedClubId: null } });
          setStatus(answering.status === 'accepted' ? `Đã đồng ý hợp tác “${answering.title}”.` : `Đã từ chối đề xuất hợp tác “${answering.title}”.`);
          setAnswering(null);
        }}
      />
      <WithdrawDialog
        target={withdrawing}
        onCancel={() => {
          setWithdrawing(null);
        }}
        onConfirm={() => {
          if (!withdrawing) return;
          dispatch({ type: 'proposal/withdraw', id: withdrawing.id });
          setStatus(`Đã rút đề xuất hợp tác “${withdrawing.title}”.`);
          setWithdrawing(null);
        }}
      />
    </>
  );
}

/** With the council or an office as the demo publisher: say so and let the visitor pick a club. */
function NotAClubIdeas({ catalog, publisher }: { catalog: Catalog; publisher: string }) {
  return (
    <PageHead
      eyebrow="Đề xuất hợp tác"
      title="Đề xuất hợp tác"
      lead={`${publisher} không tham gia Đề xuất hợp tác. Đề xuất hợp tác được gửi giữa các câu lạc bộ; vui lòng chọn một câu lạc bộ đại diện để xem và gửi đề xuất.`}
    >
      <div className="ideas__club">
        <label htmlFor="ideas-club-select">Câu lạc bộ đại diện</label>
        <select
          id="ideas-club-select"
          value=""
          onChange={(e) => {
            if (e.target.value !== '') catalog.dispatch({ type: 'club/setActive', clubId: e.target.value });
          }}
        >
          <option value="">Chọn câu lạc bộ</option>
          {STUDENT_CLUBS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.shortName}
            </option>
          ))}
        </select>
      </div>
    </PageHead>
  );
}

/** Đề xuất: students propose activities to HĐHS, clubs propose collaborations to each other, HĐHS answers students. */
export function IdeasPage() {
  const catalog = useCatalog();
  const { state } = catalog;
  // The demo roles act once a profile exists; a visitor always reads the student view.
  if (state.profile === null) return <StudentIdeas catalog={catalog} />;
  if (state.role === 'moderator') return <ModeratorIdeas catalog={catalog} />;
  if (state.role === 'club') {
    // Only clubs take part: the council and the offices are told so instead of acting as another club.
    const club = STUDENT_CLUBS.find((c) => c.id === state.activeClubId);
    if (club) return <ClubIdeas catalog={catalog} club={club} />;
    return <NotAClubIdeas catalog={catalog} publisher={catalog.clubName(state.activeClubId) || 'Đơn vị đang đại diện'} />;
  }
  return <StudentIdeas catalog={catalog} />;
}
