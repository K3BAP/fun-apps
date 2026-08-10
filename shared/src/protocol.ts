/* ============ Das Protokoll zwischen Client und Server ====================
 *
 * Das Modell in einem Satz: **ein Platz, ein Schreiber.**
 *
 * Jeder Platz in einem Raum gehoert genau einem Geraet. Nur dieses Geraet
 * schreibt die Daten des Platzes; alle anderen sehen sie live, aber nur lesend.
 * Damit sind Konflikte nicht geloest, sondern ausgeschlossen – und deshalb wird
 * der Inhalt eines Platzes immer **vollstaendig** uebertragen statt als Diff.
 * Ein Qwixx-Block sind rund 700 Byte, eine Kniffel-Spalte 13 Zahlen; ein
 * Patch-Format waere reiner Aufwand ohne Gegenwert.
 *
 * Der Server kennt keine Spielregeln. Werte, die sich aus allen Plaetzen
 * zusammen ergeben (der Bonus in Ab ins Beet, die gesperrten Reihen in Qwixx),
 * rechnet jedes Geraet selbst aus den zusammengefuehrten Plaetzen aus – das sind
 * reine Funktionen, die ueberall dasselbe Ergebnis liefern.
 * ========================================================================= */

export const PROTOCOL_VERSION = 1;

/** Bleibt auf dem Geraet (localStorage) und ueberlebt einen Reload. */
export type DeviceId = string;
export type SeatId = string;
export type RoomCode = string;

export type RoomPhase = "setup" | "play" | "result";

export type Seat = {
  id: SeatId;
  name: string;
  color: string;
  /** `null` = frei. Nur der Eigentuemer darf `data` schreiben. */
  owner: DeviceId | null;
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
  | { t: "hello"; v: number; device: DeviceId; code: RoomCode }
  | { t: "claim"; seat: SeatId }
  | { t: "release"; seat: SeatId }
  | { t: "seat"; seat: SeatId; rev: number; data: unknown }
  | { t: "ready"; seat: SeatId; ready: boolean }
  | { t: "room"; patch: RoomPatch }
  | { t: "ping" };

export type ErrorCode =
  | "no_room"
  | "bad_version"
  | "not_owner"
  | "not_host"
  | "seat_taken"
  | "unknown_seat"
  | "bad_message";

export type ServerMsg =
  | { t: "snapshot"; room: RoomState; you: { device: DeviceId; seats: SeatId[] } }
  | { t: "seat"; seat: Seat }
  | { t: "room"; room: RoomState }
  | { t: "error"; code: ErrorCode; msg: string }
  | { t: "pong" };

/** Was beim Anlegen eines Raums mitgegeben wird (POST /api/rooms). */
export type CreateRoomBody = {
  gameId: string;
  gameVersion: number;
  host: DeviceId;
  config: unknown;
  /** Der Raum startet dort, wo der Host gerade steht – meist mitten im Spiel. */
  phase?: RoomPhase;
  seats: { name: string; color: string }[];
};

export type CreateRoomResponse = { code: RoomCode };

/** Kurzinfo vor dem Beitreten (GET /api/rooms/:code) – fuer den QR-Einstieg. */
export type RoomInfo = {
  code: RoomCode;
  gameId: string;
  gameVersion: number;
  seats: { id: SeatId; name: string; taken: boolean }[];
};
