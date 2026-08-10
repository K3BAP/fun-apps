import { useState } from "react";
import { GameHost } from "@/game/GameHost";
import { PhaseView } from "@/ui/PhaseView";
import { DiceRoller, type DieSpec } from "@/ui/DiceRoller";
import { ROW_HEX } from "./colors";
import { OverviewSheet } from "./components/OverviewSheet";
import manifest from "./manifest";
import { ROW_KEYS, ROW_LABEL, sheetScore, type RowKey } from "./rules";
import { canEvaluate, closedFor, qwixxGame, scoresHidden, sheetsInOrder, useQwixx } from "./state";
import { t } from "./strings";
import { Play } from "./views/Play";
import { Result } from "./views/Result";
import { Setup } from "./views/Setup";

/**
 * Die sechs Qwixx-Wuerfel: zwei weisse und je einer in den vier Reihenfarben.
 *
 * Die Zuordnung zur Reihe steht mit dabei, weil ein Farbwuerfel mit seiner Reihe
 * aus dem Spiel geht – siehe `Dice`.
 */
const DICE: readonly (DieSpec & { row?: RowKey })[] = [
  { label: "Weiß 1" },
  { label: "Weiß 2" },
  { label: "Rot", row: "red", color: ROW_HEX.red },
  { label: "Gelb", row: "yellow", color: ROW_HEX.yellow },
  { label: "Grün", row: "green", color: ROW_HEX.green },
  { label: "Blau", row: "blue", color: ROW_HEX.blue },
];

export default function QwixxApp() {
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [diceOpen, setDiceOpen] = useState(false);

  return (
    <GameHost
      definition={qwixxGame}
      manifest={manifest}
      menu={(store) => {
        if (store.state.phase !== "play") return [];
        const evaluable = canEvaluate(store.state);
        return [
          {
            id: "overview",
            icon: "📋",
            label: store.state.mode === "solo" ? t.menuOverviewSolo : t.menuOverviewShared,
            onSelect: () => setOverviewOpen(true),
          },
          { id: "dice", icon: "🎲", label: t.menuDice, onSelect: () => setDiceOpen(true) },
          {
            id: "evaluate",
            icon: evaluable ? "🏁" : "🔒",
            label: t.menuEvaluate,
            note: evaluable ? undefined : t.menuEvaluateLockedNote,
            disabled: !evaluable,
            onSelect: () => store.dispatch({ type: "evaluate" }),
          },
        ];
      }}
    >
      <Phases onShowOverview={() => setOverviewOpen(true)} />
      <Overview open={overviewOpen} onClose={() => setOverviewOpen(false)} />
      <Dice open={diceOpen} onClose={() => setDiceOpen(false)} />
    </GameHost>
  );
}

/**
 * Ist eine Reihe zu, kommt ihr Farbwuerfel weg – am Tisch nimmt man ihn aus der
 * Mitte, und niemand wuerfelt eine Farbe, die es nicht mehr gibt.
 *
 * Der `key` haengt an den verbliebenen Wuerfeln: faellt einer weg, faengt der
 * Wurf von vorn an, statt dass die uebrigen die Augen ihres Vorgaengers erben.
 */
function Dice({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { store } = useQwixx();
  const closed = closedFor(store.state);
  const dice = DICE.filter((die) => die.row === undefined || !closed[die.row]);
  const gone = ROW_KEYS.filter((key) => closed[key]).map((key) => ROW_LABEL[key]);

  return (
    <DiceRoller
      key={dice.map((die) => die.label).join()}
      open={open}
      onClose={onClose}
      dice={dice}
      note={gone.length > 0 ? t.diceGone(gone) : undefined}
    />
  );
}

function Phases({ onShowOverview }: { onShowOverview: () => void }) {
  const { store } = useQwixx();
  return (
    <PhaseView
      phase={qwixxGame.phaseOf(store.state)}
      setup={<Setup />}
      play={<Play />}
      result={<Result onShowOverview={onShowOverview} />}
    />
  );
}

function Overview({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { store } = useQwixx();
  const { state } = store;
  const sheets = sheetsInOrder(state);

  return (
    <OverviewSheet
      open={open}
      onClose={onClose}
      players={state.players}
      sheets={sheets}
      closed={closedFor(state)}
      hideScores={scoresHidden(state)}
      totals={sheets.map(sheetScore)}
    />
  );
}
