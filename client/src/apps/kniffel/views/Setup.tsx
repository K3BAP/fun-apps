import { Container } from "@/ui/Container";
import { GameHero } from "@/ui/GameHero";
import { PlayerSetup } from "@/ui/PlayerSetup";
import manifest from "../manifest";
import { useKniffel } from "../state";
import { t } from "../strings";

export function Setup() {
  const { store } = useKniffel();
  const { players } = store.state;
  const { min, max } = manifest.players;

  return (
    <Container size="form" className="flex flex-col gap-5 px-4 pb-8 safe-bottom">
      <GameHero tagline={t.tagline} />

      <section className="card card-border bg-base-200 border-base-300">
        <div className="card-body p-4">
          <PlayerSetup
            players={players}
            min={min}
            max={max}
            onAdd={(name) => store.dispatch({ type: "addPlayer", name })}
            onRemove={(id) => store.dispatch({ type: "removePlayer", id })}
            onReorder={(ids) => store.dispatch({ type: "reorderPlayers", ids })}
          />
        </div>
      </section>

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
