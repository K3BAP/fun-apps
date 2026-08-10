import type { Player } from "@/game/players";
import { PlayerTable } from "@/ui/PlayerTable";
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
        <PlayerTable
          players={players}
          corner={t.blockRound}
          totalOf={(player) => gameTotal(rounds, player.id)}
          rows={rounds.map((round, index) => ({
            key: String(index),
            label: index + 1,
            cell: (player) => (
              <>
                <span className="text-base-content/60 block text-xs tabular-nums">
                  {round.beet[player.id] ?? 0}+{round.bonus[player.id] ?? 0}+
                  {round.tier[player.id] ?? 0}
                </span>
                <span className="block font-semibold tabular-nums">
                  {gameTotal(rounds.slice(0, index + 1), player.id)}
                </span>
              </>
            ),
          }))}
        />
      )}
    </Sheet>
  );
}
