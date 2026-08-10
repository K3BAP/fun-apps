import { useState } from "react";
import { GameHost } from "@/game/GameHost";
import { PhaseView } from "@/ui/PhaseView";
import { DiceRoller, type DieSpec } from "@/ui/DiceRoller";
import { ROW_HEX } from "./colors";
import { OverviewSheet } from "./components/OverviewSheet";
import manifest from "./manifest";
import { sheetScore } from "./rules";
import { canEvaluate, closedFor, qwixxGame, scoresHidden, sheetsInOrder, useQwixx } from "./state";
import { t } from "./strings";
import { Play } from "./views/Play";
import { Result } from "./views/Result";
import { Setup } from "./views/Setup";

/** Die sechs Qwixx-Wuerfel: zwei weisse und je einer in den vier Reihenfarben. */
const DICE: DieSpec[] = [
  { label: "Weiß 1" },
  { label: "Weiß 2" },
  { label: "Rot", color: ROW_HEX.red },
  { label: "Gelb", color: ROW_HEX.yellow },
  { label: "Grün", color: ROW_HEX.green },
  { label: "Blau", color: ROW_HEX.blue },
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
            label: store.state.mode === "solo" ? t.menuOverviewSolo : t.menuOverviewShared,
            onSelect: () => setOverviewOpen(true),
          },
          { label: t.menuDice, onSelect: () => setDiceOpen(true) },
          {
            label: evaluable ? t.menuEvaluate : t.menuEvaluateLocked,
            disabled: !evaluable,
            onSelect: () => store.dispatch({ type: "evaluate" }),
          },
        ];
      }}
    >
      <Phases onShowOverview={() => setOverviewOpen(true)} />
      <Overview open={overviewOpen} onClose={() => setOverviewOpen(false)} />
      <DiceRoller open={diceOpen} onClose={() => setDiceOpen(false)} dice={DICE} />
    </GameHost>
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
