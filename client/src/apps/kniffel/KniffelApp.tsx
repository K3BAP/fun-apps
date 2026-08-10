import { useState } from "react";
import { GameHost } from "@/game/GameHost";
import { DiceRoller } from "@/ui/DiceRoller";
import { PhaseView } from "@/ui/PhaseView";
import manifest from "./manifest";
import { kniffelGame, useKniffel } from "./state";
import { t } from "./strings";
import { Play } from "./views/Play";
import { Result } from "./views/Result";
import { Setup } from "./views/Setup";

/** Fuenf weisse Wuerfel – falls gerade keine auf dem Tisch liegen. */
const DICE = Array.from({ length: 5 }, (_, i) => ({ label: `Würfel ${i + 1}` }));

export default function KniffelApp() {
  const [diceOpen, setDiceOpen] = useState(false);

  return (
    <GameHost
      definition={kniffelGame}
      manifest={manifest}
      menu={(store) =>
        store.state.phase === "play"
          ? [{ id: "dice", icon: "🎲", label: t.dice, onSelect: () => setDiceOpen(true) }]
          : []
      }
    >
      <Phases />
      <DiceRoller open={diceOpen} onClose={() => setDiceOpen(false)} dice={DICE} />
    </GameHost>
  );
}

/** Liegt innerhalb von <GameHost> und kann darum den Store lesen. */
function Phases() {
  const { store } = useKniffel();
  return (
    <PhaseView
      phase={kniffelGame.phaseOf(store.state)}
      setup={<Setup />}
      play={<Play />}
      result={<Result />}
    />
  );
}
