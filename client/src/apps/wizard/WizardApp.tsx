import { useState } from "react";
import { GameHost } from "@/game/GameHost";
import { PhaseView } from "@/ui/PhaseView";
import { BlockSheet } from "./components/BlockSheet";
import manifest from "./manifest";
import { useWizard, wizardGame } from "./state";
import { t } from "./strings";
import { Play } from "./views/Play";
import { Result } from "./views/Result";
import { Setup } from "./views/Setup";

export default function WizardApp() {
  // Der Block ist aus dem ⋯-Menue erreichbar; das Menue gehoert dem GameHost,
  // also liegt der Schalter dafuer eine Ebene darueber.
  const [blockOpen, setBlockOpen] = useState(false);

  return (
    <GameHost
      definition={wizardGame}
      manifest={manifest}
      menu={(store) =>
        store.state.phase === "play"
          ? [
              { label: t.menuBlock, onSelect: () => setBlockOpen(true) },
              {
                label: t.menuEnforce(store.state.enforce),
                onSelect: () =>
                  store.dispatch({ type: "setEnforce", enforce: !store.state.enforce }),
              },
            ]
          : []
      }
    >
      <Phases />
      <MenuBlockSheet open={blockOpen} onClose={() => setBlockOpen(false)} />
    </GameHost>
  );
}

function Phases() {
  const { store } = useWizard();
  return (
    <PhaseView
      phase={wizardGame.phaseOf(store.state)}
      setup={<Setup />}
      play={<Play />}
      result={<Result />}
    />
  );
}

function MenuBlockSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { store } = useWizard();
  return (
    <BlockSheet
      open={open}
      onClose={onClose}
      players={store.state.players}
      rounds={store.state.rounds}
    />
  );
}
