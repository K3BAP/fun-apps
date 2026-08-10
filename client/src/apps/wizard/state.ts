import { useGame } from "@/game/context";
import { makePlayer, playerName, type Player, type PlayerId } from "@/game/players";
import type { GameDefinition, Phase } from "@/game/types";
import { maxRounds, type RoundRecord } from "./rules";

export type WizardStep = "bid" | "trick";

export type WizardState = {
  phase: Phase;
  players: Player[];
  /** Ansage-Verbot aktiv? */
  enforce: boolean;
  round: number;
  step: WizardStep;
  /** Was gerade eingetippt wird, noch nicht gewertet. */
  draftBids: Record<PlayerId, number>;
  draftTricks: Record<PlayerId, number>;
  rounds: RoundRecord[];
};

export type WizardAction =
  | { type: "addPlayer"; name: string }
  | { type: "removePlayer"; id: PlayerId }
  | { type: "reorderPlayers"; ids: PlayerId[] }
  | { type: "setEnforce"; enforce: boolean }
  | { type: "start" }
  | { type: "setBid"; player: PlayerId; value: number }
  | { type: "setTricks"; player: PlayerId; value: number }
  | { type: "gotoStep"; step: WizardStep }
  | { type: "finishRound" }
  | { type: "backToSetup" }
  | { type: "playAgain" };

function freshGame(state: WizardState): void {
  state.phase = "play";
  state.round = 1;
  state.step = "bid";
  state.draftBids = {};
  state.draftTricks = {};
  state.rounds = [];
}

export const wizardGame: GameDefinition<WizardState, WizardAction> = {
  id: "wizard",
  version: 1,
  undo: true,
  undoLabel: "Letzte Runde zurücknehmen",

  initial: () => ({
    phase: "setup",
    players: [],
    enforce: true,
    round: 1,
    step: "bid",
    draftBids: {},
    draftTricks: {},
    rounds: [],
  }),

  phaseOf: (state) => state.phase,

  toSetupAction: { type: "backToSetup" },

  /**
   * Nur das Abschliessen einer Runde ist es wert, zurueckgenommen zu werden –
   * alles andere laesst sich ohnehin direkt wieder aendern. „Rückgängig“ heisst
   * dadurch genau eine Sache: die letzte gewertete Runde wieder aufmachen.
   */
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

      case "setEnforce": {
        draft.enforce = action.enforce;
        break;
      }

      case "start": {
        freshGame(draft);
        break;
      }

      case "setBid": {
        draft.draftBids[action.player] = action.value;
        break;
      }

      case "setTricks": {
        draft.draftTricks[action.player] = action.value;
        break;
      }

      case "gotoStep": {
        // Frisch in die Stiche zu gehen heisst: bei 0 anfangen, nicht bei den
        // Werten der Vorrunde.
        if (action.step === "trick" && draft.step === "bid") draft.draftTricks = {};
        draft.step = action.step;
        break;
      }

      case "finishRound": {
        const bids: Record<PlayerId, number> = {};
        const tricks: Record<PlayerId, number> = {};
        for (const player of draft.players) {
          bids[player.id] = draft.draftBids[player.id] ?? 0;
          tricks[player.id] = draft.draftTricks[player.id] ?? 0;
        }
        draft.rounds.push({ bids, tricks });
        draft.draftBids = {};
        draft.draftTricks = {};
        draft.step = "bid";
        if (draft.round >= maxRounds(draft.players.length)) draft.phase = "result";
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

export const useWizard = () => useGame<WizardState, WizardAction>();
