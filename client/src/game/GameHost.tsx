import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { AppManifest } from "@/apps/types";
import { usePersistentState } from "@/hooks/usePersistentState";
import { useWakeLock } from "@/hooks/useWakeLock";
import { nsKey } from "@/storage/keys";
import { ThemeScope } from "@/theme/ThemeProvider";
import { MenuSheet } from "@/ui/MenuSheet";
import { GameContext } from "./context";
import type { GameDefinition, MenuItem } from "./types";
import { useGameStore } from "./useGameStore";

/**
 * „Bildschirm anlassen“ gilt geraeteweit, nicht pro Spiel. Frueher lag die
 * Einstellung in jedem Spielstand einzeln – ein Nutzer, der sie einmal
 * abschaltet, meint aber sein Geraet, nicht Kniffel.
 */
export const KEEP_AWAKE_KEY = nsKey("keepAwake");

/**
 * Der Rahmen um ein Spiel: Zustand, Theme, Wachhalten des Bildschirms und das
 * ⋯-Menue. Alles, was in allen vier Spielen gleich ist, steht hier – die Spiele
 * selbst bestehen dadurch fast nur noch aus Regeln und Ansicht.
 */
export function GameHost<S, A>({
  definition,
  manifest,
  menu,
  children,
}: {
  definition: GameDefinition<S, A>;
  manifest: AppManifest;
  /** Zusaetzliche Menuepunkte, erscheinen vor den Standard-Eintraegen. */
  menu?: MenuItem[];
  children: ReactNode;
}) {
  const store = useGameStore(definition);
  const phase = definition.phaseOf(store.state);

  const [keepAwake, setKeepAwake] = usePersistentState(KEEP_AWAKE_KEY, true);
  const { supported: wakeSupported } = useWakeLock(phase === "play" && keepAwake);

  const [menuOpen, setMenuOpen] = useState(false);

  // Beim Phasenwechsel nach oben – sonst startet man das Ergebnis mitten drin.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [phase]);

  const contextValue = useMemo(
    () => ({ store, manifest, openMenu: () => setMenuOpen(true) }),
    [store, manifest],
  );

  const standardItems: MenuItem[] = [];

  if (definition.undo) {
    standardItems.push({
      label: "↩︎ Rückgängig",
      disabled: !store.canUndo,
      onSelect: store.undo,
    });
    if (store.canRedo) {
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
          items={[...(menu ?? []), ...standardItems]}
        />
      </ThemeScope>
    </GameContext>
  );
}
