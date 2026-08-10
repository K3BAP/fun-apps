import type { RoomPhase } from "@fun/shared";
import type { AppId } from "@/apps/types";

export type Phase = "setup" | "play" | "result";

/**
 * Wie ein Spiel am Mehrgeraete-Modus teilnimmt.
 *
 * Plaetze werden ueber ihre **Position** angesprochen (0 = erster Spieler), nicht
 * ueber eine Kennung – so bleibt der Spielcode frei von Protokoll-Begriffen.
 *
 * Abgeleitete Werte (der Bonus in Ab ins Beet, die gesperrten Reihen in Qwixx)
 * stehen bewusst nicht im Protokoll: sie sind reine Funktionen aller Plaetze und
 * werden auf jedem Geraet neu ausgerechnet.
 */
export interface SyncSpec<S, A> {
  /** Die Plaetze, die beim Anlegen des Raums entstehen. */
  seatsOf(state: S): { name: string; color: string }[];
  /**
   * Die Spielerliste aus dem Raum uebernehmen.
   *
   * Wer einem Raum beitritt, kennt die Mitspieler noch nicht – sie stehen im
   * Raum, nicht auf seinem Geraet. Die Aktion muss idempotent sein: sie kommt
   * bei jeder Aenderung der Platzliste erneut.
   */
  applyRoster(seats: { name: string; color: string }[]): A;
  /** Mein Anteil am Zustand – serialisierbar, vollstaendig. */
  seatData(state: S, index: number): unknown;
  /** Einen fremden Platz einarbeiten. */
  applySeat(index: number, data: unknown): A;

  /**
   * Spielweite Einstellungen; nur der Host aendert sie. Weglassen, wenn es
   * ausser den Plaetzen nichts zu teilen gibt (so wie bei Kniffel).
   */
  configOf?(state: S): unknown;
  applyConfig?(config: unknown): A;

  applyPhase?(phase: RoomPhase): A;

  /** `null` = gerade wird auf nichts gewartet. */
  barrierToken?(state: S): string | null;
  applyBarrierOpen?(token: string): A;
}

/**
 * Was ein Spiel dem Rahmen ueber sich mitteilen muss.
 *
 * Alles darin ist rein: `reducer` bekommt einen immer-Draft und veraendert ihn,
 * `phaseOf` liest nur. Dadurch laesst sich die ganze Spiellogik ohne React und
 * ohne DOM testen.
 */
export interface GameDefinition<S, A> {
  readonly id: AppId;
  /**
   * Erhoehen, wenn sich die Form des States aendert. Gespeicherte Staende mit
   * anderer Version werden verworfen – es gibt bewusst keine Migration.
   */
  readonly version: number;

  initial(): S;
  reducer(draft: S, action: A): void;
  phaseOf(state: S): Phase;

  /** Aktionen, die keinen Undo-Schritt wert sind (Umschalter, Blaettern). */
  transient?(action: A): boolean;

  /** Was „Spiel zurücksetzen“ ueberleben soll (z. B. gewaehlte Optionen). */
  keepOnReset?(state: S): Partial<S>;

  /** Aktion hinter „Zurück zur Spielerauswahl“ im Standard-Menue. */
  readonly toSetupAction: A;

  /** Undo/Redo im ⋯-Menue anbieten? Standard: nein. */
  readonly undo?: boolean;
  /** Was genau zurueckgenommen wird – praeziser als ein blosses „Rückgängig“. */
  readonly undoLabel?: string;

  /** Gesetzt = dieses Spiel kann in einem Raum gespielt werden. */
  readonly sync?: SyncSpec<S, A>;
}

export type MenuItem = {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  danger?: boolean;
};
