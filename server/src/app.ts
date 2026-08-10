import path from "node:path";
import express, { type Express } from "express";
import { serveClient } from "./static";

/**
 * Vom Server-Bundle (server/dist/index.js) aus liegt der Client-Build unter
 * ../../client/dist – im Container genau wie im Repo.
 */
function clientDist(): string {
  return path.resolve(import.meta.dirname, "../../client/dist");
}

export function createApp(): Express {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "64kb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  // Im Dev liefert Vite den Client aus (Port 5173, /api wird hierher
  // durchgereicht) – dann gibt es noch keinen Build, und das ist in Ordnung.
  const served = serveClient(app, clientDist());
  if (!served) {
    console.log("Kein Client-Build gefunden – es wird nur /api ausgeliefert.");
  }

  return app;
}
