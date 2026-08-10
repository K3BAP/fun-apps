import { useRoom } from "./context";

export type RoomRole = {
  /** Wird dieses Spiel gerade in einem Raum gespielt? */
  inRoom: boolean;
  /** Gehoert dem Raum – gibt Einstellungen vor und startet. */
  isHost: boolean;
  /** Im Raum, aber nicht der Host: schaut bei den Einstellungen zu. */
  isGuest: boolean;
};

/**
 * Wer bin ich in diesem Raum?
 *
 * Die Einrichtung eines Spiels ist die einzige Stelle, an der das sichtbar
 * wird: die Optionen gehoeren dem Host, alle anderen sehen sie nur. Im Spiel
 * selbst gibt es keinen Unterschied mehr – dort zaehlt nur, wem ein Platz
 * gehoert, und das beantwortet `useMySeatIndex`.
 */
export function useRoomRole(): RoomRole {
  const { client, snapshot } = useRoom();
  const room = snapshot.room;
  const isHost = room !== null && room.host === client.device;
  return { inRoom: room !== null, isHost, isGuest: room !== null && !isHost };
}
