import type { ReactNode } from "react";
import type { Player } from "@/game/players";
import { medal, type Ranked } from "@/game/rank";
import { PlayerRow } from "./PlayerRow";

export type RankingEntry = Ranked<Player> & {
  /** Aufschluesselung unter dem Namen, z. B. „Oberer 71 · Unterer 92“. */
  detail?: ReactNode;
};

/** Endrangliste mit Medaillen – in allen Spielen gleich. */
export function Ranking({ entries }: { entries: readonly RankingEntry[] }) {
  return (
    <ol className="flex flex-col gap-2">
      {entries.map((entry) => (
        <PlayerRow
          as="li"
          key={entry.item.id}
          accent={entry.item.color}
          highlight={entry.rank === 1}
          className="py-3"
        >
          <span className="w-9 shrink-0 text-center text-xl leading-none">{medal(entry.rank)}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">{entry.item.name}</span>
            {entry.detail && (
              <span className="text-base-content/60 block text-sm">{entry.detail}</span>
            )}
          </span>
          <span className="text-xl font-bold tabular-nums">{entry.score}</span>
        </PlayerRow>
      ))}
    </ol>
  );
}
