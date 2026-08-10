import { useRoom } from "./context";
import { seatIndex } from "./useGameSync";

/**
 * Welche Spielerposition darf dieses Geraet gerade bearbeiten?
 *
 * `null` heisst „alles“ – so ist es ohne Raum, und so war es vor dem Umbau
 * ueberall. Sobald ein Raum im Spiel ist, gehoert genau ein Platz zu diesem
 * Geraet; alle anderen Spalten sind dann nur zum Ansehen.
 */
export function useMySeatIndex(): number | null {
  const { snapshot } = useRoom();
  if (!snapshot.room) return null;
  const seat = snapshot.mySeats[0];
  return seat === undefined ? -1 : seatIndex(seat);
}

export type SeatReady = {
  index: number;
  ready: boolean;
  setReady: (ready: boolean) => void;
  /** Auf wie viele Mitspieler wird noch gewartet? */
  waitingFor: number;
};

/**
 * Der eigene Platz samt Bereit-Flagge – fuer Spiele, in denen alle parallel
 * eintragen und dann gemeinsam weitergehen (Ab ins Beet).
 */
export function useSeatReady(): SeatReady | null {
  const { client, snapshot } = useRoom();
  const room = snapshot.room;
  const seatId = snapshot.mySeats[0];
  if (!room || seatId === undefined) return null;

  const seat = room.seats.find((candidate) => candidate.id === seatId);
  const taken = room.seats.filter((candidate) => candidate.owner !== null);

  return {
    index: seatIndex(seatId),
    ready: seat?.ready ?? false,
    setReady: (ready) => client.setReady(seatId, ready),
    waitingFor: taken.filter((candidate) => !candidate.ready).length,
  };
}
