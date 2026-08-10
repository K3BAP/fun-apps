export const t = {
  tagline: "Spielblock · Ansage & Stiche, Punkte automatisch",
  start: "Spiel starten",

  enforceTitle: "Ansage-Verbot",
  enforceDescription: "Die Summe der Ansagen darf nicht der Stichzahl entsprechen",
  setupHint: (players: number, rounds: number) => `${players} Spieler · ${rounds} Runden`,

  round: (round: number, total: number) => `Runde ${round} / ${total}`,
  cards: (count: number) => `${count} ${count === 1 ? "Karte" : "Karten"} je Spieler`,

  stepBid: "1 · Ansagen",
  stepTrick: "2 · Stiche",
  bidTitle: "Ansagen",
  bidSubtitle: "Wie viele Stiche schaffst du?",
  trickTitle: "Stiche",
  trickSubtitle: "Wie viele Stiche hast du tatsächlich gemacht?",
  dealer: "Geber · sagt zuletzt an",
  bidOf: (bid: number) => `Ansage: ${bid}`,

  bidSum: (sum: number, round: number) => `Summe der Ansagen: ${sum} / ${round}`,
  bidBlocked: "Ansage-Verbot: der Geber muss die Summe ändern",
  enforceOff: "(Verbot aus)",
  trickSum: (sum: number, round: number) => `Stiche gesamt: ${sum} / ${round}`,
  trickNeeded: (round: number) => `muss genau ${round} ergeben`,

  toTricks: "Weiter zu den Stichen →",
  backToBids: "← Ansagen",
  finishRound: "Runde abschließen",
  finishGame: "Spiel beenden",

  menuBlock: "Block ansehen",
  menuEnforce: "Ansage-Verbot",

  blockTitle: "Block",
  blockEmpty: "Noch keine Runde abgeschlossen.",
  blockRound: "Rd",

  finalTitle: "Endstand",
  winner: (name: string, score: number) => `${name} gewinnt mit ${score} Punkten`,
  hitsOf: (hits: number, rounds: number) => `${hits} / ${rounds} Ansagen getroffen`,
  showBlock: "📋 Kompletten Block ansehen",
  again: "Nochmal · gleiche Spieler",
  newGame: "Neues Spiel",
} as const;
