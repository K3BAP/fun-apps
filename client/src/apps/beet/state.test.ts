import { describe, expect, it } from "vitest";
import { produce } from "immer";
import type { Player } from "@/game/players";
import { gameTotal } from "./rules";
import { beetGame, type BeetAction, type BeetConfig, type BeetState } from "./state";

function apply(state: BeetState, action: BeetAction): BeetState {
  return produce(state, (draft) => {
    beetGame.reducer(draft, action);
  });
}

function player(id: string, name: string, color: string): Player {
  return { id, name, color };
}

/** Ein Gerät mit eigenen (anderen!) Spieler-Kennungen für dieselben Personen. */
function deviceWith(ids: [string, string]): BeetState {
  return {
    ...beetGame.initial(),
    phase: "play",
    players: [player(ids[0], "Kim", "#111"), player(ids[1], "Lou", "#222")],
  };
}

describe("Durchgänge über die Leitung", () => {
  it("überträgt gewertete Durchgänge nach Platznummer, nicht nach Spieler-Kennung", () => {
    // Spieler-Kennungen entstehen pro Gerät – sie taugen nicht für den
    // Austausch. Genau das ist beim Bauen einmal schiefgegangen: der Gast
    // bekam die Punkte des Gastgebers unter fremden Kennungen und sah 0.
    const host = {
      ...deviceWith(["host-1", "host-2"]),
      rounds: [
        {
          beet: { "host-1": 6, "host-2": 5 },
          bonus: { "host-1": 10, "host-2": 0 },
          tier: { "host-1": 5, "host-2": 0 },
        },
      ],
      round: 2,
      step: "beet" as const,
    };

    const config = beetGame.sync!.configOf!(host) as BeetConfig;
    const guest = apply(deviceWith(["guest-a", "guest-b"]), {
      type: "setConfig",
      config,
    });

    expect(gameTotal(guest.rounds, "guest-a")).toBe(21);
    expect(gameTotal(guest.rounds, "guest-b")).toBe(5);
    expect(gameTotal(host.rounds, "host-1")).toBe(21);
    expect(guest.round).toBe(2);
  });

  it("überträgt einen leeren Verlauf unbeschadet", () => {
    const config = beetGame.sync!.configOf!(deviceWith(["a", "b"])) as BeetConfig;
    const guest = apply(deviceWith(["x", "y"]), { type: "setConfig", config });
    expect(guest.rounds).toEqual([]);
  });
});

describe("Spielerliste aus dem Raum", () => {
  it("ist idempotent und behält die Kennungen bei gleicher Liste", () => {
    const before = deviceWith(["a", "b"]);
    const roster = [
      { name: "Kim", color: "#111" },
      { name: "Lou", color: "#222" },
    ];
    const after = apply(before, { type: "setRoster", roster });
    expect(after.players).toBe(before.players);
  });

  it("übernimmt eine geänderte Liste", () => {
    const after = apply(deviceWith(["a", "b"]), {
      type: "setRoster",
      roster: [
        { name: "Kim", color: "#111" },
        { name: "Mo", color: "#333" },
      ],
    });
    expect(after.players.map((p) => p.name)).toEqual(["Kim", "Mo"]);
    expect(after.players[0]!.id).toBe("a");
  });
});

describe("Bereit-Schranke", () => {
  const inRound = (round: number, step: BeetState["step"]) => ({
    ...deviceWith(["a", "b"]),
    round,
    step,
  });

  it("schaltet Schritt für Schritt weiter", () => {
    expect(apply(inRound(1, "beet"), { type: "barrierOpen", token: "r1:beet" }).step).toBe("bonus");
    expect(apply(inRound(1, "bonus"), { type: "barrierOpen", token: "r1:bonus" }).step).toBe(
      "tier",
    );
  });

  it("schließt beim letzten Schritt den Durchgang ab", () => {
    const after = apply(inRound(1, "tier"), { type: "barrierOpen", token: "r1:tier" });
    expect(after.round).toBe(2);
    expect(after.step).toBe("beet");
    expect(after.rounds).toHaveLength(1);
  });

  it("ignoriert einen Token, der nicht zum aktuellen Stand passt", () => {
    // Kommt die Meldung doppelt, darf sie nicht zwei Schritte weiterschalten.
    const state = inRound(2, "bonus");
    expect(apply(state, { type: "barrierOpen", token: "r1:beet" })).toBe(state);
  });
});
