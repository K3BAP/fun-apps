import {
  adoptRoster,
  makePlayer,
  playerName,
  rosterMatches,
  type Player,
  type PlayerId,
  type RosterEntry,
} from "@/game/players";
import { useGame } from "@/game/context";
import type { GameDefinition, Phase } from "@/game/types";
import { rankBy } from "@/game/rank";
import { grandTotal, type CatKey, type Sheet } from "./rules";

export type KniffelState = {
  phase: Phase;
  players: Player[];
  /** Ein Block je Spieler. */
  sheets: Record<PlayerId, Sheet>;
};

export type KniffelAction =
  | { type: "setSheetAt"; index: number; sheet: Sheet }
  | { type: "setRoster"; roster: RosterEntry[] }
  | { type: "setPhase"; phase: Phase }
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

  summarize: (state) => ({
    standings: rankBy(state.players, (player) => grandTotal(sheetOf(state, player.id))).map(
      (entry) => ({ name: entry.item.name, score: entry.score }),
    ),
  }),

  /**
   * Ein Platz ist eine Spalte. Wer den Platz hat, fuellt seine Spalte; alle
   * anderen sehen sie live, aber nur lesend. Es gibt hier keinen abgeleiteten
   * Wert ueber mehrere Spieler hinweg – Kniffel ist der einfachste Fall.
   */
  sync: {
    seatData: (state, index) => {
      const player = state.players[index];
      return player ? sheetOf(state, player.id) : {};
    },
    applySeat: (index, data) => ({ type: "setSheetAt", index, sheet: data as Sheet }),
    applyRoster: (roster) => ({ type: "setRoster", roster }),
    applyPhase: (phase) => ({ type: "setPhase", phase }),
  },

  reducer(draft, action) {
    switch (action.type) {
      case "setSheetAt": {
        const player = draft.players[action.index];
        if (player) draft.sheets[player.id] = action.sheet;
        break;
      }

      case "setRoster": {
        // Idempotent: kommt bei jeder Raum-Aenderung erneut.
        if (rosterMatches(draft.players, action.roster)) break;
        draft.players = adoptRoster(draft.players, action.roster);
        const ids = new Set(draft.players.map((p) => p.id));
        for (const id of Object.keys(draft.sheets)) if (!ids.has(id)) delete draft.sheets[id];
        for (const player of draft.players) draft.sheets[player.id] ??= {};
        break;
      }

      case "setPhase": {
        draft.phase = action.phase;
        break;
      }

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
