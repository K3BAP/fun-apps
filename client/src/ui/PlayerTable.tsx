import type { ReactNode } from "react";
import type { Player } from "@/game/players";

/**
 * Klebende Kopfzeile bzw. erste Spalte. Auch die Kniffel-Tabelle benutzt diese
 * Bausteine – die ist zu eigen fuer `PlayerTable` (Abschnitte, Rechenzeilen,
 * antippbare Felder), soll aber nicht anders aussehen.
 *
 * Wichtig ist die *deckende* Flaeche: eine durchscheinende klebende Spalte
 * verschmiert beim Scrollen mit dem, was darunter durchlaeuft.
 */
export const STICKY_HEAD = "bg-base-100 sticky top-0 z-10";
export const STICKY_COL = "bg-base-100 border-base-300 sticky start-0 border-e";

export type TableRow = {
  key: string;
  label: ReactNode;
  /** Inhalt je Spieler – in derselben Reihenfolge wie `players`. */
  cell: (player: Player, index: number) => ReactNode;
};

/**
 * Eine Tabelle mit einer Spalte je Spieler und klebendem Rand.
 *
 * Dieselbe Tabelle stand dreimal im Code: die Qwixx-Uebersicht, der
 * Wizard-Block und der Beet-Block. Sie unterschieden sich nur im Inhalt der
 * Zellen, nicht im Aufbau – bis hin zu abweichenden `min-w`-Werten, die
 * niemand bewusst entschieden hatte.
 */
export function PlayerTable({
  players,
  corner,
  totalOf,
  rows,
}: {
  players: readonly Player[];
  /** Beschriftung der Ecke oben links, z. B. „Runde". */
  corner?: ReactNode;
  /** Der grosse Wert unter dem Namen. */
  totalOf: (player: Player, index: number) => ReactNode;
  rows: readonly TableRow[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th
              className={`${STICKY_COL} ${STICKY_HEAD} border-base-300 z-20 border-b px-2 py-1 text-start text-xs`}
            >
              {corner}
            </th>
            {players.map((player, index) => (
              <th
                key={player.id}
                style={{ borderBottomColor: player.color }}
                className={`${STICKY_HEAD} min-w-20 border-b-2 px-2 py-1`}
              >
                <span className="block truncate text-xs font-semibold">{player.name}</span>
                <span className="block text-base font-bold tabular-nums">
                  {totalOf(player, index)}
                </span>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <th
                className={`${STICKY_COL} border-b px-2 py-1 text-start text-xs font-normal tabular-nums`}
              >
                {row.label}
              </th>
              {players.map((player, index) => (
                <td
                  key={player.id}
                  className="border-base-300 border-b px-2 py-1 text-center leading-tight"
                >
                  {row.cell(player, index)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
