import { describe, expect, it } from "vitest";
import type { CreateRoomBody, RoomState } from "@fun/shared";
import {
  createRoom,
  evaluateBarrier,
  joinRoom,
  leaveRoom,
  putSeat,
  seatOwnedBy,
  setOnline,
  setReady,
  setRoom,
} from "./room";

const BODY: CreateRoomBody = {
  gameId: "kniffel",
  gameVersion: 1,
  host: "host",
  maxSeats: 4,
};

function room(): RoomState {
  return createRoom("ABCD", BODY);
}

/** Ein Raum mit den angegebenen Geraeten darin – der Normalfall in den Tests. */
function roomWith(...devices: string[]): RoomState {
  const r = room();
  for (const device of devices) joinRoom(r, device, device.toUpperCase());
  return r;
}

describe("createRoom", () => {
  it("faengt leer an – Plaetze entstehen erst beim Beitreten", () => {
    const r = room();
    expect(r.seats).toEqual([]);
    expect(r.phase).toBe("setup");
    expect(r.barrier).toBeNull();
    expect(r.config).toBeNull();
  });
});

describe("Beitreten", () => {
  it("legt einen Platz an und gibt ihn dem Geraet", () => {
    const r = room();
    const result = joinRoom(r, "a", "Anna");
    expect(result.ok).toBe(true);
    expect(r.seats).toHaveLength(1);
    expect(r.seats[0]!.name).toBe("Anna");
    expect(r.seats[0]!.owner).toBe("a");
    expect(seatOwnedBy(r, "a")?.id).toBe("s1");
  });

  it("gibt jedem Platz eine eigene Farbe", () => {
    const r = roomWith("a", "b", "c");
    expect(new Set(r.seats.map((s) => s.color)).size).toBe(3);
  });

  it("nummeriert die Reihenfolge des Beitretens durch", () => {
    const r = roomWith("a", "b");
    expect(r.seats.map((s) => s.name)).toEqual(["A", "B"]);
  });

  it("gibt demselben Geraet seinen Platz zurueck, statt einen zweiten anzulegen", () => {
    // Genau das passiert nach einem Reload oder aus dem Funkloch heraus.
    const r = roomWith("a");
    setOnline(r, "a", false);
    const again = joinRoom(r, "a", "Ganz anders");
    expect(again.ok).toBe(true);
    expect(r.seats).toHaveLength(1);
    expect(r.seats[0]!.online).toBe(true);
    // Der Name bleibt: an ihm haengt die Zuordnung von Spieler zu Block.
    expect(r.seats[0]!.name).toBe("A");
  });

  it("weist ab, sobald gespielt wird", () => {
    const r = roomWith("a");
    setRoom(r, "host", { phase: "play" });
    const result = joinRoom(r, "b", "Bert");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("room_locked");
    expect(r.seats).toHaveLength(1);
  });

  it("laesst ein bekanntes Geraet auch mitten im Spiel zurueckkommen", () => {
    const r = roomWith("a");
    setRoom(r, "host", { phase: "play" });
    setOnline(r, "a", false);
    expect(joinRoom(r, "a", "A").ok).toBe(true);
    expect(r.seats[0]!.online).toBe(true);
  });

  it("weist ab, wenn der Raum voll ist", () => {
    const r = roomWith("a", "b", "c", "d");
    const result = joinRoom(r, "e", "Emil");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("room_full");
  });

  it("ersetzt einen leeren Namen", () => {
    const r = room();
    joinRoom(r, "a", "   ");
    expect(r.seats[0]!.name).toBe("Spieler 1");
  });
});

describe("Verlassen", () => {
  it("nimmt den Platz aus dem Raum", () => {
    const r = roomWith("a", "b");
    expect(leaveRoom(r, "a").ok).toBe(true);
    expect(r.seats.map((s) => s.owner)).toEqual(["b"]);
  });

  it("vergibt keine Kennung doppelt, wenn ein mittlerer Platz geht", () => {
    // `s${seats.length + 1}` waere hier wieder "s3" – und damit die Kennung
    // eines Platzes, den es noch gibt.
    const r = roomWith("a", "b", "c");
    leaveRoom(r, "b");
    joinRoom(r, "d", "Dora");
    expect(new Set(r.seats.map((s) => s.id)).size).toBe(3);
  });

  it("laesst den Platz stehen, sobald gespielt wird", () => {
    const r = roomWith("a");
    setRoom(r, "host", { phase: "play" });
    const result = leaveRoom(r, "a");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("room_locked");
    expect(r.seats).toHaveLength(1);
  });
});

describe("Platzinhalt schreiben", () => {
  it("nimmt Daten vom Eigentuemer an", () => {
    const r = roomWith("a");
    const result = putSeat(r, "a", "s1", 1, { x: 1 });
    expect(result.ok).toBe(true);
    expect(r.seats[0]!.data).toEqual({ x: 1 });
  });

  it("weist ein fremdes Geraet ab", () => {
    const r = roomWith("a");
    const result = putSeat(r, "b", "s1", 1, { x: 2 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("not_owner");
    expect(r.seats[0]!.data).toBeNull();
  });

  it("ignoriert einen veralteten Stand, ohne zu meckern", () => {
    // Genau das macht das Nachspielen der Warteschlange nach einer
    // Neuverbindung unschaedlich.
    const r = roomWith("a");
    putSeat(r, "a", "s1", 5, { x: 5 });
    const result = putSeat(r, "a", "s1", 3, { x: 3 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBeNull();
    expect(r.seats[0]!.data).toEqual({ x: 5 });
  });

  it("kennt keinen erfundenen Platz", () => {
    const result = putSeat(roomWith("a"), "a", "s9", 1, null);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("unknown_seat");
  });
});

describe("Raum-Einstellungen", () => {
  it("laesst nur den Host aendern", () => {
    const r = roomWith("a");
    const denied = setRoom(r, "a", { phase: "play" });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.code).toBe("not_host");

    expect(setRoom(r, "host", { phase: "play" }).ok).toBe(true);
    expect(r.phase).toBe("play");
  });
});

describe("Bereit-Schranke", () => {
  it("oeffnet erst, wenn alle Plaetze bereit sind", () => {
    const r = roomWith("a", "b");
    setRoom(r, "host", { barrier: "r1:beet" });

    setReady(r, "a", "s1", true);
    expect(evaluateBarrier(r)).toBe(false);
    expect(r.barrier?.open).toBe(false);

    setReady(r, "b", "s2", true);
    expect(evaluateBarrier(r)).toBe(true);
    expect(r.barrier?.open).toBe(true);
  });

  it("oeffnet nie in einem leeren Raum", () => {
    const r = room();
    setRoom(r, "host", { barrier: "r1:beet" });
    expect(evaluateBarrier(r)).toBe(false);
  });

  it("setzt die Bereit-Flaggen zurueck, sobald der Token wechselt", () => {
    const r = roomWith("a");
    setRoom(r, "host", { barrier: "r1:beet" });
    setReady(r, "a", "s1", true);
    evaluateBarrier(r);
    expect(r.barrier?.open).toBe(true);

    setRoom(r, "host", { barrier: "r2:beet" });
    expect(r.barrier).toEqual({ token: "r2:beet", open: false });
    expect(r.seats[0]!.ready).toBe(false);
  });

  it("laesst denselben Token unberuehrt", () => {
    const r = roomWith("a");
    setRoom(r, "host", { barrier: "r1:beet" });
    setReady(r, "a", "s1", true);
    setRoom(r, "host", { barrier: "r1:beet" });
    expect(r.seats[0]!.ready).toBe(true);
  });

  it("laesst sich aufheben", () => {
    const r = room();
    setRoom(r, "host", { barrier: "r1:beet" });
    setRoom(r, "host", { barrier: null });
    expect(r.barrier).toBeNull();
  });
});

describe("Verbindung", () => {
  it("behaelt den Platz beim Verbindungsverlust und merkt sich nur offline", () => {
    const r = roomWith("a");
    expect(setOnline(r, "a", false)).toBe(true);
    expect(r.seats[0]!.owner).toBe("a");
    expect(r.seats[0]!.online).toBe(false);
  });

  it("meldet nichts, wenn sich nichts aendert", () => {
    const r = roomWith("a");
    expect(setOnline(r, "a", true)).toBe(false);
  });
});
