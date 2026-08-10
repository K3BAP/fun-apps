import type { AppId } from "@/apps/types";

export type Phase = "setup" | "play" | "result";

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
}

export type MenuItem = {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  danger?: boolean;
};
