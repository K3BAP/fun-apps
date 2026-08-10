import { useMemo, useSyncExternalStore, type ReactNode } from "react";
import { RoomContext } from "./context";
import { RoomClient } from "./roomClient";
import { createWsTransport } from "./wsTransport";

/**
 * Der Raum ist immer da, aber nie im Weg: die Kinder werden sofort gerendert,
 * der Status ist „off“, und es wird nichts verbunden, bis jemand einen Raum
 * anlegt oder beitritt. Ein toter Server kann ein Spiel dadurch nicht stoeren.
 */
export function RoomProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => new RoomClient(createWsTransport()), []);
  const snapshot = useSyncExternalStore(client.subscribe, client.getSnapshot);
  const value = useMemo(() => ({ client, snapshot }), [client, snapshot]);
  return <RoomContext value={value}>{children}</RoomContext>;
}
