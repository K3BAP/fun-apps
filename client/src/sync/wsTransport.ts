import {
  PROTOCOL_VERSION,
  type ClientMsg,
  type DeviceId,
  type RoomCode,
  type ServerMsg,
} from "@fun/shared";
import type { Transport, TransportEvent } from "./transport";

const RETRY_MIN_MS = 500;
const RETRY_MAX_MS = 8000;
const PING_MS = 25_000;

function socketUrl(): string {
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${location.host}/api/ws`;
}

/** WebSocket zum eigenen Server, mit Wiederverbinden und Herzschlag. */
export function createWsTransport(): Transport {
  const listeners = new Set<(event: TransportEvent) => void>();
  let socket: WebSocket | null = null;
  let code: RoomCode | null = null;
  let device: DeviceId | null = null;
  let name = "";
  let retryDelay = RETRY_MIN_MS;
  let retryTimer: number | undefined;
  let pingTimer: number | undefined;
  let closedByUs = false;

  const emit = (event: TransportEvent) => listeners.forEach((listener) => listener(event));

  function open(): void {
    if (code === null || device === null) return;
    const hello: ClientMsg = { t: "hello", v: PROTOCOL_VERSION, device, code, name };
    /*
      Die eigene Verbindung festhalten und in jedem Ereignis vergleichen.

      Ohne diesen Vergleich meldet eine bereits abgeloeste Verbindung ihren
      Abbruch noch nach – und zwar *nachdem* die neue schon offen ist. Der
      Status faellt dann von „verbunden“ auf „offline“ zurueck, und der
      Wiederhol-Zeitgeber legt eine dritte Verbindung obendrauf. Das Ergebnis
      ist ein Raum, der dauerhaft offline aussieht, obwohl eine Leitung steht.
    */
    const ws = new WebSocket(socketUrl());
    socket = ws;

    ws.addEventListener("open", () => {
      if (socket !== ws) return;
      retryDelay = RETRY_MIN_MS;
      ws.send(JSON.stringify(hello));
      emit({ type: "open" });
      pingTimer = window.setInterval(() => {
        if (ws.readyState === WebSocket.OPEN)
          ws.send(JSON.stringify({ t: "ping" } satisfies ClientMsg));
      }, PING_MS);
    });

    ws.addEventListener("message", (event) => {
      if (socket !== ws) return;
      try {
        emit({ type: "message", msg: JSON.parse(String(event.data)) as ServerMsg });
      } catch {
        /* unverständliche Antwort ignorieren */
      }
    });

    ws.addEventListener("close", () => {
      if (socket !== ws) return;
      window.clearInterval(pingTimer);
      socket = null;
      emit({ type: "closed", willRetry: !closedByUs });
      if (closedByUs) return;
      // Aufschaukeln mit etwas Streuung, damit nicht alle Geraete im Gleichtakt
      // wiederkommen, wenn der Server neu startet.
      const jitter = Math.random() * 250;
      retryTimer = window.setTimeout(open, retryDelay + jitter);
      retryDelay = Math.min(retryDelay * 2, RETRY_MAX_MS);
    });
  }

  return {
    connect(nextCode, nextDevice, nextName) {
      closedByUs = false;
      code = nextCode;
      device = nextDevice;
      name = nextName;
      window.clearTimeout(retryTimer);
      // Der Herzschlag der alten Verbindung endet hier – ihr close-Ereignis
      // wird gleich als veraltet verworfen und raeumt nicht mehr auf.
      window.clearInterval(pingTimer);
      socket?.close();
      open();
    },

    send(msg) {
      if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(msg));
    },

    close() {
      closedByUs = true;
      window.clearTimeout(retryTimer);
      window.clearInterval(pingTimer);
      socket?.close();
      socket = null;
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
