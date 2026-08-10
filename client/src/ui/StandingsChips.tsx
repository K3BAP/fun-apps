import type { Player, PlayerId } from "@/game/players";

export type Standing = {
  player: Player;
  /** `null` blendet den Wert aus (Qwixx: verdeckte Punkte). */
  score: number | string | null;
};

/**
 * Die Leiste mit dem laufenden Stand. Ist `onSelect` gesetzt, sind die Chips
 * anwaehlbar (Qwixx wechselt so den Block).
 */
export function StandingsChips({
  standings,
  leaderId,
  activeId,
  onSelect,
}: {
  standings: readonly Standing[];
  leaderId?: PlayerId | null;
  activeId?: PlayerId | null;
  onSelect?: (id: PlayerId) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto px-3 py-2">
      {standings.map(({ player, score }) => {
        const content = (
          <>
            <span className="truncate text-xs font-medium">
              {player.id === leaderId && "👑 "}
              {player.name}
            </span>
            <span className="text-base font-bold tabular-nums">{score ?? "·"}</span>
          </>
        );
        const className = `flex shrink-0 flex-col items-start rounded-lg border-s-4 px-2.5 py-1.5 leading-tight ${
          player.id === activeId ? "bg-base-300" : "bg-base-200"
        }`;

        return onSelect ? (
          <button
            key={player.id}
            type="button"
            onClick={() => onSelect(player.id)}
            style={{ borderInlineStartColor: player.color }}
            className={className}
            aria-pressed={player.id === activeId}
          >
            {content}
          </button>
        ) : (
          <div
            key={player.id}
            style={{ borderInlineStartColor: player.color }}
            className={className}
          >
            {content}
          </div>
        );
      })}
    </div>
  );
}
