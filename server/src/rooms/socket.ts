import type { Server } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import {
  PROTOCOL_VERSION,
  normalizeCode,
  type ClientMsg,
  type DeviceId,
  type ErrorCode,
  type ServerMsg,
} from "@fun/shared";
import {
  evaluateBarrier,
  joinRoom,
  leaveRoom,
  putSeat,
  setOnline,
  setReady,
  setRoom,
  type Result,
} from "./room";
import { getRoom, type Room } from "./store";

function send(socket: WebSocket, msg: ServerMsg): void {
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(msg));
}

function fail(socket: WebSocket, code: ErrorCode, msg: string): void {
  send(socket, { t: "error", code, msg });
}

function broadcast(room: Room, msg: ServerMsg, except?: DeviceId): void {
  for (const [device, socket] of room.sockets) {
    if (device !== except) send(socket, msg);
  }
}

/** Nach jeder Aenderung: oeffnet sich die Schranke, erfahren es alle. */
function announceBarrier(room: Room): void {
  if (evaluateBarrier(room.state)) broadcast(room, { t: "room", room: room.state });
}

function parse(raw: string): ClientMsg | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (value && typeof value === "object" && typeof (value as ClientMsg).t === "string") {
      return value as ClientMsg;
    }
  } catch {
    /* faellt unten als bad_message durch */
  }
  return null;
}

/**
 * Die Berechtigung ist bewusst schlicht: wer den Code kennt, ist im Raum; einen
 * Platz beschreibt nur sein Eigentuemer; Raum-Einstellungen aendert nur der
 * Host. Fuer eine Partie am Küchentisch ist das angemessen – es ist keine
 * Zugriffskontrolle und gibt auch nicht vor, eine zu sein.
 */
export function attachRooms(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: "/api/ws" });

  wss.on("connection", (socket) => {
    let room: Room | null = null;
    let device: DeviceId | null = null;

    socket.on("message", (raw) => {
      const msg = parse(raw.toString());
      if (!msg) return fail(socket, "bad_message", "Unverständliche Nachricht.");

      if (msg.t === "ping") return send(socket, { t: "pong" });

      // Vor dem hello geht nichts.
      if (msg.t === "hello") {
        if (msg.v !== PROTOCOL_VERSION) {
          return fail(socket, "bad_version", "Bitte die Seite neu laden.");
        }
        const found = getRoom(normalizeCode(msg.code));
        if (!found) return fail(socket, "no_room", "Diesen Raum gibt es nicht (mehr).");

        // Anmelden und beitreten sind ein Schritt: schlaegt das Beitreten fehl
        // (Raum voll, Spiel laeuft schon), bleibt die Verbindung ohne Raum.
        const joined = joinRoom(found.state, msg.device, msg.name);
        if (!joined.ok) return fail(socket, joined.code, joined.msg);

        room = found;
        device = msg.device;
        // Eine zweite Verbindung desselben Geraets loest die erste ab.
        room.sockets.get(device)?.close();
        room.sockets.set(device, socket);

        send(socket, {
          t: "snapshot",
          room: room.state,
          you: { device, seat: joined.value.id },
        });
        broadcast(room, { t: "room", room: room.state }, device);
        return;
      }

      if (!room || !device) return fail(socket, "no_room", "Erst anmelden.");

      const report = <T>(result: Result<T>, onOk: (value: T) => void): void => {
        if (!result.ok) return fail(socket, result.code, result.msg);
        onOk(result.value);
      };

      switch (msg.t) {
        case "leave":
          return report(leaveRoom(room.state, device), () => {
            broadcast(room!, { t: "room", room: room!.state });
          });

        case "seat":
          return report(putSeat(room.state, device, msg.seat, msg.rev, msg.data), (seat) => {
            // `null` heisst: veralteter Stand, schon verworfen.
            if (seat) broadcast(room!, { t: "seat", seat });
          });

        case "ready":
          return report(setReady(room.state, device, msg.seat, msg.ready), (seat) => {
            broadcast(room!, { t: "seat", seat });
            announceBarrier(room!);
          });

        case "room":
          return report(setRoom(room.state, device, msg.patch), () => {
            broadcast(room!, { t: "room", room: room!.state });
            announceBarrier(room!);
          });
      }
    });

    socket.on("close", () => {
      if (!room || !device) return;
      // Nur diese Verbindung austragen – ein Reconnect kann schneller sein als
      // das close-Ereignis der alten Verbindung.
      if (room.sockets.get(device) === socket) {
        room.sockets.delete(device);
        setOnline(room.state, device, false);
        broadcast(room, { t: "room", room: room.state });
      }
    });
  });

  return wss;
}
