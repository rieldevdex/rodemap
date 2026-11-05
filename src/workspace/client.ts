/**
 * Không gian HĐHS: the only module that talks to Supabase (Auth + the hdhs_* database functions).
 * Loaded lazily with the workspace page, so the public site never downloads it. The publishable
 * key below is meant to be public: every function checks the signed-in member on the server.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  SCHOOL_EMAIL_DOMAIN,
  type MemberDraft,
  type RequestDraft,
  type TaskAction,
  type TaskDraft,
  type WsSnapshot,
} from '../domain/workspace';
import type { MonthKey, ScoreDraft, SheetAction, WsScoreSheet } from '../domain/scores';
import { SESSION_STORAGE_KEY, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './config';

let client: SupabaseClient | null = null;

function db(): SupabaseClient {
  client ??= createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: SESSION_STORAGE_KEY },
  });
  return client;
}

export type WhoAmI =
  | { status: 'signed_out' }
  | { status: 'wrong_domain' | 'not_member' | 'pending' | 'inactive'; email: string }
  | { status: 'ok'; memberId: string };

/** Thrown with the server's error code (e.g. "forbidden", "note_required") or "network". */
export class WorkspaceError extends Error {}

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  let result;
  try {
    result = await db().rpc(fn, args);
  } catch {
    throw new WorkspaceError('network');
  }
  if (result.error) throw new WorkspaceError(result.error.message);
  return result.data as T;
}

/** Google sign-in limited to school accounts; Google comes back to `returnTo`. */
export async function signInWithGoogle(returnTo: string): Promise<void> {
  const { error } = await db().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: returnTo, queryParams: { hd: SCHOOL_EMAIL_DOMAIN, prompt: 'select_account' } },
  });
  if (error) throw new WorkspaceError(error.message);
}

export async function signOut(): Promise<void> {
  await db().auth.signOut();
}

/** Calls back whenever the session changes (sign-in, sign-out, token refresh). */
export function onSessionChange(callback: () => void): () => void {
  const { data } = db().auth.onAuthStateChange((event) => {
    if (event !== 'INITIAL_SESSION') callback();
  });
  return () => {
    data.subscription.unsubscribe();
  };
}

export async function whoAmI(): Promise<WhoAmI> {
  const { data } = await db().auth.getSession();
  if (data.session === null) return { status: 'signed_out' };
  return rpc<WhoAmI>('hdhs_me');
}

export function loadSnapshot(): Promise<WsSnapshot> {
  return rpc<WsSnapshot>('hdhs_snapshot');
}

export function saveTask(draft: TaskDraft & { id?: string }): Promise<unknown> {
  return rpc('hdhs_save_task', { p: draft });
}

export function taskAction(taskId: string, action: TaskAction, input: { link?: string; quality?: number; note?: string } = {}): Promise<unknown> {
  return rpc('hdhs_task_action', { p_task: taskId, p_action: action, p_link: input.link ?? '', p_quality: input.quality ?? null, p_note: input.note ?? '' });
}

export function createRequest(draft: RequestDraft): Promise<unknown> {
  return rpc('hdhs_create_request', { p: draft });
}

export function answerRequest(requestId: string, accept: boolean, assigneeId: string | null, note: string): Promise<unknown> {
  return rpc('hdhs_answer_request', { p_request: requestId, p_accept: accept, p_assignee: assigneeId, p_note: note });
}

export function saveMember(draft: MemberDraft & { id?: string }): Promise<unknown> {
  return rpc('hdhs_save_member', { p: draft });
}

export function loadScores(month: MonthKey): Promise<WsScoreSheet> {
  return rpc<WsScoreSheet>('hdhs_scores', { p_month: month });
}

export function saveScore(month: MonthKey, draft: ScoreDraft): Promise<unknown> {
  return rpc('hdhs_save_score', { p_month: month, p: draft });
}

export function sendScoreFeedback(month: MonthKey, text: string): Promise<unknown> {
  return rpc('hdhs_score_feedback', { p_month: month, p_text: text });
}

export function decideScoreFeedback(month: MonthKey, memberId: string, text: string): Promise<unknown> {
  return rpc('hdhs_score_decision', { p_month: month, p_member: memberId, p_text: text });
}

export function scoreSheetAction(month: MonthKey, action: SheetAction): Promise<unknown> {
  return rpc('hdhs_score_sheet', { p_month: month, p_action: action });
}
