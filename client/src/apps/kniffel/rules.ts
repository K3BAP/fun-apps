/* ============ Kniffel – Regeln (rein, ohne React und ohne DOM) ============ */

export type DieFace = 1 | 2 | 3 | 4 | 5 | 6;

export type CatKey =
  | "ones"
  | "twos"
  | "threes"
  | "fours"
  | "fives"
  | "sixes"
  | "three"
  | "four"
  | "fullhouse"
  | "small"
  | "large"
  | "kniffel"
  | "chance";

export type Category =
  | { key: CatKey; label: string; hint: string; section: "upper"; face: DieFace }
  | { key: CatKey; label: string; hint: string; section: "lower"; kind: "sum" }
  | { key: CatKey; label: string; hint: string; section: "lower"; kind: "fixed"; value: number };

export const BONUS_THRESHOLD = 63;
export const BONUS_POINTS = 35;

const FACE_GLYPH: Record<DieFace, string> = {
  1: "⚀",
  2: "⚁",
  3: "⚂",
  4: "⚃",
  5: "⚄",
  6: "⚅",
};

function upper(key: CatKey, label: string, face: DieFace): Category {
  return { key, label, hint: `Summe der ${label}`, section: "upper", face };
}

export const UPPER: readonly Category[] = [
  upper("ones", "Einser", 1),
  upper("twos", "Zweier", 2),
  upper("threes", "Dreier", 3),
  upper("fours", "Vierer", 4),
  upper("fives", "Fünfer", 5),
  upper("sixes", "Sechser", 6),
];

const SUM_HINT = "Summe aller 5 Würfel";

// Als Tabelle gesetzt liest sich der untere Block wie der Block auf Papier.
// prettier-ignore
export const LOWER: readonly Category[] = [
  { key: "three",     label: "Dreierpasch",   hint: SUM_HINT,    section: "lower", kind: "sum"              },
  { key: "four",      label: "Viererpasch",   hint: SUM_HINT,    section: "lower", kind: "sum"              },
  { key: "fullhouse", label: "Full House",    hint: "25 Punkte", section: "lower", kind: "fixed", value: 25 },
  { key: "small",     label: "Kleine Straße", hint: "30 Punkte", section: "lower", kind: "fixed", value: 30 },
  { key: "large",     label: "Große Straße",  hint: "40 Punkte", section: "lower", kind: "fixed", value: 40 },
  { key: "kniffel",   label: "Kniffel",       hint: "50 Punkte", section: "lower", kind: "fixed", value: 50 },
  { key: "chance",    label: "Chance",        hint: SUM_HINT,    section: "lower", kind: "sum"              },
];

export const CATS: readonly Category[] = [...UPPER, ...LOWER];
export const TOTAL_FIELDS = CATS.length; // 13

/**
 * Ein Spielerblock.
 *
 * Wichtig: `0` heisst **gestrichen**, ein fehlender Eintrag heisst **leer**.
 * Beides sind gueltige Zustaende mit unterschiedlicher Bedeutung, deshalb
 * `number | undefined` und niemals `null` – `undefined` faellt beim
 * JSON-Serialisieren einfach weg, `null` waere ein dritter Wert.
 */
export type Sheet = Partial<Record<CatKey, number>>;

function sumOf(sheet: Sheet, cats: readonly Category[]): number {
  return cats.reduce((total, cat) => total + (sheet[cat.key] ?? 0), 0);
}

export function upperSum(sheet: Sheet): number {
  return sumOf(sheet, UPPER);
}

export function bonus(sheet: Sheet): number {
  return upperSum(sheet) >= BONUS_THRESHOLD ? BONUS_POINTS : 0;
}

export function upperTotal(sheet: Sheet): number {
  return upperSum(sheet) + bonus(sheet);
}

export function lowerSum(sheet: Sheet): number {
  return sumOf(sheet, LOWER);
}

export function grandTotal(sheet: Sheet): number {
  return upperTotal(sheet) + lowerSum(sheet);
}

export function filledCount(sheet: Sheet): number {
  return CATS.reduce((n, cat) => n + (sheet[cat.key] === undefined ? 0 : 1), 0);
}

export function isSheetComplete(sheet: Sheet): boolean {
  return filledCount(sheet) === TOTAL_FIELDS;
}

export function allComplete(sheets: readonly Sheet[]): boolean {
  return sheets.length > 0 && sheets.every(isSheetComplete);
}

export function totalFilled(sheets: readonly Sheet[]): number {
  return sheets.reduce((n, sheet) => n + filledCount(sheet), 0);
}

export function minFilled(sheets: readonly Sheet[]): number {
  if (sheets.length === 0) return 0;
  return Math.min(...sheets.map(filledCount));
}

/** Am Zug ist, wer die wenigsten Felder ausgefuellt hat; bei Gleichstand der erste. */
export function activeIndex(sheets: readonly Sheet[]): number {
  let best = -1;
  let fewest = Infinity;
  sheets.forEach((sheet, index) => {
    const filled = filledCount(sheet);
    if (filled < fewest) {
      fewest = filled;
      best = index;
    }
  });
  return best;
}

/** Die aktuelle Runde – 13 Runden, eine je Kategorie. */
export function currentRound(sheets: readonly Sheet[]): number {
  return Math.min(minFilled(sheets) + 1, TOTAL_FIELDS);
}

export type EntryOption = {
  value: number;
  /** Zusatz unter der Zahl, z. B. „3 × ⚄“. */
  sub?: string;
  /** Der eigentlich gemeinte Wert bei Kategorien mit fester Punktzahl. */
  main?: boolean;
};

/** Die zur Auswahl stehenden Werte einer Kategorie. `0` ist immer „streichen“. */
export function optionsFor(cat: Category): EntryOption[] {
  if (cat.section === "upper") {
    return Array.from({ length: 6 }, (_, n) => ({
      value: n * cat.face,
      sub: `${n} × ${FACE_GLYPH[cat.face]}`,
    }));
  }
  if (cat.kind === "fixed") {
    return [{ value: cat.value, main: true }, { value: 0 }];
  }
  // Pasch und Chance: unter 5 ist mit fuenf Wuerfeln nichts zu holen, ueber 30 nichts moeglich.
  const options: EntryOption[] = [{ value: 0 }];
  for (let sum = 5; sum <= 30; sum += 1) options.push({ value: sum });
  return options;
}
