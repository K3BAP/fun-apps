import type { AppManifest } from "../types";

const manifest: AppManifest = {
  id: "beet",
  path: "/beet",
  title: "Ab ins Beet",
  subtitle: "Zähler",
  emoji: "🥬",
  description:
    "Punktezähler zum Brettspiel „Ab ins Beet“: Beetpunkte per geführtem Rechner, automatischer Bonus, Tierkarten – über drei Durchgänge zum Endstand.",
  // Blattgruen, nach dem --leaf #3f8f3a des alten Garten-CSS.
  accent: "beet",
  players: { min: 2, max: 4 },
  multiplayer: true,
};

export default manifest;
