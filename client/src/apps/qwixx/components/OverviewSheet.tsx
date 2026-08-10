import type { Player } from "@/game/players";
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
  const cell = "border-base-300 border-b px-2 py-1 text-center leading-tight";

  return (
    <Sheet open={open} onClose={onClose} title={t.overviewTitle}>
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="bg-base-100 border-base-300 sticky start-0 top-0 z-20 border-b px-2 py-1 text-start text-xs" />
              {players.map((player, index) => (
                <th
                  key={player.id}
                  style={{ borderBottomColor: player.color }}
                  className="bg-base-100 sticky top-0 z-10 min-w-20 border-b-2 px-2 py-1"
                >
                  <span className="block truncate text-xs font-semibold">{player.name}</span>
                  <span className="block text-base font-bold tabular-nums">
                    {hideScores ? "·" : totals[index]}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.key}>
                <th className="bg-base-100 border-base-300 sticky start-0 border-b border-e px-2 py-1 text-start text-xs font-normal">
                  {row.label}
                  {closed[row.key] && " 🔒"}
                </th>
                {sheets.map((sheet, index) => (
                  <td key={index} className={cell}>
                    <span className="block font-semibold tabular-nums">
                      {hideScores ? "·" : rowScore(sheet.marks[row.key], sheet.locked[row.key])}
                      {sheet.locked[row.key] && " 🔒"}
                    </span>
                    <span className="text-base-content/50 block text-xs tabular-nums">
                      {t.marks(countMarks(sheet.marks[row.key]))}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <th className="bg-base-100 border-base-300 sticky start-0 border-b border-e px-2 py-1 text-start text-xs font-normal">
                {t.overviewPenalties}
              </th>
              {sheets.map((sheet, index) => (
                <td key={index} className={cell}>
                  <span className="block font-semibold tabular-nums">
                    {sheet.penalties > 0 ? `−${sheet.penalties * 5}` : 0}
                  </span>
                  <span className="text-base-content/50 block text-xs tabular-nums">
                    {sheet.penalties}×
                  </span>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </Sheet>
  );
}
