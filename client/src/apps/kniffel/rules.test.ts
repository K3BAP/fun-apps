import { describe, expect, it } from "vitest";
import {
  BONUS_POINTS,
  BONUS_THRESHOLD,
  CATS,
  TOTAL_FIELDS,
  UPPER,
  activeIndex,
  allComplete,
  bonus,
  currentRound,
  filledCount,
  grandTotal,
  isSheetComplete,
  lowerSum,
  optionsFor,
  upperSum,
  upperTotal,
  type CatKey,
  type Category,
  type Sheet,
} from "./rules";

function sheetOf(entries: Partial<Record<CatKey, number>>): Sheet {
  return entries;
}

function catByKey(key: CatKey): Category {
  const found = CATS.find((c) => c.key === key);
  if (!found) throw new Error(`Kategorie ${key} fehlt`);
  return found;
}

describe("Kategorien", () => {
  it("hat 13 Felder", () => {
    expect(TOTAL_FIELDS).toBe(13);
    expect(UPPER).toHaveLength(6);
  });
});

describe("0 gestrichen vs. leer", () => {
  it("zaehlt eine gestrichene Null als ausgefuellt", () => {
    expect(filledCount(sheetOf({ ones: 0 }))).toBe(1);
    expect(filledCount(sheetOf({}))).toBe(0);
  });

  it("unterscheidet gestrichen von leer auch beim Runden-Zaehler", () => {
    // Beide Bloecke haben 0 Punkte, aber nur einer hat schon gespielt.
    expect(currentRound([sheetOf({ ones: 0 })])).toBe(2);
    expect(currentRound([sheetOf({})])).toBe(1);
  });

  it("ueberlebt den Weg durch JSON", () => {
    const sheet = sheetOf({ ones: 0, twos: undefined });
    const round = JSON.parse(JSON.stringify(sheet)) as Sheet;
    expect(round.ones).toBe(0);
    expect("twos" in round).toBe(false);
    expect(filledCount(round)).toBe(1);
  });
});

describe("Bonus", () => {
  it("gibt es ab genau 63", () => {
    // 3 je Sorte: 3+6+9+12+15+18 = 63
    const exact = sheetOf({ ones: 3, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 18 });
    expect(upperSum(exact)).toBe(BONUS_THRESHOLD);
    expect(bonus(exact)).toBe(BONUS_POINTS);
    expect(upperTotal(exact)).toBe(BONUS_THRESHOLD + BONUS_POINTS);
  });

  it("gibt es bei 62 noch nicht", () => {
    const just_under = sheetOf({ ones: 2, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 18 });
    expect(upperSum(just_under)).toBe(62);
    expect(bonus(just_under)).toBe(0);
    expect(upperTotal(just_under)).toBe(62);
  });
});

describe("Summen", () => {
  it("rechnet Gesamt aus oberem Block inkl. Bonus und unterem Block", () => {
    const sheet = sheetOf({
      ones: 3,
      twos: 6,
      threes: 9,
      fours: 12,
      fives: 15,
      sixes: 18,
      three: 22,
      four: 0,
      fullhouse: 25,
      small: 30,
      large: 0,
      kniffel: 50,
      chance: 21,
    });
    expect(lowerSum(sheet)).toBe(148);
    expect(grandTotal(sheet)).toBe(63 + 35 + 148);
    expect(isSheetComplete(sheet)).toBe(true);
    expect(allComplete([sheet])).toBe(true);
  });

  it("ist ohne Spieler nicht fertig", () => {
    expect(allComplete([])).toBe(false);
  });
});

describe("activeIndex", () => {
  it("waehlt den Spieler mit den wenigsten Eintraegen", () => {
    expect(activeIndex([sheetOf({ ones: 1, twos: 2 }), sheetOf({ ones: 1 })])).toBe(1);
  });

  it("waehlt bei Gleichstand den ersten", () => {
    expect(activeIndex([sheetOf({ ones: 1 }), sheetOf({ twos: 2 })])).toBe(0);
  });
});

describe("optionsFor", () => {
  it("bietet im oberen Block 0 bis 5 Wuerfel der Sorte", () => {
    expect(optionsFor(catByKey("fives")).map((o) => o.value)).toEqual([0, 5, 10, 15, 20, 25]);
  });

  it("bietet bei fester Punktzahl nur Wert und Streichen", () => {
    expect(optionsFor(catByKey("large")).map((o) => o.value)).toEqual([40, 0]);
  });

  it("bietet bei Summen-Kategorien Streichen und 5 bis 30", () => {
    const values = optionsFor(catByKey("chance")).map((o) => o.value);
    expect(values[0]).toBe(0);
    expect(values.at(-1)).toBe(30);
    expect(values).toHaveLength(27);
  });
});
