import { createContext, use } from "react";
import type { ColorMode, ColorScheme } from "./useColorScheme";

export type ThemeContextValue = {
  mode: ColorMode;
  scheme: ColorScheme;
  setMode: (mode: ColorMode) => void;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const ctx = use(ThemeContext);
  if (!ctx) throw new Error("useTheme muss innerhalb von <ThemeProvider> benutzt werden");
  return ctx;
}
