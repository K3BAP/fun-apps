import type { AppManifest } from "../types";

const manifest: AppManifest = {
  id: "kniffel",
  path: "/kniffel",
  title: "Kniffel",
  subtitle: "Spielblock",
  emoji: "🎲",
  description:
    "Digitaler Punkteblock: Spieler anlegen, per Drag & Drop sortieren, spielen – Zwischensummen, Bonus und Endstand rechnet die App.",
  // Gold auf Papier bzw. Tinte – die Hausfarbe des alten Blocks.
  accent: "kniffel",
  players: { min: 2, max: 8 },
  multiplayer: true,
};

export default manifest;
