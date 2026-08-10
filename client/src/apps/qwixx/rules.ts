/* ============ Qwixx – Regeln (rein, ohne React und ohne DOM) ============ */

export const ROW_KEYS = ["red", "yellow", "green", "blue"] as const;
export type RowKey = (typeof ROW_KEYS)[number];

export type Row = { key: RowKey; label: string; asc: boolean };

/** Rot und Gelb laufen aufsteigend 2→12, Grün und Blau absteigend 12→2. */
export const ROWS: readonly Row[] = [
  { key: "red", label: "Rot", asc: true },
  { key: "yellow", label: "Gelb", asc: true },
  { key: "green", label: "Grün", asc: false },
  { key: "blue", label: "Blau", asc: false },
];

export const ROW_LABEL: Record<RowKey, string> = {
  red: "Rot",
  yellow: "Gelb",
  green: "Grün",
  blue: "Blau",
};

/** Elf Zahlenfelder je Reihe; Index 10 ist das Schliessfeld. */
export const CELLS = 11;
export const LAST = 10;
/** So viele Kreuze muessen stehen, bevor das letzte Feld freigeschaltet ist. */
export const CLOSE_MIN = 5;
export const MAX_PENALTIES = 4;
export const PENALTY_POINTS = 5;
/** Dreieckszahlen: 1 Kreuz → 1, 2 → 3, 3 → 6 … 12 → 78. */
export const TRI = [0, 1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66, 78] as const;

export type Marks = Record<RowKey, boolean[]>;
export type Locks = Record<RowKey, boolean>;

export type SeatSheet = {
  marks: Marks;
  locked: Locks;
  penalties: number;
};

export function blankMarks(): Marks {
  return {
    red: Array<boolean>(CELLS).fill(false),
    yellow: Array<boolean>(CELLS).fill(false),
    green: Array<boolean>(CELLS).fill(false),
    blue: Array<boolean>(CELLS).fill(false),
  };
}

export function blankLocks(): Locks {
  return { red: false, yellow: false, green: false, blue: false };
}

export function blankSheet(): SeatSheet {
  return { marks: blankMarks(), locked: blankLocks(), penalties: 0 };
}

/* ---------------------------------------------------------------------------
 * Aufdruck: Original und die beiden Bloecke der Erweiterung „Qwixx gemixxt“
 *
 * Die Erweiterung aendert keine einzige Regel – nur den Aufdruck des Blocks.
 * Weil die gesamte Logik hier ueber Feld-Indizes laeuft (0…10 je Reihe) und
 * Zahlen wie Farben blosse Beschriftung sind, bleibt alles darunter unberuehrt.
 * ------------------------------------------------------------------------- */

export type VariantKey = "classic" | "gemixxtA" | "gemixxtB";

export type Variant = {
  key: VariantKey;
  title: string;
  sub: string;
  badge: string | null;
  hint: string;
};

export const VARIANTS: readonly Variant[] = [
  {
    key: "classic",
    title: "Original",
    sub: "Standard-Block",
    badge: null,
    hint: "Der Block aus dem Grundspiel: Rot und Gelb aufsteigend 2→12, Grün und Blau absteigend 12→2.",
  },
  {
    key: "gemixxtA",
    title: "gemixxt A",
    sub: "Farbfelder",
    badge: "gemixxt A",
    hint: "Erweiterung „Qwixx gemixxt“, Variante A: gleiche Zahlenfolge wie im Original, aber jede Reihe ist in vier Farbsegmente geteilt.",
  },
  {
    key: "gemixxtB",
    title: "gemixxt B",
    sub: "Zahlen gemischt",
    badge: "gemixxt B",
    hint: "Erweiterung „Qwixx gemixxt“, Variante B: die Reihenfarben bleiben, die Zahlen sind gemischt – geschlossen wird mit Rot 11, Gelb 10, Grün 3, Blau 4.",
  },
];

type Layout = {
  /** Abweichende Zahlen je Feld (Variante B). */
  nums?: Record<RowKey, readonly number[]>;
  /** Abweichende Farben je Feld (Variante A). */
  cols?: Record<RowKey, readonly RowKey[]>;
};

/*
 * Der Aufdruck der Zusatzbloecke, Index 0…10 von links. Fest eingebaut und
 * bewusst nicht zufaellig gemischt: im Einzeln-Modus muss auf allen Geraeten
 * derselbe Block stehen, und Mitspieler mit Papierblock sollen mitspielen
 * koennen. 1:1 vom gedruckten Block uebernommen.
 */
// prettier-ignore
const LAYOUTS: Partial<Record<VariantKey, Layout>> = {
  gemixxtA: {
    cols: {
      red:    ["yellow", "yellow", "yellow", "blue",   "blue",   "blue",   "green",  "green",  "green",  "red",    "red"],
      yellow: ["red",    "red",    "green",  "green",  "green",  "green",  "blue",   "blue",   "yellow", "yellow", "yellow"],
      green:  ["blue",   "blue",   "blue",   "yellow", "yellow", "yellow", "red",    "red",    "red",    "green",  "green"],
      blue:   ["green",  "green",  "red",    "red",    "red",    "red",    "yellow", "yellow", "blue",   "blue",   "blue"],
    },
  },
  gemixxtB: {
    nums: {
      red:    [10,  6,  2,  8,  3,  4, 12,  5,  9,  7, 11],
      yellow: [ 9, 12,  4,  6,  7,  2,  5,  8, 11,  3, 10],
      green:  [ 8,  2, 10, 12,  6,  9,  7,  4,  5, 11,  3],
      blue:   [ 5,  7, 11,  9, 12,  3,  8, 10,  2,  6,  4],
    },
  },
};

export function variantInfo(key: VariantKey): Variant {
  return VARIANTS.find((variant) => variant.key === key) ?? VARIANTS[0]!;
}

export function isVariantKey(value: unknown): value is VariantKey {
  return VARIANTS.some((variant) => variant.key === value);
}

function rowOf(key: RowKey): Row {
  return ROWS.find((row) => row.key === key)!;
}

/** Die aufgedruckte Zahl eines Feldes – reine Beschriftung. */
export function cellNumber(variant: VariantKey, key: RowKey, index: number): number {
  const nums = LAYOUTS[variant]?.nums;
  if (nums) return nums[key][index]!;
  const row = rowOf(key);
  return row.asc ? index + 2 : 12 - index;
}

/** Die aufgedruckte Farbe eines Feldes – bei „gemixxt A“ nicht die Reihenfarbe. */
export function cellColor(variant: VariantKey, key: RowKey, index: number): RowKey {
  return LAYOUTS[variant]?.cols?.[key][index] ?? key;
}

/** Variante B laeuft weder auf- noch absteigend – ein ▲/▼ waere dort schlicht falsch. */
export function dirGlyph(variant: VariantKey, key: RowKey): "▲" | "▼" | "→" {
  if (variant === "gemixxtB") return "→";
  return rowOf(key).asc ? "▲" : "▼";
}

/* ---------------------------------------------------------------------------
 * Wertung
 * ------------------------------------------------------------------------- */

export function countMarks(row: readonly boolean[]): number {
  return row.reduce((n, marked) => n + (marked ? 1 : 0), 0);
}

/** Index des rechtesten Kreuzes, −1 wenn die Reihe leer ist. */
export function maxMarked(row: readonly boolean[]): number {
  for (let i = row.length - 1; i >= 0; i -= 1) if (row[i]) return i;
  return -1;
}

/** Das Schloss zaehlt als zusaetzliches Kreuz. */
export function rowScore(row: readonly boolean[], locked: boolean): number {
  return TRI[countMarks(row) + (locked ? 1 : 0)]!;
}

export function sheetScore(sheet: SeatSheet): number {
  const rows = ROW_KEYS.reduce(
    (total, key) => total + rowScore(sheet.marks[key], sheet.locked[key]),
    0,
  );
  return rows - PENALTY_POINTS * sheet.penalties;
}

/* ---------------------------------------------------------------------------
 * Abgeleitet ueber alle Bloecke hinweg
 *
 * Diese Funktionen kennen nur eine Liste von Bloecken – egal ob die auf einem
 * Geraet liegen oder von mehreren Geraeten kommen.
 * ------------------------------------------------------------------------- */

/** Welche Reihen sind geschlossen – von wem auch immer? */
export function closedRows(sheets: readonly SeatSheet[], extClosed: Locks): Locks {
  const closed = blankLocks();
  for (const key of ROW_KEYS) {
    closed[key] = extClosed[key] || sheets.some((sheet) => sheet.locked[key]);
  }
  return closed;
}

/**
 * Fuer diesen Block gesperrt: die Reihe ist zu, aber nicht von ihm selbst –
 * wer selbst geschlossen hat, sieht seine Kreuze weiter.
 */
export function isBlocked(self: SeatSheet, key: RowKey, closed: Locks): boolean {
  return closed[key] && !self.locked[key];
}

export function closedRowCount(closed: Locks): number {
  return ROW_KEYS.reduce((n, key) => n + (closed[key] ? 1 : 0), 0);
}

/** Zwei geschlossene Reihen oder vier Fehlwuerfe bei irgendwem. */
export function isGameOver(sheets: readonly SeatSheet[], extClosed: Locks): boolean {
  const tooManyPenalties = sheets.some((sheet) => sheet.penalties >= MAX_PENALTIES);
  return tooManyPenalties || closedRowCount(closedRows(sheets, extClosed)) >= 2;
}

/* ---------------------------------------------------------------------------
 * Was mit einem einzelnen Feld geht
 *
 * Frueher stand diese Herleitung zweimal da – einmal fuer `disabled`, einmal im
 * Klick-Handler. Jetzt einmal, damit Aussehen und Verhalten nicht auseinander
 * laufen koennen.
 * ------------------------------------------------------------------------- */

export type CellState =
  | "marked"
  /** angekreuzt und wieder loesbar (das rechteste Kreuz) */
  | "available"
  /** uebersprungen – links vom rechtesten Kreuz */
  | "skipped"
  /** letztes Feld, aber noch keine 5 Kreuze davor */
  | "lockedOut"
  /** aus einem anderen Grund nicht anwaehlbar (Reihe gesperrt) */
  | "off";

export function cellState(
  sheet: SeatSheet,
  key: RowKey,
  index: number,
  blocked: boolean,
): CellState {
  const row = sheet.marks[key];
  if (row[index]) return "marked";

  const rightmost = maxMarked(row);
  if (index < rightmost) return "skipped";
  if (index === LAST && countMarks(row) < CLOSE_MIN) return "lockedOut";
  if (!blocked && index > rightmost) return "available";
  return "off";
}

/** Nur das rechteste Kreuz laesst sich wieder loesen. */
export function canUnmark(sheet: SeatSheet, key: RowKey, index: number): boolean {
  return sheet.marks[key][index] === true && index === maxMarked(sheet.marks[key]);
}

/** Antippen des k-ten Kaestchens: war es gesetzt, faellt es weg, sonst bis hierhin. */
export function togglePenalty(current: number, box: number): number {
  return box < current ? box : box + 1;
}
