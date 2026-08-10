export type Ranked<T> = {
  item: T;
  score: number;
  /** 1-basiert. Gleichstand teilt sich den Rang, der naechste Rang wird uebersprungen. */
  rank: number;
};

/**
 * Rangliste, absteigend nach Punkten. Ersetzt die vier gleichlautenden
 * Sortier-und-Rang-Bloecke der bisherigen Apps.
 */
export function rankBy<T>(
  items: readonly T[],
  score: (item: T) => number,
  /** Zweites Kriterium bei Gleichstand, groesser ist besser (Beet: letzter Durchgang). */
  tiebreak?: (item: T) => number,
): Ranked<T>[] {
  const second = (item: T) => tiebreak?.(item) ?? 0;
  const scored = items.map((item) => ({ item, score: score(item), rank: 0 }));
  scored.sort((a, b) => b.score - a.score || second(b.item) - second(a.item));
  scored.forEach((entry, i) => {
    const prev = scored[i - 1];
    const tied =
      prev !== undefined && entry.score === prev.score && second(entry.item) === second(prev.item);
    entry.rank = tied ? prev.rank : i + 1;
  });
  return scored;
}

export function medal(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}
