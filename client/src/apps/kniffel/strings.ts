/** Alle sichtbaren Texte dieser App an einer Stelle. */
export const t = {
  tagline: "Spielblock · Punkte werden automatisch berechnet",
  start: "Spiel starten",

  upperBlock: "Oberer Block",
  lowerBlock: "Unterer Block",
  subtotal: "Zwischensumme",
  bonus: "Bonus",
  grandTotal: "Gesamt",
  category: "Kategorie",
  turn: "am Zug",

  round: (round: number, total: number) => `Runde ${round} / ${total}`,
  fields: (filled: number, total: number) => `${filled} / ${total} Felder`,
  openFields: (open: number) => `Noch ${open} ${open === 1 ? "Feld" : "Felder"} offen`,
  showResult: "Auswertung anzeigen",

  dice: "🎲 Würfeln",
  strike: "streichen",
  clearField: "Feld leeren",

  finalTitle: "Endstand",
  winner: (name: string, score: number) => `${name} gewinnt mit ${score} Punkten`,
  breakdown: (upper: number, lower: number) => `Oberer ${upper} · Unterer ${lower}`,
  bonusIncluded: (points: number) => `inkl. +${points}`,
  again: "Nochmal · gleiche Spieler",
  newGame: "Neues Spiel",
} as const;
