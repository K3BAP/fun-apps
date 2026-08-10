import { useMemo, type ReactNode } from "react";
import { RoomContext, useRoom } from "./context";

/**
 * Ein Raum gilt nur fuer sein Spiel.
 *
 * Die Verbindung liegt ueber dem Router, damit der Weg Lobby -> Spiel sie nicht
 * abreisst. Damit kann aber ein offener Kniffel-Raum noch dastehen, waehrend
 * jemand Qwixx oeffnet – und dessen Spielerliste und Platzinhalte gehoeren dort
 * nicht hin. Diese Schicht blendet einen fremden Raum aus, statt jede einzelne
 * Stelle darunter nachfragen zu lassen.
 */
export function RoomScope({ gameId, children }: { gameId: string; children: ReactNode }) {
  const { client, snapshot } = useRoom();

  const value = useMemo(
    () =>
      snapshot.room && snapshot.room.gameId !== gameId
        ? { client, snapshot: { ...snapshot, room: null, mySeat: null } }
        : { client, snapshot },
    [client, snapshot, gameId],
  );

  return <RoomContext value={value}>{children}</RoomContext>;
}
