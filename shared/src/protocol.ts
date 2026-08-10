/* ============ Das Protokoll zwischen Client und Server ====================
 *
 * Das Modell in einem Satz: **ein Geraet, ein Platz.**
 *
 * Ein Raum wird leer eroeffnet. Jedes Geraet, das sich anmeldet, bringt seinen
 * Namen mit und bekommt dabei seinen Platz – Plaetze werden also nicht vorher
 * angelegt und dann verteilt, sondern entstehen beim Beitreten. Damit ist die
 * Spielerliste eines Raums immer genau die Liste derer, die wirklich da sind.
 *
 * Nur das Geraet, dem ein Platz gehoert, schreibt dessen Daten; alle anderen
 * sehen sie live, aber nur lesend. Damit sind Konflikte nicht geloest, sondern
 * ausgeschlossen – und deshalb wird der Inhalt eines Platzes immer
 * **vollstaendig** uebertragen statt als Diff. Ein Qwixx-Block sind rund 700
 * Byte, eine Kniffel-Spalte 13 Zahlen; ein Patch-Format waere reiner Aufwand
 * ohne Gegenwert.
 *
 * Der Server kennt keine Spielregeln. Werte, die sich aus allen Plaetzen
 * zusammen ergeben (der Bonus in Ab ins Beet, die gesperrten Reihen in Qwixx),
 * rechnet jedes Geraet selbst aus den zusammengefuehrten Plaetzen aus – das sind
 * reine Funktionen, die ueberall dasselbe Ergebnis liefern.
 * ========================================================================= */

export const PROTOCOL_VERSION = 2;

/** Bleibt auf dem Geraet (localStorage) und ueberlebt einen Reload. */
export type DeviceId = string;
export type SeatId = string;
export type RoomCode = string;

export type RoomPhase = "setup" | "play" | "result";

/**
 * Die Position eines Platzes ist seine Stelle in `RoomState.seats` – dort steht
 * die Spielerreihenfolge. Die Kennung ist nur ein Name, aus ihr laesst sich
 * nichts ableiten.
 */
export type Seat = {
  id: SeatId;
  name: string;
  color: string;
  /** Das Geraet, dem der Platz gehoert. Nur es darf `data` schreiben. */
  owner: DeviceId;
  /** Ist der Eigentuemer gerade verbunden? */
  online: boolean;
  /** Flagge fuer die Bereit-Schranke. */
  ready: boolean;
  /** Zaehlt der Eigentuemer bei jedem Senden hoch; aeltere Staende fallen durch. */
  rev: number;
  /** Vom Spiel definierter Inhalt – der Server schaut nicht hinein. */
  data: unknown;
};

export type RoomState = {
  code: RoomCode;
  gameId: string;
  gameVersion: number;
  host: DeviceId;
  /** So viele Plaetze laesst das Spiel zu – der Raum weist darueber hinaus ab. */
  maxSeats: number;
  /** Spielweite Einstellungen (Qwixx-Block, Optionen …), nur der Host aendert sie. */
  config: unknown;
  phase: RoomPhase;
  /**
   * Bereit-Schranke: `open` wird wahr, sobald alle belegten Plaetze `ready`
   * gemeldet haben. Der `token` benennt, worauf gewartet wird (z. B. `r2:beet`);
   * aendert er sich, faengt die Warterei von vorn an.
   */
  barrier: { token: string; open: boolean } | null;
  seats: Seat[];
  rev: number;
};

export type RoomPatch = {
  config?: unknown;
  phase?: RoomPhase;
  /** Neuer Schranken-Token, oder `null` zum Aufheben. */
  barrier?: string | null;
};

export type ClientMsg =
  /**
   * Anmelden **und** beitreten in einem Zug. `name` gilt nur, wenn dabei ein
   * neuer Platz entsteht; ein wiederkehrendes Geraet bekommt seinen alten Platz
   * unveraendert zurueck – ein Namenswechsel mitten im Spiel wuerde die
   * Zuordnung von Spieler zu Block zerreissen.
   */
  | { t: "hello"; v: number; device: DeviceId; code: RoomCode; name: string }
  /** Den eigenen Platz raeumen. Waehrend des Spiels nicht mehr moeglich. */
  | { t: "leave" }
  | { t: "seat"; seat: SeatId; rev: number; data: unknown }
  | { t: "ready"; seat: SeatId; ready: boolean }
  | { t: "room"; patch: RoomPatch }
  | { t: "ping" };

export type ErrorCode =
  | "no_room"
  | "bad_version"
  | "not_owner"
  | "not_host"
  | "room_full"
  /** Das Spiel laeuft schon – wer nicht dabei war, kommt nicht mehr hinein. */
  | "room_locked"
  | "unknown_seat"
  | "bad_message";

export type ServerMsg =
  | { t: "snapshot"; room: RoomState; you: { device: DeviceId; seat: SeatId } }
  | { t: "seat"; seat: Seat }
  | { t: "room"; room: RoomState }
  | { t: "error"; code: ErrorCode; msg: string }
  | { t: "pong" };

/**
 * Was beim Eroeffnen eines Raums mitgegeben wird (POST /api/rooms).
 *
 * Ohne Plaetze: der Raum ist zunaechst leer, auch der Host bekommt seinen Platz
 * erst mit seinem `hello`.
 */
export type CreateRoomBody = {
  gameId: string;
  gameVersion: number;
  host: DeviceId;
  maxSeats: number;
};

export type CreateRoomResponse = { code: RoomCode };

/**
 * Kurzinfo vor dem Beitreten (GET /api/rooms/:code).
 *
 * Sie beantwortet die zwei Fragen, die sich vor dem Beitreten stellen: Zu
 * welchem Spiel gehoert dieser Code, und ist da ueberhaupt noch Platz?
 */
export type RoomInfo = {
  code: RoomCode;
  gameId: string;
  gameVersion: number;
  phase: RoomPhase;
  maxSeats: number;
  /** Wer schon drin ist – in Spielerreihenfolge. */
  players: string[];
};
