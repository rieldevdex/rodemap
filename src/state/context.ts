import { createContext, type Dispatch } from 'react';
import type { Millis } from '../domain/types';
import type { Action } from './actions';
import type { AppState } from './schema';

export const StateContext = createContext<AppState | null>(null);
export const DispatchContext = createContext<Dispatch<Action> | null>(null);
/** The real clock, refreshed every minute. Read it through useNow(), which applies the demo date. */
export const NowContext = createContext<number>(0);
