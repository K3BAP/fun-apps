import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import type { Seat } from "@fun/shared";
import { PlayerRow } from "@/ui/PlayerRow";
import { useRoom } from "./context";

function joinUrl(code: string): string {
  return `${location.origin}/beitreten/${code}`;
}

function QrCode({ code }: { code: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    void QRCode.toCanvas(canvas, joinUrl(code), { width: 176, margin: 1 });
  }, [code]);

  return <canvas ref={ref} className="rounded bg-white p-1" aria-label={`QR-Code für ${code}`} />;
}

function StatusBadge() {
  const { snapshot } = useRoom();
  const label = {
    off: "getrennt",
    connecting: "verbindet …",
    online: "verbunden",
    offline: "offline – du spielst lokal weiter",
  }[snapshot.status];
  const tone =
    snapshot.status === "online"
      ? "badge-success"
      : snapshot.status === "offline"
        ? "badge-warning"
        : "badge-ghost";

  return (
    <span className={`badge badge-sm ${tone}`}>
      {label}
      {snapshot.pending > 0 && ` · ${snapshot.pending} wartet`}
    </span>
  );
}

/** Wer ist da? Ein Platz gehoert genau einem Geraet, also ist das die Spielerliste. */
function SeatList() {
  const { snapshot } = useRoom();
  const room = snapshot.room;
  if (!room) return null;

  return (
    <ul className="flex flex-col gap-2">
      {room.seats.map((seat: Seat) => {
        const mine = seat.id === snapshot.mySeat;
        const host = seat.owner === room.host;
        const note = [mine && "du", host && "Host", !seat.online && "offline"]
          .filter(Boolean)
          .join(" · ");

        return (
          <PlayerRow as="li" key={seat.id} accent={seat.color}>
            <span className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="truncate font-medium">{seat.name}</span>
              {note && <span className="text-base-content/60 text-xs">{note}</span>}
            </span>
            {seat.online && <span className="badge badge-success badge-xs" aria-hidden="true" />}
          </PlayerRow>
        );
      })}
    </ul>
  );
}

async function share(code: string): Promise<void> {
  const url = joinUrl(code);
  if (navigator.share) {
    await navigator.share({ title: "fun-apps", text: `Raum ${code}`, url }).catch(() => {});
    return;
  }
  await navigator.clipboard.writeText(url).catch(() => {});
}

/**
 * Der Raum, wie er sich anfuehlt: Code, wer schon da ist, und der Ausgang.
 *
 * Dieselbe Anzeige dient als Lobby (in der Spielerauswahl) und als Rauminfo im
 * ⋯-Menue – es ist ja dieselbe Frage, nur zu einem anderen Zeitpunkt gestellt.
 */
export function RoomPanel({ onLeave }: { onLeave?: () => void }) {
  const { client, snapshot } = useRoom();
  const room = snapshot.room;
  if (!room) return null;

  const missing = room.maxSeats - room.seats.length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-2">
        <span className="text-base-content/60 text-xs">Raumcode</span>
        <span className="font-mono text-4xl font-bold tracking-[0.3em]">{room.code}</span>
        <StatusBadge />
        <QrCode code={room.code} />
        {snapshot.error && <p className="text-warning text-sm">{snapshot.error}</p>}
      </div>

      <SeatList />

      {room.phase === "setup" && (
        <p className="text-base-content/60 text-center text-sm">
          {missing > 0
            ? "Weitere Spieler können mit dem Code beitreten."
            : "Der Raum ist voll – es kann losgehen."}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          className="btn btn-ghost flex-1"
          onClick={() => void share(room.code)}
        >
          Teilen
        </button>
        <button
          type="button"
          className="btn btn-ghost text-error"
          onClick={() => {
            client.leave();
            onLeave?.();
          }}
        >
          Raum verlassen
        </button>
      </div>
    </div>
  );
}
