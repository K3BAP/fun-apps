/**
 * Die Spielerfarben – die Akzentfarben der alten Apps, unveraendert uebernommen.
 *
 * Sie stehen hier und nicht im Client, weil im Raum der **Server** die Farbe
 * vergibt: er ist die einzige Stelle, die alle Plaetze eines Raums gleichzeitig
 * sieht. Waehlte jedes Geraet seine Farbe selbst, saessen zwei Spieler
 * frueher oder spaeter in derselben.
 */
export const PLAYER_COLORS = [
  "#c9a15a",
  "#4a7a4d",
  "#b5533f",
  "#5b7fa6",
  "#8a6bb0",
  "#d98a2b",
  "#3f9e9e",
  "#a6708b",
] as const;

/**
 * Die erste noch freie Farbe. Wird ein Spieler entfernt und ein neuer angelegt,
 * bekommt der neue die frei gewordene Farbe – kein Dublettenrisiko, solange
 * nicht mehr Spieler als Farben im Spiel sind.
 */
export function nextColor(taken: readonly string[]): string {
  const used = new Set(taken);
  return (
    PLAYER_COLORS.find((c) => !used.has(c)) ?? PLAYER_COLORS[taken.length % PLAYER_COLORS.length]
  );
}
