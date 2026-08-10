import type { Player } from "@/game/players";
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
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="bg-base-100 border-base-300 sticky start-0 top-0 z-20 border-b px-2 py-1 text-start text-xs">
                  {t.blockRound}
                </th>
                {players.map((player) => (
                  <th
                    key={player.id}
                    style={{ borderBottomColor: player.color }}
                    className="bg-base-100 sticky top-0 z-10 min-w-16 border-b-2 px-2 py-1"
                  >
                    <span className="block truncate text-xs font-semibold">{player.name}</span>
                    <span className="block text-base font-bold tabular-nums">
                      {totalScore(rounds, player.id)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rounds.map((round, index) => (
                <tr key={index}>
                  <th className="bg-base-100 border-base-300 sticky start-0 border-b border-e px-2 py-1 text-start text-xs font-normal tabular-nums">
                    {index + 1}
                  </th>
                  {players.map((player) => {
                    const bid = round.bids[player.id] ?? 0;
                    const tricks = round.tricks[player.id] ?? 0;
                    const points = roundScore(bid, tricks);
                    return (
                      <td
                        key={player.id}
                        className="border-base-300 border-b px-2 py-1 text-center leading-tight"
                      >
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
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Sheet>
  );
}
