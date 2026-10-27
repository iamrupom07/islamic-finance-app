import { useSyncExternalStore } from "react";
export let connected = true;
const listeners = new Set<() => void>();
export function setConnected(next: boolean) {
  if (next === connected) return;
  connected = next;
  for (const listen of listeners) listen();
}
export function useOnline() {
  return useSyncExternalStore(
    (callback) => {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    },
    () => connected,
    () => true,
  );
}
