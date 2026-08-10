import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { CODE_LENGTH, isValidCode, type RoomPhase, type Seat } from "@fun/shared";
import type { SyncSpec } from "@/game/types";
import { PlayerRow } from "@/ui/PlayerRow";
import { Sheet } from "@/ui/Sheet";
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

function SeatList() {
  const { client, snapshot } = useRoom();
  if (!snapshot.room) return null;

  return (
    <ul className="flex flex-col gap-2">
      {snapshot.room.seats.map((seat: Seat) => {
        const mine = snapshot.mySeats.includes(seat.id);
        return (
          <PlayerRow as="li" key={seat.id} accent={seat.color}>
            <span className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="truncate font-medium">{seat.name}</span>
              <span className="text-base-content/60 text-xs">
                {mine
                  ? "dein Platz"
                  : seat.owner
                    ? seat.online
                      ? "belegt"
                      : "belegt · offline"
                    : "frei"}
              </span>
            </span>
            {mine ? (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => client.releaseSeat(seat.id)}
              >
                Freigeben
              </button>
            ) : (
              !seat.owner && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => client.claim(seat.id)}
                >
                  Übernehmen
                </button>
              )
            )}
          </PlayerRow>
        );
      })}
    </ul>
  );
}

/**
 * Raum eroeffnen, beitreten, Platz belegen.
 *
 * Der Mehrgeraete-Modus ist immer freiwillig: ohne Raum spielt jedes Spiel
 * genau wie vorher, und ein Verbindungsverlust unterbricht nichts.
 */
export function RoomSheet<S, A>({
  open,
  onClose,
  gameId,
  gameVersion,
  phase,
  spec,
  state,
}: {
  open: boolean;
  onClose: () => void;
  gameId: string;
  gameVersion: number;
  phase: RoomPhase;
  spec: SyncSpec<S, A>;
  state: S;
}) {
  const { client, snapshot } = useRoom();
  const [codeInput, setCodeInput] = useState("");
  const [busy, setBusy] = useState(false);

  const seats = spec.seatsOf(state);

  async function createRoom() {
    setBusy(true);
    try {
      await client.create({
        gameId,
        gameVersion,
        phase,
        config: spec.configOf?.(state) ?? null,
        seats,
      });
    } finally {
      setBusy(false);
    }
  }

  async function share(code: string) {
    const url = joinUrl(code);
    if (navigator.share) {
      await navigator.share({ title: "fun-apps", text: `Raum ${code}`, url }).catch(() => {});
      return;
    }
    await navigator.clipboard.writeText(url).catch(() => {});
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Auf mehreren Geräten"
      description="Jeder spielt auf seinem eigenen Gerät. Ohne Raum bleibt alles wie gewohnt."
    >
      {snapshot.room ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-2">
            <span className="font-mono text-4xl font-bold tracking-[0.3em]">
              {snapshot.room.code}
            </span>
            <StatusBadge />
            <QrCode code={snapshot.room.code} />
            {snapshot.error && <p className="text-warning text-sm">{snapshot.error}</p>}
          </div>

          <SeatList />

          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-ghost flex-1"
              onClick={() => void share(snapshot.room!.code)}
            >
              Teilen
            </button>
            <button
              type="button"
              className="btn btn-ghost text-error"
              onClick={() => client.leave()}
            >
              Raum verlassen
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {snapshot.error && <p className="alert alert-warning py-2 text-sm">{snapshot.error}</p>}

          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || seats.length === 0}
            onClick={() => void createRoom()}
          >
            Raum eröffnen
          </button>

          <div className="divider my-0 text-xs">oder beitreten</div>

          <div className="join w-full">
            <input
              type="text"
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              maxLength={CODE_LENGTH}
              placeholder="Code"
              aria-label="Raumcode"
              className="input join-item w-full text-center font-mono text-xl tracking-[0.3em] uppercase"
              value={codeInput}
              onChange={(event) => setCodeInput(event.target.value.toUpperCase())}
            />
            <button
              type="button"
              className="btn btn-primary join-item"
              disabled={!isValidCode(codeInput)}
              onClick={() => client.join(codeInput)}
            >
              Beitreten
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
