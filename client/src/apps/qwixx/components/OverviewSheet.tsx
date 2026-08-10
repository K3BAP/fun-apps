import type { Player } from "@/game/players";
import { PlayerTable, type TableRow } from "@/ui/PlayerTable";
import { Sheet } from "@/ui/Sheet";
import { ROWS, countMarks, rowScore, type Locks, type SeatSheet } from "../rules";
import { t } from "../strings";

/** Alle Bloecke nebeneinander: je Reihe die Wertung, unten die Fehlwuerfe. */
export function OverviewSheet({
  open,
  onClose,
  players,
  sheets,
  closed,
  hideScores,
  totals,
}: {
  open: boolean;
  onClose: () => void;
  players: readonly Player[];
  sheets: readonly SeatSheet[];
  closed: Locks;
  hideScores: boolean;
  totals: readonly number[];
}) {
  const rows: TableRow[] = ROWS.map((row) => ({
    key: row.key,
    label: (
      <>
        {row.label}
        {closed[row.key] && " 🔒"}
      </>
    ),
    cell: (_player, index) => {
      const sheet = sheets[index]!;
      return (
        <>
          <span className="block font-semibold tabular-nums">
            {hideScores ? "·" : rowScore(sheet.marks[row.key], sheet.locked[row.key])}
            {sheet.locked[row.key] && " 🔒"}
          </span>
          <span className="text-base-content/50 block text-xs tabular-nums">
            {t.marks(countMarks(sheet.marks[row.key]))}
          </span>
        </>
      );
    },
  }));

  rows.push({
    key: "penalties",
    label: t.overviewPenalties,
    cell: (_player, index) => {
      const sheet = sheets[index]!;
      return (
        <>
          <span className="block font-semibold tabular-nums">
            {sheet.penalties > 0 ? `−${sheet.penalties * 5}` : 0}
          </span>
          <span className="text-base-content/50 block text-xs tabular-nums">
            {sheet.penalties}×
          </span>
        </>
      );
    },
  });

  return (
    <Sheet open={open} onClose={onClose} title={t.overviewTitle} wide>
      <PlayerTable
        players={players}
        totalOf={(_player, index) => (hideScores ? "·" : totals[index])}
        rows={rows}
      />
    </Sheet>
  );
}
