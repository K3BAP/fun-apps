import { useState } from "react";
import { GameHost } from "@/game/GameHost";
import { PhaseView } from "@/ui/PhaseView";
import { BlockSheet } from "./components/BlockSheet";
import manifest from "./manifest";
import { beetGame, useBeet } from "./state";
import { t } from "./strings";
import { Play } from "./views/Play";
import { Result } from "./views/Result";
import { Setup } from "./views/Setup";

export default function BeetApp() {
  const [blockOpen, setBlockOpen] = useState(false);

  return (
    <GameHost
      definition={beetGame}
      manifest={manifest}
      menu={(store) =>
        store.state.phase === "play"
          ? [{ label: t.menuBlock, onSelect: () => setBlockOpen(true) }]
          : []
      }
    >
      <Phases />
      <MenuBlockSheet open={blockOpen} onClose={() => setBlockOpen(false)} />
    </GameHost>
  );
}

function Phases() {
  const { store } = useBeet();
  return (
    <PhaseView
      phase={beetGame.phaseOf(store.state)}
      setup={<Setup />}
      play={<Play />}
      result={<Result />}
    />
  );
}

function MenuBlockSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { store } = useBeet();
  return (
    <BlockSheet
      open={open}
      onClose={onClose}
      players={store.state.players}
      rounds={store.state.rounds}
    />
  );
}
