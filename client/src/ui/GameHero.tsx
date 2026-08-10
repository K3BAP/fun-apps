import { Link } from "react-router-dom";
import { useGame } from "@/game/context";
import { ArrowLeftIcon } from "./icons";

/** Kopf der Setup-Ansicht: Emoji, Titel, ein Satz Erklaerung, Weg zurueck. */
export function GameHero({ tagline }: { tagline: string }) {
  const { manifest } = useGame();

  return (
    <header className="relative flex flex-col items-center gap-2 pt-4 pb-2 text-center">
      <Link
        to="/"
        className="btn btn-ghost btn-sm btn-circle absolute start-0 top-4"
        aria-label="Zurück zur Übersicht"
      >
        <ArrowLeftIcon />
      </Link>
      <div className="text-5xl" aria-hidden="true">
        {manifest.emoji}
      </div>
      <h1 className="text-3xl font-bold tracking-tight">{manifest.title}</h1>
      <p className="text-base-content/70 max-w-sm text-balance">{tagline}</p>
    </header>
  );
}
