import path from "node:path";
import express, { type Express } from "express";
import { isValidCode, normalizeCode, type CreateRoomBody, type RoomInfo } from "@fun/shared";
import { createAndStore, getRoom, roomCount } from "./rooms/store";
import { serveClient } from "./static";

/**
 * Vom Server-Bundle (server/dist/index.js) aus liegt der Client-Build unter
 * ../../client/dist – im Container genau wie im Repo.
 */
function clientDist(): string {
  return path.resolve(import.meta.dirname, "../../client/dist");
}

function isCreateBody(value: unknown): value is CreateRoomBody {
  const body = value as CreateRoomBody | undefined;
  return (
    typeof body?.gameId === "string" &&
    typeof body.gameVersion === "number" &&
    typeof body.host === "string" &&
    typeof body.maxSeats === "number" &&
    body.maxSeats >= 1 &&
    body.maxSeats <= 16
  );
}

export function createApp(): Express {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "64kb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, rooms: roomCount() });
  });

  app.post("/api/rooms", (req, res) => {
    if (!isCreateBody(req.body)) {
      res.status(400).json({ error: "Unvollständige Anfrage." });
      return;
    }
    const room = createAndStore(req.body);
    res.status(201).json({ code: room.state.code });
  });

  // Vor dem Beitreten: zu welchem Spiel gehoert der Code, wer ist schon da, ist
  // noch Platz? Das reicht fuer den Beitritts-Bildschirm, ohne den Spielstand
  // herauszugeben.
  app.get("/api/rooms/:code", (req, res) => {
    const code = normalizeCode(req.params.code);
    const room = isValidCode(code) ? getRoom(code) : undefined;
    if (!room) {
      res.status(404).json({ error: "Diesen Raum gibt es nicht (mehr)." });
      return;
    }
    const info: RoomInfo = {
      code: room.state.code,
      gameId: room.state.gameId,
      gameVersion: room.state.gameVersion,
      phase: room.state.phase,
      maxSeats: room.state.maxSeats,
      players: room.state.seats.map((seat) => seat.name),
    };
    res.json(info);
  });

  // Im Dev liefert Vite den Client aus (Port 5173, /api wird hierher
  // durchgereicht) – dann gibt es noch keinen Build, und das ist in Ordnung.
  if (!serveClient(app, clientDist())) {
    console.log("Kein Client-Build gefunden – es wird nur /api ausgeliefert.");
  }

  return app;
}
