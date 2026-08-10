export type PlayerId = string;

export type Player = {
  id: PlayerId;
  name: string;
  /** Feste Farbe, unabhaengig vom Theme – sie gehoert zur Person, nicht zum Design. */
  color: string;
};

/** Die Akzentfarben der bisherigen Apps, unveraendert uebernommen. */
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

let counter = 0;

export function newPlayerId(): PlayerId {
  counter += 1;
  return `p${Date.now().toString(36)}${counter.toString(36)}`;
}

/**
 * Erste noch freie Farbe. Wird ein Spieler entfernt und ein neuer angelegt,
 * bekommt der neue die frei gewordene Farbe – kein Dublettenrisiko, solange
 * nicht mehr Spieler als Farben im Spiel sind.
 */
function nextColor(taken: readonly Player[]): string {
  const used = new Set(taken.map((p) => p.color));
  return (
    PLAYER_COLORS.find((c) => !used.has(c)) ?? PLAYER_COLORS[taken.length % PLAYER_COLORS.length]
  );
}

export function makePlayer(name: string, existing: readonly Player[]): Player {
  return { id: newPlayerId(), name, color: nextColor(existing) };
}

export type RosterEntry = { name: string; color: string };

/** Stimmt die lokale Spielerliste mit der aus dem Raum ueberein? */
export function rosterMatches(players: readonly Player[], roster: readonly RosterEntry[]): boolean {
  return (
    players.length === roster.length &&
    players.every(
      (player, i) => player.name === roster[i]?.name && player.color === roster[i]?.color,
    )
  );
}

/**
 * Die Spielerliste aus dem Raum uebernehmen und dabei so viel Identitaet wie
 * moeglich behalten: passt der Eintrag an derselben Stelle, bleibt der Spieler
 * derselbe – und damit auch sein Block.
 */
export function adoptRoster(players: readonly Player[], roster: readonly RosterEntry[]): Player[] {
  return roster.map((entry, i) => {
    const existing = players[i];
    if (existing && existing.name === entry.name && existing.color === entry.color) return existing;
    return { id: newPlayerId(), name: entry.name, color: entry.color };
  });
}

/** Leerer Name -> „Spieler 3“, wie in den bisherigen Apps. */
export function playerName(raw: string, index: number): string {
  const trimmed = raw.trim();
  return trimmed === "" ? `Spieler ${index + 1}` : trimmed;
}

export const NAME_MAX_LENGTH = 18;
