import { describe, expect, it } from "vitest";
import {
  CELLS,
  CLOSE_MIN,
  LAST,
  ROW_KEYS,
  VARIANTS,
  blankLocks,
  blankSheet,
  canUnmark,
  cellColor,
  cellNumber,
  cellState,
  closedRowCount,
  closedRows,
  countMarks,
  dirGlyph,
  isBlocked,
  isGameOver,
  maxMarked,
  rowScore,
  sheetScore,
  togglePenalty,
  type RowKey,
  type SeatSheet,
  type VariantKey,
} from "./rules";

/** Block mit Kreuzen an den angegebenen Positionen. */
function sheetWith(marks: Partial<Record<RowKey, number[]>>, patch: Partial<SeatSheet> = {}) {
  const sheet = blankSheet();
  for (const [key, indices] of Object.entries(marks)) {
    for (const index of indices) sheet.marks[key as RowKey][index] = true;
  }
  return { ...sheet, ...patch };
}

const ALL_VARIANTS: VariantKey[] = ["classic", "gemixxtA", "gemixxtB"];

describe("Aufdruck", () => {
  it("beschriftet den Originalblock auf- bzw. absteigend", () => {
    expect(cellNumber("classic", "red", 0)).toBe(2);
    expect(cellNumber("classic", "red", LAST)).toBe(12);
    expect(cellNumber("classic", "green", 0)).toBe(12);
    expect(cellNumber("classic", "green", LAST)).toBe(2);
  });

  it("schliesst bei gemixxt B mit Rot 11, Gelb 10, Grün 3, Blau 4", () => {
    expect(cellNumber("gemixxtB", "red", LAST)).toBe(11);
    expect(cellNumber("gemixxtB", "yellow", LAST)).toBe(10);
    expect(cellNumber("gemixxtB", "green", LAST)).toBe(3);
    expect(cellNumber("gemixxtB", "blue", LAST)).toBe(4);
  });

  it("laesst bei gemixxt B die Reihenfarbe unberuehrt", () => {
    for (const key of ROW_KEYS) {
      for (let i = 0; i < CELLS; i += 1) expect(cellColor("gemixxtB", key, i)).toBe(key);
    }
  });

  it("gibt dem letzten Segment von gemixxt A die Reihenfarbe – das Schloss bleibt bunt", () => {
    for (const key of ROW_KEYS) expect(cellColor("gemixxtA", key, LAST)).toBe(key);
  });

  it("hat in jedem Layout genau 11 Felder je Reihe mit gueltigen Zahlen", () => {
    for (const variant of ALL_VARIANTS) {
      for (const key of ROW_KEYS) {
        const numbers = Array.from({ length: CELLS }, (_, i) => cellNumber(variant, key, i));
        expect(numbers).toHaveLength(CELLS);
        expect(new Set(numbers).size).toBe(CELLS);
        for (const n of numbers) expect(n).toBeGreaterThanOrEqual(2);
        for (const n of numbers) expect(n).toBeLessThanOrEqual(12);
      }
    }
  });

  it("zeigt nur bei gemixxt B einen Pfeil statt ▲/▼", () => {
    expect(dirGlyph("classic", "red")).toBe("▲");
    expect(dirGlyph("classic", "green")).toBe("▼");
    expect(dirGlyph("gemixxtA", "green")).toBe("▼");
    expect(dirGlyph("gemixxtB", "green")).toBe("→");
  });

  it("kennt drei Bloecke", () => {
    expect(VARIANTS.map((v) => v.key)).toEqual(ALL_VARIANTS);
  });
});

describe("Wertung", () => {
  it("wertet ueber die Dreieckszahlen", () => {
    expect(rowScore([], false)).toBe(0);
    expect(rowScore([true], false)).toBe(1);
    expect(rowScore([true, true, true], false)).toBe(6);
  });

  it("zaehlt das Schloss als zusaetzliches Kreuz", () => {
    const row = Array<boolean>(CELLS).fill(true);
    expect(countMarks(row)).toBe(11);
    expect(rowScore(row, false)).toBe(66);
    expect(rowScore(row, true)).toBe(78);
  });

  it("zieht 5 Punkte je Fehlwurf ab", () => {
    const sheet = sheetWith({ red: [0, 1, 2] }, { penalties: 2 });
    expect(sheetScore(sheet)).toBe(6 - 10);
  });

  it("wertet dasselbe Kreuzmuster in allen drei Bloecken gleich", () => {
    // Der Kern der Erweiterung: nur der Aufdruck aendert sich, nichts darunter.
    const pattern = { red: [0, 2, 5], green: [1, 3], blue: [7] };
    const scores = ALL_VARIANTS.map(() => sheetScore(sheetWith(pattern)));
    expect(new Set(scores).size).toBe(1);
    expect(scores[0]).toBe(6 + 3 + 1);
  });
});

describe("maxMarked", () => {
  it("liefert das rechteste Kreuz, sonst −1", () => {
    expect(maxMarked([false, true, false, true])).toBe(3);
    expect(maxMarked([false, false])).toBe(-1);
  });
});

describe("Feldzustaende", () => {
  it("sperrt alles links vom rechtesten Kreuz", () => {
    const sheet = sheetWith({ red: [4] });
    expect(cellState(sheet, "red", 2, false)).toBe("skipped");
    expect(cellState(sheet, "red", 4, false)).toBe("marked");
    expect(cellState(sheet, "red", 5, false)).toBe("available");
  });

  it("gibt das letzte Feld erst ab 5 Kreuzen frei", () => {
    const four = sheetWith({ red: [0, 1, 2, 3] });
    expect(countMarks(four.marks.red)).toBeLessThan(CLOSE_MIN);
    expect(cellState(four, "red", LAST, false)).toBe("lockedOut");

    const five = sheetWith({ red: [0, 1, 2, 3, 4] });
    expect(cellState(five, "red", LAST, false)).toBe("available");
  });

  it("macht in einer gesperrten Reihe nichts mehr anwaehlbar", () => {
    const sheet = sheetWith({ red: [1] });
    expect(cellState(sheet, "red", 5, true)).toBe("off");
  });

  it("laesst nur das rechteste Kreuz wieder loesen", () => {
    const sheet = sheetWith({ red: [2, 6] });
    expect(canUnmark(sheet, "red", 6)).toBe(true);
    expect(canUnmark(sheet, "red", 2)).toBe(false);
    expect(canUnmark(sheet, "red", 7)).toBe(false);
  });
});

describe("Sperren ueber mehrere Bloecke", () => {
  it("leitet geschlossene Reihen aus allen Bloecken ab", () => {
    const mine = blankSheet();
    const theirs = { ...blankSheet(), locked: { ...blankLocks(), red: true } };
    const closed = closedRows([mine, theirs], blankLocks());
    expect(closed.red).toBe(true);
    expect(closed.blue).toBe(false);
    expect(closedRowCount(closed)).toBe(1);
  });

  it("beruecksichtigt auch das von Hand gesetzte Schloss", () => {
    const closed = closedRows([blankSheet()], { ...blankLocks(), green: true });
    expect(closed.green).toBe(true);
  });

  it("sperrt niemanden in seiner eigenen geschlossenen Reihe", () => {
    const mine = { ...blankSheet(), locked: { ...blankLocks(), red: true } };
    const closed = closedRows([mine], blankLocks());
    expect(isBlocked(mine, "red", closed)).toBe(false);
    expect(isBlocked(blankSheet(), "red", closed)).toBe(true);
  });
});

describe("Spielende", () => {
  it("ist bei zwei geschlossenen Reihen erreicht", () => {
    const one = { ...blankSheet(), locked: { ...blankLocks(), red: true } };
    expect(isGameOver([one], blankLocks())).toBe(false);
    const two = { ...blankSheet(), locked: { ...blankLocks(), red: true, blue: true } };
    expect(isGameOver([two], blankLocks())).toBe(true);
  });

  it("ist bei vier Fehlwuerfen erreicht", () => {
    expect(isGameOver([{ ...blankSheet(), penalties: 3 }], blankLocks())).toBe(false);
    expect(isGameOver([{ ...blankSheet(), penalties: 4 }], blankLocks())).toBe(true);
  });
});

describe("Fehlwuerfe", () => {
  it("setzt beim Antippen bis zum Kaestchen und nimmt es beim zweiten Mal zurueck", () => {
    expect(togglePenalty(0, 0)).toBe(1);
    expect(togglePenalty(0, 2)).toBe(3);
    expect(togglePenalty(3, 2)).toBe(2);
    expect(togglePenalty(1, 0)).toBe(0);
  });
});
