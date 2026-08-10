import { useEffect, useMemo, useState, type ReactNode } from "react";
import { normalizeCode } from "@fun/shared";
import type { AppManifest } from "@/apps/types";
import { useHaptics } from "@/hooks/useHaptics";
import { usePersistentState } from "@/hooks/usePersistentState";
import { useWakeLock } from "@/hooks/useWakeLock";
import { appendGame } from "@/storage/history";
import { nsKey, readJson, writeJson } from "@/storage/keys";
import { useRoom } from "@/sync/context";
import { OnlineGate } from "@/sync/OnlineGate";
import type { RoomClient } from "@/sync/roomClient";
import { RoomScope } from "@/sync/RoomScope";
import { RoomSheet } from "@/sync/RoomSheet";
import { useGameSync } from "@/sync/useGameSync";
import { ThemeScope } from "@/theme/ThemeProvider";
import { MenuSheet } from "@/ui/MenuSheet";
import { UndoIcon } from "@/ui/icons";
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
 * Soll der Online-Einstieg aufgehen, und mit welchem Code?
 *
 * `null` = nein, `""` = ja, ohne Einladung, sonst der eingeladene Raumcode.
 * „Online spielen“ bei laufender Sitzung heisst dabei: zurueck in den Raum, in
 * dem man schon sitzt – und nicht einen zweiten aufmachen.
 */
function initialGate(gameId: string, client: RoomClient): string | null {
  const params = new URLSearchParams(window.location.search);
  const invite = params.get("raum");
  if (invite !== null) return normalizeCode(invite);
  if (params.get("online") !== null && !client.hasSession(gameId)) return "";
  return null;
}

/**
 * Der Rahmen um ein Spiel: Zustand, Theme, Wachhalten des Bildschirms, das
 * ⋯-Menue und – falls das Spiel es anbietet – der Mehrgeraete-Modus.
 */
export function GameHost<S, A>(props: Props<S, A>) {
  return (
    <RoomScope gameId={props.definition.id}>
      <GameHostInner {...props} />
    </RoomScope>
  );
}

function GameHostInner<S, A>({ definition, manifest, menu, children }: Props<S, A>) {
  const store = useGameStore(definition);
  const phase = definition.phaseOf(store.state);

  const [keepAwake, setKeepAwake] = usePersistentState(KEEP_AWAKE_KEY, true);
  const { supported: wakeSupported } = useWakeLock(phase === "play" && keepAwake);
  const haptics = useHaptics();

  const [menuOpen, setMenuOpen] = useState(false);
  const [roomOpen, setRoomOpen] = useState(false);

  const { client, snapshot } = useRoom();
  useGameSync(definition, store);

  // Was die Adresse beim Öffnen wollte, steht schon beim ersten Rendern fest –
  // dafuer braucht es keinen Effekt, der den Bildschirm nachtraeglich umwirft.
  const [gate, setGate] = useState<string | null>(() =>
    definition.sync ? initialGate(definition.id, client) : null,
  );

  // Die Marker aus der Adresse nehmen, damit ein Reload nicht von vorn anfaengt,
  // und – wenn keine Einladung vorliegt – die letzte Sitzung wieder aufnehmen.
  useEffect(() => {
    if (!definition.sync) return;
    const params = new URLSearchParams(window.location.search);
    const invite = params.get("raum");

    if (invite !== null || params.get("online") !== null) {
      params.delete("raum");
      params.delete("online");
      const query = params.toString();
      window.history.replaceState(null, "", window.location.pathname + (query ? `?${query}` : ""));
    }

    if (invite === null) client.resume(definition.id);
  }, [client, definition.sync, definition.id]);

  // Beim Phasenwechsel nach oben – sonst startet man das Ergebnis mitten drin.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [phase]);

  // Beendete Spiele wandern in den Verlauf. Die Unterschrift verhindert
  // Doppeleintraege, wenn man das Ergebnis mehrfach betritt („Weiterspielen“)
  // oder die Seite dort neu laedt.
  useEffect(() => {
    if (phase !== "result" || !definition.summarize) return;
    const summary = definition.summarize(store.state);
    if (summary.standings.length === 0) return;

    const key = nsKey(definition.id, "lastArchived");
    const signature = JSON.stringify(summary);
    if (readJson<string | null>(key, null) === signature) return;
    writeJson(key, signature);
    void appendGame({ gameId: definition.id, ...summary });
  }, [phase, definition, store.state]);

  const contextValue = useMemo(
    () => ({ store, manifest, openMenu: () => setMenuOpen(true) }),
    [store, manifest],
  );

  const standardItems: MenuItem[] = [];

  // Nur im Raum – eroeffnet wird nicht mehr aus dem Menue heraus, sondern vorne
  // im Online-Einstieg.
  if (definition.sync && snapshot.room) {
    standardItems.push({
      id: "room",
      icon: "👥",
      label: `Raum ${snapshot.room.code}`,
      note: snapshot.status === "offline" ? "offline" : undefined,
      onSelect: () => setRoomOpen(true),
    });
  }

  if (definition.undo) {
    // Im Raum abgeschaltet: „zurueck“ waere dort eine Aussage ueber fremde
    // Plaetze, und die gehoeren einem nicht.
    const inRoom = snapshot.room !== null;
    standardItems.push({
      id: "undo",
      icon: <UndoIcon />,
      label: definition.undoLabel ?? "Rückgängig",
      note: inRoom ? "nicht im Raum" : undefined,
      disabled: inRoom || !store.canUndo,
      onSelect: store.undo,
    });
    if (!inRoom && store.canRedo) {
      standardItems.push({
        id: "redo",
        icon: <UndoIcon className="size-5 scale-x-[-1]" />,
        label: "Wiederholen",
        onSelect: store.redo,
      });
    }
  }

  standardItems.push({
    id: "wakelock",
    label: "Bildschirm anlassen",
    checked: wakeSupported && keepAwake,
    note: wakeSupported ? undefined : "nicht unterstützt",
    disabled: !wakeSupported,
    onSelect: () => setKeepAwake((on) => !on),
  });

  standardItems.push({
    id: "haptics",
    label: "Vibrieren beim Tippen",
    checked: haptics.enabled,
    onSelect: () => haptics.setEnabled(!haptics.enabled),
  });

  if (phase !== "setup") {
    standardItems.push({
      id: "toSetup",
      label: "Zurück zur Spielerauswahl",
      onSelect: () => store.dispatch(definition.toSetupAction),
    });
  }

  standardItems.push({
    id: "reset",
    label: "Spiel zurücksetzen",
    danger: true,
    onSelect: store.reset,
  });

  return (
    <GameContext value={contextValue}>
      <ThemeScope accent={manifest.accent}>
        {/* Solange kein Raum steht, gehoert der Bildschirm dem Einstieg. Faellt
            der Raum spaeter weg (Lobby verlassen), ist man wieder hier. */}
        {gate !== null && !snapshot.room && definition.sync ? (
          <OnlineGate
            manifest={manifest}
            gameVersion={definition.version}
            invite={gate === "" ? null : gate}
            // Ein Raum faengt bei null an: der Block auf diesem Geraet gehoert
            // zur alten Partie, die Mitspieler kommen gleich aus dem Raum.
            onEnter={store.reset}
            onCancel={() => setGate(null)}
          />
        ) : (
          children
        )}
        <MenuSheet
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          items={[...(menu?.(store) ?? []), ...standardItems]}
        />
        <RoomSheet
          open={roomOpen}
          onClose={() => {
            setRoomOpen(false);
            // Wer den Raum von hier aus verlaesst, will zurueck ins lokale
            // Spiel – nicht in die Raumauswahl.
            setGate(null);
          }}
        />
      </ThemeScope>
    </GameContext>
  );
}
