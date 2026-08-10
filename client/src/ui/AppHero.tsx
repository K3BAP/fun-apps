import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useGame } from "@/game/context";
import { ArrowLeftIcon } from "./icons";

/**
 * Der grosse Kopf ueber Einrichtung und Ergebnis: Emoji, Titel, ein Satz.
 *
 * Vorher zwei Dateien – `GameHero` und `ResultHeader` –, die sich nur im Weg
 * zurueck und in den Abstaenden unterschieden.
 *
 * Ohne Angabe stehen hier Emoji und Titel der App; das Ergebnis setzt beides
 * um (🏆 „Endstand").
 */
export function AppHero({
  emoji,
  title,
  subtitle,
  back = false,
}: {
  emoji?: string;
  title?: string;
  subtitle: ReactNode;
  /** Zeigt den Weg zurueck zur Uebersicht – in der Einrichtung, nicht im Ergebnis. */
  back?: boolean;
}) {
  const { manifest } = useGame();

  return (
    <header className="relative flex flex-col items-center gap-2 pt-5 pb-1 text-center">
      {back && (
        <Link
          to="/"
          className="btn btn-ghost btn-sm btn-circle absolute start-0 top-4"
          aria-label="Zurück zur Übersicht"
        >
          <ArrowLeftIcon />
        </Link>
      )}
      <div className="text-5xl" aria-hidden="true">
        {emoji ?? manifest.emoji}
      </div>
      <h1 className="text-3xl font-bold tracking-tight">{title ?? manifest.title}</h1>
      <p className="text-base-content/70 max-w-sm text-balance">{subtitle}</p>
    </header>
  );
}
