import { describe, expect, it } from "vitest";
import {
  bedPoints,
  beetTotal,
  bonusTiers,
  gameTotal,
  lastRoundTotal,
  maxTier,
  newBed,
  newBeds,
  roundTotal,
  type Bed,
  type RoundRecord,
} from "./rules";

function bed(patch: Partial<Bed> = {}): Bed {
  return { ...newBed(), ...patch };
}

describe("bedPoints", () => {
  it("wertet die Farbigkeit nach Anleitung", () => {
    expect(bedPoints(bed({ colors: 1 }))).toBe(3);
    expect(bedPoints(bed({ colors: 2 }))).toBe(1);
    expect(bedPoints(bed({ colors: 3 }))).toBe(0);
  });

  it("addiert Salate, „keine halben“ und Paare", () => {
    expect(bedPoints(bed({ colors: 1, salate: 2, noHalf: true, pairs: 3 }))).toBe(3 + 2 + 1 + 3);
  });

  it("faengt mit drei leeren Beeten bei 3 an (3× zweifarbig)", () => {
    expect(beetTotal(newBeds())).toBe(3);
  });
});

describe("bonusTiers", () => {
  it("gibt der Spitze 10, dem Schluss 0 und dem Rest 5", () => {
    expect(bonusTiers({ a: 12, b: 8, c: 3 })).toEqual({ a: 10, b: 5, c: 0 });
  });

  it("teilt die Spitze und den Schluss bei Gleichstand", () => {
    expect(bonusTiers({ a: 10, b: 10, c: 4, d: 4 })).toEqual({ a: 10, b: 10, c: 0, d: 0 });
  });

  it("gibt allen 10, wenn alle gleich viele Beetpunkte haben", () => {
    // max wird vor min geprueft – so war es schon in der bisherigen Umsetzung.
    expect(bonusTiers({ a: 7, b: 7, c: 7 })).toEqual({ a: 10, b: 10, c: 10 });
  });

  it("kommt ohne Spieler klar", () => {
    expect(bonusTiers({})).toEqual({});
  });
});

describe("maxTier", () => {
  it("waechst mit dem Durchgang und deckelt bei 3", () => {
    expect([1, 2, 3].map(maxTier)).toEqual([1, 2, 3]);
  });
});

describe("Durchgaenge", () => {
  const rounds: RoundRecord[] = [
    { beet: { a: 10, b: 6 }, bonus: { a: 10, b: 0 }, tier: { a: 5, b: 0 } },
    { beet: { a: 4, b: 12 }, bonus: { a: 0, b: 10 }, tier: { a: 0, b: 10 } },
  ];

  it("summiert Beet + Bonus + Tier je Durchgang", () => {
    expect(roundTotal(rounds[0]!, "a")).toBe(25);
    expect(roundTotal(rounds[0]!, "b")).toBe(6);
  });

  it("summiert ueber alle Durchgaenge", () => {
    expect(gameTotal(rounds, "a")).toBe(29);
    expect(gameTotal(rounds, "b")).toBe(38);
  });

  it("liefert den letzten Durchgang fuer den Tie-Break", () => {
    expect(lastRoundTotal(rounds, "a")).toBe(4);
    expect(lastRoundTotal(rounds, "b")).toBe(32);
    expect(lastRoundTotal([], "a")).toBe(0);
  });

  it("wertet einen fehlenden Eintrag als 0", () => {
    expect(gameTotal(rounds, "c")).toBe(0);
  });
});
