import { useEffect, useReducer, useState, type ReactNode } from 'react';
import type { Millis } from '../domain/types';
import { DispatchContext, NowContext, StateContext } from './context';
import { applyTheme } from './effects';
import { getStorage, loadState, saveState } from './persistence';
import { reducer } from './reducer';
import type { AppState } from './schema';

const CLOCK_TICK_MS = 60_000;

export interface StoreProviderProps {
  children: ReactNode;
  /** Tests may inject a state; the app loads from localStorage. */
  initialState?: AppState;
}

export function StoreProvider({ children, initialState }: StoreProviderProps) {
  const [state, dispatch] = useReducer(reducer, initialState, (init) => init ?? loadState(getStorage()));
  const [realNow, setRealNow] = useState<Millis>(() => Date.now());

  useEffect(() => {
    saveState(getStorage(), state);
  }, [state]);

  useEffect(() => {
    applyTheme(state.theme);
  }, [state.theme]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setRealNow(Date.now());
    }, CLOCK_TICK_MS);
    return () => {
      window.clearInterval(id);
    };
  }, []);

  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>
        <NowContext.Provider value={realNow}>{children}</NowContext.Provider>
      </DispatchContext.Provider>
    </StateContext.Provider>
  );
}
