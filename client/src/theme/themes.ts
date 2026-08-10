/**
 * Jede App bringt ein Theme-Paar mit: eins fuer hell, eins fuer dunkel. Welche
 * der beiden Varianten gilt, entscheidet die *globale* Einstellung (System /
 * Hell / Dunkel) – die Apps unterscheiden sich in der Farbwelt, nicht darin, ob
 * gerade Nacht ist.
 *
 * Wichtig: Jedes hier benutzte Theme muss auch in src/index.css im
 * `@plugin "daisyui"`-Block stehen, sonst wird sein CSS gar nicht erzeugt.
 */
export type ThemePair = {
  readonly light: string;
  readonly dark: string;
};

/** Schwarz + Gold – die Optik der bisherigen Landing-Page. */
export const SHELL_THEME: ThemePair = { light: "silk", dark: "luxury" };

export function resolveTheme(pair: ThemePair, scheme: "light" | "dark"): string {
  return pair[scheme];
}
