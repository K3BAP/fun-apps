/* ============ Ab ins Beet – Regeln (rein, ohne React und ohne DOM) ============ */

import type { PlayerId } from "@/game/players";

export const ROUNDS = 3;

export type Colors = 1 | 2 | 3;

/** einfarbig 3, zweifarbig 1, dreifarbig 0 – nach offizieller Anleitung. */
export const COLOR_PTS: Record<Colors, number> = { 1: 3, 2: 1, 3: 0 };

export type Bed = {
  colors: Colors;
  /** ganze Salate, je +1 */
  salate: number;
  /** keine halben Salate im Beet, +1 */
  noHalf: boolean;
  /** Tomate-Paprika-Paare, je +1 */
  pairs: number;
};

export function newBed(): Bed {
  return { colors: 2, salate: 0, noHalf: false, pairs: 0 };
}

export function newBeds(): Bed[] {
  return [newBed(), newBed(), newBed()];
}

export function bedPoints(bed: Bed): number {
  return COLOR_PTS[bed.colors] + bed.salate + (bed.noHalf ? 1 : 0) + bed.pairs;
}

export function beetTotal(beds: readonly Bed[]): number {
  return beds.reduce((total, bed) => total + bedPoints(bed), 0);
}

/**
 * Der Bonus – der einzige Wert, der ueber alle Spieler hinweg entsteht:
 * meiste Beetpunkte → 10, wenigste → 0, dazwischen → 5.
 *
 * Der Vergleich auf `max` steht bewusst vor dem auf `min`: haben alle gleich
 * viele Beetpunkte, bekommt jeder 10. Das entspricht der bisherigen Umsetzung.
 */
export function bonusTiers(totals: Record<PlayerId, number>): Record<PlayerId, number> {
  const values = Object.values(totals);
  if (values.length === 0) return {};
  const max = Math.max(...values);
  const min = Math.min(...values);

  const result: Record<PlayerId, number> = {};
  for (const [id, total] of Object.entries(totals)) {
    result[id] = total === max ? 10 : total === min ? 0 : 5;
  }
  return result;
}

/** Im ersten Durchgang liegt hoechstens eine Tierkarte aus, im dritten drei. */
export function maxTier(round: number): number {
  return Math.min(3, round);
}

export const TIER_POINTS = 5;

export type RoundRecord = {
  beet: Record<PlayerId, number>;
  bonus: Record<PlayerId, number>;
  tier: Record<PlayerId, number>;
};

export function roundTotal(round: RoundRecord, id: PlayerId): number {
  return (round.beet[id] ?? 0) + (round.bonus[id] ?? 0) + (round.tier[id] ?? 0);
}

export function gameTotal(rounds: readonly RoundRecord[], id: PlayerId): number {
  return rounds.reduce((total, round) => total + roundTotal(round, id), 0);
}

/** Tie-Break im Endstand: bei Gleichstand entscheidet der letzte Durchgang. */
export function lastRoundTotal(rounds: readonly RoundRecord[], id: PlayerId): number {
  const last = rounds.at(-1);
  return last ? roundTotal(last, id) : 0;
}
