/** React hooks over the store. Pages read state through these; components receive props. */
import { useContext, type Dispatch } from 'react';
import type { Millis } from '../domain/types';
import type { Action } from './actions';
import { DispatchContext, NowContext, StateContext } from './context';
import type { AppState } from './schema';
import { selectNow } from './selectors';

export function useAppState(): AppState {
  const state = useContext(StateContext);
  if (state === null) throw new Error('useAppState must be used inside <StoreProvider>');
  return state;
}

export function useDispatch(): Dispatch<Action> {
  const dispatch = useContext(DispatchContext);
  if (dispatch === null) throw new Error('useDispatch must be used inside <StoreProvider>');
  return dispatch;
}

export function useSelector<T>(selector: (state: AppState) => T): T {
  return selector(useAppState());
}

/** "Now" for the demo: the demo date when set, otherwise the real clock (minute resolution). */
export function useNow(): Millis {
  const state = useAppState();
  const realNow = useContext(NowContext);
  return selectNow(state, realNow);
}
