import { useGame } from "@/game/context";
import { makePlayer, playerName, type Player, type PlayerId } from "@/game/players";
import type { GameDefinition, Phase } from "@/game/types";
import {
  ROUNDS,
  TIER_POINTS,
  beetTotal,
  bonusTiers,
  maxTier,
  newBeds,
  type Bed,
  type RoundRecord,
} from "./rules";

export type BeetStep = "beet" | "bonus" | "tier";

export type BeetState = {
  phase: Phase;
  players: Player[];
  round: number;
  step: BeetStep;
  /** In Schritt ① wird Gaertner fuer Gaertner geblaettert. */
  beetIdx: number;
  draftBeds: Record<PlayerId, Bed[]>;
  draftTier: Record<PlayerId, number>;
  rounds: RoundRecord[];
};

export type BeetAction =
  | { type: "addPlayer"; name: string }
  | { type: "removePlayer"; id: PlayerId }
  | { type: "reorderPlayers"; ids: PlayerId[] }
  | { type: "start" }
  | { type: "setBed"; player: PlayerId; index: number; patch: Partial<Bed> }
  | { type: "setTier"; player: PlayerId; value: number }
  | { type: "gotoStep"; step: BeetStep }
  | { type: "gotoGardener"; index: number }
  | { type: "finishRound" }
  | { type: "backToSetup" }
  | { type: "playAgain" };

/** Beete eines Spielers, ohne den State anzufassen. */
export function bedsOf(state: BeetState, id: PlayerId): Bed[] {
  const beds = state.draftBeds[id];
  return beds && beds.length === 3 ? beds : newBeds();
}

export function beetTotalOf(state: BeetState, id: PlayerId): number {
  return beetTotal(bedsOf(state, id));
}

/** Beetpunkte aller Spieler – die Grundlage des Bonus. */
export function beetTotals(state: BeetState): Record<PlayerId, number> {
  return Object.fromEntries(state.players.map((p) => [p.id, beetTotalOf(state, p.id)]));
}

function freshGame(state: BeetState): void {
  state.phase = "play";
  state.round = 1;
  state.step = "beet";
  state.beetIdx = 0;
  state.draftBeds = {};
  state.draftTier = {};
  state.rounds = [];
}

export const beetGame: GameDefinition<BeetState, BeetAction> = {
  id: "beet",
  version: 1,
  undo: true,
  undoLabel: "Letzten Durchgang zurücknehmen",

  initial: () => ({
    phase: "setup",
    players: [],
    round: 1,
    step: "beet",
    beetIdx: 0,
    draftBeds: {},
    draftTier: {},
    rounds: [],
  }),

  phaseOf: (state) => state.phase,

  toSetupAction: { type: "backToSetup" },

  transient: (action) => action.type !== "finishRound",

  reducer(draft, action) {
    switch (action.type) {
      case "addPlayer": {
        draft.players.push(
          makePlayer(playerName(action.name, draft.players.length), draft.players),
        );
        break;
      }

      case "removePlayer": {
        draft.players = draft.players.filter((p) => p.id !== action.id);
        delete draft.draftBeds[action.id];
        delete draft.draftTier[action.id];
        break;
      }

      case "reorderPlayers": {
        const byId = new Map(draft.players.map((p) => [p.id, p]));
        draft.players = action.ids.flatMap((id) => {
          const player = byId.get(id);
          return player ? [player] : [];
        });
        break;
      }

      case "start": {
        freshGame(draft);
        break;
      }

      case "setBed": {
        const beds = (draft.draftBeds[action.player] ??= newBeds());
        const bed = beds[action.index];
        if (bed) Object.assign(bed, action.patch);
        break;
      }

      case "setTier": {
        draft.draftTier[action.player] = action.value;
        break;
      }

      case "gotoStep": {
        // Zurueck zu den Beeten heisst: beim letzten Gaertner weitermachen.
        if (action.step === "beet" && draft.step === "bonus") {
          draft.beetIdx = Math.max(0, draft.players.length - 1);
        }
        draft.step = action.step;
        break;
      }

      case "gotoGardener": {
        draft.beetIdx = Math.min(Math.max(0, action.index), draft.players.length - 1);
        break;
      }

      case "finishRound": {
        const beet = beetTotals(draft);
        const bonus = bonusTiers(beet);
        const limit = maxTier(draft.round);
        const tier: Record<PlayerId, number> = {};
        for (const player of draft.players) {
          // Auch hier deckeln, nicht nur in der Anzeige: ein Wert aus einem
          // spaeteren Durchgang darf nicht in einen frueheren durchsickern.
          tier[player.id] = Math.min(draft.draftTier[player.id] ?? 0, limit) * TIER_POINTS;
        }

        draft.rounds.push({ beet, bonus, tier });
        draft.draftBeds = {};
        draft.draftTier = {};
        draft.step = "beet";
        draft.beetIdx = 0;
        if (draft.round >= ROUNDS) draft.phase = "result";
        else draft.round += 1;
        break;
      }

      case "backToSetup": {
        draft.phase = "setup";
        break;
      }

      case "playAgain": {
        freshGame(draft);
        break;
      }
    }
  },
};

export const useBeet = () => useGame<BeetState, BeetAction>();
