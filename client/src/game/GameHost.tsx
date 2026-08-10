import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { AppManifest } from "@/apps/types";
import { usePersistentState } from "@/hooks/usePersistentState";
import { useWakeLock } from "@/hooks/useWakeLock";
import { nsKey } from "@/storage/keys";
import { RoomProvider } from "@/sync/RoomProvider";
import { useRoom } from "@/sync/context";
import { RoomSheet } from "@/sync/RoomSheet";
import { useGameSync } from "@/sync/useGameSync";
import { ThemeScope } from "@/theme/ThemeProvider";
import { MenuSheet } from "@/ui/MenuSheet";
import { GameContext } from "./context";
import type { GameDefinition, MenuItem } from "./types";
import { useGameStore, type GameStore } from "./useGameStore";

/**
 * „Bildschirm anlassen“ gilt geraeteweit, nicht pro Spiel. Frueher lag die
 * Einstellung in jedem Spielstand einzeln – ein Nutzer, der sie einmal
 * abschaltet, meint aber sein Geraet, nicht Kniffel.
 */
export const KEEP_AWAKE_KEY = nsKey("keepAwake");

type Props<S, A> = {
  definition: GameDefinition<S, A>;
  manifest: AppManifest;
  /**
   * Zusaetzliche Menuepunkte, erscheinen vor den Standard-Eintraegen. Als
   * Funktion, weil sie meist vom Spielstand abhaengen – den haelt erst der Host.
   */
  menu?: (store: GameStore<S, A>) => MenuItem[];
  children: ReactNode;
};

/**
 * Der Rahmen um ein Spiel: Zustand, Theme, Wachhalten des Bildschirms, das
 * ⋯-Menue und – falls das Spiel es anbietet – der Mehrgeraete-Modus.
 */
export function GameHost<S, A>(props: Props<S, A>) {
  return (
    <RoomProvider>
      <GameHostInner {...props} />
    </RoomProvider>
  );
}

function GameHostInner<S, A>({ definition, manifest, menu, children }: Props<S, A>) {
  const store = useGameStore(definition);
  const phase = definition.phaseOf(store.state);

  const [keepAwake, setKeepAwake] = usePersistentState(KEEP_AWAKE_KEY, true);
  const { supported: wakeSupported } = useWakeLock(phase === "play" && keepAwake);

  const [menuOpen, setMenuOpen] = useState(false);
  const [roomOpen, setRoomOpen] = useState(false);

  const { client, snapshot } = useRoom();
  useGameSync(definition, store);

  // Beim Öffnen der App: einem Raum aus dem QR-Link folgen (?raum=ABCD) oder
  // die zuletzt benutzte Sitzung wieder aufnehmen.
  useEffect(() => {
    if (!definition.sync) return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("raum");
    if (code) {
      client.join(code);
      // Den Code aus der Adresse nehmen, damit ein Reload nicht erneut beitritt.
      params.delete("raum");
      const query = params.toString();
      window.history.replaceState(null, "", window.location.pathname + (query ? `?${query}` : ""));
      return;
    }
    client.resume(definition.id);
  }, [client, definition.sync, definition.id]);

  // Beim Phasenwechsel nach oben – sonst startet man das Ergebnis mitten drin.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [phase]);

  const contextValue = useMemo(
    () => ({ store, manifest, openMenu: () => setMenuOpen(true) }),
    [store, manifest],
  );

  const standardItems: MenuItem[] = [];

  if (definition.sync) {
    standardItems.push({
      label: snapshot.room
        ? `👥 Raum ${snapshot.room.code}${snapshot.status === "offline" ? " · offline" : ""}`
        : "👥 Auf mehreren Geräten",
      onSelect: () => setRoomOpen(true),
    });
  }

  if (definition.undo) {
    // Im Raum abgeschaltet: „zurueck“ waere dort eine Aussage ueber fremde
    // Plaetze, und die gehoeren einem nicht.
    const inRoom = snapshot.room !== null;
    standardItems.push({
      label: `↩︎ ${definition.undoLabel ?? "Rückgängig"}${inRoom ? " · nicht im Raum" : ""}`,
      disabled: inRoom || !store.canUndo,
      onSelect: store.undo,
    });
    if (!inRoom && store.canRedo) {
      standardItems.push({ label: "↪︎ Wiederholen", onSelect: store.redo });
    }
  }

  standardItems.push({
    label: `${wakeSupported && keepAwake ? "✓" : "○"} Bildschirm anlassen${
      wakeSupported ? "" : " · nicht unterstützt"
    }`,
    disabled: !wakeSupported,
    onSelect: () => setKeepAwake((on) => !on),
  });

  if (phase !== "setup") {
    standardItems.push({
      label: "Zurück zur Spielerauswahl",
      onSelect: () => store.dispatch(definition.toSetupAction),
    });
  }

  standardItems.push({
    label: "Spiel zurücksetzen",
    danger: true,
    onSelect: store.reset,
  });

  return (
    <GameContext value={contextValue}>
      <ThemeScope pair={manifest.themes}>
        {children}
        <MenuSheet
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          items={[...(menu?.(store) ?? []), ...standardItems]}
        />
        {definition.sync && (
          <RoomSheet
            open={roomOpen}
            onClose={() => setRoomOpen(false)}
            gameId={definition.id}
            gameVersion={definition.version}
            phase={phase}
            spec={definition.sync}
            state={store.state}
          />
        )}
      </ThemeScope>
    </GameContext>
  );
}
