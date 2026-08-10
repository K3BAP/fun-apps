import { RoomPanel } from "@/sync/RoomPanel";
import { StartGameButton } from "@/sync/StartGameButton";
import { useRoomRole } from "@/sync/useRoomRole";
import { SetupCard } from "@/ui/SetupCard";
import { Container } from "@/ui/Container";
import { AppHero } from "@/ui/AppHero";
import { PlayerSetup } from "@/ui/PlayerSetup";
import manifest from "../manifest";
import { useKniffel } from "../state";
import { t } from "../strings";

export function Setup() {
  const { store } = useKniffel();
  const { players } = store.state;
  const { min, max } = manifest.players;
  const { inRoom } = useRoomRole();

  return (
    <Container size="form" className="flex flex-col gap-5 px-4 pb-8 safe-bottom">
      <AppHero subtitle={t.tagline} back />

      <SetupCard>
        {/* Im Raum ist die Spielerliste die Liste der Beigetretenen – sie wird
            nicht angelegt, sie fuellt sich. */}
        {inRoom ? (
          <RoomPanel />
        ) : (
          <PlayerSetup
            players={players}
            min={min}
            max={max}
            onAdd={(name) => store.dispatch({ type: "addPlayer", name })}
            onRemove={(id) => store.dispatch({ type: "removePlayer", id })}
            onReorder={(ids) => store.dispatch({ type: "reorderPlayers", ids })}
          />
        )}
      </SetupCard>

      <StartGameButton
        label={t.start}
        count={players.length}
        min={min}
        onStart={() => store.dispatch({ type: "start" })}
      />
    </Container>
  );
}
