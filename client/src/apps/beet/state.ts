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
  ROUNDS,
  TIER_POINTS,
  beetTotal,
  bonusTiers,
  gameTotal,
  lastRoundTotal,
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

/**
 * Ein gewerteter Durchgang, wie er ueber die Leitung geht: nach **Platznummer**
 * statt nach Spieler-Kennung.
 *
 * Spieler-Kennungen sind auf jedem Geraet andere – sie taugen nicht fuer den
 * Austausch. Uebersetzt wird genau hier an der Grenze, damit der restliche Code
 * (und die Tests) weiter mit Kennungen arbeiten koennen.
 */
type WireRound = { beet: number[]; bonus: number[]; tier: number[] };

/**
 * Alles, was zum Tisch gehoert und nicht zu einem einzelnen Platz: wo der
 * Durchgang steht und was schon gewertet wurde. Im Raum gibt der Host es vor –
 * so bekommt auch ein spaet dazugestossenes Geraet die bisherigen Durchgaenge.
 */
export type BeetConfig = { round: number; step: BeetStep; rounds: WireRound[] };

function toWire(rounds: readonly RoundRecord[], players: readonly Player[]): WireRound[] {
  const column = (record: Record<PlayerId, number>) => players.map((p) => record[p.id] ?? 0);
  return rounds.map((round) => ({
    beet: column(round.beet),
    bonus: column(round.bonus),
    tier: column(round.tier),
  }));
}

function fromWire(rounds: readonly WireRound[], players: readonly Player[]): RoundRecord[] {
  const record = (values: readonly number[]) =>
    Object.fromEntries(players.map((p, i) => [p.id, values[i] ?? 0]));
  return rounds.map((round) => ({
    beet: record(round.beet),
    bonus: record(round.bonus),
    tier: record(round.tier),
  }));
}

/** Der Anteil eines Gaertners am Zustand. */
export type BeetSeatData = { beds: Bed[]; tier: number };

export type BeetAction =
  | { type: "setSeatAt"; index: number; data: BeetSeatData }
  | { type: "setRoster"; roster: RosterEntry[] }
  | { type: "setPhase"; phase: Phase }
  | { type: "setConfig"; config: BeetConfig }
  | { type: "barrierOpen"; token: string }
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

/**
 * Einen Durchgang abschliessen: Beet-, Bonus- und Tierpunkte festschreiben.
 *
 * Rechnet ausschliesslich aus dem State – im Raum stehen dort die
 * zusammengefuehrten Eintraege aller Geraete, sodass jedes Geraet zum selben
 * Ergebnis kommt.
 */
function closeRound(state: BeetState): void {
  const beet = beetTotals(state);
  const bonus = bonusTiers(beet);
  const limit = maxTier(state.round);
  const tier: Record<PlayerId, number> = {};
  for (const player of state.players) {
    // Auch hier deckeln, nicht nur in der Anzeige: ein Wert aus einem spaeteren
    // Durchgang darf nicht in einen frueheren durchsickern.
    tier[player.id] = Math.min(state.draftTier[player.id] ?? 0, limit) * TIER_POINTS;
  }

  state.rounds.push({ beet, bonus, tier });
  state.draftBeds = {};
  state.draftTier = {};
  state.step = "beet";
  state.beetIdx = 0;
  if (state.round >= ROUNDS) state.phase = "result";
  else state.round += 1;
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

  summarize: (state) => ({
    standings: rankBy(
      state.players,
      (player) => gameTotal(state.rounds, player.id),
      (player) => lastRoundTotal(state.rounds, player.id),
    ).map((entry) => ({ name: entry.item.name, score: entry.score })),
  }),

  transient: (action) => action.type !== "finishRound",

  /**
   * Ein Platz ist ein Gaertner. Hier zeigt sich die Bereit-Schranke: alle tragen
   * ihre Beete gleichzeitig ein, und erst wenn jeder fertig ist, geht es
   * gemeinsam weiter – der Bonus haengt schliesslich von allen ab.
   */
  sync: {
    seatsOf: (state) => state.players.map((p) => ({ name: p.name, color: p.color })),
    seatData: (state, index): BeetSeatData => {
      const player = state.players[index];
      return player
        ? { beds: bedsOf(state, player.id), tier: state.draftTier[player.id] ?? 0 }
        : { beds: newBeds(), tier: 0 };
    },
    applySeat: (index, data) => ({ type: "setSeatAt", index, data: data as BeetSeatData }),
    applyRoster: (roster) => ({ type: "setRoster", roster }),
    applyPhase: (phase) => ({ type: "setPhase", phase }),
    configOf: (state): BeetConfig => ({
      round: state.round,
      step: state.step,
      rounds: toWire(state.rounds, state.players),
    }),
    applyConfig: (config) => ({ type: "setConfig", config: config as BeetConfig }),
    barrierToken: (state) => `r${state.round}:${state.step}`,
    applyBarrierOpen: (token) => ({ type: "barrierOpen", token }),
  },

  reducer(draft, action) {
    switch (action.type) {
      case "setSeatAt": {
        const player = draft.players[action.index];
        if (!player) break;
        draft.draftBeds[player.id] = action.data.beds;
        draft.draftTier[player.id] = action.data.tier;
        break;
      }

      case "setRoster": {
        if (rosterMatches(draft.players, action.roster)) break;
        draft.players = adoptRoster(draft.players, action.roster);
        const ids = new Set(draft.players.map((p) => p.id));
        for (const id of Object.keys(draft.draftBeds)) if (!ids.has(id)) delete draft.draftBeds[id];
        for (const id of Object.keys(draft.draftTier)) if (!ids.has(id)) delete draft.draftTier[id];
        break;
      }

      case "setPhase": {
        draft.phase = action.phase;
        break;
      }

      case "setConfig": {
        draft.round = action.config.round;
        draft.step = action.config.step;
        draft.rounds = fromWire(action.config.rounds, draft.players);
        break;
      }

      // Alle sind fertig. Nur der Host bekommt das (siehe useGameSync) und
      // schaltet weiter; die anderen folgen ueber `config`.
      case "barrierOpen": {
        if (action.token !== `r${draft.round}:${draft.step}`) break; // schon weiter
        if (draft.step === "beet") draft.step = "bonus";
        else if (draft.step === "bonus") draft.step = "tier";
        else closeRound(draft);
        break;
      }

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
        closeRound(draft);
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
