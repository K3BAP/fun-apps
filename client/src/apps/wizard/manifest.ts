import type { AppManifest } from "../types";

const manifest: AppManifest = {
  id: "wizard",
  path: "/wizard",
  title: "Wizard",
  subtitle: "Spielblock",
  emoji: "🧙",
  description:
    "Punkteblock zum Kartenspiel Wizard: Ansage & Stiche pro Runde eintragen – Wertung, laufender Stand und Endrangliste rechnet die App.",
  // Violett/Magenta in beiden Richtungen – passt zum 🧙, ohne zu schreien.
  themes: { light: "fantasy", dark: "dracula" },
  players: { min: 2, max: 6 },
  multiplayer: false,
};

export default manifest;
