import { describe, expect, it } from "vitest";
import type { CreateRoomBody, RoomState } from "@fun/shared";
import {
  claim,
  createRoom,
  evaluateBarrier,
  putSeat,
  release,
  seatsOwnedBy,
  setOnline,
  setReady,
  setRoom,
} from "./room";

const BODY: CreateRoomBody = {
  gameId: "kniffel",
  gameVersion: 1,
  host: "host",
  config: { foo: 1 },
  seats: [
    { name: "Anna", color: "#111" },
    { name: "Bert", color: "#222" },
  ],
};

function room(): RoomState {
  return createRoom("ABCD", BODY);
}

describe("createRoom", () => {
  it("legt je Spieler einen freien Platz an", () => {
    const r = room();
    expect(r.seats.map((s) => s.id)).toEqual(["s1", "s2"]);
    expect(r.seats.every((s) => s.owner === null)).toBe(true);
    expect(r.phase).toBe("setup");
    expect(r.barrier).toBeNull();
  });
});

describe("Plaetze belegen", () => {
  it("gibt einen freien Platz an das Geraet", () => {
    const r = room();
    expect(claim(r, "a", "s1").ok).toBe(true);
    expect(r.seats[0]!.owner).toBe("a");
    expect(seatsOwnedBy(r, "a")).toEqual(["s1"]);
  });

  it("weist ein fremdes Geraet ab", () => {
    const r = room();
    claim(r, "a", "s1");
    const result = claim(r, "b", "s1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("seat_taken");
  });

  it("laesst dasselbe Geraet erneut belegen – so kommt es nach einem Reload zurueck", () => {
    const r = room();
    claim(r, "a", "s1");
    setOnline(r, "a", false);
    expect(claim(r, "a", "s1").ok).toBe(true);
    expect(r.seats[0]!.online).toBe(true);
  });

  it("kennt keinen erfundenen Platz", () => {
    const result = claim(room(), "a", "s9");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("unknown_seat");
  });
});

describe("Platzinhalt schreiben", () => {
  it("nimmt Daten vom Eigentuemer an", () => {
    const r = room();
    claim(r, "a", "s1");
    const result = putSeat(r, "a", "s1", 1, { x: 1 });
    expect(result.ok).toBe(true);
    expect(r.seats[0]!.data).toEqual({ x: 1 });
  });

  it("weist ein fremdes Geraet ab", () => {
    const r = room();
    claim(r, "a", "s1");
    const result = putSeat(r, "b", "s1", 1, { x: 2 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("not_owner");
    expect(r.seats[0]!.data).toBeNull();
  });

  it("ignoriert einen veralteten Stand, ohne zu meckern", () => {
    // Genau das macht das Nachspielen der Warteschlange nach einer
    // Neuverbindung unschaedlich.
    const r = room();
    claim(r, "a", "s1");
    putSeat(r, "a", "s1", 5, { x: 5 });
    const result = putSeat(r, "a", "s1", 3, { x: 3 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBeNull();
    expect(r.seats[0]!.data).toEqual({ x: 5 });
  });
});

describe("Raum-Einstellungen", () => {
  it("laesst nur den Host aendern", () => {
    const r = room();
    const denied = setRoom(r, "a", { phase: "play" });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.code).toBe("not_host");

    expect(setRoom(r, "host", { phase: "play" }).ok).toBe(true);
    expect(r.phase).toBe("play");
  });
});

describe("Bereit-Schranke", () => {
  it("oeffnet erst, wenn alle belegten Plaetze bereit sind", () => {
    const r = room();
    claim(r, "a", "s1");
    claim(r, "b", "s2");
    setRoom(r, "host", { barrier: "r1:beet" });

    setReady(r, "a", "s1", true);
    expect(evaluateBarrier(r)).toBe(false);
    expect(r.barrier?.open).toBe(false);

    setReady(r, "b", "s2", true);
    expect(evaluateBarrier(r)).toBe(true);
    expect(r.barrier?.open).toBe(true);
  });

  it("wartet nicht auf freie Plaetze", () => {
    const r = room();
    claim(r, "a", "s1"); // s2 bleibt frei
    setRoom(r, "host", { barrier: "r1:beet" });
    setReady(r, "a", "s1", true);
    expect(evaluateBarrier(r)).toBe(true);
  });

  it("oeffnet nie ohne einen einzigen belegten Platz", () => {
    const r = room();
    setRoom(r, "host", { barrier: "r1:beet" });
    expect(evaluateBarrier(r)).toBe(false);
  });

  it("setzt die Bereit-Flaggen zurueck, sobald der Token wechselt", () => {
    const r = room();
    claim(r, "a", "s1");
    setRoom(r, "host", { barrier: "r1:beet" });
    setReady(r, "a", "s1", true);
    evaluateBarrier(r);
    expect(r.barrier?.open).toBe(true);

    setRoom(r, "host", { barrier: "r2:beet" });
    expect(r.barrier).toEqual({ token: "r2:beet", open: false });
    expect(r.seats[0]!.ready).toBe(false);
  });

  it("laesst denselben Token unberuehrt", () => {
    const r = room();
    claim(r, "a", "s1");
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
    const r = room();
    claim(r, "a", "s1");
    expect(setOnline(r, "a", false)).toEqual(["s1"]);
    expect(r.seats[0]!.owner).toBe("a");
    expect(r.seats[0]!.online).toBe(false);
  });

  it("gibt den Platz frei, wenn der Eigentuemer es sagt", () => {
    const r = room();
    claim(r, "a", "s1");
    expect(release(r, "a", "s1").ok).toBe(true);
    expect(r.seats[0]!.owner).toBeNull();
  });

  it("laesst niemanden einen fremden Platz freigeben", () => {
    const r = room();
    claim(r, "a", "s1");
    const result = release(r, "b", "s1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("not_owner");
  });
});
