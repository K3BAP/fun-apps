/**
 * Die Gegenstelle zu `src/themes.css`.
 *
 * Es gibt genau zwei Themes – `fa-light` und `fa-dark` –, die Flaechen, Radien
 * und Signalfarben festlegen. Was eine App farblich ausmacht, ist allein ihr
 * Akzent; die zugehoerigen CSS-Regeln stehen am Ende von `themes.css`.
 */

export type AccentKey = "shell" | "kniffel" | "wizard" | "beet" | "qwixx";

export type ColorScheme = "light" | "dark";

/** Landing-Page und Fehlerseiten: Gold auf Tinte, wie die bisherige Huelle. */
export const SHELL_ACCENT: AccentKey = "shell";

export function themeName(scheme: ColorScheme): string {
  return scheme === "dark" ? "fa-dark" : "fa-light";
}

/**
 * Die Akzentfarbe als CSS-Wert – fuer die wenigen Stellen, die eine App-Farbe
 * ausserhalb ihres eigenen Theme-Bereichs zeigen (die Kacheln der Landing-Page
 * liegen im Shell-Theme, sollen aber die Farbe ihrer App tragen).
 */
export function accentColor(accent: AccentKey, scheme: ColorScheme): string {
  return `var(--fa-${ACCENT_HUE[accent]}${scheme === "light" ? "-lt" : ""})`;
}

const ACCENT_HUE: Record<AccentKey, string> = {
  shell: "gold",
  kniffel: "gold",
  wizard: "plum",
  beet: "leaf",
  qwixx: "slate",
};
