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
