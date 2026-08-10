import type { Player } from "@/game/players";
import { PlayerTable } from "@/ui/PlayerTable";
import { Sheet } from "@/ui/Sheet";
import { roundScore, scoreAfter, totalScore, type RoundRecord } from "../rules";
import { t } from "../strings";

/** Der komplette Block: je Runde Ansage·Stiche und der laufende Stand. */
export function BlockSheet({
  open,
  onClose,
  players,
  rounds,
}: {
  open: boolean;
  onClose: () => void;
  players: readonly Player[];
  rounds: readonly RoundRecord[];
}) {
  return (
    <Sheet open={open} onClose={onClose} title={t.blockTitle} wide>
      {rounds.length === 0 ? (
        <p className="text-base-content/60 py-4 text-center">{t.blockEmpty}</p>
      ) : (
        <PlayerTable
          players={players}
          corner={t.blockRound}
          totalOf={(player) => totalScore(rounds, player.id)}
          rows={rounds.map((round, index) => ({
            key: String(index),
            label: index + 1,
            cell: (player) => {
              const bid = round.bids[player.id] ?? 0;
              const tricks = round.tricks[player.id] ?? 0;
              const points = roundScore(bid, tricks);
              return (
                <>
                  <span className="block text-xs tabular-nums">
                    {bid}·{tricks}{" "}
                    <span className={points >= 0 ? "text-success" : "text-error"}>
                      {points >= 0 ? "+" : ""}
                      {points}
                    </span>
                  </span>
                  <span className="block font-semibold tabular-nums">
                    {scoreAfter(rounds, player.id, index + 1)}
                  </span>
                </>
              );
            },
          }))}
        />
      )}
    </Sheet>
  );
}
