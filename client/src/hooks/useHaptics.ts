import { useCallback } from "react";
import { usePersistentState } from "./usePersistentState";
import { nsKey } from "@/storage/keys";

export const HAPTICS_KEY = nsKey("haptics");

/**
 * Kurzes Rueckmelden beim Antippen.
 *
 * `navigator.vibrate` gibt es nur auf Android; iOS ignoriert es stillschweigend.
 * Deshalb keine Fehlerbehandlung und kein Hinweis – es ist Zugabe, nicht Funktion.
 */
export function useHaptics(): {
  tap: () => void;
  enabled: boolean;
  setEnabled: (on: boolean) => void;
} {
  const [enabled, setEnabled] = usePersistentState(HAPTICS_KEY, true);

  const tap = useCallback(() => {
    if (!enabled) return;
    navigator.vibrate?.(12);
  }, [enabled]);

  return { tap, enabled, setEnabled };
}
