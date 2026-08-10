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
  const { room, mySeat } = snapshot;
  if (!room) return null;
  return mySeat === null ? -1 : seatIndex(room, mySeat);
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
  const { room, mySeat } = snapshot;
  if (!room || mySeat === null) return null;

  const seat = room.seats.find((candidate) => candidate.id === mySeat);

  return {
    index: seatIndex(room, mySeat),
    ready: seat?.ready ?? false,
    setReady: (ready) => client.setReady(mySeat, ready),
    waitingFor: room.seats.filter((candidate) => !candidate.ready).length,
  };
}
