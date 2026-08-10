import { useCallback, useEffect, useState } from "react";
import { nsKey, readJson, writeJson } from "@/storage/keys";

export type ColorMode = "system" | "light" | "dark";
export type ColorScheme = "light" | "dark";

const MODE_KEY = nsKey("colorMode");
const DARK_QUERY = "(prefers-color-scheme: dark)";

function isColorMode(value: unknown): value is ColorMode {
  return value === "system" || value === "light" || value === "dark";
}

function systemScheme(): ColorScheme {
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

/**
 * Die eine globale Hell/Dunkel-Einstellung. `mode` ist die Wahl des Nutzers,
 * `scheme` das, was daraus tatsaechlich folgt.
 */
export function useColorScheme(): {
  mode: ColorMode;
  scheme: ColorScheme;
  setMode: (mode: ColorMode) => void;
} {
  const [mode, setModeState] = useState<ColorMode>(() => {
    const stored: unknown = readJson<unknown>(MODE_KEY, "system");
    return isColorMode(stored) ? stored : "system";
  });
  const [system, setSystem] = useState<ColorScheme>(systemScheme);

  // Der Systemwechsel muss auch bei geoeffneter App ankommen (Nachtmodus nach Uhrzeit).
  useEffect(() => {
    const mq = window.matchMedia(DARK_QUERY);
    const onChange = () => setSystem(mq.matches ? "dark" : "light");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const setMode = useCallback((next: ColorMode) => {
    setModeState(next);
    writeJson(MODE_KEY, next);
  }, []);

  return { mode, scheme: mode === "system" ? system : mode, setMode };
}
