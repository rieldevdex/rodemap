import { createContext, useContext } from 'react';
import type { MochiState } from '../components/organisms/Mochi';
import type { ChatItem } from '../mochi/conversation';

export type MochiMode = 'online' | 'offline';

export interface MochiApi {
  open: boolean;
  setOpen: (open: boolean) => void;
  items: ChatItem[];
  busy: boolean;
  mode: MochiMode;
  figure: MochiState;
  send: (text: string) => void;
  newConversation: () => void;
  confirmRegistration: (cardId: string, eventId: string, action: 'register' | 'unregister') => void;
  confirmPlan: (cardId: string, eventIds: string[]) => void;
  saveDraft: (cardId: string, eventId: string, reflection: string, role: string) => void;
  dismissCard: (cardId: string) => void;
  exportIcs: (eventIds: string[]) => void;
}

export const MochiContext = createContext<MochiApi | null>(null);

export function useMochi(): MochiApi {
  const api = useContext(MochiContext);
  if (api === null) throw new Error('useMochi must be used inside <MochiProvider>');
  return api;
}
