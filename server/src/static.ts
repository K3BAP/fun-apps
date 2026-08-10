import fs from "node:fs";
import path from "node:path";
import express, { type Express } from "express";

/**
 * Die Auslieferung des Client-Builds – der Teil, der frueher in
 * nginx/default.conf stand.
 *
 * Mit Build-Step tragen die Assets einen Hash im Namen und koennen ewig
 * gecacht werden. Die Huelle (index.html) und der Service Worker duerfen das
 * nicht: sonst zeigt der Browser tagelang einen alten Stand, weil er die
 * Haltbarkeit ohne Cache-Control heuristisch aus Last-Modified raet. Genau
 * dieses Problem hatte die Vorgaenger-Version.
 */
const NEVER_CACHE = /(index\.html|sw\.js|manifest\.webmanifest|registerSW\.js)$/;

export function serveClient(app: Express, distDir: string): boolean {
  if (!fs.existsSync(distDir)) return false;

  // Gehashte Dateinamen: der Inhalt aendert sich nie, der Name schon.
  app.use(
    "/assets",
    express.static(path.join(distDir, "assets"), {
      index: false,
      immutable: true,
      maxAge: "1y",
    }),
  );

  app.use(
    express.static(distDir, {
      index: false,
      setHeaders(res, file) {
        res.setHeader(
          "Cache-Control",
          NEVER_CACHE.test(file) ? "no-cache" : "public, max-age=3600",
        );
      },
    }),
  );

  // SPA-Fallback fuer alles ausser /api. Kein "*" – path-to-regexp v8 (Express 5)
  // lehnt das ab; die negative Vorschau trifft es ohnehin genauer.
  app.get(/^(?!\/api(\/|$)).*/, (_req, res) => {
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(path.join(distDir, "index.html"));
  });

  return true;
}
