import { useEffect, useRef } from "react";
import type { Seat, SeatId } from "@fun/shared";
import type { GameDefinition } from "@/game/types";
import type { GameStore } from "@/game/useGameStore";
import { useRoom } from "./context";

/** Plaetze heissen s1, s2, … – der Spielcode rechnet mit der Position. */
export function seatIndex(id: SeatId): number {
  return Number(id.slice(1)) - 1;
}

export function seatIdAt(index: number): SeatId {
  return `s${index + 1}`;
}

/** Wie lange nach der letzten Aenderung gewartet wird, bevor gesendet wird. */
const PUBLISH_DEBOUNCE_MS = 120;

/**
 * Verbindet ein Spiel mit einem Raum – in zwei Richtungen und sonst nichts.
 *
 * Raus: aendert sich mein Platzinhalt, geht er (leicht verzoegert) hinaus.
 * Rein: aendert sich ein fremder Platz, wird er in den Reducer gegeben – auf
 * demselben Weg wie jede lokale Aenderung, es gibt keinen zweiten Pfad.
 */
export function useGameSync<S, A>(definition: GameDefinition<S, A>, store: GameStore<S, A>): void {
  const { client, snapshot } = useRoom();
  const spec = definition.sync;

  const { room, mySeats, status } = snapshot;
  const { state, dispatch } = store;

  // Zuletzt eingearbeiteter Stand je Platz – damit dieselbe Nachricht nicht
  // mehrfach in den Reducer laeuft.
  const appliedRevs = useRef(new Map<SeatId, number>());
  const appliedRoster = useRef<string | null>(null);
  const appliedConfig = useRef<string | null>(null);
  const appliedBarrier = useRef<string | null>(null);
  const lastPublished = useRef<string | null>(null);

  const mySeat: SeatId | undefined = mySeats[0];

  // --- raus ---------------------------------------------------------------
  useEffect(() => {
    if (!spec || !room || mySeat === undefined) return;
    const payload = spec.seatData(state, seatIndex(mySeat));
    const encoded = JSON.stringify(payload ?? null);
    if (encoded === lastPublished.current) return;

    const timer = window.setTimeout(() => {
      lastPublished.current = encoded;
      client.publish(mySeat, payload);
    }, PUBLISH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [spec, room, mySeat, state, client]);

  // --- rein ---------------------------------------------------------------
  useEffect(() => {
    if (!spec || !room) return;

    // Zuerst die Mitspieler: ohne sie haetten die Platzinhalte unten niemanden,
    // zu dem sie gehoeren.
    const roster = room.seats.map((seat) => ({ name: seat.name, color: seat.color }));
    const signature = JSON.stringify(roster);
    if (signature !== appliedRoster.current) {
      appliedRoster.current = signature;
      dispatch(spec.applyRoster(roster));
    }

    for (const seat of room.seats as Seat[]) {
      if (seat.id === mySeat || seat.data === null) continue;
      if (appliedRevs.current.get(seat.id) === seat.rev) continue;
      appliedRevs.current.set(seat.id, seat.rev);
      dispatch(spec.applySeat(seatIndex(seat.id), seat.data));
    }

    // Phase und Einstellungen gehoeren dem Host. Wuerde er sie auch selbst
    // uebernehmen, ueberschriebe der Anfangswert des Raums seinen eigenen Stand.
    const isHost = room.host === client.device;

    if (spec.applyConfig && !isHost) {
      const config = JSON.stringify(room.config ?? null);
      if (config !== appliedConfig.current) {
        appliedConfig.current = config;
        dispatch(spec.applyConfig(room.config));
      }
    }

    if (spec.applyPhase && !isHost) dispatch(spec.applyPhase(room.phase));

    // Die Schranke ist offen: jedes Geraet rechnet den Rest selbst aus.
    if (room.barrier?.open && spec.applyBarrierOpen) {
      if (appliedBarrier.current !== room.barrier.token) {
        appliedBarrier.current = room.barrier.token;
        dispatch(spec.applyBarrierOpen(room.barrier.token));
      }
    }
  }, [spec, room, mySeat, dispatch, client.device]);

  // --- was nur der Host bekanntgibt: Phase und Schranke --------------------
  useEffect(() => {
    if (!spec || !room || room.host !== client.device) return;

    const phase = definition.phaseOf(state);
    if (phase !== room.phase) client.patchRoom({ phase });

    if (spec.barrierToken) {
      const token = spec.barrierToken(state);
      if (token !== (room.barrier?.token ?? null)) client.patchRoom({ barrier: token });
    }
  }, [spec, room, state, client, definition]);

  // Beim Verlassen des Spiels nichts kappen: der Raum lebt weiter, solange der
  // Nutzer ihn nicht selbst verlaesst.
  void status;
}
