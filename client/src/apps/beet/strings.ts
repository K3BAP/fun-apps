export const t = {
  tagline: "Punktezähler · Beete, Bonus und Tierkarten",
  start: "Spiel starten",
  gardeners: "Gärtner",

  round: (round: number, total: number) => `Durchgang ${round} / ${total}`,
  tierCards: (count: number) => `${count} ${count === 1 ? "Tierkarte" : "Tierkarten"}`,

  stepBeet: "① Beete",
  stepBonus: "② Bonus",
  stepTier: "③ Tiere",

  beetTitle: (name: string) => `Beete von ${name}`,
  beetSubtitle: (index: number, total: number) =>
    `Gärtner ${index} / ${total} · tippe die 3 Beete an`,
  bedTitle: (index: number) => `🌱 Beet ${index}`,
  points: (value: number) => `${value} P`,
  colorfulness: "Farbigkeit",
  colorOptions: [
    { colors: 1, label: "einfarbig", points: 3 },
    { colors: 2, label: "zweifarbig", points: 1 },
    { colors: 3, label: "dreifarbig", points: 0 },
  ] as const,
  wholeSalads: "🥬 Ganze Salate",
  noHalfSalads: "Keine halben Salate",
  noHalfHint: "+1, wenn kein halber Salat im Beet liegt",
  pairs: "🍅🫑 Tomate+Paprika-Paare",
  beetSum: (name: string) => `Beetpunkte ${name}`,
  previousGardener: "← Zurück",
  nextGardener: "Nächster Gärtner →",
  toBonus: "Weiter zum Bonus →",

  bonusTitle: "Bonuspunkte",
  bonusSubtitle: "Automatisch: meiste → 10, wenigste → 0, dazwischen → 5",
  beetPoints: (value: number) => `${value} Beetpkt.`,
  backToBeet: "← Beete",
  toTier: "Weiter zu den Tieren →",

  tierTitle: "Tierkarten",
  tierSubtitle: (max: number) => `5 Punkte je Beet, das eine Tierkarte erfüllt (max. ${max})`,
  tierBeds: (count: number) => `🦡 ${count} ${count === 1 ? "Beet" : "Beete"}`,
  backToBonus: "← Bonus",
  finishRound: "Durchgang abschließen",
  finishGame: "Spiel beenden 🏆",

  menuBlock: "📋 Block ansehen",
  blockTitle: "Block",
  blockEmpty: "Noch kein Durchgang abgeschlossen.",
  blockLegend: "je Zelle: Beet + Bonus + Tier · darunter die Laufsumme",
  blockRound: "Dg",

  finalTitle: "Endstand",
  winner: (name: string, score: number) => `${name} gewinnt mit ${score} Punkten`,
  roundBreakdown: (parts: readonly number[]) => `Durchgänge: ${parts.join(" · ")}`,
  showBlock: "📋 Kompletten Block ansehen",
  again: "Nochmal · gleiche Gärtner",
  newGame: "Neues Spiel",
} as const;
