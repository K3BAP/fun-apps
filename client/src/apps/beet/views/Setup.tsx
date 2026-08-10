import { SetupCard } from "@/ui/SetupCard";
import { Container } from "@/ui/Container";
import { AppHero } from "@/ui/AppHero";
import { PlayerSetup } from "@/ui/PlayerSetup";
import manifest from "../manifest";
import { useBeet } from "../state";
import { t } from "../strings";

export function Setup() {
  const { store } = useBeet();
  const { players } = store.state;
  const { min, max } = manifest.players;

  return (
    <Container size="form" className="flex flex-col gap-5 px-4 pb-8 safe-bottom">
      <AppHero subtitle={t.tagline} back />

      <SetupCard>
        <PlayerSetup
          players={players}
          min={min}
          max={max}
          onAdd={(name) => store.dispatch({ type: "addPlayer", name })}
          onRemove={(id) => store.dispatch({ type: "removePlayer", id })}
          onReorder={(ids) => store.dispatch({ type: "reorderPlayers", ids })}
        />
      </SetupCard>

      <button
        type="button"
        className="btn btn-primary btn-lg"
        disabled={players.length < min}
        onClick={() => store.dispatch({ type: "start" })}
      >
        {t.start}
      </button>
    </Container>
  );
}
