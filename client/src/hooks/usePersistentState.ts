import { useCallback, useState } from "react";
import { readJson, writeJson } from "@/storage/keys";

/**
 * Wie `useState`, nur dass der Wert in localStorage liegt. Fuer Einstellungen
 * ausserhalb eines Spielstands – etwa „Bildschirm anlassen“.
 */
export function usePersistentState<T>(
  key: string,
  initial: T,
): [T, (value: T | ((previous: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => readJson<T>(key, initial));

  const update = useCallback(
    (next: T | ((previous: T) => T)) => {
      setValue((previous) => {
        const resolved = typeof next === "function" ? (next as (p: T) => T)(previous) : next;
        writeJson(key, resolved);
        return resolved;
      });
    },
    [key],
  );

  return [value, update];
}
