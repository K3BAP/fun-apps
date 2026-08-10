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

export type Result<T> = { ok: true; value: T } | { ok: false; code: ErrorCode; msg: string };

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = <T>(code: ErrorCode, msg: string): Result<T> => ({ ok: false, code, msg });

export function createRoom(code: RoomCode, body: CreateRoomBody): RoomState {
  return {
    code,
    gameId: body.gameId,
    gameVersion: body.gameVersion,
    host: body.host,
    config: body.config,
    phase: body.phase ?? "setup",
    barrier: null,
    seats: body.seats.map((seat, index) => ({
      id: `s${index + 1}`,
      name: seat.name,
      color: seat.color,
      owner: null,
      online: false,
      ready: false,
      rev: 0,
      data: null,
    })),
    rev: 0,
  };
}

function seatOf(room: RoomState, id: SeatId): Seat | undefined {
  return room.seats.find((seat) => seat.id === id);
}

/**
 * Einen Platz belegen. Wieder-Belegen durch dasselbe Geraet ist erlaubt – genau
 * das passiert nach einem Reload oder einer Neuverbindung.
 */
export function claim(room: RoomState, device: DeviceId, seatId: SeatId): Result<Seat> {
  const seat = seatOf(room, seatId);
  if (!seat) return fail("unknown_seat", `Platz ${seatId} gibt es nicht.`);
  if (seat.owner !== null && seat.owner !== device) {
    return fail("seat_taken", `Platz ${seatId} ist schon belegt.`);
  }
  seat.owner = device;
  seat.online = true;
  room.rev += 1;
  return ok(seat);
}

export function release(room: RoomState, device: DeviceId, seatId: SeatId): Result<Seat> {
  const seat = seatOf(room, seatId);
  if (!seat) return fail("unknown_seat", `Platz ${seatId} gibt es nicht.`);
  if (seat.owner !== device) return fail("not_owner", "Das ist nicht dein Platz.");
  seat.owner = null;
  seat.online = false;
  seat.ready = false;
  room.rev += 1;
  return ok(seat);
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

/**
 * Die Schranke oeffnet, sobald alle **belegten** Plaetze bereit sind. Freie
 * Plaetze zaehlen nicht mit – sonst wartete eine Runde ewig auf einen Platz,
 * den niemand genommen hat.
 */
export function evaluateBarrier(room: RoomState): boolean {
  if (!room.barrier || room.barrier.open) return false;
  const taken = room.seats.filter((seat) => seat.owner !== null);
  if (taken.length === 0 || !taken.every((seat) => seat.ready)) return false;
  room.barrier.open = true;
  room.rev += 1;
  return true;
}

/** Verbindung weg: der Platz bleibt dem Geraet, er ist nur gerade nicht da. */
export function setOnline(room: RoomState, device: DeviceId, online: boolean): SeatId[] {
  const changed: SeatId[] = [];
  for (const seat of room.seats) {
    if (seat.owner === device && seat.online !== online) {
      seat.online = online;
      changed.push(seat.id);
    }
  }
  if (changed.length > 0) room.rev += 1;
  return changed;
}

export function seatsOwnedBy(room: RoomState, device: DeviceId): SeatId[] {
  return room.seats.filter((seat) => seat.owner === device).map((seat) => seat.id);
}
