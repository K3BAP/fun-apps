import { GameHost } from "@/game/GameHost";
import { PhaseView } from "@/ui/PhaseView";
import manifest from "./manifest";
import { kniffelGame, useKniffel } from "./state";
import { Play } from "./views/Play";
import { Result } from "./views/Result";
import { Setup } from "./views/Setup";

export default function KniffelApp() {
  return (
    <GameHost definition={kniffelGame} manifest={manifest}>
      <Phases />
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
