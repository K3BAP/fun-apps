import type { AppManifest } from "@/apps/types";

const manifest: AppManifest = {
  id: "kniffel",
  path: "/kniffel",
  title: "Kniffel",
  subtitle: "Spielblock",
  emoji: "🎲",
  description:
    "Digitaler Punkteblock: Spieler anlegen, per Drag & Drop sortieren, spielen – Zwischensummen, Bonus und Endstand rechnet die App.",
  // Warmes Creme/Braun wie der bisherige Block; beide Themes sind ruhig genug
  // fuer eine dichte Tabelle mit 13 Zeilen.
  themes: { light: "caramellatte", dark: "coffee" },
  players: { min: 2, max: 8 },
  multiplayer: true,
};

export default manifest;
