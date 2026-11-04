/**
 * The workspace state for the page: who is signed in, the snapshot, and the actions. Every action
 * goes to the server (which checks permissions) and then reloads the snapshot, so the screen
 * always shows the stored state.
 */
import { useCallback, useEffect, useState } from 'react';
import { workspaceErrorMessage, type MemberDraft, type RequestDraft, type TaskAction, type TaskDraft, type WsMember, type WsSnapshot } from '../domain/workspace';
import * as api from './client';

export type WorkspacePhase = 'loading' | 'signed_out' | 'wrong_domain' | 'not_member' | 'pending' | 'inactive' | 'ready' | 'error';

export interface Workspace {
  phase: WorkspacePhase;
  /** The account's address when it cannot enter (wrong domain, not a member). */
  email: string;
  snapshot: WsSnapshot | null;
  me: WsMember | null;
  /** The last action's error, in Vietnamese; cleared by the next action. */
  error: string;
  busy: boolean;
  signIn: () => void;
  signOut: () => void;
  refresh: () => void;
  saveTask: (draft: TaskDraft & { id?: string }) => Promise<boolean>;
  act: (taskId: string, action: TaskAction, input?: { link?: string; quality?: number; note?: string }) => Promise<boolean>;
  createRequest: (draft: RequestDraft) => Promise<boolean>;
  answerRequest: (requestId: string, accept: boolean, assigneeId: string | null, note: string) => Promise<boolean>;
  saveMember: (draft: MemberDraft & { id?: string }) => Promise<boolean>;
}

/** Removes the one-time sign-in code Google sends back, so a reload does not reuse it. */
function clearAuthParams(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has('code') && !url.searchParams.has('error')) return;
  url.searchParams.delete('code');
  url.searchParams.delete('error');
  url.searchParams.delete('error_description');
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
}

export function useWorkspace(): Workspace {
  const [phase, setPhase] = useState<WorkspacePhase>('loading');
  const [email, setEmail] = useState('');
  const [snapshot, setSnapshot] = useState<WsSnapshot | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const who = await api.whoAmI();
      clearAuthParams();
      if (who.status === 'ok') {
        setSnapshot(await api.loadSnapshot());
        setPhase('ready');
        return;
      }
      setSnapshot(null);
      setEmail(who.status === 'signed_out' ? '' : who.email);
      setPhase(who.status);
    } catch (e) {
      setError(workspaceErrorMessage(e instanceof Error ? e.message : 'network'));
      setPhase('error');
    }
  }, []);

  useEffect(() => {
    void load();
    return api.onSessionChange(() => {
      void load();
    });
  }, [load]);

  const run = useCallback(
    async (task: () => Promise<unknown>): Promise<boolean> => {
      setBusy(true);
      setError('');
      try {
        await task();
        setSnapshot(await api.loadSnapshot());
        return true;
      } catch (e) {
        setError(workspaceErrorMessage(e instanceof Error ? e.message : 'network'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const me = snapshot?.members.find((m) => m.id === snapshot.me) ?? null;

  return {
    phase,
    email,
    snapshot,
    me,
    error,
    busy,
    signIn: () => {
      setError('');
      api.signInWithGoogle(`${window.location.origin}/hdhs`).catch((e: unknown) => {
        setError(workspaceErrorMessage(e instanceof Error ? e.message : 'network'));
      });
    },
    signOut: () => {
      void api.signOut().then(load);
    },
    refresh: () => {
      void load();
    },
    saveTask: (draft) => run(() => api.saveTask(draft)),
    act: (taskId, action, input) => run(() => api.taskAction(taskId, action, input)),
    createRequest: (draft) => run(() => api.createRequest(draft)),
    answerRequest: (requestId, accept, assigneeId, note) => run(() => api.answerRequest(requestId, accept, assigneeId, note)),
    saveMember: (draft) => run(() => api.saveMember(draft)),
  };
}
