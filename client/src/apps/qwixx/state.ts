import { useGame } from "@/game/context";
import {
  adoptRoster,
  makePlayer,
  playerName,
  rosterMatches,
  type Player,
  type PlayerId,
  type RosterEntry,
} from "@/game/players";
import type { GameDefinition, Phase } from "@/game/types";
import { rankBy } from "@/game/rank";
import {
  LAST,
  MAX_PENALTIES,
  sheetScore,
  variantInfo,
  blankLocks,
  blankSheet,
  canUnmark,
  cellState,
  closedRows,
  isBlocked,
  isGameOver,
  togglePenalty,
  type Locks,
  type RowKey,
  type SeatSheet,
  type VariantKey,
} from "./rules";

/** Alle Bloecke auf einem Geraet – oder jeder auf seinem eigenen. */
export type QwixxMode = "shared" | "solo";

export type QwixxState = {
  phase: Phase;
  mode: QwixxMode;
  variant: VariantKey;
  /** Punktestand waehrend des Spiels sichtbar? Standard: nein. */
  showScore: boolean;
  /** „Auswerten“ erst zulassen, wenn eine echte Endbedingung erfuellt ist. */
  requireEnd: boolean;
  players: Player[];
  activeId: PlayerId | null;
  /** Von Hand gesetzte Schloesser – fuer Mitspieler ausserhalb dieses Geraets. */
  extClosed: Locks;
  sheets: Record<PlayerId, SeatSheet>;
};

/** Was im Raum spielweit gilt – der Host gibt es vor. */
export type QwixxConfig = {
  variant: VariantKey;
  showScore: boolean;
  requireEnd: boolean;
};

export type QwixxAction =
  | { type: "setSheetAt"; index: number; sheet: SeatSheet }
  | { type: "setRoster"; roster: RosterEntry[] }
  | { type: "setPhase"; phase: Phase }
  | { type: "setConfig"; config: QwixxConfig }
  | { type: "addPlayer"; name: string }
  | { type: "removePlayer"; id: PlayerId }
  | { type: "reorderPlayers"; ids: PlayerId[] }
  | { type: "setMode"; mode: QwixxMode }
  | { type: "setVariant"; variant: VariantKey }
  | { type: "setShowScore"; on: boolean }
  | { type: "setRequireEnd"; on: boolean }
  | { type: "startShared" }
  | { type: "startSolo"; name: string }
  | { type: "selectPlayer"; id: PlayerId }
  | { type: "toggleCell"; player: PlayerId; row: RowKey; index: number }
  | { type: "setPenalty"; player: PlayerId; box: number }
  | { type: "toggleExtClosed"; row: RowKey }
  | { type: "evaluate" }
  | { type: "resume" }
  | { type: "backToSetup" }
  | { type: "playAgain" };

export function sheetOf(state: QwixxState, id: PlayerId): SeatSheet {
  return state.sheets[id] ?? blankSheet();
}

export function sheetsInOrder(state: QwixxState): SeatSheet[] {
  return state.players.map((player) => sheetOf(state, player.id));
}

export function closedFor(state: QwixxState): Locks {
  return closedRows(sheetsInOrder(state), state.extClosed);
}

export function activePlayer(state: QwixxState): Player | null {
  return state.players.find((p) => p.id === state.activeId) ?? state.players[0] ?? null;
}

/** Waehrend des Spiels verdeckt – in der Auswertung sind die Punkte immer sichtbar. */
export function scoresHidden(state: QwixxState): boolean {
  return state.phase === "play" && !state.showScore;
}

export function gameOver(state: QwixxState): boolean {
  return isGameOver(sheetsInOrder(state), state.extClosed);
}

export function canEvaluate(state: QwixxState): boolean {
  return !state.requireEnd || gameOver(state);
}

/** Warum ist das Spiel zu Ende? Fuer den Hinweis ueber dem Auswerten-Knopf. */
export function endReason(state: QwixxState): "penalties" | "rows" | null {
  if (!gameOver(state)) return null;
  const anyPenalties = sheetsInOrder(state).some((sheet) => sheet.penalties >= MAX_PENALTIES);
  return anyPenalties ? "penalties" : "rows";
}

function clearSheets(state: QwixxState): void {
  state.sheets = Object.fromEntries(state.players.map((p) => [p.id, blankSheet()]));
  state.extClosed = blankLocks();
}

export const qwixxGame: GameDefinition<QwixxState, QwixxAction> = {
  id: "qwixx",
  version: 1,

  initial: () => ({
    phase: "setup",
    mode: "shared",
    variant: "classic",
    showScore: false,
    requireEnd: true,
    players: [],
    activeId: null,
    extClosed: blankLocks(),
    sheets: {},
  }),

  phaseOf: (state) => state.phase,

  toSetupAction: { type: "backToSetup" },

  summarize: (state) => ({
    standings: rankBy(state.players, (player) => sheetScore(sheetOf(state, player.id))).map(
      (entry) => ({ name: entry.item.name, score: entry.score }),
    ),
    note: variantInfo(state.variant).badge ?? undefined,
  }),

  // Die Einstellungen und der gewaehlte Block ueberleben „Spiel zurücksetzen“ –
  // sie beschreiben den Tisch, nicht die Partie.
  keepOnReset: (state) => ({
    mode: state.mode,
    variant: state.variant,
    showScore: state.showScore,
    requireEnd: state.requireEnd,
  }),

  /**
   * Ein Platz ist ein Block. Die Reihensperren ueber mehrere Spieler hinweg
   * brauchen dabei **keine** Protokoll-Unterstuetzung: `closedRows` ist eine
   * reine Funktion aller Bloecke – ob die auf einem Geraet liegen oder von
   * mehreren kommen, ist ihr egal. Der Mehrgeraete-Modus erbt die Sperren also,
   * ohne dass eine Regel doppelt geschrieben wird.
   */
  sync: {
    seatData: (state, index) => {
      const player = state.players[index];
      return player ? sheetOf(state, player.id) : blankSheet();
    },
    applySeat: (index, data) => ({ type: "setSheetAt", index, sheet: data as SeatSheet }),
    applyRoster: (roster) => ({ type: "setRoster", roster }),
    applyPhase: (phase) => ({ type: "setPhase", phase }),
    configOf: (state): QwixxConfig => ({
      variant: state.variant,
      showScore: state.showScore,
      requireEnd: state.requireEnd,
    }),
    applyConfig: (config) => ({ type: "setConfig", config: config as QwixxConfig }),
  },

  reducer(draft, action) {
    switch (action.type) {
      case "setSheetAt": {
        const player = draft.players[action.index];
        if (player) draft.sheets[player.id] = action.sheet;
        break;
      }

      case "setRoster": {
        if (rosterMatches(draft.players, action.roster)) break;
        draft.players = adoptRoster(draft.players, action.roster);
        const ids = new Set(draft.players.map((p) => p.id));
        for (const id of Object.keys(draft.sheets)) if (!ids.has(id)) delete draft.sheets[id];
        for (const player of draft.players) draft.sheets[player.id] ??= blankSheet();
        if (!draft.activeId || !ids.has(draft.activeId)) {
          draft.activeId = draft.players[0]?.id ?? null;
        }
        break;
      }

      case "setPhase": {
        draft.phase = action.phase;
        break;
      }

      case "setConfig": {
        // Der Block darf sich nicht mitten im Spiel aendern – Kreuze haengen an
        // der Feldposition und wuerden sonst still umbeschriftet.
        if (draft.phase === "setup") draft.variant = action.config.variant;
        draft.showScore = action.config.showScore;
        draft.requireEnd = action.config.requireEnd;
        break;
      }

      case "addPlayer": {
        const player = makePlayer(playerName(action.name, draft.players.length), draft.players);
        draft.players.push(player);
        draft.sheets[player.id] = blankSheet();
        break;
      }

      case "removePlayer": {
        draft.players = draft.players.filter((p) => p.id !== action.id);
        delete draft.sheets[action.id];
        if (draft.activeId === action.id) draft.activeId = draft.players[0]?.id ?? null;
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

      case "setMode": {
        draft.mode = action.mode;
        break;
      }

      // Nur im Setup erreichbar: Kreuze haengen an der Feldposition, ein Wechsel
      // mitten im Spiel wuerde sie stillschweigend umbeschriften.
      case "setVariant": {
        draft.variant = action.variant;
        break;
      }

      case "setShowScore": {
        draft.showScore = action.on;
        break;
      }

      case "setRequireEnd": {
        draft.requireEnd = action.on;
        break;
      }

      case "startShared": {
        clearSheets(draft);
        draft.phase = "play";
        draft.activeId = draft.players[0]?.id ?? null;
        break;
      }

      case "startSolo": {
        const player = makePlayer(action.name.trim() || "Ich", []);
        draft.players = [player];
        clearSheets(draft);
        draft.phase = "play";
        draft.activeId = player.id;
        break;
      }

      case "selectPlayer": {
        draft.activeId = action.id;
        break;
      }

      case "toggleCell": {
        const sheet = draft.sheets[action.player];
        if (!sheet) break;
        const row = sheet.marks[action.row];

        if (row[action.index]) {
          if (!canUnmark(sheet, action.row, action.index)) break;
          row[action.index] = false;
          if (action.index === LAST) sheet.locked[action.row] = false;
          break;
        }

        const closed = closedRows(
          draft.players.map((p) => draft.sheets[p.id] ?? blankSheet()),
          draft.extClosed,
        );
        if (isBlocked(sheet, action.row, closed)) break;
        if (cellState(sheet, action.row, action.index, false) !== "available") break;

        row[action.index] = true;
        if (action.index === LAST) sheet.locked[action.row] = true;
        break;
      }

      case "setPenalty": {
        const sheet = draft.sheets[action.player];
        if (sheet) sheet.penalties = togglePenalty(sheet.penalties, action.box);
        break;
      }

      case "toggleExtClosed": {
        draft.extClosed[action.row] = !draft.extClosed[action.row];
        break;
      }

      case "evaluate": {
        draft.phase = "result";
        break;
      }

      // Versehentlich ausgewertet: zurueck in den Block, nichts wird zurueckgesetzt.
      case "resume": {
        draft.phase = "play";
        draft.activeId = draft.activeId ?? draft.players[0]?.id ?? null;
        break;
      }

      case "backToSetup": {
        draft.phase = "setup";
        break;
      }

      case "playAgain": {
        clearSheets(draft);
        draft.phase = "play";
        draft.activeId = draft.players[0]?.id ?? null;
        break;
      }
    }
  },
};

export const useQwixx = () => useGame<QwixxState, QwixxAction>();
