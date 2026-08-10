/* ============ Wizard – Regeln (rein, ohne React und ohne DOM) ============ */

import type { PlayerId } from "@/game/players";

/** Das Wizard-Blatt hat 60 Karten – daraus folgt die Rundenzahl. */
export const DECK = 60;

export type RoundRecord = {
  bids: Record<PlayerId, number>;
  tricks: Record<PlayerId, number>;
};

/** 2 → 30, 3 → 20, 4 → 15, 5 → 12, 6 → 10 */
export function maxRounds(playerCount: number): number {
  return playerCount > 0 ? Math.floor(DECK / playerCount) : 0;
}

/** Ansage exakt getroffen → 20 + 10 je Stich, sonst −10 je Stich Abweichung. */
export function roundScore(bid: number, tricks: number): number {
  return bid === tricks ? 20 + 10 * tricks : -10 * Math.abs(bid - tricks);
}

export function dealerIndex(round: number, playerCount: number): number {
  return playerCount > 0 ? (round - 1) % playerCount : 0;
}

/**
 * Wer erst nach einer gewerteten Runde dazukommt, hat dort keinen Eintrag.
 * `?? 0` an dieser einen Stelle haelt NaN aus allen Summen heraus.
 */
function entry(record: Record<PlayerId, number>, id: PlayerId): number {
  return record[id] ?? 0;
}

export function totalScore(rounds: readonly RoundRecord[], id: PlayerId): number {
  return rounds.reduce(
    (total, round) => total + roundScore(entry(round.bids, id), entry(round.tricks, id)),
    0,
  );
}

/** Laufender Stand nach den ersten `count` Runden. */
export function scoreAfter(rounds: readonly RoundRecord[], id: PlayerId, count: number): number {
  return totalScore(rounds.slice(0, count), id);
}

export function hits(rounds: readonly RoundRecord[], id: PlayerId): number {
  return rounds.reduce(
    (n, round) => n + (entry(round.bids, id) === entry(round.tricks, id) ? 1 : 0),
    0,
  );
}

/**
 * Ansage-Verbot: die Summe der Ansagen darf nicht der Stichzahl entsprechen –
 * irgendjemand muss danebenliegen.
 *
 * Wichtig: das sperrt nur den Weiter-Schritt, nicht die einzelnen Stepper. Beim
 * Eintragen darf man durch eine verbotene Summe hindurchlaufen.
 */
export function bidsBlocked(sumBids: number, round: number, enforce: boolean): boolean {
  return enforce && sumBids === round;
}

/** Es werden genau `round` Stiche gespielt – die Summe muss exakt stimmen. */
export function tricksValid(sumTricks: number, round: number): boolean {
  return sumTricks === round;
}

export function sumOf(record: Record<PlayerId, number>, ids: readonly PlayerId[]): number {
  return ids.reduce((sum, id) => sum + entry(record, id), 0);
}
