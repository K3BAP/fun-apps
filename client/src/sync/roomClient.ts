import type {
  CreateRoomBody,
  CreateRoomResponse,
  RoomCode,
  RoomPatch,
  RoomState,
  SeatId,
} from "@fun/shared";
import { normalizeCode } from "@fun/shared";
import { nsKey, readJson, removeKey, writeJson } from "@/storage/keys";
import { deviceId } from "./device";
import type { Transport } from "./transport";

export type RoomStatus = "off" | "connecting" | "online" | "offline";

export type RoomSnapshot = {
  status: RoomStatus;
  room: RoomState | null;
  code: RoomCode | null;
  mySeats: SeatId[];
  /** Wie viele Aenderungen warten noch auf die Leitung? */
  pending: number;
  error: string | null;
};

const SESSION_KEY = nsKey("room");
type Session = { code: RoomCode; gameId: string; seats: SeatId[] };

const EMPTY: RoomSnapshot = {
  status: "off",
  room: null,
  code: null,
  mySeats: [],
  pending: 0,
  error: null,
};

/**
 * Der Raum aus Sicht dieses Geraets.
 *
 * Kernpunkt ist die **Ausgangspost**: pro Platz wird nur der *letzte* Stand
 * gemerkt. Das ist genau dann richtig, wenn Inhalte vollstaendig uebertragen
 * werden – und das ist hier so. Ohne Verbindung sammelt sie sich an, bei der
 * naechsten Verbindung geht sie in einem Rutsch raus. Gespielt wird die ganze
 * Zeit weiter; das ist der Sinn der Uebung.
 */
export class RoomClient {
  private snapshot: RoomSnapshot = EMPTY;
  private listeners = new Set<() => void>();
  private outbox = new Map<SeatId, { rev: number; data: unknown }>();
  /** Eigener Zaehler je Platz – steigt bei jeder lokalen Aenderung. */
  private revs = new Map<SeatId, number>();
  private unsubscribe: (() => void) | null = null;

  readonly device = deviceId();

  constructor(private readonly transport: Transport) {}

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): RoomSnapshot => this.snapshot;

  private set(patch: Partial<RoomSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch, pending: this.outbox.size };
    this.listeners.forEach((listener) => listener());
  }

  /**
   * Beim Start einer App: eine gemerkte Sitzung wieder aufnehmen – aber nur,
   * wenn sie zu diesem Spiel gehoert. Sonst laege beim Öffnen von Kniffel
   * ploetzlich ein Qwixx-Raum an.
   */
  resume(gameId: string): void {
    const session = readJson<Session | null>(SESSION_KEY, null);
    if (session?.code && session.gameId === gameId) this.join(session.code);
  }

  async create(body: Omit<CreateRoomBody, "host">): Promise<RoomCode> {
    const response = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, host: this.device } satisfies CreateRoomBody),
    });
    if (!response.ok) throw new Error("Raum konnte nicht angelegt werden.");
    const { code } = (await response.json()) as CreateRoomResponse;
    this.join(code);
    return code;
  }

  join(rawCode: string): void {
    const code = normalizeCode(rawCode);
    this.unsubscribe?.();
    this.unsubscribe = this.transport.subscribe((event) => this.onTransport(event));
    this.set({ status: "connecting", code, error: null });
    this.transport.connect(code, this.device);
  }

  leave(): void {
    this.transport.close();
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.outbox.clear();
    this.revs.clear();
    removeKey(SESSION_KEY);
    this.snapshot = EMPTY;
    this.listeners.forEach((listener) => listener());
  }

  claim(seat: SeatId): void {
    this.transport.send({ t: "claim", seat });
  }

  releaseSeat(seat: SeatId): void {
    this.transport.send({ t: "release", seat });
  }

  setReady(seat: SeatId, ready: boolean): void {
    this.transport.send({ t: "ready", seat, ready });
  }

  patchRoom(patch: RoomPatch): void {
    this.transport.send({ t: "room", patch });
  }

  /** Den eigenen Platzinhalt veroeffentlichen – vollstaendig, nicht als Diff. */
  publish(seat: SeatId, data: unknown): void {
    const rev = (this.revs.get(seat) ?? 0) + 1;
    this.revs.set(seat, rev);
    this.outbox.set(seat, { rev, data });
    this.flush();
    this.set({});
  }

  private flush(): void {
    if (this.snapshot.status !== "online") return;
    for (const [seat, entry] of this.outbox) {
      this.transport.send({ t: "seat", seat, rev: entry.rev, data: entry.data });
    }
    // Bestaetigt wird ueber das naechste `seat`-Echo bzw. den Schnappschuss;
    // bis dahin bleibt der Eintrag stehen und wird notfalls erneut gesendet.
  }

  private onTransport(event: import("./transport").TransportEvent): void {
    if (event.type === "open") {
      this.set({ status: "online" });
      this.flush();
      return;
    }

    if (event.type === "closed") {
      this.set({ status: event.willRetry ? "offline" : "off" });
      return;
    }

    const msg = event.msg;
    switch (msg.t) {
      case "snapshot": {
        // Abgleich: was lokal neuer ist, geht noch einmal raus; alles andere
        // wird uebernommen.
        for (const seat of msg.room.seats) {
          if (seat.owner === this.device) {
            const mine = this.revs.get(seat.id) ?? 0;
            if (mine > seat.rev) {
              const entry = this.outbox.get(seat.id);
              if (entry) this.transport.send({ t: "seat", seat: seat.id, ...entry });
            } else {
              this.revs.set(seat.id, seat.rev);
              this.outbox.delete(seat.id);
            }
          }
        }
        const mySeats = msg.you.seats;
        writeJson(SESSION_KEY, {
          code: msg.room.code,
          gameId: msg.room.gameId,
          seats: mySeats,
        } satisfies Session);
        this.set({ status: "online", room: msg.room, code: msg.room.code, mySeats, error: null });
        return;
      }

      case "seat": {
        const room = this.snapshot.room;
        if (!room) return;
        if (msg.seat.owner === this.device) this.outbox.delete(msg.seat.id);
        this.set({
          room: {
            ...room,
            seats: room.seats.map((seat) => (seat.id === msg.seat.id ? msg.seat : seat)),
          },
        });
        return;
      }

      case "room": {
        const mySeats = msg.room.seats
          .filter((seat) => seat.owner === this.device)
          .map((seat) => seat.id);
        writeJson(SESSION_KEY, {
          code: msg.room.code,
          gameId: msg.room.gameId,
          seats: mySeats,
        } satisfies Session);
        this.set({ room: msg.room, code: msg.room.code, mySeats });
        return;
      }

      case "error": {
        // Ein verschwundener Raum ist keine Stoerung, sondern ein Zustand:
        // lokal wird ohne Unterbrechung weitergespielt.
        if (msg.code === "no_room") {
          removeKey(SESSION_KEY);
          this.transport.close();
          this.set({ status: "off", room: null, mySeats: [], error: msg.msg });
          return;
        }
        this.set({ error: msg.msg });
        return;
      }

      case "pong":
        return;
    }
  }
}
