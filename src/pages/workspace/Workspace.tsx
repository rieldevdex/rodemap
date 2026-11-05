import { useState, type KeyboardEvent } from 'react';
import { Button } from '../../components/atoms/Button';
import { PageHead } from '../../components/molecules/PageHead';
import { POSITION_LABELS, tasksForMember, tasksToReview, requestsToDepartment, type WsSnapshot, type WsMember } from '../../domain/workspace';
import { useNow } from '../../state/hooks';
import { useWorkspace, type Workspace } from '../../workspace/useWorkspace';
import { WorkspaceMembers } from './WorkspaceMembers';
import { WorkspaceRequests } from './WorkspaceRequests';
import { WorkspaceScores } from './WorkspaceScores';
import { WorkspaceBoard, WorkspaceMyTasks } from './WorkspaceTasks';
import './Workspace.css';

const EYEBROW = 'Hội đồng Học sinh · Nội bộ';

type Tab = 'mine' | 'board' | 'requests' | 'scores' | 'members';

const TABS: { id: Tab; label: string }[] = [
  { id: 'mine', label: 'Việc của tôi' },
  { id: 'board', label: 'Công việc các ban' },
  { id: 'requests', label: 'Phiếu yêu cầu' },
  { id: 'scores', label: 'Bảng điểm' },
  { id: 'members', label: 'Thành viên' },
];

/** Messages for the accounts that cannot enter (DESIGN.md §7.5). */
function Gate({ ws }: { ws: Workspace }) {
  const signOut = (
    <Button variant="secondary" onClick={ws.signOut}>
      Đăng xuất
    </Button>
  );
  switch (ws.phase) {
    case 'loading':
      return (
        <p className="workspace__note" role="status">
          Đang tải Không gian HĐHS…
        </p>
      );
    case 'signed_out':
      return (
        <div className="workspace__gate stack stack--md">
          <p>Đăng nhập bằng tài khoản Google của trường (địa chỉ @stu.vinschool.edu.vn) để xem và cập nhật công việc của Hội đồng Học sinh.</p>
          <div className="cluster">
            <Button variant="primary" iconStart="user" onClick={ws.signIn}>
              Đăng nhập bằng tài khoản trường
            </Button>
          </div>
          <p className="workspace__note">Chỉ thành viên đã được Ban Nhân sự thêm vào danh sách mới truy cập được. Dữ liệu của Không gian HĐHS không hiển thị công khai.</p>
        </div>
      );
    case 'wrong_domain':
      return (
        <div className="workspace__gate stack stack--md">
          <p>Tài khoản {ws.email} không thuộc tên miền @stu.vinschool.edu.vn. Vui lòng đăng xuất và đăng nhập bằng tài khoản Google của trường.</p>
          <div className="cluster">{signOut}</div>
        </div>
      );
    case 'not_member':
      return (
        <div className="workspace__gate stack stack--md">
          <p>Tài khoản {ws.email} chưa có trong danh sách thành viên Hội đồng Học sinh. Vui lòng liên hệ Ban Nhân sự để được thêm địa chỉ này.</p>
          <div className="cluster">{signOut}</div>
        </div>
      );
    case 'pending':
    case 'inactive':
      return (
        <div className="workspace__gate stack stack--md">
          <p>
            {ws.phase === 'pending'
              ? `Tài khoản ${ws.email} đang chờ Ban điều hành xác nhận vị trí trong Hội đồng Học sinh.`
              : `Tài khoản ${ws.email} đã ngừng hoạt động trong Hội đồng Học sinh.`}
          </p>
          <div className="cluster">{signOut}</div>
        </div>
      );
    case 'error':
      return (
        <div className="workspace__gate stack stack--md">
          <p role="alert">{ws.error}</p>
          <div className="cluster">
            <Button variant="secondary" onClick={ws.refresh}>
              Thử lại
            </Button>
          </div>
        </div>
      );
    case 'ready':
      return null;
  }
}

function departmentName(snapshot: WsSnapshot, id: string): string {
  return snapshot.departments.find((d) => d.id === id)?.name ?? id;
}

function Ready({ ws, snapshot, me }: { ws: Workspace; snapshot: WsSnapshot; me: WsMember }) {
  const now = useNow();
  const [tab, setTab] = useState<Tab>('mine');
  const counts: Record<Tab, number> = {
    mine: tasksForMember(snapshot.tasks, me.id).filter((t) => t.status !== 'done' && t.status !== 'cancelled').length + tasksToReview(snapshot.tasks, me).length,
    board: 0,
    requests: requestsToDepartment(snapshot.requests, me.departmentId).filter((r) => r.status === 'open').length,
    scores: 0,
    members: 0,
  };
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = TABS[(index + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length];
    if (!next) return;
    setTab(next.id);
    document.getElementById(`workspace-tab-${next.id}`)?.focus();
  };

  return (
    <>
      <div className="workspace__whoami cluster cluster--between">
        <p>
          <strong>{me.fullName}</strong> · {POSITION_LABELS[me.position]} · {departmentName(snapshot, me.departmentId)}
        </p>
        <div className="cluster cluster--sm">
          <Button variant="quiet" size="sm" onClick={ws.refresh}>
            Tải lại
          </Button>
          <Button variant="quiet" size="sm" onClick={ws.signOut}>
            Đăng xuất
          </Button>
        </div>
      </div>
      <div className="workspace__tabs" role="tablist" aria-label="Không gian HĐHS">
        {TABS.map((t, i) => (
          <button
            key={t.id}
            id={`workspace-tab-${t.id}`}
            type="button"
            role="tab"
            className="workspace__tab"
            aria-selected={tab === t.id}
            aria-controls={`workspace-panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => {
              setTab(t.id);
            }}
            onKeyDown={(e) => {
              onKey(e, i);
            }}
          >
            {t.label}
            {counts[t.id] > 0 ? <span className="workspace__count mono">{counts[t.id]}</span> : null}
          </button>
        ))}
      </div>
      {ws.error !== '' ? (
        <p className="workspace__error" role="alert">
          {ws.error}
        </p>
      ) : null}
      <section id={`workspace-panel-${tab}`} role="tabpanel" aria-labelledby={`workspace-tab-${tab}`} className="workspace__panel">
        {tab === 'mine' ? <WorkspaceMyTasks ws={ws} snapshot={snapshot} me={me} now={now} /> : null}
        {tab === 'board' ? <WorkspaceBoard ws={ws} snapshot={snapshot} me={me} now={now} /> : null}
        {tab === 'requests' ? <WorkspaceRequests ws={ws} snapshot={snapshot} me={me} now={now} /> : null}
        {tab === 'scores' ? <WorkspaceScores snapshot={snapshot} me={me} now={now} /> : null}
        {tab === 'members' ? <WorkspaceMembers ws={ws} snapshot={snapshot} me={me} /> : null}
      </section>
    </>
  );
}

/** Không gian HĐHS (/hdhs): the council's internal workspace, behind the school Google sign-in. */
export function WorkspacePage() {
  const ws = useWorkspace();
  const ready = ws.phase === 'ready' && ws.snapshot !== null && ws.me !== null;
  return (
    <div className="workspace">
      <PageHead
        eyebrow={EYEBROW}
        title="Không gian HĐHS"
        lead="Theo dõi công việc được giao, phiếu yêu cầu giữa các ban, bảng điểm hằng tháng và danh sách thành viên của Hội đồng Học sinh."
        leadShort="Công việc, phiếu yêu cầu, bảng điểm và thành viên của Hội đồng Học sinh."
      />
      <div className="band band--surface">
        <div className="container stack stack--lg">
          {ready && ws.snapshot && ws.me ? <Ready ws={ws} snapshot={ws.snapshot} me={ws.me} /> : <Gate ws={ws} />}
        </div>
      </div>
    </div>
  );
}
