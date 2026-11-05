/**
 * Bảng điểm tháng for the workspace page: loads the sheet of one month and runs the scoring
 * actions. Every action goes to the server (which checks permissions), then the sheet is reloaded.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { MonthKey, ScoreDraft, SheetAction, WsScoreSheet } from '../domain/scores';
import { workspaceErrorMessage } from '../domain/workspace';
import * as api from './client';

export interface ScoreSheetState {
  sheet: WsScoreSheet | null;
  /** The last error, in Vietnamese; cleared by the next action. */
  error: string;
  busy: boolean;
  reload: () => void;
  save: (draft: ScoreDraft) => Promise<boolean>;
  sendFeedback: (text: string) => Promise<boolean>;
  decide: (memberId: string, text: string) => Promise<boolean>;
  act: (action: SheetAction) => Promise<boolean>;
}

const message = (e: unknown) => workspaceErrorMessage(e instanceof Error ? e.message : 'network');

export function useScoreSheet(month: MonthKey): ScoreSheetState {
  const [sheet, setSheet] = useState<WsScoreSheet | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // A late answer for a month the viewer has already left is ignored.
  const current = useRef(month);
  current.current = month;
  const accept = useCallback((next: WsScoreSheet) => {
    if (next.month === current.current) setSheet(next);
  }, []);

  const load = useCallback(async () => {
    try {
      accept(await api.loadScores(month));
    } catch (e) {
      setError(message(e));
    }
  }, [month, accept]);

  useEffect(() => {
    setSheet(null);
    setError('');
    void load();
  }, [load]);

  const run = useCallback(
    async (task: () => Promise<unknown>): Promise<boolean> => {
      setBusy(true);
      setError('');
      try {
        await task();
        accept(await api.loadScores(month));
        return true;
      } catch (e) {
        setError(message(e));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [month, accept],
  );

  return {
    sheet,
    error,
    busy,
    reload: () => {
      void load();
    },
    save: (draft) => run(() => api.saveScore(month, draft)),
    sendFeedback: (text) => run(() => api.sendScoreFeedback(month, text)),
    decide: (memberId, text) => run(() => api.decideScoreFeedback(month, memberId, text)),
    act: (action) => run(() => api.scoreSheetAction(month, action)),
  };
}
