/**
 * A tiny in-memory bridge so any page can ask Mochi to open with a prepared request
 * ("Hỏi Mochi về sự kiện này") without importing the Mochi client. The MochiDock
 * subscribes in milestone 4.
 */
export type MochiRequest =
  | { kind: 'open' }
  | { kind: 'event'; eventId: string }
  | { kind: 'prompt'; text: string };

type Listener = (request: MochiRequest) => void;
const listeners = new Set<Listener>();

export function requestMochi(request: MochiRequest): void {
  for (const listener of listeners) listener(request);
}

export function subscribeMochi(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
