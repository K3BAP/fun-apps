import { makePlayer, playerName, type Player, type PlayerId } from "@/game/players";
import { useGame } from "@/game/context";
import type { GameDefinition, Phase } from "@/game/types";
import type { CatKey, Sheet } from "./rules";

export type KniffelState = {
  phase: Phase;
  players: Player[];
  /** Ein Block je Spieler. */
  sheets: Record<PlayerId, Sheet>;
};

export type KniffelAction =
  | { type: "addPlayer"; name: string }
  | { type: "removePlayer"; id: PlayerId }
  | { type: "reorderPlayers"; ids: PlayerId[] }
  | { type: "start" }
  | { type: "setValue"; player: PlayerId; cat: CatKey; value: number | null }
  | { type: "evaluate" }
  | { type: "backToSetup" }
  | { type: "playAgain" };

export function sheetOf(state: KniffelState, id: PlayerId): Sheet {
  return state.sheets[id] ?? {};
}

export function sheetsInOrder(state: KniffelState): Sheet[] {
  return state.players.map((player) => sheetOf(state, player.id));
}

export const kniffelGame: GameDefinition<KniffelState, KniffelAction> = {
  id: "kniffel",
  version: 1,

  initial: () => ({ phase: "setup", players: [], sheets: {} }),

  phaseOf: (state) => state.phase,

  toSetupAction: { type: "backToSetup" },

  reducer(draft, action) {
    switch (action.type) {
      case "addPlayer": {
        const player = makePlayer(playerName(action.name, draft.players.length), draft.players);
        draft.players.push(player);
        draft.sheets[player.id] = {};
        break;
      }

      case "removePlayer": {
        draft.players = draft.players.filter((p) => p.id !== action.id);
        delete draft.sheets[action.id];
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
        draft.phase = "play";
        break;
      }

      case "setValue": {
        const sheet = (draft.sheets[action.player] ??= {});
        // `null` heisst „Feld leeren“ – der Eintrag verschwindet, eine 0 bliebe
        // als gestrichen stehen.
        if (action.value === null) delete sheet[action.cat];
        else sheet[action.cat] = action.value;
        break;
      }

      case "evaluate": {
        draft.phase = "result";
        break;
      }

      case "backToSetup": {
        draft.phase = "setup";
        break;
      }

      case "playAgain": {
        for (const player of draft.players) draft.sheets[player.id] = {};
        draft.phase = "play";
        break;
      }
    }
  },
};

export const useKniffel = () => useGame<KniffelState, KniffelAction>();
