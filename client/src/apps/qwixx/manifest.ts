import type { AppManifest } from "../types";

const manifest: AppManifest = {
  id: "qwixx",
  path: "/qwixx",
  title: "Qwixx",
  subtitle: "Spielblock",
  emoji: "🌈",
  description:
    "Vier Farbreihen ankreuzen: Sperren, Schlösser und Fehlwürfe führt die App regelkonform, die Punkte rechnet sie. Auch die beiden Blöcke der Erweiterung „gemixxt“.",
  // Sehr geringe Buntheit, damit die vier festen Reihenfarben das Lauteste auf
  // dem Bildschirm bleiben.
  themes: { light: "winter", dark: "night" },
  players: { min: 2, max: 5 },
  multiplayer: true,
};

export default manifest;
