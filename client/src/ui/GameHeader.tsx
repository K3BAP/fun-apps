import { useGame } from "@/game/context";
import type { ReactNode } from "react";

/**
 * Die klebende Kopfzeile der Spiel-Ansicht: Marke links, Kurzstand rechts,
 * ⋯-Menue ganz aussen – in allen Spielen gleich aufgebaut.
 */
export function GameHeader({
  badge,
  primary,
  secondary,
}: {
  /** Zusatz neben dem Titel, z. B. der gewaehlte Qwixx-Block. */
  badge?: ReactNode;
  /** Wichtigste Zahl, z. B. „Runde 4 / 13“. */
  primary: ReactNode;
  /** Nebeninformation, z. B. „12 / 39 Felder“. */
  secondary?: ReactNode;
}) {
  const { manifest, openMenu } = useGame();

  return (
    <header className="bg-base-100 border-base-300 shrink-0 border-b safe-top">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-3 pb-2">
        <span className="text-xl leading-none" aria-hidden="true">
          {manifest.emoji}
        </span>
        <span className="font-semibold">{manifest.title}</span>
        {badge && <span className="badge badge-sm badge-outline">{badge}</span>}

        <span className="ml-auto flex flex-col items-end leading-tight">
          <span className="text-sm font-semibold tabular-nums">{primary}</span>
          {secondary && <span className="text-base-content/60 text-xs">{secondary}</span>}
        </span>

        <button
          type="button"
          className="btn btn-ghost btn-sm btn-circle text-lg"
          onClick={openMenu}
          aria-label="Menü"
        >
          ⋯
        </button>
      </div>
    </header>
  );
}
