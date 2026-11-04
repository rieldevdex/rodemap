import { useId, useState, type SyntheticEvent } from 'react';
import { Button } from '../../components/atoms/Button';
import { StatusTag } from '../../components/atoms/StatusTag';
import '../../components/organisms/EventSubmissionForm.css';
import {
  BDH_POSITIONS,
  canManageMembers,
  MEMBER_STATUS_LABELS,
  membersOf,
  POSITION_LABELS,
  POSITIONS,
  validateMemberDraft,
  type DepartmentId,
  type MemberDraft,
  type MemberStatus,
  type Position,
  type WsMember,
  type WsSnapshot,
} from '../../domain/workspace';
import type { Workspace } from '../../workspace/useWorkspace';

interface Props {
  ws: Workspace;
  snapshot: WsSnapshot;
  me: WsMember;
}

function toDraft(m: WsMember | null): MemberDraft {
  return m === null
    ? { fullName: '', className: '', departmentId: 'pr', position: 'thanh_vien', email: '', status: 'active' }
    : { fullName: m.fullName, className: m.className, departmentId: m.departmentId, position: m.position, email: m.email ?? '', status: m.status };
}

function MemberForm({ ws, snapshot, initial, onClose }: { ws: Workspace; snapshot: WsSnapshot; initial: WsMember | null; onClose: () => void }) {
  const id = useId();
  const [draft, setDraft] = useState<MemberDraft>(() => toDraft(initial));
  const [shown, setShown] = useState(false);
  const errors = validateMemberDraft(draft);
  const set = (patch: Partial<MemberDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
  };
  const positions = POSITIONS.filter((p) => (draft.departmentId === 'bdh' ? BDH_POSITIONS.includes(p) || p === 'thanh_vien' : !BDH_POSITIONS.includes(p)));
  const submit = (e: SyntheticEvent) => {
    e.preventDefault();
    setShown(true);
    if (Object.keys(errors).length > 0) return;
    const payload = { ...draft, fullName: draft.fullName.trim(), className: draft.className.trim().toUpperCase(), email: draft.email.trim().toLowerCase() };
    void ws.saveMember(initial === null ? payload : { ...payload, id: initial.id }).then((ok) => {
      if (ok) onClose();
    });
  };
  const field = (key: keyof MemberDraft) => ({
    'aria-invalid': shown && errors[key] ? true : undefined,
    'aria-describedby': shown && errors[key] ? `${id}-${key}-error` : undefined,
  });
  const err = (key: keyof MemberDraft) =>
    shown && errors[key] ? (
      <span id={`${id}-${key}-error`} className="submission-form__error">
        {errors[key]}
      </span>
    ) : null;
  return (
    <form className="submission-form ws-form" aria-label={initial === null ? 'Thêm thành viên' : 'Cập nhật thành viên'} onSubmit={submit} noValidate>
      <h3 className="ws-form__title">{initial === null ? 'Thêm thành viên' : `Cập nhật thành viên: ${initial.fullName}`}</h3>
      <div className="submission-form__grid">
        <div className="submission-form__field">
          <label htmlFor={`${id}-name`}>Họ và tên</label>
          <input
            id={`${id}-name`}
            value={draft.fullName}
            {...field('fullName')}
            onChange={(e) => {
              set({ fullName: e.target.value });
            }}
          />
          {err('fullName')}
        </div>
        <div className="submission-form__field">
          <label htmlFor={`${id}-class`}>Lớp</label>
          <input
            id={`${id}-class`}
            value={draft.className}
            {...field('className')}
            onChange={(e) => {
              set({ className: e.target.value });
            }}
          />
          {err('className')}
        </div>
        <div className="submission-form__field">
          <label htmlFor={`${id}-dept`}>Ban</label>
          <select
            id={`${id}-dept`}
            value={draft.departmentId}
            onChange={(e) => {
              set({ departmentId: e.target.value as DepartmentId, position: 'thanh_vien' });
            }}
          >
            {snapshot.departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="submission-form__field">
          <label htmlFor={`${id}-position`}>Vị trí</label>
          <select
            id={`${id}-position`}
            value={draft.position}
            {...field('position')}
            onChange={(e) => {
              set({ position: e.target.value as Position });
            }}
          >
            {positions.map((p) => (
              <option key={p} value={p}>
                {POSITION_LABELS[p]}
              </option>
            ))}
          </select>
          {err('position')}
        </div>
        <div className="submission-form__field">
          <label htmlFor={`${id}-email`}>Thư điện tử của trường (dùng để đăng nhập)</label>
          <input
            id={`${id}-email`}
            type="email"
            value={draft.email}
            placeholder="ten@stu.vinschool.edu.vn"
            {...field('email')}
            onChange={(e) => {
              set({ email: e.target.value });
            }}
          />
          {err('email')}
        </div>
        <div className="submission-form__field">
          <label htmlFor={`${id}-status`}>Trạng thái</label>
          <select
            id={`${id}-status`}
            value={draft.status}
            onChange={(e) => {
              set({ status: e.target.value as MemberStatus });
            }}
          >
            {(['active', 'pending', 'inactive'] as const).map((s) => (
              <option key={s} value={s}>
                {MEMBER_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="submission-form__hint">Không ghi số điện thoại, địa chỉ hay tài khoản mạng xã hội. Đổi địa chỉ thư điện tử sẽ ngắt liên kết với tài khoản đã đăng nhập trước đó.</p>
      <div className="submission-form__actions cluster">
        <Button type="submit" variant="primary" disabled={ws.busy}>
          {initial === null ? 'Thêm thành viên' : 'Lưu thay đổi'}
        </Button>
        <Button type="button" variant="quiet" onClick={onClose}>
          Hủy
        </Button>
      </div>
    </form>
  );
}

/** "Thành viên": the member database by department. Ban điều hành and Ban Nhân sự add and edit members. */
export function WorkspaceMembers({ ws, snapshot, me }: Props) {
  const editor = canManageMembers(me);
  const [form, setForm] = useState<WsMember | null | 'new'>(null);
  return (
    <div className="stack stack--xl">
      {editor && form === null ? (
        <div className="cluster">
          <Button
            variant="primary"
            iconStart="plus"
            onClick={() => {
              setForm('new');
            }}
          >
            Thêm thành viên
          </Button>
        </div>
      ) : null}
      {form === null ? null : (
        <MemberForm
          key={form === 'new' ? 'new' : form.id}
          ws={ws}
          snapshot={snapshot}
          initial={form === 'new' ? null : form}
          onClose={() => {
            setForm(null);
          }}
        />
      )}
      {snapshot.departments.map((d) => {
        const list = membersOf(snapshot.members, d.id);
        return (
          <section key={d.id} className="stack stack--sm" aria-labelledby={`ws-members-${d.id}`}>
            <h2 id={`ws-members-${d.id}`} className="workspace__h2">
              {d.name} <span className="mono">{list.length}</span>
            </h2>
            {list.length === 0 ? (
              <p className="workspace__note">Ban chưa có thành viên.</p>
            ) : (
              <div className="ws-table-wrap">
                <table className="ws-table">
                  <caption className="visually-hidden">Thành viên {d.name}</caption>
                  <thead>
                    <tr>
                      <th scope="col">Họ và tên</th>
                      <th scope="col">Lớp</th>
                      <th scope="col">Vị trí</th>
                      <th scope="col">Trạng thái</th>
                      {editor ? <th scope="col">Đăng nhập</th> : null}
                      {editor ? (
                        <th scope="col">
                          <span className="visually-hidden">Thao tác</span>
                        </th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((m) => (
                      <tr key={m.id}>
                        <th scope="row">{m.fullName}</th>
                        <td className="mono">{m.className}</td>
                        <td>{POSITION_LABELS[m.position]}</td>
                        <td>
                          <StatusTag tone={m.status === 'active' ? 'ok' : m.status === 'pending' ? 'warn' : 'neutral'}>{MEMBER_STATUS_LABELS[m.status]}</StatusTag>
                        </td>
                        {editor ? <td>{m.email === null ? 'Chưa có địa chỉ' : m.linked ? 'Đã liên kết' : m.email}</td> : null}
                        {editor ? (
                          <td>
                            <Button
                              size="sm"
                              variant="quiet"
                              onClick={() => {
                                setForm(m);
                              }}
                            >
                              Cập nhật<span className="visually-hidden"> {m.fullName}</span>
                            </Button>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
