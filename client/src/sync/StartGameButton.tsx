import { useRoomRole } from "./useRoomRole";

/**
 * Der Knopf, der ein Spiel startet – allein wie im Raum.
 *
 * Im Raum darf nur der Host starten. Nicht, weil er mehr Rechte braeuchte,
 * sondern weil der Start ein Zeitpunkt ist: er muss fuer alle derselbe sein,
 * und dafuer reicht genau eine Stimme.
 */
export function StartGameButton({
  label,
  count,
  min,
  onStart,
}: {
  label: string;
  /** Wie viele Spieler stehen bereit? */
  count: number;
  min: number;
  onStart: () => void;
}) {
  const { inRoom, isGuest } = useRoomRole();
  const missing = min - count;

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        className="btn btn-primary btn-lg"
        disabled={missing > 0 || isGuest}
        onClick={onStart}
      >
        {isGuest ? "Warten auf den Host …" : label}
      </button>

      {isGuest ? (
        <p className="text-base-content/60 text-center text-sm">
          Der Host startet das Spiel, sobald alle da sind.
        </p>
      ) : (
        // Ausserhalb des Raums sagt die Spielerliste das schon selbst.
        inRoom &&
        missing > 0 && (
          <p className="text-base-content/60 text-center text-sm">
            {missing === 1 ? "Es fehlt noch ein Spieler." : `Es fehlen noch ${missing} Spieler.`}
          </p>
        )
      )}
    </div>
  );
}
