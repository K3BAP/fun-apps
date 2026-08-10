import { nsKey, readJson, writeJson } from "./keys";

const KEY = nsKey("recentNames");
const MAX = 12;

/**
 * Zuletzt benutzte Spielernamen, quer ueber alle Apps.
 *
 * Bewusst nur eine Vorschlagsliste und keine verwaltete Personenliste: die Namen
 * werden beim Anlegen in den Spielstand kopiert. Wer hier spaeter etwas aendert,
 * schreibt damit keine fertigen Spiele um.
 */
export function recentNames(): string[] {
  const stored = readJson<unknown>(KEY, []);
  return Array.isArray(stored) ? stored.filter((n): n is string => typeof n === "string") : [];
}

export function rememberName(name: string): void {
  const trimmed = name.trim();
  if (trimmed === "") return;
  const next = [trimmed, ...recentNames().filter((n) => n !== trimmed)].slice(0, MAX);
  writeJson(KEY, next);
}
