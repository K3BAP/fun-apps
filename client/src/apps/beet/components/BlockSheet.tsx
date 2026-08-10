import type { Player } from "@/game/players";
import { Sheet } from "@/ui/Sheet";
import { gameTotal, type RoundRecord } from "../rules";
import { t } from "../strings";

/** Je Zelle: Beet + Bonus + Tier, darunter die Laufsumme. */
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
    <Sheet
      open={open}
      onClose={onClose}
      title={t.blockTitle}
      description={rounds.length > 0 ? t.blockLegend : undefined}
      wide
    >
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
                    className="bg-base-100 sticky top-0 z-10 min-w-20 border-b-2 px-2 py-1"
                  >
                    <span className="block truncate text-xs font-semibold">{player.name}</span>
                    <span className="block text-base font-bold tabular-nums">
                      {gameTotal(rounds, player.id)}
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
                  {players.map((player) => (
                    <td
                      key={player.id}
                      className="border-base-300 border-b px-2 py-1 text-center leading-tight"
                    >
                      <span className="text-base-content/60 block text-xs tabular-nums">
                        {round.beet[player.id] ?? 0}+{round.bonus[player.id] ?? 0}+
                        {round.tier[player.id] ?? 0}
                      </span>
                      <span className="block font-semibold tabular-nums">
                        {gameTotal(rounds.slice(0, index + 1), player.id)}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Sheet>
  );
}
