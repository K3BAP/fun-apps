import type { ClientMsg, DeviceId, RoomCode, ServerMsg } from "@fun/shared";

export type TransportEvent =
  { type: "open" } | { type: "closed"; willRetry: boolean } | { type: "message"; msg: ServerMsg };

/**
 * Die Austauschstelle fuer das Übertragungsverfahren.
 *
 * Heute steckt hier ein WebSocket zum eigenen Server. Ein spaeterer
 * QR-/WebRTC-Transport (echtes Peer-to-Peer im lokalen Netz, ganz ohne Server)
 * muesste nur diese fuenf Mitglieder erfuellen – der Spielcode darueber merkt
 * nichts davon. Das Puffern liegt bewusst eine Ebene hoeher, nicht hier.
 */
export interface Transport {
  /**
   * Der Name gehoert zum Verbinden, weil Anmelden und Beitreten dasselbe sind:
   * wer sich anmeldet und noch keinen Platz hat, bekommt einen – unter diesem
   * Namen.
   */
  connect(code: RoomCode, device: DeviceId, name: string): void;
  send(msg: ClientMsg): void;
  close(): void;
  subscribe(listener: (event: TransportEvent) => void): () => void;
}
