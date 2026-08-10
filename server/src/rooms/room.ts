import type {
  CreateRoomBody,
  DeviceId,
  ErrorCode,
  RoomCode,
  RoomPatch,
  RoomState,
  Seat,
  SeatId,
} from "@fun/shared";
import { nextColor } from "@fun/shared";

export type Result<T> = { ok: true; value: T } | { ok: false; code: ErrorCode; msg: string };

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = <T>(code: ErrorCode, msg: string): Result<T> => ({ ok: false, code, msg });

/** Laenger als das passt in keine Spielerliste – und niemand tippt es ein. */
const NAME_MAX = 24;

export function createRoom(code: RoomCode, body: CreateRoomBody): RoomState {
  return {
    code,
    gameId: body.gameId,
    gameVersion: body.gameVersion,
    host: body.host,
    maxSeats: body.maxSeats,
    config: null,
    phase: "setup",
    barrier: null,
    seats: [],
    rev: 0,
  };
}

/**
 * Eine Kennung, die keinem lebenden Platz gehoert.
 *
 * Bewusst aus dem Hoechststand abgeleitet und nicht aus der Anzahl: verlaesst
 * der zweite von dreien den Raum, waere `s${length + 1}` wieder `s3` – und damit
 * die Kennung eines Platzes, den es noch gibt.
 */
function nextSeatId(room: RoomState): SeatId {
  const highest = room.seats.reduce((max, seat) => Math.max(max, Number(seat.id.slice(1)) || 0), 0);
  return `s${highest + 1}`;
}

function seatOf(room: RoomState, id: SeatId): Seat | undefined {
  return room.seats.find((seat) => seat.id === id);
}

export function seatOwnedBy(room: RoomState, device: DeviceId): Seat | undefined {
  return room.seats.find((seat) => seat.owner === device);
}

/**
 * Anmelden heisst beitreten: wer noch keinen Platz hat, bekommt einen.
 *
 * Ein wiederkehrendes Geraet erkennt der Raum an seiner Kennung und gibt ihm
 * seinen alten Platz zurueck – deshalb ueberstehen Reload und Funkloch das
 * Spiel, ohne dass jemand etwas „uebernehmen“ muesste. Nur wer beim Start nicht
 * dabei war, kommt nicht mehr hinein: Plaetze mitten im Spiel anzuhaengen
 * verschoebe die Reihenfolge, an der alle Bloecke haengen.
 */
export function joinRoom(room: RoomState, device: DeviceId, name: string): Result<Seat> {
  const existing = seatOwnedBy(room, device);
  if (existing) {
    if (!existing.online) {
      existing.online = true;
      room.rev += 1;
    }
    return ok(existing);
  }

  if (room.phase !== "setup") {
    return fail("room_locked", "Das Spiel läuft schon.");
  }
  if (room.seats.length >= room.maxSeats) {
    return fail("room_full", `Der Raum ist voll (${room.maxSeats} Spieler).`);
  }

  const clean = name.trim().slice(0, NAME_MAX);
  const seat: Seat = {
    id: nextSeatId(room),
    name: clean === "" ? `Spieler ${room.seats.length + 1}` : clean,
    color: nextColor(room.seats.map((s) => s.color)),
    owner: device,
    online: true,
    ready: false,
    rev: 0,
    data: null,
  };
  room.seats.push(seat);
  room.rev += 1;
  return ok(seat);
}

/**
 * Den eigenen Platz raeumen – nur in der Lobby.
 *
 * Sobald gespielt wird, bleibt der Platz stehen, auch wenn sein Geraet
 * verschwindet: er traegt den halben Spielstand der anderen mit sich (die
 * gesperrten Reihen in Qwixx, den Bonus in Ab ins Beet).
 */
export function leaveRoom(room: RoomState, device: DeviceId): Result<SeatId> {
  const seat = seatOwnedBy(room, device);
  if (!seat) return fail("unknown_seat", "Du hast hier keinen Platz.");
  if (room.phase !== "setup") return fail("room_locked", "Das Spiel läuft schon.");

  room.seats = room.seats.filter((candidate) => candidate !== seat);
  room.rev += 1;
  return ok(seat.id);
}

/**
 * Den Inhalt eines Platzes setzen.
 *
 * Ein `rev`, das nicht groesser ist als das gespeicherte, wird verworfen. Damit
 * ist das Nachspielen der Warteschlange nach einer Neuverbindung von selbst
 * idempotent – ohne Merkliste bereits gesehener Nachrichten.
 */
export function putSeat(
  room: RoomState,
  device: DeviceId,
  seatId: SeatId,
  rev: number,
  data: unknown,
): Result<Seat | null> {
  const seat = seatOf(room, seatId);
  if (!seat) return fail("unknown_seat", `Platz ${seatId} gibt es nicht.`);
  if (seat.owner !== device) return fail("not_owner", "Das ist nicht dein Platz.");
  if (rev <= seat.rev) return ok(null);

  seat.rev = rev;
  seat.data = data;
  room.rev += 1;
  return ok(seat);
}

export function setReady(
  room: RoomState,
  device: DeviceId,
  seatId: SeatId,
  ready: boolean,
): Result<Seat> {
  const seat = seatOf(room, seatId);
  if (!seat) return fail("unknown_seat", `Platz ${seatId} gibt es nicht.`);
  if (seat.owner !== device) return fail("not_owner", "Das ist nicht dein Platz.");
  seat.ready = ready;
  room.rev += 1;
  return ok(seat);
}

/** Spielweite Aenderungen darf nur der Host. */
export function setRoom(room: RoomState, device: DeviceId, patch: RoomPatch): Result<RoomState> {
  if (device !== room.host) return fail("not_host", "Das darf nur der Host.");

  if (patch.config !== undefined) room.config = patch.config;
  if (patch.phase !== undefined) room.phase = patch.phase;

  if (patch.barrier !== undefined) {
    if (patch.barrier === null) {
      room.barrier = null;
    } else if (room.barrier?.token !== patch.barrier) {
      // Neue Schranke: alle fangen wieder bei „nicht bereit“ an.
      room.barrier = { token: patch.barrier, open: false };
      for (const seat of room.seats) seat.ready = false;
    }
  }

  room.rev += 1;
  return ok(room);
}

/** Die Schranke oeffnet, sobald alle Plaetze bereit sind. */
export function evaluateBarrier(room: RoomState): boolean {
  if (!room.barrier || room.barrier.open) return false;
  if (room.seats.length === 0 || !room.seats.every((seat) => seat.ready)) return false;
  room.barrier.open = true;
  room.rev += 1;
  return true;
}

/** Verbindung weg: der Platz bleibt dem Geraet, er ist nur gerade nicht da. */
export function setOnline(room: RoomState, device: DeviceId, online: boolean): boolean {
  const seat = seatOwnedBy(room, device);
  if (!seat || seat.online === online) return false;
  seat.online = online;
  room.rev += 1;
  return true;
}
