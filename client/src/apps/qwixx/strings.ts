export const t = {
  tagline: "Spielblock · vier Reihen, Punkte automatisch",

  modeLabel: "Modus",
  modeShared: "👥 Gemeinsam",
  modeSharedHint: "Alle auf einem Gerät",
  modeSolo: "📱 Einzeln",
  modeSoloHint: "Eigenes Gerät",

  blockLabel: "Spielblock",
  soloAllSame: " Alle Mitspieler müssen denselben Block wählen.",

  optShowScore: "Punkte live anzeigen",
  optShowScoreHint: "Aus: Punktestand bleibt bis zur Auswertung verdeckt",
  optRequireEnd: "Ende nur nach Regel",
  optRequireEndHint: "Auswerten erst, wenn 2 Reihen zu sind oder 4 Fehlwürfe stehen",

  yourName: "Dein Name",
  yourNamePlaceholder: "Dein Name …",
  soloHint:
    "Auf diesem Gerät spielst nur du. Alle Mitspieler öffnen dieselbe Seite auf ihrem eigenen Gerät und wählen ebenfalls „Einzeln“.",
  startSolo: "Losspielen",
  startShared: "Spiel starten",

  hidden: "🙈 verdeckt",
  points: (value: number) => `${value} Pkt`,
  marksCount: (count: number) => `${count}×`,

  penalties: "Fehlwürfe · je −5",
  lockRow: (label: string) => `${label} sperren – ein Mitspieler hat die Reihe geschlossen`,
  lockRowUndo: (label: string) => `${label} wieder freigeben`,
  lockedByYou: (label: string) => `${label}: von dir geschlossen`,
  lockedByOther: (label: string) => `${label}: von einem Mitspieler geschlossen`,

  blockedRows: (labels: readonly string[]) =>
    `Zugemacht: ${labels.join(" · ")} – im selben Zug darfst du die Reihe noch mit zumachen, sonst geht hier nichts mehr rein.`,

  diceGone: (labels: readonly string[]) =>
    labels.length === 1
      ? `${labels[0]} ist raus – die Reihe ist zu.`
      : `${labels.join(" und ")} sind raus – die Reihen sind zu.`,
  lockHint:
    "Hat ein Mitspieler eine Reihe zugemacht? Schloss antippen – dann ist sie hier gesperrt.",

  endBanner: (reason: string) => `Spielende erreicht: ${reason} Jetzt auswerten.`,
  endSoloPenalties: "Du hast 4 Fehlwürfe.",
  endSoloRows: "Du hast 2 Reihen geschlossen.",
  endSharedPenalties: "Ein Spieler hat 4 Fehlwürfe.",
  endSharedRows: "Zwei Reihen sind geschlossen.",
  evaluate: "Auswerten",
  evaluateLocked:
    "Auswerten ist gesperrt, bis das Spielende erreicht ist: zwei geschlossene Reihen oder 4 Fehlwürfe.",

  menuOverviewSolo: "Reihen-Übersicht",
  menuOverviewShared: "Übersicht aller Spieler",
  menuDice: "Würfeln",
  menuEvaluate: "Spiel auswerten",
  menuEvaluateLockedNote: "erst am Spielende",

  overviewTitle: "Übersicht",
  overviewPenalties: "Fehl.",
  marks: (count: number) => `${count} Kreuze`,

  resultSoloTitle: "Dein Ergebnis",
  resultSoloSubtitle: (name: string, score: number, badge: string) =>
    `${name} · ${score} Punkte${badge}`,
  finalTitle: "Endstand",
  winner: (name: string, score: number, badge: string) =>
    `${name} gewinnt mit ${score} Punkten${badge}`,
  closedRows: (count: number) => `${count} ${count === 1 ? "Reihe" : "Reihen"} geschlossen`,
  penaltyCount: (count: number) => `${count} ${count === 1 ? "Fehlwurf" : "Fehlwürfe"}`,
  lockBonus: " + Schloss",
  total: "Gesamt",
  resume: "↩︎ Weiterspielen",
  resumeHint: "Zurück zum Spielblock – nichts wird zurückgesetzt",
  showOverview: "📋 Übersicht aller Reihen",
  againSolo: "Nochmal",
  againShared: "Nochmal · gleiche Spieler",
  backToStart: "Zurück zum Start",
  newGame: "Neues Spiel",
} as const;
