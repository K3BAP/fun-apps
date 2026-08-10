import { describe, expect, it } from "vitest";
import {
  bidsBlocked,
  dealerIndex,
  hits,
  maxRounds,
  roundScore,
  scoreAfter,
  sumOf,
  totalScore,
  tricksValid,
  type RoundRecord,
} from "./rules";

describe("maxRounds", () => {
  it("teilt 60 Karten auf die Spieler auf", () => {
    expect([2, 3, 4, 5, 6].map(maxRounds)).toEqual([30, 20, 15, 12, 10]);
  });

  it("kommt ohne Spieler klar", () => {
    expect(maxRounds(0)).toBe(0);
  });
});

describe("roundScore", () => {
  it("belohnt die getroffene Ansage mit 20 + 10 je Stich", () => {
    expect(roundScore(0, 0)).toBe(20);
    expect(roundScore(3, 3)).toBe(50);
  });

  it("bestraft jede Abweichung mit −10 je Stich", () => {
    expect(roundScore(0, 2)).toBe(-20); // zu wenig angesagt
    expect(roundScore(4, 1)).toBe(-30); // zu viel angesagt
  });
});

describe("dealerIndex", () => {
  it("rueckt jede Runde einen weiter und laeuft um", () => {
    expect([1, 2, 3, 4].map((r) => dealerIndex(r, 3))).toEqual([0, 1, 2, 0]);
  });
});

describe("Summen ueber Runden", () => {
  const rounds: RoundRecord[] = [
    { bids: { a: 1, b: 0 }, tricks: { a: 1, b: 0 } }, // a +30, b +20
    { bids: { a: 0, b: 2 }, tricks: { a: 2, b: 0 } }, // a −20, b −20
  ];

  it("summiert die Rundenwertungen", () => {
    expect(totalScore(rounds, "a")).toBe(10);
    expect(totalScore(rounds, "b")).toBe(0);
  });

  it("zaehlt getroffene Ansagen", () => {
    expect(hits(rounds, "a")).toBe(1);
    expect(hits(rounds, "b")).toBe(1);
  });

  it("liefert den Zwischenstand nach n Runden", () => {
    expect(scoreAfter(rounds, "a", 1)).toBe(30);
    expect(scoreAfter(rounds, "a", 2)).toBe(10);
  });

  it("wertet einen spaeter dazugekommenen Spieler als 0/0, nicht als NaN", () => {
    // Wer in Runde 1 und 2 fehlt, hat dort weder angesagt noch gestochen.
    expect(totalScore(rounds, "c")).toBe(40);
    expect(Number.isNaN(totalScore(rounds, "c"))).toBe(false);
  });
});

describe("Ansage-Verbot", () => {
  it("sperrt genau dann, wenn die Summe der Stichzahl entspricht", () => {
    expect(bidsBlocked(3, 3, true)).toBe(true);
    expect(bidsBlocked(2, 3, true)).toBe(false);
    expect(bidsBlocked(4, 3, true)).toBe(false);
  });

  it("sperrt nie, wenn das Verbot aus ist", () => {
    expect(bidsBlocked(3, 3, false)).toBe(false);
  });
});

describe("Stiche", () => {
  it("muessen genau der Rundenzahl entsprechen", () => {
    expect(tricksValid(3, 3)).toBe(true);
    expect(tricksValid(2, 3)).toBe(false);
    expect(tricksValid(4, 3)).toBe(false);
  });

  it("summiert fehlende Eintraege als 0", () => {
    expect(sumOf({ a: 2 }, ["a", "b"])).toBe(2);
  });
});
