import type { AppManifest } from "../types";

const manifest: AppManifest = {
  id: "beet",
  path: "/beet",
  title: "Ab ins Beet",
  subtitle: "Zähler",
  emoji: "🥬",
  description:
    "Punktezähler zum Brettspiel „Ab ins Beet“: Beetpunkte per geführtem Rechner, automatischer Bonus, Tierkarten – über drei Durchgänge zum Endstand.",
  // Die naechstliegenden eingebauten Themes zum bisherigen Garten-CSS.
  themes: { light: "garden", dark: "forest" },
  players: { min: 2, max: 4 },
  multiplayer: true,
};

export default manifest;
