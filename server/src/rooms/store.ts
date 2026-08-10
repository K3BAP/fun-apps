import type { WebSocket } from "ws";
import {
  generateCode,
  type CreateRoomBody,
  type DeviceId,
  type RoomCode,
  type RoomState,
} from "@fun/shared";
import { createRoom } from "./room";

export type Room = {
  state: RoomState;
  /** Offene Verbindungen je Geraet. */
  sockets: Map<DeviceId, WebSocket>;
  lastSeen: number;
};

/**
 * Raeume leben nur im Arbeitsspeicher und verfallen, wenn niemand mehr da ist.
 *
 * Keine Datenbank, keine Migrationen, kein Volume – ein Raum ist eine Sitzung am
 * Tisch, kein Dokument. Ein Neustart des Servers beendet laufende Raeume; jedes
 * Geraet behaelt seinen vollstaendigen Spielstand lokal und kann weiterspielen.
 * Das ist eine bewusste Eigenschaft, keine Luecke.
 */
const rooms = new Map<RoomCode, Room>();

const TTL_MS = Number(process.env.ROOM_TTL_MIN ?? 120) * 60_000;
const SWEEP_MS = 60_000;

export function createAndStore(body: CreateRoomBody): Room {
  let code = generateCode();
  while (rooms.has(code)) code = generateCode();

  const room: Room = {
    state: createRoom(code, body),
    sockets: new Map(),
    lastSeen: Date.now(),
  };
  rooms.set(code, room);
  return room;
}

export function getRoom(code: RoomCode): Room | undefined {
  const room = rooms.get(code);
  if (room) room.lastSeen = Date.now();
  return room;
}

export function roomCount(): number {
  return rooms.size;
}

export function startSweeper(): NodeJS.Timeout {
  const timer = setInterval(() => {
    const deadline = Date.now() - TTL_MS;
    for (const [code, room] of rooms) {
      if (room.sockets.size === 0 && room.lastSeen < deadline) rooms.delete(code);
    }
  }, SWEEP_MS);
  timer.unref();
  return timer;
}
