import { useEffect, useRef } from "react";
import type { RoomState, SeatId } from "@fun/shared";
import type { GameDefinition } from "@/game/types";
import type { GameStore } from "@/game/useGameStore";
import { useRoom } from "./context";

/**
 * Die Position eines Platzes ist seine Stelle in der Liste – dieselbe
 * Reihenfolge, in der auch die Spieler stehen.
 *
 * Frueher wurde sie aus der Kennung gelesen (`s3` -> 2). Das ging nur, solange
 * die Plaetze vorab angelegt wurden und keiner je verschwand; seit sie beim
 * Beitreten entstehen und in der Lobby auch wieder gehen koennen, ist die
 * Kennung nur noch ein Name.
 */
export function seatIndex(room: RoomState, id: SeatId): number {
  return room.seats.findIndex((seat) => seat.id === id);
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

  const { room, mySeat, epoch, status } = snapshot;
  const { state, dispatch } = store;

  // Zuletzt eingearbeiteter Stand je Platz – damit dieselbe Nachricht nicht
  // mehrfach in den Reducer laeuft.
  const appliedRevs = useRef(new Map<SeatId, number>());
  const appliedRoster = useRef<string | null>(null);
  const appliedConfig = useRef<string | null>(null);
  const appliedBarrier = useRef<string | null>(null);
  const lastPublished = useRef<string | null>(null);
  const appliedEpoch = useRef(0);

  const myIndex = room && mySeat ? seatIndex(room, mySeat) : -1;

  // --- raus ---------------------------------------------------------------
  useEffect(() => {
    if (!spec || !room || !mySeat || myIndex < 0) return;
    const payload = spec.seatData(state, myIndex);
    const encoded = JSON.stringify(payload ?? null);
    if (encoded === lastPublished.current) return;

    const timer = window.setTimeout(() => {
      lastPublished.current = encoded;
      client.publish(mySeat, payload);
    }, PUBLISH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [spec, room, mySeat, myIndex, state, client]);

  // --- rein ---------------------------------------------------------------
  useEffect(() => {
    if (!spec || !room) return;

    /*
      Neuer Eintritt in einen Raum: das Gedaechtnis unten beschreibt einen
      Spielstand, den es lokal nicht mehr gibt (der Einstieg setzt ihn zurueck).
      Wer den Raum verlaesst und gleich wieder beitritt, bekaeme sonst seine
      Mitspieler nicht zurueck – die Liste ist ja unveraendert, „schon
      eingearbeitet“ stimmt aber nicht mehr.
    */
    if (appliedEpoch.current !== epoch) {
      appliedEpoch.current = epoch;
      appliedRevs.current.clear();
      appliedRoster.current = null;
      appliedConfig.current = null;
      appliedBarrier.current = null;
      lastPublished.current = null;
    }

    // Zuerst die Mitspieler: ohne sie haetten die Platzinhalte unten niemanden,
    // zu dem sie gehoeren.
    const roster = room.seats.map((seat) => ({ name: seat.name, color: seat.color }));
    const signature = JSON.stringify(roster);
    if (signature !== appliedRoster.current) {
      appliedRoster.current = signature;
      // Mit der Liste aendern sich die Positionen – was zu einer alten Position
      // gemerkt war, gilt nicht mehr.
      appliedRevs.current.clear();
      dispatch(spec.applyRoster(roster));
    }

    room.seats.forEach((seat, index) => {
      if (seat.id === mySeat || seat.data === null) return;
      if (appliedRevs.current.get(seat.id) === seat.rev) return;
      appliedRevs.current.set(seat.id, seat.rev);
      dispatch(spec.applySeat(index, seat.data));
    });

    // Phase und Einstellungen gehoeren dem Host. Wuerde er sie auch selbst
    // uebernehmen, ueberschriebe der Stand des Raums seinen eigenen.
    const isHost = room.host === client.device;

    // `null` heisst „der Host hat noch nichts gesagt“ – ein frisch eroeffneter
    // Raum sieht so aus, und dieses Nichts darf keine Einstellungen ueberbuegeln.
    if (spec.applyConfig && !isHost && room.config !== null) {
      const config = JSON.stringify(room.config);
      if (config !== appliedConfig.current) {
        appliedConfig.current = config;
        dispatch(spec.applyConfig(room.config));
      }
    }

    if (spec.applyPhase && !isHost) dispatch(spec.applyPhase(room.phase));

    // Die Schranke ist offen: alle sind fertig, es geht weiter. Den Schritt
    // macht nur der Host – die anderen folgen ueber `config`. Ein Anfuehrer ist
    // hier einfacher zu verstehen als drei Geraete, die gleichzeitig
    // weiterschalten.
    if (room.barrier?.open && spec.applyBarrierOpen && isHost) {
      if (appliedBarrier.current !== room.barrier.token) {
        appliedBarrier.current = room.barrier.token;
        dispatch(spec.applyBarrierOpen(room.barrier.token));
      }
    }
  }, [spec, room, mySeat, epoch, dispatch, client.device]);

  // --- was nur der Host bekanntgibt: Phase und Schranke --------------------
  useEffect(() => {
    if (!spec || !room || room.host !== client.device) return;

    const phase = definition.phaseOf(state);
    if (phase !== room.phase) client.patchRoom({ phase });

    // Die Einstellungen wandern nicht nur beim Anlegen mit: bei Ab ins Beet
    // steht hier der Schritt, an dem der Tisch gerade ist.
    if (spec.configOf) {
      const config = spec.configOf(state);
      if (JSON.stringify(config) !== JSON.stringify(room.config)) client.patchRoom({ config });
    }

    if (spec.barrierToken) {
      const token = spec.barrierToken(state);
      if (token !== (room.barrier?.token ?? null)) client.patchRoom({ barrier: token });
    }
  }, [spec, room, state, client, definition]);

  // Beim Verlassen des Spiels nichts kappen: der Raum lebt weiter, solange der
  // Nutzer ihn nicht selbst verlaesst.
  void status;
}
